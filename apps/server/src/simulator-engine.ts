import {
  MAX_CLASS_CAPACITY,
  type SimulatorScenario,
  type SimulatorStepEvent,
} from '@trial-booking/shared';
import { BookingEngine } from './booking-engine';
import { InMemoryBookingStore } from './store';

export class SimulatorEngine {
  constructor(
    private readonly store: InMemoryBookingStore,
    private readonly bookingEngine: BookingEngine
  ) {}

  private countConfirmed(trialClassId: string): number {
    return Array.from(this.store.bookings.values()).filter(
      (b) => b.trialClassId === trialClassId && b.status === 'confirmed'
    ).length;
  }

  public async runScenario(
    scenario: SimulatorScenario,
    resetBeforeRun = true
  ): Promise<{
    scenario: SimulatorScenario;
    steps: SimulatorStepEvent[];
    finalConfirmedCount: number;
    maxCapacity: number;
  }> {
    if (resetBeforeRun) {
      this.store.resetToSeed();
    }

    const steps: SimulatorStepEvent[] = [];

    if (scenario === 'last_seat_race') {
      const classId = 'cls-math-fractions'; // 3/4 confirmed (Seat 4 is the last available seat)

      // Step 1: User A (Siti / Arka) selects Seat #4 and holds pending_payment
      const resA1 = await this.bookingEngine.createCheckoutIntent({
        parentId: 'par-siti',
        studentId: 'stu-arka',
        trialClassId: classId,
        seatNumber: 4,
      });
      steps.push({
        stepNumber: 1,
        actor: 'User A (Siti Rahma · Child: Arka)',
        action: 'Selects last available slot (Seat #4) & moves to payment',
        endpoint: 'POST /api/bookings/checkout',
        httpStatus: resA1.httpStatus,
        bookingId: resA1.data?.id ?? null,
        previousStatus: null,
        nextStatus: resA1.data?.status ?? 'rejected',
        errorCode: resA1.errorCode,
        confirmedRosterCount: this.countConfirmed(classId),
        maxCapacity: MAX_CLASS_CAPACITY,
        summary: resA1.message,
      });

      // Step 2: User B (Budi / Dina) also selects Seat #4 while User A is still in pending_payment
      const resB1 = await this.bookingEngine.createCheckoutIntent({
        parentId: 'par-budi',
        studentId: 'stu-dina',
        trialClassId: classId,
        seatNumber: 4,
      });
      steps.push({
        stepNumber: 2,
        actor: 'User B (Budi Santoso · Child: Dina)',
        action: 'Selects the same Seat #4 while User A is still on checkout screen',
        endpoint: 'POST /api/bookings/checkout',
        httpStatus: resB1.httpStatus,
        bookingId: resB1.data?.id ?? null,
        previousStatus: null,
        nextStatus: resB1.data?.status ?? 'rejected',
        errorCode: resB1.errorCode,
        confirmedRosterCount: this.countConfirmed(classId),
        maxCapacity: MAX_CLASS_CAPACITY,
        summary: resB1.message,
      });

      // Step 3: User B completes payment first -> Confirmed (takes 4th seat!)
      const bookingBId = resB1.data?.id ?? '';
      const resB2 = await this.bookingEngine.processPayment(bookingBId, {
        paymentOutcome: 'success',
        paymentMethod: 'card_visa_4242',
      });
      steps.push({
        stepNumber: 3,
        actor: 'User B (Budi Santoso · Child: Dina)',
        action: 'Completes payment first (Visa •••• 4242)',
        endpoint: `POST /api/bookings/${bookingBId}/pay`,
        httpStatus: resB2.httpStatus,
        bookingId: bookingBId,
        previousStatus: 'pending_payment',
        nextStatus: resB2.data?.status ?? 'confirmed',
        errorCode: resB2.errorCode,
        confirmedRosterCount: this.countConfirmed(classId),
        maxCapacity: MAX_CLASS_CAPACITY,
        summary: resB2.message,
      });

      // Step 4: User A then tries to complete payment -> Atomic guard rejects with 409 LAST_SEAT_RACE_LOST
      const bookingAId = resA1.data?.id ?? '';
      const resA2 = await this.bookingEngine.processPayment(bookingAId, {
        paymentOutcome: 'success',
        paymentMethod: 'card_visa_4242',
      });
      steps.push({
        stepNumber: 4,
        actor: 'User A (Siti Rahma · Child: Arka)',
        action: 'Attempts to complete payment after Seat #4 was confirmed by User B',
        endpoint: `POST /api/bookings/${bookingAId}/pay`,
        httpStatus: resA2.httpStatus,
        bookingId: bookingAId,
        previousStatus: 'pending_payment',
        nextStatus: resA2.data?.status ?? 'expired_conflict',
        errorCode: resA2.errorCode,
        confirmedRosterCount: this.countConfirmed(classId),
        maxCapacity: MAX_CLASS_CAPACITY,
        summary: resA2.message,
      });

      return {
        scenario,
        steps,
        finalConfirmedCount: this.countConfirmed(classId),
        maxCapacity: MAX_CLASS_CAPACITY,
      };
    }

    if (scenario === 'duplicate_booking') {
      const classId = 'cls-sci-orbit'; // Dina Santoso already holds confirmed Seat #1
      const resDup = await this.bookingEngine.createCheckoutIntent({
        parentId: 'par-budi',
        studentId: 'stu-dina',
        trialClassId: classId,
        seatNumber: 3,
      });
      steps.push({
        stepNumber: 1,
        actor: 'Budi Santoso (Child: Dina Santoso)',
        action:
          'Attempts second booking for Dina in Planetary Orbits (already confirmed in Seat #1)',
        endpoint: 'POST /api/bookings/checkout',
        httpStatus: resDup.httpStatus,
        bookingId: resDup.data?.id ?? null,
        previousStatus: 'confirmed',
        nextStatus: 'rejected_duplicate',
        errorCode: resDup.errorCode,
        confirmedRosterCount: this.countConfirmed(classId),
        maxCapacity: MAX_CLASS_CAPACITY,
        summary: resDup.message,
      });

      return {
        scenario,
        steps,
        finalConfirmedCount: this.countConfirmed(classId),
        maxCapacity: MAX_CLASS_CAPACITY,
      };
    }

    if (scenario === 'overbooking_guard') {
      const classId = 'cls-math-logic'; // Already at 4/4 confirmed students
      const resFull = await this.bookingEngine.createCheckoutIntent({
        parentId: 'par-siti',
        studentId: 'stu-arka',
        trialClassId: classId,
        seatNumber: 4,
      });
      steps.push({
        stepNumber: 1,
        actor: 'Siti Rahma (Child: Arka Rahma)',
        action: 'Attempts to book into Algorithmic Puzzles class at 4/4 capacity',
        endpoint: 'POST /api/bookings/checkout',
        httpStatus: resFull.httpStatus,
        bookingId: null,
        previousStatus: null,
        nextStatus: 'rejected_capacity_full',
        errorCode: resFull.errorCode,
        confirmedRosterCount: this.countConfirmed(classId),
        maxCapacity: MAX_CLASS_CAPACITY,
        summary: resFull.message,
      });

      return {
        scenario,
        steps,
        finalConfirmedCount: this.countConfirmed(classId),
        maxCapacity: MAX_CLASS_CAPACITY,
      };
    }

    // scenario === 'payment_failure'
    const classId = 'cls-sci-orbit';
    const resCheckout = await this.bookingEngine.createCheckoutIntent({
      parentId: 'par-siti',
      studentId: 'stu-arka',
      trialClassId: classId,
      seatNumber: 3,
    });
    steps.push({
      stepNumber: 1,
      actor: 'Siti Rahma (Child: Arka Rahma)',
      action: 'Selects Seat #3 in Planetary Orbits and starts checkout',
      endpoint: 'POST /api/bookings/checkout',
      httpStatus: resCheckout.httpStatus,
      bookingId: resCheckout.data?.id ?? null,
      previousStatus: null,
      nextStatus: resCheckout.data?.status ?? 'pending_payment',
      errorCode: null,
      confirmedRosterCount: this.countConfirmed(classId),
      maxCapacity: MAX_CLASS_CAPACITY,
      summary: resCheckout.message,
    });

    const bookingId = resCheckout.data?.id ?? '';
    const resFail = await this.bookingEngine.processPayment(bookingId, {
      paymentOutcome: 'fail',
      paymentMethod: 'card_declined_0002',
    });
    steps.push({
      stepNumber: 2,
      actor: 'Siti Rahma (Child: Arka Rahma)',
      action: 'Submits payment with declined card (•••• 0002)',
      endpoint: `POST /api/bookings/${bookingId}/pay`,
      httpStatus: resFail.httpStatus,
      bookingId,
      previousStatus: 'pending_payment',
      nextStatus: resFail.data?.status ?? 'payment_failed',
      errorCode: resFail.errorCode,
      confirmedRosterCount: this.countConfirmed(classId),
      maxCapacity: MAX_CLASS_CAPACITY,
      summary: resFail.message,
    });

    return {
      scenario,
      steps,
      finalConfirmedCount: this.countConfirmed(classId),
      maxCapacity: MAX_CLASS_CAPACITY,
    };
  }
}
