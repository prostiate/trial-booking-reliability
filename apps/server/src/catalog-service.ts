import {
  MAX_CLASS_CAPACITY,
  SEAT_NUMBERS,
  type BookingPaginationQuery,
  type BookingRecord,
  type ClassCatalogItem,
  type CreateTrialClassInput,
  type EnrichedBooking,
  type SeatSlotState,
  type TrialClass,
} from '@trial-booking/shared';
import { InMemoryBookingStore } from './store';
import type { EngineResult } from './booking-engine';

export class CatalogService {
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

  public async createTrialClass(
    input: CreateTrialClassInput
  ): Promise<EngineResult<ClassCatalogItem>> {
    return this.store.runAtomic(() => {
      const newClass: TrialClass = {
        id: this.store.nextId('cls'),
        title: input.title,
        subject: input.subject,
        gradeRange: input.gradeRange,
        teacherName: input.teacherName,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        priceIdr: input.priceIdr,
        maxCapacity: MAX_CLASS_CAPACITY,
      };
      this.store.trialClasses.set(newClass.id, newClass);

      const createdCatalogItem = this.getClassCatalog().find((c) => c.id === newClass.id) ?? null;

      return {
        ok: true,
        httpStatus: 201,
        errorCode: null,
        message: `Trial class "${newClass.title}" created with ${MAX_CLASS_CAPACITY} seats.`,
        data: createdCatalogItem,
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
