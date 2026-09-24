import {
  BOOKING_ERROR_CODES,
  MAX_CLASS_CAPACITY,
  SEAT_NUMBERS,
  type BookingErrorCode,
  type BookingPaginationQuery,
  type BookingRecord,
  type ClassCatalogItem,
  type CreateCheckoutInput,
  type EnrichedBooking,
  type PaymentAttempt,
  type ProcessPaymentInput,
  type SeatSlotState,
} from '@trial-booking/shared';
import { InMemoryBookingStore } from './store';

export interface EngineResult<T> {
  ok: boolean;
  httpStatus: 200 | 201 | 400 | 402 | 404 | 409;
  errorCode: BookingErrorCode | null;
  message: string;
  data: T | null;
}

export class BookingEngine {
  constructor(private readonly store: InMemoryBookingStore) {}

  public enrichBooking(booking: BookingRecord): EnrichedBooking {
    const parent = this.store.parents.get(booking.parentId);
    const student = this.store.students.get(booking.studentId);
    const trialClass = this.store.trialClasses.get(booking.trialClassId);
    const attempts = Array.from(this.store.paymentAttempts.values())
      .filter((a) => a.bookingId === booking.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return {
      ...booking,
      parentName: parent?.name ?? 'Unknown Parent',
      parentEmail: parent?.email ?? 'unknown@example.com',
      studentName: student?.name ?? 'Unknown Student',
      studentGrade: student?.gradeLevel ?? 'Grade 4',
      classTitle: trialClass?.title ?? 'Unknown Class',
      classSubject: trialClass?.subject ?? 'Math',
      teacherName: trialClass?.teacherName ?? 'Unknown Teacher',
      scheduledAt: trialClass?.scheduledAt ?? '',
      priceIdr: trialClass?.priceIdr ?? 75000,
      paymentAttempts: attempts,
    };
  }

  public getClassCatalog(): ClassCatalogItem[] {
    const allBookings = Array.from(this.store.bookings.values());
    return Array.from(this.store.trialClasses.values()).map((cls) => {
      const classBookings = allBookings.filter((b) => b.trialClassId === cls.id);
      const confirmedBookings = classBookings.filter((b) => b.status === 'confirmed');
      const pendingBookings = classBookings.filter((b) => b.status === 'pending_payment');

      const seats: SeatSlotState[] = SEAT_NUMBERS.map((seatNumber) => {
        const confirmed = confirmedBookings.find((b) => b.seatNumber === seatNumber);
        const confirmedStudent = confirmed
          ? (this.store.students.get(confirmed.studentId)?.name ?? null)
          : null;
        const pendingForSeat = pendingBookings.filter((b) => b.seatNumber === seatNumber);
        const pendingNames = pendingForSeat.map(
          (b) => this.store.students.get(b.studentId)?.name ?? 'Student'
        );

        return {
          seatNumber,
          isConfirmed: Boolean(confirmed),
          confirmedStudentName: confirmedStudent,
          confirmedBookingId: confirmed?.id ?? null,
          pendingCheckoutCount: pendingForSeat.length,
          pendingStudentNames: pendingNames,
        };
      });

      const confirmedCount = confirmedBookings.length;
      return {
        ...cls,
        confirmedCount,
        availableSeatsCount: Math.max(0, cls.maxCapacity - confirmedCount),
        pendingCount: pendingBookings.length,
        isFull: confirmedCount >= cls.maxCapacity,
        seats,
      };
    });
  }

  public async createCheckoutIntent(
    input: CreateCheckoutInput
  ): Promise<EngineResult<EnrichedBooking>> {
    return this.store.runAtomic(() => {
      const parent = this.store.parents.get(input.parentId);
      const student = this.store.students.get(input.studentId);
      const trialClass = this.store.trialClasses.get(input.trialClassId);

      if (!parent || !student || !trialClass) {
        return {
          ok: false,
          httpStatus: 404,
          errorCode: BOOKING_ERROR_CODES.BOOKING_NOT_FOUND,
          message: 'Selected parent, student, or trial class was not found.',
          data: null,
        };
      }

      if (student.parentId !== parent.id) {
        return {
          ok: false,
          httpStatus: 400,
          errorStatus: 400,
          errorCode: BOOKING_ERROR_CODES.STUDENT_PARENT_MISMATCH,
          message: `${student.name} does not belong to parent account ${parent.name}.`,
          data: null,
        };
      }

      const allBookings = Array.from(this.store.bookings.values());
      const duplicateConfirmed = allBookings.find(
        (b) =>
          b.studentId === student.id && b.trialClassId === trialClass.id && b.status === 'confirmed'
      );
      if (duplicateConfirmed) {
        return {
          ok: false,
          httpStatus: 409,
          errorCode: BOOKING_ERROR_CODES.DUPLICATE_CONFIRMED_BOOKING,
          message: `${student.name} already has a confirmed seat (#${duplicateConfirmed.seatNumber}) in ${trialClass.title}.`,
          data: this.enrichBooking(duplicateConfirmed),
        };
      }

      const confirmedInClass = allBookings.filter(
        (b) => b.trialClassId === trialClass.id && b.status === 'confirmed'
      );
      if (confirmedInClass.length >= MAX_CLASS_CAPACITY) {
        return {
          ok: false,
          httpStatus: 409,
          errorCode: BOOKING_ERROR_CODES.CLASS_CAPACITY_EXCEEDED,
          message: `${trialClass.title} is already full (${MAX_CLASS_CAPACITY}/${MAX_CLASS_CAPACITY} confirmed students).`,
          data: null,
        };
      }

      const seatOccupied = confirmedInClass.find((b) => b.seatNumber === input.seatNumber);
      if (seatOccupied) {
        const occupantName =
          this.store.students.get(seatOccupied.studentId)?.name ?? 'another student';
        return {
          ok: false,
          httpStatus: 409,
          errorCode: BOOKING_ERROR_CODES.SEAT_ALREADY_CONFIRMED,
          message: `Seat #${input.seatNumber} is already confirmed by ${occupantName}.`,
          data: null,
        };
      }

      // Reuse an existing pending_payment checkout for the exact same child + class + seat if present
      const existingPending = allBookings.find(
        (b) =>
          b.studentId === student.id &&
          b.trialClassId === trialClass.id &&
          b.seatNumber === input.seatNumber &&
          b.status === 'pending_payment'
      );
      if (existingPending) {
        return {
          ok: true,
          httpStatus: 200,
          errorCode: null,
          message: `Resumed pending checkout for ${student.name} on Seat #${input.seatNumber}.`,
          data: this.enrichBooking(existingPending),
        };
      }

      const now = new Date().toISOString();
      const newBooking: BookingRecord = {
        id: this.store.nextId('bkg'),
        parentId: parent.id,
        studentId: student.id,
        trialClassId: trialClass.id,
        seatNumber: input.seatNumber,
        status: 'pending_payment',
        conflictReason: null,
        conflictingBookingId: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
        confirmedAt: null,
      };
      this.store.bookings.set(newBooking.id, newBooking);

      return {
        ok: true,
        httpStatus: 201,
        errorCode: null,
        message: `Checkout created in pending_payment for ${student.name} (Seat #${input.seatNumber}).`,
        data: this.enrichBooking(newBooking),
      };
    });
  }

  public async processPayment(
    bookingId: string,
    input: ProcessPaymentInput
  ): Promise<EngineResult<EnrichedBooking>> {
    return this.store.runAtomic(() => {
      const booking = this.store.bookings.get(bookingId);
      if (!booking) {
        return {
          ok: false,
          httpStatus: 404,
          errorCode: BOOKING_ERROR_CODES.BOOKING_NOT_FOUND,
          message: `Booking ${bookingId} was not found.`,
          data: null,
        };
      }

      if (booking.status === 'confirmed') {
        return {
          ok: false,
          httpStatus: 409,
          errorCode: BOOKING_ERROR_CODES.BOOKING_ALREADY_FINALIZED,
          message: `Booking ${booking.id} is already confirmed.`,
          data: this.enrichBooking(booking),
        };
      }

      const trialClass = this.store.trialClasses.get(booking.trialClassId);
      const student = this.store.students.get(booking.studentId);
      const now = new Date().toISOString();
      const allBookings = Array.from(this.store.bookings.values());

      // Invariant 1: Duplicate confirmed booking check for same student + class
      const existingDuplicate = allBookings.find(
        (b) =>
          b.id !== booking.id &&
          b.studentId === booking.studentId &&
          b.trialClassId === booking.trialClassId &&
          b.status === 'confirmed'
      );
      if (existingDuplicate) {
        booking.status = 'expired_conflict';
        booking.conflictReason = BOOKING_ERROR_CODES.DUPLICATE_CONFIRMED_BOOKING;
        booking.conflictingBookingId = existingDuplicate.id;
        booking.version += 1;
        booking.updatedAt = now;

        const attempt: PaymentAttempt = {
          id: this.store.nextId('pay'),
          bookingId: booking.id,
          amountIdr: 0,
          method: input.paymentMethod,
          status: 'aborted_conflict',
          errorCode: BOOKING_ERROR_CODES.DUPLICATE_CONFIRMED_BOOKING,
          message: `Aborted charge: ${student?.name ?? 'Student'} is already confirmed in ${trialClass?.title ?? 'this class'}.`,
          createdAt: now,
        };
        this.store.paymentAttempts.set(attempt.id, attempt);

        return {
          ok: false,
          httpStatus: 409,
          errorCode: BOOKING_ERROR_CODES.DUPLICATE_CONFIRMED_BOOKING,
          message: `${student?.name ?? 'Student'} already has a confirmed booking in ${trialClass?.title ?? 'this class'}. Payment aborted (Rp 0).`,
          data: this.enrichBooking(booking),
        };
      }

      // Invariant 2: Last-seat race & 4-student class capacity critical section check
      const confirmedInClass = allBookings.filter(
        (b) => b.trialClassId === booking.trialClassId && b.status === 'confirmed'
      );
      const seatWinner = confirmedInClass.find((b) => b.seatNumber === booking.seatNumber);

      if (confirmedInClass.length >= MAX_CLASS_CAPACITY || seatWinner) {
        const winnerBooking = seatWinner ?? confirmedInClass[confirmedInClass.length - 1];
        const winnerStudentName = winnerBooking
          ? (this.store.students.get(winnerBooking.studentId)?.name ?? 'another student')
          : 'another student';

        booking.status = 'expired_conflict';
        booking.conflictReason = BOOKING_ERROR_CODES.LAST_SEAT_RACE_LOST;
        booking.conflictingBookingId = winnerBooking?.id ?? null;
        booking.version += 1;
        booking.updatedAt = now;

        const attempt: PaymentAttempt = {
          id: this.store.nextId('pay'),
          bookingId: booking.id,
          amountIdr: 0,
          method: input.paymentMethod,
          status: 'aborted_conflict',
          errorCode: BOOKING_ERROR_CODES.LAST_SEAT_RACE_LOST,
          message: `Last-seat race lost: Seat #${booking.seatNumber} was confirmed first by ${winnerStudentName}. Payment aborted (Rp 0 charged).`,
          createdAt: now,
        };
        this.store.paymentAttempts.set(attempt.id, attempt);

        return {
          ok: false,
          httpStatus: 409,
          errorCode: BOOKING_ERROR_CODES.LAST_SEAT_RACE_LOST,
          message: `Checkout conflict: Seat #${booking.seatNumber} in ${trialClass?.title ?? 'this class'} was just confirmed by ${winnerStudentName}. Your card was not charged (Rp 0).`,
          data: this.enrichBooking(booking),
        };
      }

      // Invariant 3: Payment failure must NOT add student to confirmed roster
      if (input.paymentOutcome === 'fail' || input.paymentMethod === 'card_declined_0002') {
        booking.status = 'payment_failed';
        booking.conflictReason = BOOKING_ERROR_CODES.PAYMENT_DECLINED;
        booking.version += 1;
        booking.updatedAt = now;

        const attempt: PaymentAttempt = {
          id: this.store.nextId('pay'),
          bookingId: booking.id,
          amountIdr: trialClass?.priceIdr ?? 75000,
          method: input.paymentMethod,
          status: 'failed',
          errorCode: BOOKING_ERROR_CODES.PAYMENT_DECLINED,
          message: `Card declined by issuer. ${student?.name ?? 'Student'} was NOT added to the confirmed class roster.`,
          createdAt: now,
        };
        this.store.paymentAttempts.set(attempt.id, attempt);

        return {
          ok: false,
          httpStatus: 402,
          errorCode: BOOKING_ERROR_CODES.PAYMENT_DECLINED,
          message: `Payment failed (Card Declined). ${student?.name ?? 'Student'} was not added to the confirmed roster.`,
          data: this.enrichBooking(booking),
        };
      }

      // Payment Succeeded + Capacity & Seat Verified -> Confirm Booking
      booking.status = 'confirmed';
      booking.conflictReason = null;
      booking.conflictingBookingId = null;
      booking.version += 1;
      booking.updatedAt = now;
      booking.confirmedAt = now;

      const attempt: PaymentAttempt = {
        id: this.store.nextId('pay'),
        bookingId: booking.id,
        amountIdr: trialClass?.priceIdr ?? 75000,
        method: input.paymentMethod,
        status: 'succeeded',
        errorCode: null,
        message: `Payment captured (Rp ${(trialClass?.priceIdr ?? 75000).toLocaleString('id-ID')}) and Seat #${booking.seatNumber} confirmed.`,
        createdAt: now,
      };
      this.store.paymentAttempts.set(attempt.id, attempt);

      return {
        ok: true,
        httpStatus: 200,
        errorCode: null,
        message: `Booking confirmed! ${student?.name ?? 'Student'} is enrolled in ${trialClass?.title ?? 'class'} (Seat #${booking.seatNumber}).`,
        data: this.enrichBooking(booking),
      };
    });
  }

  public listPaginatedBookings(query: BookingPaginationQuery) {
    const allEnriched = Array.from(this.store.bookings.values())
      .map((b) => this.enrichBooking(b))
      .filter((b) => {
        if (query.status !== 'all' && b.status !== query.status) return false;
        if (query.trialClassId !== 'all' && b.trialClassId !== query.trialClassId) return false;
        if (query.parentId !== 'all' && b.parentId !== query.parentId) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const total = allEnriched.length;
    const totalPages = Math.max(1, Math.ceil(total / query.limit));
    const safePage = Math.min(query.page, totalPages);
    const startIndex = (safePage - 1) * query.limit;
    const items = allEnriched.slice(startIndex, startIndex + query.limit);

    return {
      items,
      pagination: {
        page: safePage,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }
}
