# Repository Guidelines & AI Coding Rules (`./trial-booking-reliability`)

> **ALWAYS READ THIS FIRST.** Before writing, editing, or reviewing any code in `./trial-booking-reliability`, read this file and `docs/superpowers/specs/2026-09-24-trial-booking-reliability-design.md`. The code is authoritative; reviewers and pre-push hooks reject changes that break the invariants below.

---

## 1. Workspace & Monorepo Structure

- **Target Repository**: `./trial-booking-reliability`
- **Monorepo Architecture (Turborepo + pnpm workspaces)**:
  - `apps/dashboard` (`@trial-booking/dashboard`): Nuxt 4 Self-Serve Trial Booking, Seat Checkout, Live Roster, History & Edge-Case State Simulator (Port `24002`)
  - `apps/server` (`@trial-booking/server`): Hono RPC Backend, Atomic In-Memory Booking Engine, Rate Limiter & Concurrency Guard (Port `24001`)
  - `packages/shared` (`@trial-booking/shared`): Shared TypeScript types, constants, and Zod validation schemas
  - `packages/api-client` (`@trial-booking/api-client`): Type-safe Hono RPC client (`hc<AppType>`)

---

## 2. File & Component Size Limits (Hard Rule)

| Kind                                                            | Soft cap | Hard cap |
| :-------------------------------------------------------------- | :------- | :------- |
| Logic files — Hono routes, composables, utils, engine, services | 300      | 400      |
| Vue SFCs — pages, components, layouts                           | 400      | 500      |

- **Soft cap**: Plan the split; do not keep adding unrelated code.
- **Hard cap**: Review blocker on new and changed files. Split by responsibility into sub-components, composables, helper modules, or sub-routers.
- **Exempt**: Tests (`*.test.ts`), generated files (`.nuxt/`, `.output/`), and seed fixtures.

---

## 3. UI/UX & Styling Guidelines (`frontend-design` + `@nuxt/ui`)

- **Nuxt UI v4 & Tailwind CSS Standards**:
  - Always use standard `@nuxt/ui` components (`UButton`, `UCard`, `UBadge`, `UAlert`, `USelect`, `UInput`, `UForm`, `UFormField`, `UPagination`, `UIcon`).
  - Keep the UI clean, compact, high-trust, and purposeful (Traveloka-style seat checkout & operational telemetry).
- **Text Contrast & Shade Rule**:
  - Never use `text-gray-400` or `text-slate-400` for readable copy. The minimum allowed gray text shade for readable contrast across themes is `text-slate-500` (`text-gray-500`).
- **Unified Full-Width Layout**:
  - Main viewport container in `apps/dashboard/app/layouts/default.vue` provides consistent layout spacing. Avoid conflicting nested widths inside child views.

---

## 4. Architecture & Code Quality (SOLID + KISS)

1. **Single Responsibility**: One responsibility per file, component, composable, or route module.
2. **Dependency Inversion & End-to-End Type Safety**:
   - Views and Pinia stores communicate through `@trial-booking/api-client` (`hc<AppType>`) and `@trial-booking/shared` Zod schemas.
3. **Strict TypeScript (`No any`)**:
   - **DO NOT use `any` or unjustified `unknown`.**
   - `@typescript-eslint/no-explicit-any` is enforced as `'error'` across all workspace packages.
   - If a type assertion in a test file is ever required, document the explicit reason inline.
4. **Backend Atomicity & Domain Invariants**:
   - Trial classes are strictly capped at `MAX_CLASS_CAPACITY = 4` confirmed students.
   - Duplicate confirmed bookings (`studentId + trialClassId`) are forbidden.
   - Payment failures record a `payment_attempts` audit entry and set status to `payment_failed` without adding the student to the confirmed roster.
   - Last-seat race conditions are resolved atomically inside the payment confirmation critical section: at most one user can transition to `confirmed` for the 4th seat; competing checkouts receive `409 Conflict (LAST_SEAT_RACE_LOST)` and transition to `expired_conflict` with payment aborted (`Rp 0` charged).

---

## 5. Validation, Pre-Push Gate & Git Protocol

- **Unified Verification Pipeline**:
  - Run `pnpm verify` (`prettier --check .`, `turbo lint`, `turbo typecheck`, and `eslint apps/server packages`) plus `pnpm test`.
  - Pre-push git hook (`.githooks/pre-push`) automatically enforces `pnpm verify` and `pnpm test` before allowing any `git push`.
- **Git Branch & Commit Safety**:
  1. Never commit directly to `main`. All changes must happen on a feature branch (`feat/...`, `fix/...`) and merge via Pull Request.
  2. Follow [Conventional Commits](https://www.conventionalcommits.org) (`feat(scope): ...`, `fix(scope): ...`, `docs(scope): ...`, `chore(scope): ...`).
