# Ottodot Trial Booking Reliability — Production Architecture & Design Specification

**Date:** 2026-09-24  
**Repository:** `./trial-booking-reliability`  
**Classification:** Architectural (`brainstorming` → `frontend-design` → `lavish` → `writing-plans`)

---

## 1. Executive Summary & Problem Statement

Ottodot runs live online Science and Math classes for children, strictly capped at **4 students per trial class**. Parents book and pay for trial classes self-serve, while teachers and operations teams require an accurate, uncorrupted class roster before class starts.

This design specifies a production-grade TypeScript monorepo (`@trial-booking/server`, `@trial-booking/dashboard`, `@trial-booking/shared`, `@trial-booking/api-client`) that guarantees:
1. **Zero duplicate confirmed bookings** for the same child and trial class (`studentId + trialClassId`).
2. **Zero overbooking beyond 4 confirmed students** per trial class (`confirmedCount <= 4`).
3. **Strict payment isolation**: failed payments record a `payment_attempts` audit row and transition the booking to `payment_failed` without ever adding the student to the confirmed roster.
4. **Deterministic Last-Seat Race Resolution**: when User A and User B both enter checkout (`pending_payment`) for the 4th (last) seat of a class, and User B completes payment first (`confirmed`), User A's subsequent payment attempt is atomically rejected with `409 Conflict (LAST_SEAT_RACE_LOST)`, transitioning User A's booking to `expired_conflict` and aborting payment capture (`Rp 0` charged).

---

## 2. Frontend-Design Token System & UX Flow

### 2.1 Visual Identity & Typography (`frontend-design`)
- **Subject & Persona:** Precision EdTech Self-Serve Booking & Live Classroom Operations Telemetry.
- **Color Palette (High-Contrast WCAG AA, no `text-gray-400` or washed-out muted text; minimum secondary text is `text-slate-500`):**
  - `Cobalt Primary` (`#1D4ED8` / `bg-blue-700`): Primary interactive controls, selected seat indicator, active step.
  - `Emerald Confirmed` (`#047857` / `bg-emerald-700`): Verified `confirmed` seats and roster badges.
  - `Amber Pending` (`#B45309` / `bg-amber-600`): Active `pending_payment` checkout holds.
  - `Crimson Conflict` (`#BE123C` / `bg-rose-700`): `expired_conflict` (Last-Seat Race lost) and `payment_failed` alerts.
  - `Obsidian Ink` (`#0F172A` / `text-slate-900`): High-contrast primary typography.
