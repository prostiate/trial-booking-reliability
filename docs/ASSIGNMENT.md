# Ottodot Full-Stack Engineer Take-Home Assignment

**Title**: Trial Booking Reliability  
**Policy**: AI tools welcome | **Timebox**: 3–4 hours  
_Please cap your time at 4 hours. If you run out of time, leave notes on what you would do next._  
_We encourage you to use AI tools. We are interested in how you steer it, question it, and ship something great._

---

## 1. Context

Ottodot runs live online science and math classes for kids. Parents need to book and pay a trial class for their child, and our team needs an accurate roster before class starts.

**Trial classes are capped at 4 students per class.**

Your task is to build the smallest working slice of a trial booking system that behaves correctly under important edge cases.

---

## 2. What To Build

Implement trial booking only. Do not implement regular enrollment.

Your solution should allow:

1. A parent to choose a child and pick an available trial class.
2. A parent to submit a trial booking.
3. A mock payment step or payment result to be recorded.
4. The booking status to be shown after submission.
5. An admin or teacher to see the trial class roster or a simple roster API/output.

Your solution must prevent or handle:

- **Duplicate confirmed bookings** for the same child and class
- **Overbooking** beyond 4 confirmed students
- **Payment failure** without incorrectly adding the child to the confirmed roster
- **The last-seat race condition** described below

A polished frontend is not required. A simple UI is useful, but we care more about the data model, backend logic, invariants, tests, and your explanation. A CLI, script, API endpoint, server action, or minimal app is fine if it shows your thinking clearly.

---

## 3. Required Technical Scenario: Last-Seat Race

Please explicitly handle or explain this scenario:

1. **User A** selects the last available slot and moves to payment.
2. **User B** selects the same slot.
3. **User B** completes payment first and confirms the booking.
4. **User A** then tries to complete payment.

Your implementation must ensure that **at most one user can end up with a confirmed booking for the last available seat**.

In your `README.md`, explain:

- The approach you chose
- Why you chose it
- What tradeoffs you accepted

---

## 4. Backend Design Requirements

In your `README.md`, include a short backend/design section covering:

- Your data model or schema
- The key API endpoints, server actions, or backend functions
- Booking statuses used, such as `pending_payment`, `confirmed`, `payment_failed`, `cancelled`, or similar
- How you prevent duplicate bookings
- How you handle payment failure
- How you handle two users competing for the last seat
- Which checks belong in the UI, backend, database, or background job

---

## 5. Suggested Model

Use a small synthetic dataset. You can create it in any format you prefer: seed file, JSON, CSV, SQLite, Postgres, Supabase, or in-memory data.

Useful concepts may include:

- `parents`
- `students`
- `trial_classes`
- `bookings`
- `payment_attempts`

You may add fields if useful, but keep the model small.

---

## 6. Seed Data And Edge Cases

Please include seed data or setup steps so we can run the demo quickly.

Include enough cases to show:

- A class with available seats
- A class with exactly 3 confirmed students
- A duplicate booking attempt for the same child and class
- A payment failure case

---

## 7. What To Submit

1. **Public GitHub repository** containing:
   - `README.md`
   - Your implementation
   - Synthetic data or setup instructions
   - Tests or clear verification steps
   - `AI_USAGE.md`
   - _Note: Zip files are not accepted._
2. **Short video walkthrough (5–8 minutes)** — screen recording of you running the solution and briefly explaining your approach, the last-seat race handling, and any tradeoffs. Loom, YouTube (unlisted), or similar is fine.

---

## 8. README Requirements

Your `README.md` should explain:

- How to run your solution
- What you built
- Time spent
- Assumptions you made
- Key architecture and backend decisions
- What you deliberately cut
- What you would monitor after release
- What you would do next with more time

---

## 9. `AI_USAGE.md` Requirements

Your `AI_USAGE.md` should explain:

- Which AI tools you used
- What you used AI for
- One place where AI helped you move faster
- One place where you disagreed with, corrected, or rejected AI output
- What you would change about your AI workflow if you had to do this again
- How you verified the final implementation

---

## 10. Evaluation Criteria

We will look for:

- Backend and data-model judgment
- Correctness under payment and double-booking edge cases
- A working full-stack or backend-led flow
- Sensible tests or verification
- Clear scope control
- Clear communication

_Please prioritize correct backend behavior, clear edge-case handling, and verification over frontend polish or feature breadth._
