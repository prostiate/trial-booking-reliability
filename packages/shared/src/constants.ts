export const MAX_CLASS_CAPACITY = 4 as const;
export const SEAT_NUMBERS = [1, 2, 3, 4] as const;

export const BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'payment_failed',
  'expired_conflict',
  'cancelled',
] as const;

export const PAYMENT_METHODS = [
  'card_visa_4242',
  'card_declined_0002',
  'qris_instant',
] as const;

export const PAYMENT_ATTEMPT_STATUSES = [
  'succeeded',
  'failed',
  'aborted_conflict',
] as const;

export const BOOKING_ERROR_CODES = {
  DUPLICATE_CONFIRMED_BOOKING: 'DUPLICATE_CONFIRMED_BOOKING',
  CLASS_CAPACITY_EXCEEDED: 'CLASS_CAPACITY_EXCEEDED',
  SEAT_ALREADY_CONFIRMED: 'SEAT_ALREADY_CONFIRMED',
  LAST_SEAT_RACE_LOST: 'LAST_SEAT_RACE_LOST',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  BOOKING_ALREADY_FINALIZED: 'BOOKING_ALREADY_FINALIZED',
  STUDENT_PARENT_MISMATCH: 'STUDENT_PARENT_MISMATCH',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export type BookingErrorCode =
  (typeof BOOKING_ERROR_CODES)[keyof typeof BOOKING_ERROR_CODES];

export const SIMULATOR_SCENARIOS = [
  'last_seat_race',
  'duplicate_booking',
  'overbooking_guard',
  'payment_failure',
] as const;
