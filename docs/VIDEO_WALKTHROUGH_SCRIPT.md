# 5–8 Minute Video Walkthrough Script (Human Deliverable Guide)

> **Human Responsibility:** Record a 5–8 minute screen share (Loom or unlisted YouTube) walking through the running application (`http://localhost:24002` or `https://trial-booking-reliability.irfankurniawan.com`) and your code.

---

## Minute 0:00 – 1:00 · Introduction & Scope Control

- "Hi Ottodot team, I'm Irfan. This is my walkthrough for the **Trial Booking Reliability** take-home assignment."
- "I scoped this strictly to **self-serve trial class booking** with a 4-student class cap (`MAX_CLASS_CAPACITY = 4`) and focused on backend correctness, concurrency safety, and clear operational visibility."
- "The project is a TypeScript monorepo (`@trial-booking/shared` for Zod schemas, `@trial-booking/server` for the Hono RPC backend & atomic booking engine, and `@trial-booking/dashboard` for the Nuxt 4 + Nuxt UI v4 interface)."

## Minute 1:00 – 3:00 · Live Demo of the Last-Seat Race Condition (Page 1: Book Trial)

- Open **`1. Book Trial` (`/`)**:
  1. Point out **Visual Fractions & Ratios Lab (`cls-math-fractions`)**, which is pre-seeded at **3 / 4 Confirmed** (`Seat 1, 2, 3` locked; **`Seat 4` is the last available seat**).
  2. Point out the right-hand **Pending Checkouts** dock: **User A (`Arka Rahma · Seat 4`)** already selected Seat 4 and is holding a `pending_payment` checkout (or click **Hold in Pending Checkout** to create one).
  3. Now act as **User B (`Budi Santoso` -> `Dina Santoso`)**: select **`Seat 4`** on the classroom grid and click **Pay & Confirm (Rp 75.000)**.
  4. Show that User B immediately succeeds (`200 · CONFIRMED`), and the class badge updates to **`4 / 4 Confirmed`**.
  5. Now go to the **Pending Checkouts** dock on the right and click **Complete Payment** on **User A (`Arka Rahma · Seat 4`)**.
  6. Show the red **`409 · LAST_SEAT_RACE_LOST`** alert: User A's booking transitions to `expired_conflict` and payment capture is aborted (`Rp 0` charged).

## Minute 3:00 – 4:30 · Duplicate Booking, Overbooking & Payment Failure + Class Roster

- Still on **`1. Book Trial`**:
  1. Switch to **Planetary Orbits & Gravity (`1 / 4 Confirmed`)** where `Dina Santoso` already holds `Seat 1`. Try booking `Dina Santoso` again into `Seat 2` -> show **`409 · DUPLICATE_CONFIRMED_BOOKING`**.
  2. Switch to `Raka Santoso` -> `Seat 2` -> click **Simulate Card Decline** -> show **`402 · PAYMENT_DECLINED`** (`status = payment_failed`).
- Click **`2. Class Roster` (`/roster`)**:
  - Show that **Visual Fractions & Ratios Lab** has strictly **4 / 4 Confirmed** students on the teacher's roster, while `Arka Rahma (expired_conflict)` and `Nadia/Raka (payment_failed)` appear only under **Excluded Attempts (Not on Roster)**.
- Click **`3. History` (`/history`)** and **`4. Simulator` (`/simulator`)**:
  - Briefly show the paginated audit log and click through the 4 simulator buttons (`1. Last-Seat Race`, `2. Duplicate Child + Class`, `3. Overbooking`, `4. Payment Card Decline`).

## Minute 4:30 – 6:30 · Code Walkthrough & Architectural Tradeoffs

- Open [`apps/server/src/booking-engine.ts`](../apps/server/src/booking-engine.ts) and [`apps/server/src/store.ts`](../apps/server/src/store.ts):
  - Explain `store.runAtomic(...)` (in-memory mutex critical section, which maps to `SELECT ... FOR UPDATE` + partial unique indexes `WHERE status = 'confirmed'` in PostgreSQL).
  - Explain **why** we chose **Optimistic Checkout (`pending_payment`) + Atomic Confirmation at Payment**: hard-locking a seat on `pending_payment` allows cart abandoners to block a 4-seat class for 15 minutes, whereas atomic confirmation at payment maximizes utilization while guaranteeing zero overbooking and zero double charges (via manual-capture pre-authorization in production).
- Run `pnpm verify && pnpm test` in the terminal to show all 8 Vitest concurrency and edge-case tests passing in `< 100ms`.
