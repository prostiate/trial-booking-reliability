import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import {
  BookingPaginationQuerySchema,
  CheckoutAndPayInputSchema,
  CreateCheckoutInputSchema,
  CreateTrialClassInputSchema,
  MAX_CLASS_CAPACITY,
  ProcessPaymentInputSchema,
  SimulatorRunInputSchema,
} from '@trial-booking/shared';
import { bookingStore } from './store';
import { BookingEngine } from './booking-engine';
import { SimulatorEngine } from './simulator-engine';
import { createRateLimiter } from './middleware/rate-limit';
import { securityHeadersMiddleware } from './middleware/security';

export const engine = new BookingEngine(bookingStore);
export const simulator = new SimulatorEngine(bookingStore, engine);

const app = new Hono()
  .use('*', securityHeadersMiddleware())
  .use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return '*';
        const allowed = [
          'https://trial-booking-reliability.irfankurniawan.com',
          'http://localhost:24002',
          'http://127.0.0.1:24002',
          'http://localhost:3000',
        ];
        return allowed.includes(origin) ? origin : allowed[0];
      },
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Accept'],
      exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
      maxAge: 86400,
    })
  )
  .use(
    '/api/*',
    createRateLimiter({
      windowMs: 60_000,
      maxRequestsPerWindow: 40,
      burstWindowMs: 2_000,
      maxBurstRequests: 15,
    })
  )
  .get('/api/health', (c) => {
    return c.json({
      ok: true,
      service: '@trial-booking/server',
      maxCapacityPerClass: MAX_CLASS_CAPACITY,
      timestamp: new Date().toISOString(),
    });
  })
  .get('/api/catalog', (c) => {
    const parents = Array.from(bookingStore.parents.values());
    const students = Array.from(bookingStore.students.values());
    const classes = engine.getClassCatalog();
    const pendingCheckouts = Array.from(bookingStore.bookings.values())
      .filter((b) => b.status === 'pending_payment')
      .map((b) => engine.enrichBooking(b))
      .sort((a, b) => {
        const cmp = b.createdAt.localeCompare(a.createdAt);
        return cmp !== 0 ? cmp : b.id.localeCompare(a.id);
      });

    return c.json({
      ok: true,
      data: {
        parents,
        students,
        classes,
        pendingCheckouts,
      },
    });
  })
  .get('/api/rosters', (c) => {
    const classes = engine.getClassCatalog();
    const allEnriched = Array.from(bookingStore.bookings.values()).map((b) =>
      engine.enrichBooking(b)
    );

    const rosters = classes.map((cls) => {
      const confirmedRoster = allEnriched
        .filter((b) => b.trialClassId === cls.id && b.status === 'confirmed')
        .sort((a, b) => a.seatNumber - b.seatNumber);

      const nonRosterAttempts = allEnriched
        .filter((b) => b.trialClassId === cls.id && b.status !== 'confirmed')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      return {
        trialClass: cls,
        confirmedCount: confirmedRoster.length,
        maxCapacity: cls.maxCapacity,
        confirmedRoster,
        nonRosterAttempts,
      };
    });

    return c.json({
      ok: true,
      data: rosters,
    });
  })
  .post('/api/classes', zValidator('json', CreateTrialClassInputSchema), async (c) => {
    const input = c.req.valid('json');
    const result = await engine.createTrialClass(input);
    return c.json(result, result.httpStatus);
  })
  .get('/api/bookings', zValidator('query', BookingPaginationQuerySchema), (c) => {
    const query = c.req.valid('query');
    const result = engine.listPaginatedBookings(query);
    return c.json({
      ok: true,
      data: result,
    });
  })
  .post('/api/bookings/checkout', zValidator('json', CreateCheckoutInputSchema), async (c) => {
    const input = c.req.valid('json');
    const result = await engine.createCheckoutIntent(input);
    return c.json(result, result.httpStatus);
  })
  .post('/api/bookings/submit', zValidator('json', CheckoutAndPayInputSchema), async (c) => {
    const input = c.req.valid('json');
    const checkoutRes = await engine.createCheckoutIntent({
      parentId: input.parentId,
      studentId: input.studentId,
      trialClassId: input.trialClassId,
      seatNumber: input.seatNumber,
    });

    if (!checkoutRes.ok || !checkoutRes.data) {
      return c.json(checkoutRes, checkoutRes.httpStatus);
    }

    if (input.action === 'hold_pending') {
      return c.json(checkoutRes, checkoutRes.httpStatus);
    }

    const payRes = await engine.processPayment(checkoutRes.data.id, {
      paymentOutcome: input.action === 'pay_success' ? 'success' : 'fail',
      paymentMethod:
        input.paymentMethod ??
        (input.action === 'pay_success' ? 'card_visa_4242' : 'card_declined_0002'),
    });

    return c.json(payRes, payRes.httpStatus);
  })
  .post('/api/bookings/:id/pay', zValidator('json', ProcessPaymentInputSchema), async (c) => {
    const bookingId = c.req.param('id');
    const input = c.req.valid('json');
    const result = await engine.processPayment(bookingId, input);
    return c.json(result, result.httpStatus);
  })
  .post('/api/bookings/:id/cancel', async (c) => {
    const bookingId = c.req.param('id');
    const result = await engine.cancelBooking(bookingId);
    return c.json(result, result.httpStatus);
  })
  .post('/api/simulator/run', zValidator('json', SimulatorRunInputSchema), async (c) => {
    const input = c.req.valid('json');
    const simResult = await simulator.runScenario(input.scenario, input.resetBeforeRun);
    return c.json({
      ok: true,
      data: simResult,
    });
  })
  .post('/api/reset', (c) => {
    bookingStore.resetToSeed();
    return c.json({
      ok: true,
      message: 'In-memory store reset to initial seed state.',
    });
  });

export type AppType = typeof app;
export default app;
