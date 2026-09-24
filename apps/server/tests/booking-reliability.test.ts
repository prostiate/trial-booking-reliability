import { beforeEach, describe, expect, it } from 'vitest';
import { BOOKING_ERROR_CODES, MAX_CLASS_CAPACITY } from '@trial-booking/shared';
import app, { engine } from '../src/index';
import { bookingStore } from '../src/store';
import { resetRateLimiterState } from '../src/middleware/rate-limit';

describe('Ottodot Trial Booking Reliability & Concurrency Suite', () => {
  beforeEach(() => {
    bookingStore.resetToSeed();
    resetRateLimiterState();
  });

  it('seeds classes with 3/4 confirmed (1 last seat), 1/4 available, and 4/4 full capacity', () => {
    const catalog = engine.getClassCatalog();
    const fractionsClass = catalog.find((c) => c.id === 'cls-math-fractions');
    const orbitsClass = catalog.find((c) => c.id === 'cls-sci-orbit');
    const logicClass = catalog.find((c) => c.id === 'cls-math-logic');

    expect(fractionsClass?.confirmedCount).toBe(3);
    expect(fractionsClass?.availableSeatsCount).toBe(1);
    expect(fractionsClass?.isFull).toBe(false);

    expect(orbitsClass?.confirmedCount).toBe(1);
    expect(orbitsClass?.availableSeatsCount).toBe(3);

    expect(logicClass?.confirmedCount).toBe(4);
    expect(logicClass?.isFull).toBe(true);
  });

  it('allows a parent to select a child, book an open seat, and confirm payment', async () => {
    const res = await app.request('/api/bookings/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: 'par-siti',
        studentId: 'stu-arka',
        trialClassId: 'cls-sci-orbit',
        seatNumber: 3,
        action: 'pay_success',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe('confirmed');
    expect(body.data.seatNumber).toBe(3);
    expect(body.data.paymentAttempts).toHaveLength(1);
    expect(body.data.paymentAttempts[0].status).toBe('succeeded');
  });

  it('prevents duplicate confirmed bookings for the same child and trial class', async () => {
    // Dina Santoso (stu-dina) is already confirmed in Seat #1 of cls-sci-orbit
    const res = await app.request('/api/bookings/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: 'par-budi',
        studentId: 'stu-dina',
        trialClassId: 'cls-sci-orbit',
        seatNumber: 2,
        action: 'pay_success',
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.errorCode).toBe(BOOKING_ERROR_CODES.DUPLICATE_CONFIRMED_BOOKING);

    const orbitsCatalog = engine.getClassCatalog().find((c) => c.id === 'cls-sci-orbit');
    expect(orbitsCatalog?.confirmedCount).toBe(1);
  });

  it('prevents overbooking beyond 4 confirmed students', async () => {
    // cls-math-logic already has 4/4 confirmed students
    const res = await app.request('/api/bookings/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: 'par-siti',
        studentId: 'stu-arka',
        trialClassId: 'cls-math-logic',
        seatNumber: 4,
        action: 'pay_success',
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.errorCode).toBe(BOOKING_ERROR_CODES.CLASS_CAPACITY_EXCEEDED);

    const logicCatalog = engine.getClassCatalog().find((c) => c.id === 'cls-math-logic');
    expect(logicCatalog?.confirmedCount).toBe(MAX_CLASS_CAPACITY);
  });

  it('records payment failure without adding the child to the confirmed class roster', async () => {
    const res = await app.request('/api/bookings/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: 'par-budi',
        studentId: 'stu-raka',
        trialClassId: 'cls-sci-orbit',
        seatNumber: 4,
        action: 'pay_fail',
      }),
    });

    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.errorCode).toBe(BOOKING_ERROR_CODES.PAYMENT_DECLINED);
    expect(body.data.status).toBe('payment_failed');
    expect(body.data.paymentAttempts[0].status).toBe('failed');

    // Roster count must remain 1 (only Dina Santoso)
    const rosterRes = await app.request('/api/rosters');
    const rosterBody = await rosterRes.json();
    const orbitRoster = rosterBody.data.find(
      (r: { trialClass: { id: string } }) => r.trialClass.id === 'cls-sci-orbit'
    );
    expect(orbitRoster.confirmedCount).toBe(1);
    expect(
      orbitRoster.confirmedRoster.some((b: { studentId: string }) => b.studentId === 'stu-raka')
    ).toBe(false);
  });

  it('handles the Last-Seat Race Condition: User A holds last slot, User B pays first, User A is rejected with 409', async () => {
    // Step 1: User A (Siti / Arka) selects Seat #4 (the 4th and last seat of cls-math-fractions)
    const checkoutA = await engine.createCheckoutIntent({
      parentId: 'par-siti',
      studentId: 'stu-arka',
      trialClassId: 'cls-math-fractions',
      seatNumber: 4,
    });
    expect(checkoutA.ok).toBe(true);
    expect(checkoutA.data?.status).toBe('pending_payment');

    // Step 2: User B (Budi / Dina) selects the same Seat #4
    const checkoutB = await engine.createCheckoutIntent({
      parentId: 'par-budi',
      studentId: 'stu-dina',
      trialClassId: 'cls-math-fractions',
      seatNumber: 4,
    });
    expect(checkoutB.ok).toBe(true);
    expect(checkoutB.data?.status).toBe('pending_payment');

    // Step 3: User B completes payment first -> Confirmed!
    const payB = await engine.processPayment(checkoutB.data!.id, {
      paymentOutcome: 'success',
      paymentMethod: 'card_visa_4242',
    });
    expect(payB.ok).toBe(true);
    expect(payB.httpStatus).toBe(200);
    expect(payB.data?.status).toBe('confirmed');

    // Step 4: User A then tries to complete payment -> Rejected with 409 LAST_SEAT_RACE_LOST
    const payA = await engine.processPayment(checkoutA.data!.id, {
      paymentOutcome: 'success',
      paymentMethod: 'card_visa_4242',
    });
    expect(payA.ok).toBe(false);
    expect(payA.httpStatus).toBe(409);
    expect(payA.errorCode).toBe(BOOKING_ERROR_CODES.LAST_SEAT_RACE_LOST);
    expect(payA.data?.status).toBe('expired_conflict');
    expect(payA.data?.paymentAttempts[0].status).toBe('aborted_conflict');
    expect(payA.data?.paymentAttempts[0].amountIdr).toBe(0);

    // Verify class confirmed count is strictly 4 (never 5)
    const fractionsCatalog = engine.getClassCatalog().find((c) => c.id === 'cls-math-fractions');
    expect(fractionsCatalog?.confirmedCount).toBe(MAX_CLASS_CAPACITY);
  });

  it('enforces strict atomicity under concurrent Promise.all payment submissions for the last seat', async () => {
    const checkoutA = await engine.createCheckoutIntent({
      parentId: 'par-siti',
      studentId: 'stu-arka',
      trialClassId: 'cls-math-fractions',
      seatNumber: 4,
    });
    const checkoutB = await engine.createCheckoutIntent({
      parentId: 'par-budi',
      studentId: 'stu-dina',
      trialClassId: 'cls-math-fractions',
      seatNumber: 4,
    });

    const [resultA, resultB] = await Promise.all([
      engine.processPayment(checkoutA.data!.id, {
        paymentOutcome: 'success',
        paymentMethod: 'card_visa_4242',
      }),
      engine.processPayment(checkoutB.data!.id, {
        paymentOutcome: 'success',
        paymentMethod: 'card_visa_4242',
      }),
    ]);

    const successes = [resultA, resultB].filter((r) => r.ok && r.httpStatus === 200);
    const conflicts = [resultA, resultB].filter(
      (r) => !r.ok && r.errorCode === BOOKING_ERROR_CODES.LAST_SEAT_RACE_LOST
    );

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);

    const fractionsCatalog = engine.getClassCatalog().find((c) => c.id === 'cls-math-fractions');
    expect(fractionsCatalog?.confirmedCount).toBe(MAX_CLASS_CAPACITY);
  });

  it('enforces application-layer rate limiting and security headers on burst traffic', async () => {
    const healthRes = await app.request('/api/health');
    expect(healthRes.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(healthRes.headers.get('X-Frame-Options')).toBe('DENY');
    expect(healthRes.headers.get('X-RateLimit-Limit')).toBeTruthy();

    // Send 16 rapid write requests from same IP to trigger burst throttle (maxBurstRequests = 15)
    const responses = [];
    for (let i = 0; i < 16; i += 1) {
      const r = await app.request('/api/reset', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '203.0.113.99' },
      });
      responses.push(r.status);
    }

    expect(responses).toContain(429);
  });
});
