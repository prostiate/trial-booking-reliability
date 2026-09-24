# Ottodot Trial Booking Reliability (`./trial-booking-reliability`)

Production-grade full-stack implementation of the **Ottodot Senior Full-Stack Engineer Take-Home Assignment ([`docs/ASSIGNMENT.md`](./docs/ASSIGNMENT.md))**. Built as a strict TypeScript monorepo (`Turborepo + pnpm workspaces`) featuring a **Hono RPC backend** (`@trial-booking/server`), **shared Zod domain contracts** (`@trial-booking/shared`), **type-safe RPC client** (`@trial-booking/api-client`), and **Nuxt 4 + Nuxt UI v4 + Pinia frontend** (`@trial-booking/dashboard`).

- **Live Production Deployment**: [https://trial-booking-reliability.irfankurniawan.com](https://trial-booking-reliability.irfankurniawan.com)
- **Official Assignment Specification**: [`docs/ASSIGNMENT.md`](./docs/ASSIGNMENT.md)
- **AI Engineering & Verification Reflection**: [`AI_USAGE.md`](./AI_USAGE.md)
- **Video Walkthrough Script**: [`docs/VIDEO_WALKTHROUGH_SCRIPT.md`](./docs/VIDEO_WALKTHROUGH_SCRIPT.md)

---

## 1. Assignment Technical Requirements & Verification Matrix

Every requirement from [`docs/ASSIGNMENT.md`](./docs/ASSIGNMENT.md) is satisfied and verified by automated unit + concurrency tests in [`apps/server/tests/booking-reliability.test.ts`](./apps/server/tests/booking-reliability.test.ts):

| #      | Official Assignment Requirement (`docs/ASSIGNMENT.md`)                                              | Status | Where It Is Implemented & Verified                                                                                                                                                                                                                            |
| :----- | :-------------------------------------------------------------------------------------------------- | :----: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1**  | **Parent selects a child and picks an available trial class**                                       | ✅ Met | [`apps/dashboard/app/pages/index.vue`](./apps/dashboard/app/pages/index.vue), [`ClassroomSeatPicker.vue`](./apps/dashboard/app/components/ClassroomSeatPicker.vue), `GET /api/catalog`                                                                        |
| **2**  | **Parent submits a trial booking (`Confirm Seat` -> `Pending Checkouts`)**                          | ✅ Met | `POST /api/bookings/checkout` & `POST /api/bookings/submit` in [`booking-engine.ts`](./apps/server/src/booking-engine.ts)                                                                                                                                     |
| **3**  | **Mock payment step or payment result recorded (`payment_attempts`)**                               | ✅ Met | `POST /api/bookings/:id/pay` (`Visa •••• 4242` success vs `Card •••• 0002` decline) recording immutable `PaymentAttempt` audit entries                                                                                                                        |
| **4**  | **Booking status shown clearly after submission**                                                   | ✅ Met | Top high-contrast outcome alert banner on `/` ([`index.vue`](./apps/dashboard/app/pages/index.vue)) + [`BookingStatusBadge.vue`](./apps/dashboard/app/components/BookingStatusBadge.vue)                                                                      |
| **5**  | **Admin or teacher sees the trial class roster (`<= 4` students)**                                  | ✅ Met | `/roster` ([`roster.vue`](./apps/dashboard/app/pages/roster.vue)) & `GET /api/rosters` showing verified `confirmed` roster vs `Excluded Attempts (Not on Roster)`                                                                                             |
| **6**  | **Prevent duplicate confirmed bookings (`same child + same class`)**                                | ✅ Met | Enforced in `createCheckoutIntent` & `processPayment` (`409 DUPLICATE_CONFIRMED_BOOKING`). Tested in `booking-reliability.test.ts`                                                                                                                            |
| **7**  | **Prevent overbooking beyond `MAX_CLASS_CAPACITY = 4` confirmed students**                          | ✅ Met | Enforced inside `store.runAtomic()` mutex critical section (`409 CLASS_CAPACITY_EXCEEDED`). Tested in `booking-reliability.test.ts`                                                                                                                           |
| **8**  | **Handle payment failure without adding child to confirmed roster**                                 | ✅ Met | Transitions booking to `payment_failed` (`402 PAYMENT_DECLINED`) and keeps `confirmedCount` unchanged. Tested in `booking-reliability.test.ts`                                                                                                                |
| **9**  | **Handle Last-Seat Race Condition (`User A holds slot -> User B pays first -> User A rejected`)**   | ✅ Met | Atomic confirmation check (`store.runAtomic`): User B transitions to `confirmed` (`4/4`), User A receives `409 LAST_SEAT_RACE_LOST` (`expired_conflict`, `Rp 0` charged). Tested sequentially & via concurrent `Promise.all` in `booking-reliability.test.ts` |
| **10** | **Seed data covering open seats, 3/4 confirmed (last seat), 4/4 full, duplicate & payment failure** | ✅ Met | [`apps/server/src/seed.ts`](./apps/server/src/seed.ts) + 1-click `POST /api/reset` (`Reset Data` button in header)                                                                                                                                            |

---

## 2. What We Extended Beyond the Core Assignment

In addition to fulfilling 100% of the core assignment requirements, we extended the solution with production-grade operational features:

1. **Two-Step Seat Selection $\rightarrow$ Class-Scoped `Pending Checkouts` Dock (`/`)**:
   - Selecting a Parent, Child, Class, and Seat (`Seat 1..4`) and clicking **`Confirm Seat`** places the checkout into **`Pending Checkouts`**, filtered dynamically to show **only pending checkouts for the currently selected trial class** (`selectedClassPendingCheckouts`).
   - Each pending checkout card displays its **complete millisecond timestamp (`YYYY-MM-DD HH:mm:ss.SSS`)** and is sorted **Latest DESC** (`createdAt` descending with sequence ID tie-breaker).
   - Individual **`Pay`** and **`Cancel`** (`POST /api/bookings/:id/cancel`) buttons on every pending checkout card.
2. **Real-Time Concurrent `Pay All` (`Promise.all`) & `Cancel All` Race Trigger**:
   - Clicking **`Pay All (N)`** dispatches real concurrent `POST /api/bookings/:id/pay` HTTP requests via `Promise.all` at the current millisecond timestamp.
   - **Why this makes the Last-Seat Race 100% real**: Holding a seat (`createdAt`) does not lock the seat. Because `Pending Checkouts` is ordered **Latest DESC**, when User A (`Arka Rahma`, who held Seat #4 earlier at `09:00:00.418`) and User B (`Dina Santoso`, who selected Seat #4 later) are both in `Pending Checkouts`, clicking **`Pay All (2)`** fires both payment requests at the current time. User B's payment enters the backend `runAtomic()` mutex first and wins Seat #4 (`200 CONFIRMED`), while User A's payment arrives milliseconds later and is rejected with **`409 LAST_SEAT_RACE_LOST` (`Rp 0` charged)**.
   - The top alert banner above the Parent & Child inputs displays both `Hold Created` and `Payment Executed` millisecond timestamps for every item in the batch.
3. **Live Trial Class Creation (`+ Add Class` on `/roster`)**:
   - Admins/teachers can create new 4-seat trial classes (`POST /api/classes`) directly from `/roster`, which immediately sync to the `/` seat picker catalog.
4. **Excluded Attempts (`Not on Roster`) Audit Panel (`/roster`)**:
   - Explicitly separates the teacher's verified `confirmed` roster (`<= 4` students) from non-roster attempts (`pending_payment`, `payment_failed`, `expired_conflict`, `cancelled`) so Ops and reviewers can verify that failed payments and race losers never pollute the live class roster.
5. **Server-Paginated Audit Ledger (`/history`) with Configurable Page Size (Default `100`)**:
   - Supports page size selection (`10`, `25`, `50`, `100`, `200` rows per page, defaulting to `100`) plus status and class filtering.
6. **End-to-End Hono RPC Type Safety (`hc<AppType>`) & Application-Layer Security Hardening**:
   - Zero `any` across all 4 workspace packages, sliding-window IP rate limiter + burst throttle (`429 Too Many Requests`), strict HTTP security headers (`CSP`, `X-Frame-Options`, `X-Content-Type-Options`), and `.githooks/pre-push` verification gate.

---

## 3. Quick Start — How to Run the Solution (3 Supported Ways)

### Option A: Bare Local Development (`pnpm dev`) — Recommended for Fast Review

Requires **Node.js >= 22** and **pnpm >= 10**.

```bash
# 1. Install dependencies across all workspace packages
pnpm install

# 2. Start both Backend (http://localhost:24001) and Frontend (http://localhost:24002)
pnpm dev
```

- **Frontend Dashboard**: [http://localhost:24002](http://localhost:24002)
- **Backend API Health**: [http://localhost:24001/api/health](http://localhost:24001/api/health)

```bash
# Run the full verification pipeline (Prettier + ESLint + Typecheck + Vitest Concurrency Suite)
pnpm verify && pnpm test
```

---

### Option B: Docker Compose (Multi-Stage Cached Build)

Runs the production Hono server container (`24001`) and Nuxt Nitro node-server container (`24002`):

```bash
# Build and start containers in the background
docker compose up --build -d

# View container logs
docker compose logs -f

# Stop containers
docker compose down
```

Open [http://localhost:24002](http://localhost:24002).

---

### Option C: Cloudflare Workers (2 Workers: Frontend + Backend API)

Configured via [`apps/server/wrangler.jsonc`](./apps/server/wrangler.jsonc) and [`apps/dashboard/wrangler.jsonc`](./apps/dashboard/wrangler.jsonc) using same-origin route specificity on `https://trial-booking-reliability.irfankurniawan.com`:

- **Frontend Worker (`trial-booking-dashboard`)**: `trial-booking-reliability.irfankurniawan.com`
- **Backend Worker (`trial-booking-server`)**: `trial-booking-reliability.irfankurniawan.com/api/*`

---

## 4. Seed Data & Pre-Configured Edge Cases

Defined in [`apps/server/src/seed.ts`](./apps/server/src/seed.ts) (can be reset at any time via the **Reset Data** button in the top navbar or `POST /api/reset`):

| Class ID             | Class Title                                              | Initial Confirmed Roster                                                                           | Edge Case Demonstrated                                                                                                                                                                                            |
| :------------------- | :------------------------------------------------------- | :------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cls-math-fractions` | **Visual Fractions & Ratios Lab** (Grade 4 Math)         | **3 / 4 Confirmed** (`Seat 1, 2, 3` taken; **`Seat 4` open** + 1 pending checkout by `Arka Rahma`) | **Last-Seat Race Condition**: Seat 4 is the last slot. Select `Budi Santoso` -> `Dina Santoso` -> `Seat 4` -> click **Confirm Seat**, then click **Pay All (2)** in `Pending Checkouts` to trigger the live race! |
| `cls-sci-orbit`      | **Planetary Orbits & Gravity Physics** (Grade 5 Science) | **1 / 4 Confirmed** (`Dina Santoso` in `Seat 1`) + 1 `payment_failed` (`Nadia Rahma`)              | **Available Seats**, **Duplicate Child + Class Prevention** (try booking `Dina Santoso` again into this class -> `409 DUPLICATE_CONFIRMED_BOOKING`), and **Payment Failure Isolation**.                           |
| `cls-math-logic`     | **Algorithmic Puzzles & Game Logic** (Grade 3–4 Math)    | **4 / 4 Confirmed** (`Full Capacity`)                                                              | **Overbooking Guard**: Any booking attempt immediately returns `409 CLASS_CAPACITY_EXCEEDED`.                                                                                                                     |

---

## 5. Backend Design & Concurrency Architecture

### 5.1 Data Model (`packages/shared/src/schemas.ts`)

- **`Parent`**: `id`, `name`, `email`, `phone`
- **`Student`**: `id`, `parentId`, `name`, `age`, `gradeLevel`
- **`TrialClass`**: `id`, `title`, `subject` (`Math` | `Science`), `gradeRange`, `teacherName`, `scheduledAt`, `durationMinutes`, `priceIdr`, `maxCapacity` (`4`)
- **`BookingRecord`**:
  - `id`, `parentId`, `studentId`, `trialClassId`, `seatNumber` (`1..4`)
  - `status`: `'pending_payment' | 'confirmed' | 'payment_failed' | 'expired_conflict' | 'cancelled'`
  - `conflictReason`: `'LAST_SEAT_RACE_LOST' | 'DUPLICATE_CONFIRMED_BOOKING' | 'CLASS_CAPACITY_EXCEEDED' | 'PAYMENT_DECLINED' | null`
  - `conflictingBookingId`: `string | null`, `version`: `number`, `createdAt`, `updatedAt`, `confirmedAt`
- **`PaymentAttempt`**:
  - `id`, `bookingId`, `amountIdr`, `method`, `status` (`'succeeded' | 'failed' | 'aborted_conflict'`), `errorCode`, `message`, `createdAt`

### 5.2 Key API Endpoints (`apps/server/src/index.ts`)

| Method & Path                   | Purpose                                                                                                        |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------- |
| `GET /api/catalog`              | Returns parents, students, trial classes with 4-seat occupancy states, and active `pending_payment` checkouts. |
| `POST /api/classes`             | Creates a new 4-seat `TrialClass` in the catalog (`+ Add Class` on `/roster`).                                 |
| `POST /api/bookings/checkout`   | Validates parent/student/class invariants and creates (or updates) a `pending_payment` checkout intent.        |
| `POST /api/bookings/submit`     | Unified checkout + payment action (`pay_success`, `pay_fail`, or `hold_pending`).                              |
| `POST /api/bookings/:id/pay`    | Executes the atomic payment confirmation critical section for an existing `pending_payment` booking.           |
| `POST /api/bookings/:id/cancel` | Cancels an active `pending_payment` checkout (`status = 'cancelled'`).                                         |
| `GET /api/rosters`              | Returns each class's verified `confirmed` roster (`<= 4`) and excluded non-roster attempts.                    |
| `GET /api/bookings`             | Server-paginated booking and payment attempt history with configurable `limit` (default `100`) and filters.    |
| `POST /api/reset`               | Resets the in-memory store back to the initial deterministic seed snapshot.                                    |

### 5.3 Required Technical Scenario: Last-Seat Race Condition

**Scenario:**

1. Class `cls-math-fractions` has **3 confirmed students** (`Seat 1, 2, 3`). Only **`Seat 4`** remains.
2. **User A (`Arka Rahma`)** selects `Seat 4` and enters checkout (`status = 'pending_payment'`).
3. **User B (`Dina Santoso`)** also selects `Seat 4` and enters checkout (`status = 'pending_payment'`).
4. **User B** completes payment first -> `BookingEngine.processPayment` runs inside `store.runAtomic(...)`, verifies `confirmedCount === 3 < 4` and `Seat 4` is unconfirmed, records a `succeeded` payment attempt (`Rp 75.000`), and transitions User B to `confirmed`. The class is now **`4 / 4 Full`**.
5. **User A** then submits payment -> Inside `store.runAtomic(...)`, the engine detects `confirmedCount === 4` (and `Seat 4` is now occupied by User B). It aborts payment capture (`PaymentAttempt.status = 'aborted_conflict'`, `amountIdr = 0`), transitions User A's booking to `expired_conflict` (`conflictReason = 'LAST_SEAT_RACE_LOST'`), and returns HTTP `409 Conflict`.

- **Why We Chose Optimistic Checkout + Atomic Confirmation Gate**:
  Hard-locking the 4th seat when User A merely opens the payment screen (`pending_payment`) allows cart abandoners or slow shoppers to block high-intent parents for 10–15 minutes in a tiny 4-student classroom. By allowing concurrent `pending_payment` checkouts and enforcing a strict atomic serialization gate at payment confirmation time (`runAtomic` in memory / `SELECT ... FOR UPDATE` + unique partial index in PostgreSQL), seat utilization is maximized while guaranteeing **at most 1 user wins the 4th seat** and the runner-up is never charged (`Rp 0`).
- **Tradeoffs Accepted**:
  A slower shopper (User A) who stays on the payment page while User B pays for the final seat experiences a `409 Conflict` when clicking Pay. In production with an external gateway (e.g., Stripe/Midtrans), this requires using a two-phase **Pre-Authorization (`capture_method: 'manual'`)** so the hold can be voided immediately if the atomic seat confirmation check fails.

### 5.4 Where Each Check Belongs Across the Stack

| Layer                                 | Responsibility                                                                                                                                                                                                                                                                                                                                                           |
| :------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI (`@trial-booking/dashboard`)**   | Disables already-confirmed seats in `ClassroomSeatPicker.vue`, validates required fields via Zod + `UForm`, and renders actionable `409 Conflict` / `402 Payment Declined` alerts. Never trusted for security or capacity enforcement.                                                                                                                                   |
| **Backend (`@trial-booking/server`)** | Enforces rate limiting (`rate-limit.ts`), Zod request schema validation, parent-student ownership check, atomic critical-section execution (`runAtomic`), payment pre-auth/capture orchestration, and `payment_attempts` audit logging.                                                                                                                                  |
| **Database (Production SQL Target)**  | Enforces hard structural constraints: partial unique index `CREATE UNIQUE INDEX uniq_confirmed_student_class ON bookings (student_id, trial_class_id) WHERE status = 'confirmed'`, partial unique index on `(trial_class_id, seat_number) WHERE status = 'confirmed'`, and row-level locking (`SELECT id, confirmed_count FROM trial_classes WHERE id = $1 FOR UPDATE`). |
| **Background Job / Cron**             | Sweeps stale `pending_payment` checkouts older than TTL (e.g., 15 minutes) to `cancelled` and reconciles any orphaned payment gateway webhooks.                                                                                                                                                                                                                          |

---

## 6. Time Spent, Assumptions, Scope Cuts & Post-Release Plan

- **Time Spent**: ~3.5 hours total:
  - 0.5h: Domain modeling, concurrency tradeoff analysis, and UI architecture.
  - 1.5h: Hono RPC backend, atomic booking engine, application-layer rate limiter, and Vitest concurrency test suite.
  - 1.0h: Nuxt 4 + Nuxt UI v4 checkout flow, Pending Checkouts dock, Roster, Paginated History, and Simulator.
  - 0.5h: Multi-stage Docker Compose, Cloudflare Wrangler configs, `README.md`, `docs/ASSIGNMENT.md`, and `AI_USAGE.md`.
- **Assumptions Made**:
  - Parents can have multiple children (`Budi Santoso` has `Dina` and `Raka`); duplicate prevention applies per `(studentId, trialClassId)` so a parent can still book a _different_ sibling into the same class if seats are available.
  - A student with a `payment_failed` booking is allowed to retry payment (or another parent can claim the seat in the meantime) because `payment_failed` does not hold a confirmed roster spot.
- **What Was Deliberately Cut**:
  - Recurring weekly enrollment & subscription billing (explicitly out of scope per `docs/ASSIGNMENT.md`).
  - External database container (used deterministic in-memory store with mutex locking and `POST /api/reset` for zero-setup reproducibility).
  - Real payment gateway SDK redirects (modeled via deterministic payment outcomes and `payment_attempts` audit records).
- **What We Would Monitor After Release**:
  1. **Invariant Violation Alert (`P0`)**: Any class where `COUNT(bookings WHERE status = 'confirmed') > 4` or duplicate `(student_id, trial_class_id)` confirmed rows (must always be `0`).
  2. **Last-Seat Conflict Rate (`409 LAST_SEAT_RACE_LOST`)**: High rates signal we should spawn an additional parallel teacher section for that time slot.
  3. **Payment Failure & Retry Conversion Rate (`402 PAYMENT_DECLINED` -> `confirmed`)**: Tracks how many parents recover after a declined card.
  4. **Rate Limiter Triggers (`429 RATE_LIMIT_EXCEEDED`)**: Monitors bot/burst abuse on public booking endpoints.
- **What We Would Do Next With More Time**:
  1. Replace the in-memory store with **PostgreSQL (or Cloudflare Durable Objects per `trialClassId`)** using `SELECT ... FOR UPDATE` and partial unique indexes.
  2. Integrate **Stripe/Midtrans Manual Capture (`capture_method: 'manual'`)** so funds are authorized first, the seat is atomically locked in the DB, and the charge is captured only after the DB commit succeeds (or immediately voided on `409 LAST_SEAT_RACE_LOST`).
  3. Add an **automated 1-click Waitlist / Next-Slot suggestion** when a parent loses a last-seat race.