- **Signature Component:**
  - **Traveloka-Style 4-Seat Classroom Grid + Active Pending Checkouts Dock**: Parents select a parent account, pick a child, and select an explicit seat (`Seat #1`..`Seat #4`) in a visual 4-desk layout. If a parent starts checkout and leaves it in `pending_payment`, the session docks into the **Active Pending Checkouts Switcher**, enabling seamless shopper switching (e.g., switching to Parent B, buying Seat #4, and then clicking "Complete Payment" on Parent A's docked checkout to trigger and observe the real `409 Conflict` e-commerce flow).

### 2.2 Four Production Views (`@trial-booking/dashboard`)
1. **Self-Serve Trial Booking (`/`)**:
   - Step 1: Select Parent & Child (displays existing enrollments to prevent duplicate bookings).
   - Step 2: Select Trial Class & Classroom Seat (`1..4` visual grid with live occupancy).
   - Step 3: Checkout & Payment Execution (`Pay & Confirm Now`, `Hold Checkout (Pending Payment)`, `Simulate Declined Card`).
   - Right-rail **Active Pending Checkouts Dock** to resume or complete any pending shopper session.
2. **Teacher & Ops Class Roster (`/roster`)**:
   - Displays verified `confirmed` students per class (`0/4` to `4/4` progress bar, seat number, parent contact, payment reference).
   - Includes a separate collapsible **Unconfirmed / Conflict / Failed Attempts** section so teachers see a clean roster while Ops has full visibility.
3. **Paginated Booking & Payment History (`/history`)**:
   - Server-paginated (`page`, `limit`, `status`, `trialClassId`, `parentId`) audit ledger of all bookings and nested `payment_attempts`.
4. **Production Flow State-Transition Simulator (`/simulator`)**:
   - Executes real production service sequences (`last_seat_race`, `duplicate_booking`, `overbooking_guard`, `payment_failure`) against the backend engine and renders the step-by-step state transitions (`pending_payment` → `confirmed` vs `expired_conflict` / `payment_failed`).

---

## 3. Data Model & State Machine (`@trial-booking/shared`)

### 3.1 Entities
- **`Parent`**: `id`, `name`, `email`, `phone`
- **`Student`**: `id`, `parentId`, `name`, `age`, `gradeLevel`
- **`TrialClass`**: `id`, `title`, `subject` (`Math` | `Science`), `gradeRange`, `teacherName`, `scheduledAt`, `durationMinutes`, `priceIdr`, `maxCapacity` (`4`)
- **`Booking`**:
  - `id`, `parentId`, `studentId`, `trialClassId`, `seatNumber` (`1 | 2 | 3 | 4`)
  - `status`: `'pending_payment' | 'confirmed' | 'payment_failed' | 'expired_conflict' | 'cancelled'`
  - `conflictReason`: `'LAST_SEAT_RACE_LOST' | 'DUPLICATE_CONFIRMED_BOOKING' | 'CLASS_CAPACITY_EXCEEDED' | null`
  - `conflictingBookingId`: `string | null`
  - `version`: `number` (optimistic concurrency version counter)
  - `createdAt`, `updatedAt`, `confirmedAt`
- **`PaymentAttempt`**:
  - `id`, `bookingId`, `amountIdr`, `method` (`card_visa_4242` | `card_declined_0002` | `qris_instant`)
  - `status`: `'succeeded' | 'failed' | 'aborted_conflict'`
  - `errorCode`: `string | null`, `message`: `string`, `createdAt`

### 3.2 Why Optimistic Checkout + Atomic Payment Confirmation (Tradeoffs)
- **Chosen Approach:** Checkout creates a `pending_payment` intent without hard-locking the seat away from other parents; the seat and class capacity (`< 4`) are atomically enforced at payment confirmation time (`POST /api/bookings/:id/pay`).
- **Why Chosen:** In high-intent trial funnels, hard-locking a seat on `pending_payment` allows abandoned carts or malicious actors to starve a 4-seat class for 10–15 minutes. Optimistic checkout with an atomic confirmation gate guarantees 100% seat utilization while strictly preventing overbooking (`confirmed <= 4`) and aborting payment capture if the last seat was taken milliseconds earlier.
- **Tradeoff Accepted:** A slower shopper (User A) who lingers on the payment page while User B completes payment for the 4th seat experiences a checkout conflict (`409 LAST_SEAT_RACE_LOST`) upon clicking Pay, requiring an immediate payment abort/void and a prompt to pick another class schedule.

---

## 4. Security Hardening & 3-Way Deployment

1. **Application-Layer Rate Limiting & Burst Throttling (`apps/server/src/middleware/rate-limit.ts`)**:
   - Sliding-window + burst limiter per client IP (`CF-Connecting-IP` / `X-Forwarded-For`) with separate budgets for read endpoints (`120 req/min`) and mutating booking/payment endpoints (`25 req/min`), emitting `X-RateLimit-*` and `Retry-After` headers.
2. **Security Headers & Input Validation (`apps/server/src/middleware/security.ts`)**:
   - Strict CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, HSTS, strict CORS origin validation, and Zod schema validation on all route params, queries, and JSON bodies.
3. **3 Execution Modes**:
   - **Bare Local**: `pnpm dev` (runs `@trial-booking/server` on port `24001` and `@trial-booking/dashboard` on port `24002` with `/api/**` proxy).
   - **Docker Compose**: Multi-stage cached `Dockerfile` + `docker-compose.yml`.
   - **Cloudflare Workers**:
     - `trial-booking-dashboard` on `trial-booking-reliability.irfankurniawan.com`
     - `trial-booking-server` on `trial-booking-reliability.irfankurniawan.com/api/*`
