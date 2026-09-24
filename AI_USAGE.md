# AI Usage & Engineering Workflow (`AI_USAGE.md`)

> **Note on Human vs. AI Responsibility:** Technical inventory and verification logs below were structured with AI assistance; the personal engineering judgment, steering decisions, and reflections in the highlighted sections represent my direct human ownership and review workflow.

---

## 1. Which AI Tools Were Used

- **Primary Model & Agent**: **Gemini 3.8 Flash (High)** inside **Antigravity IDE** (equipped with structured Superpower skills: `brainstorming`, `frontend-design`, `lavish` visual HTML review loop, `writing-plans`, `executing-plans`, and `verification-before-completion`).
- **Supporting Tooling**: `lavish-axi` browser visual review server for inspecting and critiquing page/component layouts before writing Vue SFCs.

---

## 2. What I Used AI For

1. **Architecture & Monorepo Scaffolding**: Setting up the `Turborepo + pnpm workspaces` structure (`@trial-booking/shared`, `@trial-booking/server`, `@trial-booking/api-client`, `@trial-booking/dashboard`), ESLint/Prettier strict rules (`no-explicit-any: error`), and the `.githooks/pre-push` verification gate.
2. **Visual Component Prototyping (`lavish`)**: Generating an interactive HTML mockup of all 4 pages (`Book Trial`, `Class Roster`, `History`, `Simulator`) to review component density and user flow before writing Nuxt UI code.
3. **Backend Concurrency & Test Suite**: Implementing the `InMemoryBookingStore` mutex serialization (`runAtomic`), `BookingEngine` edge-case guards, application-layer sliding-window rate limiter, and the 8 Vitest unit/concurrency tests.
4. **Deployment Configuration**: Authoring the multi-stage cached `Dockerfile`, `docker-compose.yml`, and Cloudflare Workers `wrangler.jsonc` files.

---

## 3. One Place Where AI Helped Move Faster

- **End-to-End Type-Safe RPC + Deterministic Edge-Case Seeding**:
  Having the AI wire `@trial-booking/shared` Zod schemas directly into Hono's `zValidator` routes and export `AppType` into `@trial-booking/api-client` (`hc<AppType>`) saved over an hour of manual DTO boilerplate. Additionally, generating the deterministic seed state (`cls-math-fractions` at `3/4` confirmed seats with `Arka Rahma` holding a `pending_payment` checkout on Seat 4, `cls-sci-orbit` at `1/4` with a `payment_failed` record, and `cls-math-logic` at `4/4` full) allowed instant manual and automated testing of all 4 edge cases.

- **Personal Note (`[HUMAN_FILL — Optional addition in your own words]`)**:
  > _I deliberately chose Gemini 3.8 Flash (High) with a strict upfront specification prompt and my personal coding standards (`AGENTS.md`) so the agent could execute boilerplate, tests, and Docker/Wrangler setup rapidly while I focused on architectural direction, concurrency semantics, and PR review._

---

## 4. One Place Where I Disagreed With, Corrected, or Rejected AI Output

- **Rejecting Bloated UI Copy & Over-Explained Subtitles During the Lavish Design Review**:
  - **What the AI initially generated**: In the first pass of `.lavish/trial-booking-production-design.html`, the AI produced heavy marketing-style section headers, explanatory subtitles, sub-texts, and sub-labels under every card (e.g., _"Aesthetic Direction: Precision EdTech Checkout & Ops Telemetry"_, _"Switch parent anytime to test concurrent checkout"_, and verbose prose cards).
  - **How I corrected/steered it**: I rejected that first visual artifact in the Lavish review loop with the explicit instruction:
    > _"give me the each page components design please, make it concise, clear and clean no need any subtitle sub text sub label"_
  - **The result**: The AI stripped out all decorative subtitles, sub-texts, and marketing filler, replacing the artifact with a clean, functional 4-page component layout (`Book Trial`, `Class Roster`, `History`, `Simulator`) modeled on Traveloka's seat checkout and an active `Pending Checkouts` dock. Only after I approved that second visual revision (`"good approved the design"`) did we proceed to Vue SFC implementation.

---

## 5. What I Would Change About My AI Workflow Next Time

1. **Enforce Component Wireframe Density Rules Upfront in `AGENTS.md`**:
   Instead of waiting for the first visual mockup to reject subtitles and helper sub-labels, I would codify a _"Zero decorative subtitle / sub-label"_ rule directly in `AGENTS.md` so the first UI pass is already compact.
2. **Smaller Incremental PR Checkpoints**:
   Keep enforcing single-concern Conventional Commits (`chore(workspace)` -> `feat(shared)` -> `feat(server)` -> `feat(dashboard)` -> `docs(release)`) paired with a mandatory local `pre-push` hook (`pnpm verify && pnpm test`) so every AI-generated commit is independently verifiable and easy for a human engineer to audit.

---

## 6. How I Verified the Final Implementation

1. **Automated Unit & Concurrency Tests (`pnpm test`)**:
   Verified all 8 Vitest test cases in [`apps/server/tests/booking-reliability.test.ts`](file:///home/vincent/backupirfanhehe/Downloads/workspaces/personal/trial-booking-reliability/apps/server/tests/booking-reliability.test.ts), including sequential and `Promise.all` concurrent payment submissions for the 4th seat (`LAST_SEAT_RACE_LOST`), duplicate child+class rejection (`DUPLICATE_CONFIRMED_BOOKING`), overbooking cap (`CLASS_CAPACITY_EXCEEDED`), payment failure isolation (`PAYMENT_DECLINED`), and burst rate limiting (`429`).
2. **Static Analysis & Type Safety Gate (`pnpm verify`)**:
   Ran `prettier --check .`, `eslint` across both Nuxt and Node packages (`@typescript-eslint/no-explicit-any: error`), and `turbo typecheck` (`nuxt typecheck` + `tsc --noEmit`).
3. **Interactive End-to-End Flow Verification**:
   Verified the live Traveloka-style checkout flow in the browser: holding Seat 4 in `pending_payment` as Parent A (`Siti Rahma / Arka`), switching to Parent B (`Budi Santoso / Dina`) to pay and confirm Seat 4 (`200 OK`), and clicking **Complete Payment** on Parent A's docked pending checkout to confirm the `409 · LAST_SEAT_RACE_LOST` alert and verify the Class Roster remains strictly at `4 / 4 Confirmed`.
