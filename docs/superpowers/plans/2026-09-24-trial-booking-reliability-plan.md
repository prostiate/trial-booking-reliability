# Trial Booking Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade Trial Booking Reliability monorepo (`@trial-booking/shared`, `@trial-booking/server`, `@trial-booking/api-client`, `@trial-booking/dashboard`) satisfying all Ottodot edge cases, concurrency invariants, and 3-way deployment targets.

**Architecture:** Turborepo + pnpm workspaces monorepo. Hono RPC backend with deterministic in-memory store, atomic critical-section booking engine, application-layer rate limiting, and Vitest concurrency tests. Nuxt 4 + Nuxt UI v4 + Pinia frontend implementing the Traveloka-style 3-step checkout, Active Pending Checkouts switcher, Teacher Roster, Paginated History, and Production State Simulator.

**Tech Stack:** TypeScript 5.8, Hono, Zod, Vitest, Nuxt 4, `@nuxt/ui`, Pinia, Turborepo, ESLint, Prettier, Docker Compose, Cloudflare Workers (`wrangler`).

**Spec:** `docs/superpowers/specs/2026-09-24-trial-booking-reliability-design.md`

## Global Constraints

- Hard file size caps: Logic files `<= 400` lines (soft cap `300`), Vue SFCs `<= 500` lines (soft cap `400`).
- Zero `any` or unjustified `unknown` types across the entire workspace (`@typescript-eslint/no-explicit-any: error`).
- Minimum gray text contrast: `text-slate-500` / `text-gray-500` (never `text-gray-400` or lighter).
- Every commit follows Conventional Commits on feature branch `feat/trial-booking-reliability` and passes `pnpm verify && pnpm test`.

---

### Task 1: Workspace Foundation, Coding Standards (`AGENTS.md`), Linting & Pre-Push Gate

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.prettierrc`, `.prettierignore`, `eslint.config.mjs`, `.githooks/pre-push`, `AGENTS.md`

- [ ] **Step 1:** Write root workspace files and configure `.githooks/pre-push` executable hook.
- [ ] **Step 2:** Commit foundation (`chore(workspace): initialize turborepo, linting, and pre-push gate`).

---

### Task 2: Shared Domain Schemas & Booking State Machine Contracts (`@trial-booking/shared`)

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/schemas.ts`, `packages/shared/src/constants.ts`

- [ ] **Step 1:** Implement Zod schemas for `Parent`, `Student`, `TrialClass`, `BookingRecord`, `PaymentAttempt`, `BookingStatus`, `CheckoutInput`, `ProcessPaymentInput`, `PaginationQuery`, and `SimulatorScenario`.
- [ ] **Step 2:** Commit shared contracts (`feat(shared): add zod domain schemas and booking invariant constants`).

---

### Task 3: Hono Backend Engine, Rate Limiter, Seeder & Concurrency Tests (`@trial-booking/server`)

**Files:**
- Create: `apps/server/package.json`, `apps/server/tsconfig.json`, `apps/server/wrangler.jsonc`, `apps/server/src/store.ts`, `apps/server/src/seed.ts`, `apps/server/src/booking-engine.ts`, `apps/server/src/middleware/security.ts`, `apps/server/src/middleware/rate-limit.ts`, `apps/server/src/index.ts`, `apps/server/src/dev-server.ts`, `apps/server/tests/booking-reliability.test.ts`

- [ ] **Step 1:** Write comprehensive Vitest test suite covering normal checkout, duplicate child+class rejection, >4 overbooking prevention, payment failure isolation, and the Last-Seat Race scenario (2-way and 10-way concurrent race).
- [ ] **Step 2:** Implement the in-memory store, seed data (including 3/4 confirmed class, 1/4 class, and 4/4 class), atomic booking engine, security/rate-limit middleware, and Hono RPC routes.
- [ ] **Step 3:** Run `pnpm --filter @trial-booking/server test` and verify 100% pass.
- [ ] **Step 4:** Commit server (`feat(server): implement atomic trial booking engine, rate limiter, and concurrency tests`).

---

### Task 4: Typed Hono RPC Client (`@trial-booking/api-client`)

**Files:**
- Create: `packages/api-client/package.json`, `packages/api-client/tsconfig.json`, `packages/api-client/src/index.ts`

- [ ] **Step 1:** Create `hc<AppType>` client wrapper and export typed RPC helpers.
- [ ] **Step 2:** Commit API client (`feat(api-client): add type-safe hono rpc client`).

---

### Task 5: Production Nuxt UI v4 Dashboard (`@trial-booking/dashboard`)

**Files:**
- Create: `apps/dashboard/package.json`, `apps/dashboard/tsconfig.json`, `apps/dashboard/nuxt.config.ts`, `apps/dashboard/wrangler.jsonc`, `apps/dashboard/eslint.config.mjs`, `apps/dashboard/app/assets/css/main.css`, `apps/dashboard/app/stores/booking.ts`, `apps/dashboard/app/layouts/default.vue`, `apps/dashboard/app/components/PageHeader.vue`, `apps/dashboard/app/components/BookingStatusBadge.vue`, `apps/dashboard/app/components/ClassroomSeatPicker.vue`, `apps/dashboard/app/components/ActivePendingCheckoutsDock.vue`, `apps/dashboard/app/pages/index.vue`, `apps/dashboard/app/pages/roster.vue`, `apps/dashboard/app/pages/history.vue`, `apps/dashboard/app/pages/simulator.vue`

- [ ] **Step 1:** Build modular single-responsibility components (`< 400` lines each) and Pinia store backed by `@trial-booking/api-client`.
- [ ] **Step 2:** Verify `pnpm verify` (`prettier`, `eslint`, `nuxt typecheck`) and `pnpm build`.
- [ ] **Step 3:** Commit dashboard (`feat(dashboard): build nuxt ui checkout flow, seat map, roster, history, and simulator`).

---

### Task 6: Multi-Stage Docker Compose, Cloudflare Workers Config, `README.md` & `AI_USAGE.md`

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `README.md`, `AI_USAGE.md`, `docs/VIDEO_WALKTHROUGH_SCRIPT.md`

- [ ] **Step 1:** Add multi-stage cached `Dockerfile` and `docker-compose.yml`.
- [ ] **Step 2:** Write comprehensive `README.md` and structured `AI_USAGE.md` + walkthrough script.
- [ ] **Step 3:** Run full verification (`pnpm verify && pnpm test && pnpm build`) and commit (`docs(release): add docker compose, cloudflare worker configs, README, and AI_USAGE`).
