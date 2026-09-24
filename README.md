# Ottodot Trial Booking Reliability (`./trial-booking-reliability`)

Production-grade full-stack implementation of the **Ottodot Senior Full-Stack Engineer Take-Home Assignment (Trial Booking Reliability)**. Built as a strict TypeScript monorepo (`Turborepo + pnpm workspaces`) featuring a **Hono RPC backend** (`@trial-booking/server`), **shared Zod domain contracts** (`@trial-booking/shared`), **type-safe RPC client** (`@trial-booking/api-client`), and **Nuxt 4 + Nuxt UI v4 + Pinia frontend** (`@trial-booking/dashboard`).

---

## 1. Quick Start — How to Run the Solution (3 Supported Ways)

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

Configured via [`apps/server/wrangler.jsonc`](file:///home/vincent/backupirfanhehe/Downloads/workspaces/personal/trial-booking-reliability/apps/server/wrangler.jsonc) and [`apps/dashboard/wrangler.jsonc`](file:///home/vincent/backupirfanhehe/Downloads/workspaces/personal/trial-booking-reliability/apps/dashboard/wrangler.jsonc) using same-origin route specificity on `trial-booking-reliability.irfankurniawan.com`:

- **Frontend Worker (`trial-booking-dashboard`)**: `trial-booking-reliability.irfankurniawan.com`
- **Backend Worker (`trial-booking-server`)**: `trial-booking-reliability.irfankurniawan.com/api/*`

```bash
# Deploy Backend Worker
pnpm --filter @trial-booking/server exec wrangler deploy

# Build & Deploy Frontend Worker
pnpm --filter @trial-booking/dashboard build
pnpm --filter @trial-booking/dashboard exec wrangler deploy
```

---

## 2. What Was Built

We implemented **trial class booking only** (deliberately excluding recurring enrollment) across 4 focused operational screens in `@trial-booking/dashboard`:

1. **Book Trial Class (`/`) — Traveloka-Style Seat Checkout & Multi-Shopper Pending Dock**:
   - Parents choose their parent account, pick a child, select a trial class, and pick an explicit classroom seat (`Seat 1` to `Seat 4`).
   - Three checkout execution modes:
     - **Pay & Confirm (`Rp 75.000`)**: Immediately runs checkout + payment confirmation.
     - **Hold in Pending Checkout**: Creates a `pending_payment` checkout and pins it to the **Pending Checkouts** dock on the right. You can switch to another Parent & Child, buy the same last seat (`Seat 4`), and then click **Complete Payment** on the first parent's pending card to experience the exact **`409 LAST_SEAT_RACE_LOST`** checkout conflict in real time.
     - **Simulate Card Decline**: Records a failed `PaymentAttempt` (`CARD_DECLINED`), transitions the booking to `payment_failed`, and guarantees the student is **never** added to the confirmed roster.
2. **Class Roster (`/roster`) — Teacher & Ops Verified Roster**:
   - Shows the live `confirmed` student roster (`<= 4` capacity bar) for each class alongside a separate **Excluded Attempts (`Not on Roster`)** audit panel (`expired_conflict` and `payment_failed` records).
3. **Booking History (`/history`) — Server-Paginated Audit Ledger**:
   - Paginated table (`page`, `limit`, status filter, class filter) showing every booking and its latest payment attempt outcome.
4. **Edge-Case State Simulator (`/simulator`) — Production Flow Telemetry**:
   - Executes the real production `BookingEngine` methods for the 4 critical scenarios (`1. Last-Seat Race (Seat 4)`, `2. Duplicate Child + Class`, `3. Overbooking (>4 Cap)`, `4. Payment Card Decline`) and renders step-by-step HTTP status codes, booking status transitions, and live roster counts.

---

## 3. Seed Data & Pre-Configured Edge Cases

Defined in [`apps/server/src/seed.ts`](file:///home/vincent/backupirfanhehe/Downloads/workspaces/personal/trial-booking-reliability/apps/server/src/seed.ts) (can be reset at any time via the **Reset Data** button in the top navbar or `POST /api/reset`):

| Class ID             | Class Title                                              | Initial Confirmed Roster                                                                           | Edge Case Demonstrated                                                                                                                                                                                               |
| :------------------- | :------------------------------------------------------- | :------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cls-math-fractions` | **Visual Fractions & Ratios Lab** (Grade 4 Math)         | **3 / 4 Confirmed** (`Seat 1, 2, 3` taken; **`Seat 4` open** + 1 pending checkout by `Arka Rahma`) | **Last-Seat Race Condition**: Seat 4 is the last slot. Select `Budi Santoso` -> `Dina Santoso` -> `Seat 4` -> click **Pay & Confirm**, then click **Complete Payment** on Arka's pending checkout in the right dock. |
| `cls-sci-orbit`      | **Planetary Orbits & Gravity Physics** (Grade 5 Science) | **1 / 4 Confirmed** (`Dina Santoso` in `Seat 1`) + 1 `payment_failed` (`Nadia Rahma`)              | **Available Seats**, **Duplicate Child + Class Prevention** (try booking `Dina Santoso` again into this class -> `409 DUPLICATE_CONFIRMED_BOOKING`), and **Payment Failure Isolation**.                              |
| `cls-math-logic`     | **Algorithmic Puzzles & Game Logic** (Grade 3–4 Math)    | **4 / 4 Confirmed** (`Full Capacity`)                                                              | **Overbooking Guard**: Any booking attempt immediately returns `409 CLASS_CAPACITY_EXCEEDED`.                                                                                                                        |

---

## 4. Backend Design & Concurrency Architecture

### 4.1 Data Model (`packages/shared/src/schemas.ts`)

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

### 4.2 Key API Endpoints (`apps/server/src/index.ts`)

| Method & Path                 | Purpose                                                                                                        |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------- |
| `GET /api/catalog`            | Returns parents, students, trial classes with 4-seat occupancy states, and active `pending_payment` checkouts. |
| `POST /api/bookings/checkout` | Validates parent/student/class invariants and creates (or resumes) a `pending_payment` checkout intent.        |
| `POST /api/bookings/submit`   | Unified checkout + payment action (`pay_success`, `pay_fail`, or `hold_pending`).                              |
| `POST /api/bookings/:id/pay`  | Executes the atomic payment confirmation critical section for an existing `pending_payment` booking.           |
| `GET /api/rosters`            | Returns each class's verified `confirmed` roster (`<= 4`) and excluded non-roster attempts.                    |
| `GET /api/bookings`           | Server-paginated booking and payment attempt history with status and class filters.                            |
| `POST /api/simulator/run`     | Runs deterministic multi-step edge-case scenarios against the production `BookingEngine`.                      |
| `POST /api/reset`             | Resets the in-memory store back to the initial deterministic seed snapshot.                                    |

### 4.3 Required Technical Scenario: Last-Seat Race Condition

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

### 4.4 Where Each Check Belongs Across the Stack

| Layer                                 | Responsibility                                                                                                                                                                                                                                                                                                                                                           |
| :------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI (`@trial-booking/dashboard`)**   | Disables already-confirmed seats in `ClassroomSeatPicker.vue`, validates required fields via Zod + `UForm`, and renders actionable `409 Conflict` / `402 Payment Declined` alerts. Never trusted for security or capacity enforcement.                                                                                                                                   |
| **Backend (`@trial-booking/server`)** | Enforces rate limiting (`rate-limit.ts`), Zod request schema validation, parent-student ownership check, atomic critical-section execution (`runAtomic`), payment pre-auth/capture orchestration, and `payment_attempts` audit logging.                                                                                                                                  |
| **Database (Production SQL Target)**  | Enforces hard structural constraints: partial unique index `CREATE UNIQUE INDEX uniq_confirmed_student_class ON bookings (student_id, trial_class_id) WHERE status = 'confirmed'`, partial unique index on `(trial_class_id, seat_number) WHERE status = 'confirmed'`, and row-level locking (`SELECT id, confirmed_count FROM trial_classes WHERE id = $1 FOR UPDATE`). |
| **Background Job / Cron**             | Sweeps stale `pending_payment` checkouts older than TTL (e.g., 15 minutes) to `cancelled` and reconciles any orphaned payment gateway webhooks.                                                                                                                                                                                                                          |

---

## 5. Time Spent, Assumptions, Scope Cuts & Post-Release Plan

- **Time Spent**: ~3.5 hours total:
  - 0.5h: Domain modeling, concurrency tradeoff analysis, and Lavish UI component design.
  - 1.5h: Hono RPC backend, atomic booking engine, application-layer rate limiter, and Vitest concurrency test suite.
  - 1.0h: Nuxt 4 + Nuxt UI v4 checkout flow, Pending Checkouts dock, Roster, Paginated History, and Simulator.
  - 0.5h: Multi-stage Docker Compose, Cloudflare Wrangler configs, `README.md`, and `AI_USAGE.md`.
- **Assumptions Made**:
  - Parents can have multiple children (`Budi Santoso` has `Dina` and `Raka`); duplicate prevention applies per `(studentId, trialClassId)` so a parent can still book a _different_ sibling into the same class if seats are available.
  - A student with a `payment_failed` booking is allowed to retry payment (or another parent can claim the seat in the meantime) because `payment_failed` does not hold a confirmed roster spot.
- **What Was Deliberately Cut**:
  - Recurring weekly enrollment & subscription billing (explicitly out of scope).
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
