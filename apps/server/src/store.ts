import {
  type BookingRecord,
  type Parent,
  type PaymentAttempt,
  type Student,
  type TrialClass,
} from '@trial-booking/shared';
import { createInitialSeedSnapshot } from './seed';

export class InMemoryBookingStore {
  public parents: Map<string, Parent> = new Map();
  public students: Map<string, Student> = new Map();
  public trialClasses: Map<string, TrialClass> = new Map();
  public bookings: Map<string, BookingRecord> = new Map();
  public paymentAttempts: Map<string, PaymentAttempt> = new Map();
  private sequenceCounter = 100;
  private mutexQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.resetToSeed();
  }

  public resetToSeed(): void {
    const snapshot = createInitialSeedSnapshot();
    this.parents.clear();
    this.students.clear();
    this.trialClasses.clear();
    this.bookings.clear();
    this.paymentAttempts.clear();
    this.sequenceCounter = 100;

    for (const parent of snapshot.parents) {
      this.parents.set(parent.id, { ...parent });
    }
    for (const student of snapshot.students) {
      this.students.set(student.id, { ...student });
    }
    for (const cls of snapshot.trialClasses) {
      this.trialClasses.set(cls.id, { ...cls });
    }
    for (const booking of snapshot.bookings) {
      this.bookings.set(booking.id, { ...booking });
    }
    for (const attempt of snapshot.paymentAttempts) {
      this.paymentAttempts.set(attempt.id, { ...attempt });
    }
  }

  public nextId(prefix: 'bkg' | 'pay'): string {
    this.sequenceCounter += 1;
    return `${prefix}-${this.sequenceCounter}`;
  }

  /**
   * Serializes mutating operations across concurrent async callers (`Promise.all`)
   * so check-then-act seat confirmations are strictly atomic.
   */
  public async runAtomic<T>(criticalSection: () => T | Promise<T>): Promise<T> {
    const previous = this.mutexQueue;
    let release!: () => void;
    this.mutexQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await criticalSection();
    } finally {
      release();
    }
  }
}

export const bookingStore = new InMemoryBookingStore();
