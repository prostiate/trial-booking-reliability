import { z } from 'zod';
import {
  BOOKING_STATUSES,
  MAX_CLASS_CAPACITY,
  PAYMENT_ATTEMPT_STATUSES,
  PAYMENT_METHODS,
  SIMULATOR_SCENARIOS,
} from './constants';

export const SeatNumberSchema = z.number().int().min(1).max(MAX_CLASS_CAPACITY);
export type SeatNumber = z.infer<typeof SeatNumberSchema>;

export const BookingStatusSchema = z.enum(BOOKING_STATUSES);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const PaymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentAttemptStatusSchema = z.enum(PAYMENT_ATTEMPT_STATUSES);
export type PaymentAttemptStatus = z.infer<typeof PaymentAttemptStatusSchema>;

export const ParentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
});
export type Parent = z.infer<typeof ParentSchema>;

export const StudentSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().min(1),
  name: z.string().min(1),
  age: z.number().int().min(5).max(16),
  gradeLevel: z.string().min(1),
});
export type Student = z.infer<typeof StudentSchema>;

export const TrialClassSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subject: z.enum(['Math', 'Science']),
  gradeRange: z.string().min(1),
  teacherName: z.string().min(1),
  scheduledAt: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  priceIdr: z.number().int().nonnegative(),
  maxCapacity: z.literal(MAX_CLASS_CAPACITY),
});
export type TrialClass = z.infer<typeof TrialClassSchema>;

export const PaymentAttemptSchema = z.object({
  id: z.string().min(1),
  bookingId: z.string().min(1),
  amountIdr: z.number().int().nonnegative(),
  method: PaymentMethodSchema,
  status: PaymentAttemptStatusSchema,
  errorCode: z.string().nullable(),
  message: z.string(),
  createdAt: z.string(),
});
export type PaymentAttempt = z.infer<typeof PaymentAttemptSchema>;

export const BookingRecordSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().min(1),
  studentId: z.string().min(1),
  trialClassId: z.string().min(1),
  seatNumber: SeatNumberSchema,
  status: BookingStatusSchema,
  conflictReason: z.string().nullable(),
  conflictingBookingId: z.string().nullable(),
  version: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  confirmedAt: z.string().nullable(),
});
export type BookingRecord = z.infer<typeof BookingRecordSchema>;

export const EnrichedBookingSchema = BookingRecordSchema.extend({
  parentName: z.string(),
  parentEmail: z.string(),
  studentName: z.string(),
  studentGrade: z.string(),
  classTitle: z.string(),
  classSubject: z.enum(['Math', 'Science']),
  teacherName: z.string(),
  scheduledAt: z.string(),
  priceIdr: z.number().int(),
  paymentAttempts: z.array(PaymentAttemptSchema),
});
export type EnrichedBooking = z.infer<typeof EnrichedBookingSchema>;

export const SeatSlotStateSchema = z.object({
  seatNumber: SeatNumberSchema,
  isConfirmed: z.boolean(),
  confirmedStudentName: z.string().nullable(),
  confirmedBookingId: z.string().nullable(),
  pendingCheckoutCount: z.number().int().nonnegative(),
  pendingStudentNames: z.array(z.string()),
});
export type SeatSlotState = z.infer<typeof SeatSlotStateSchema>;

export const ClassCatalogItemSchema = TrialClassSchema.extend({
  confirmedCount: z.number().int().nonnegative(),
  availableSeatsCount: z.number().int().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  isFull: z.boolean(),
  seats: z.array(SeatSlotStateSchema),
});
export type ClassCatalogItem = z.infer<typeof ClassCatalogItemSchema>;

export const CreateCheckoutInputSchema = z.object({
  parentId: z.string().min(1, 'Please select a parent'),
  studentId: z.string().min(1, 'Please select a child'),
  trialClassId: z.string().min(1, 'Please select a trial class'),
  seatNumber: SeatNumberSchema,
});
export type CreateCheckoutInput = z.infer<typeof CreateCheckoutInputSchema>;

export const ProcessPaymentInputSchema = z.object({
  paymentOutcome: z.enum(['success', 'fail']),
  paymentMethod: PaymentMethodSchema.default('card_visa_4242'),
});
export type ProcessPaymentInput = z.infer<typeof ProcessPaymentInputSchema>;

export const CheckoutAndPayInputSchema = CreateCheckoutInputSchema.extend({
  action: z.enum(['pay_success', 'pay_fail', 'hold_pending']),
  paymentMethod: PaymentMethodSchema.optional(),
});
export type CheckoutAndPayInput = z.infer<typeof CheckoutAndPayInputSchema>;

export const CreateTrialClassInputSchema = z.object({
  title: z.string().min(3, 'Class title must be at least 3 characters'),
  subject: z.enum(['Math', 'Science']),
  gradeRange: z.string().min(1, 'Grade range is required'),
  teacherName: z.string().min(2, 'Teacher name is required'),
  scheduledAt: z.string().min(1, 'Schedule time is required'),
  durationMinutes: z.coerce.number().int().min(15).max(180).default(45),
  priceIdr: z.coerce.number().int().min(0).default(75000),
});
export type CreateTrialClassInput = z.infer<typeof CreateTrialClassInputSchema>;

export const BookingPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  status: z.enum(['all', ...BOOKING_STATUSES]).default('all'),
  trialClassId: z.string().default('all'),
  parentId: z.string().default('all'),
});
export type BookingPaginationQuery = z.infer<typeof BookingPaginationQuerySchema>;

export const SimulatorScenarioSchema = z.enum(SIMULATOR_SCENARIOS);
export type SimulatorScenario = z.infer<typeof SimulatorScenarioSchema>;

export const SimulatorRunInputSchema = z.object({
  scenario: SimulatorScenarioSchema,
  resetBeforeRun: z.boolean().default(true),
});
export type SimulatorRunInput = z.infer<typeof SimulatorRunInputSchema>;

export const SimulatorStepEventSchema = z.object({
  stepNumber: z.number().int().positive(),
  actor: z.string(),
  action: z.string(),
  endpoint: z.string(),
  httpStatus: z.number().int(),
  bookingId: z.string().nullable(),
  previousStatus: z.string().nullable(),
  nextStatus: z.string(),
  errorCode: z.string().nullable(),
  confirmedRosterCount: z.number().int(),
  maxCapacity: z.number().int(),
  summary: z.string(),
});
export type SimulatorStepEvent = z.infer<typeof SimulatorStepEventSchema>;
