# AI Usage & Engineering Workflow (`AI_USAGE.md`)

This document covers the required reflection points from [`docs/TAKE_HOME_ASSIGNMENT.md`](./docs/TAKE_HOME_ASSIGNMENT.md) on how AI tools were used, steered, and verified during the 4-hour assignment window.

---

## 1. Which AI Tools You Used

- **Primary Model & Environment**: **Antigravity IDE** running **Gemini 3.8 Flash (High)**, combined with custom agent skills (`brainstorming`, `frontend-design`, `lavish` browser visual preview, `writing-plans`, and `verification-before-completion`).
- **Why I Chose This Setup**:
  Because the assignment has a strict **4-hour time cap**, execution speed was critical. Stronger reasoning models (such as **Claude Opus** or **OpenAI o1/Sol/Astra**) have higher raw intelligence and fewer assumptions, but their response latency is too slow when scaffolding a full monorepo, tests, Docker, and Cloudflare Workers under a tight clock.
- **How I Compensated for Model Limitations**:
  Since **Gemini 3.8 Flash (High)** is fast (`okay-ish` reasoning) rather than frontier-level like Claude Opus or OpenAI Sol/Astra, I could not rely on vague prompts. I had to write a comprehensive upfront specification prompt (`docs/prompts/prompt-1.md`) with explicit constraints, force the agent to ask clarifying questions before writing code, run `frontend-design` + `lavish` visual previews in parallel with workspace setup, and actively steer both UI layout and backend design throughout the session.

---

## 2. What You Used AI For

I used AI across the entire full-stack lifecycle—**architecture, UI/UX design prototyping, full-stack code generation, automated concurrency testing, and deployment configuration**—guided by my upfront prompt and iterative steering:

1. **Full-Stack Monorepo & End-to-End Type Safety**: Scaffolding `Turborepo + pnpm workspaces` (`@trial-booking/shared`, `@trial-booking/server`, `@trial-booking/api-client`, `@trial-booking/dashboard`), Zod schemas, Hono RPC (`hc<AppType>`), and strict ESLint/Prettier/TypeScript gates (`no-explicit-any: error`).
2. **Brainstorming Concurrency & Edge-Case Possibilities**: Exploring the exact mechanics of the **Last-Seat Race Condition** (FIFO payment execution vs. seat selection holds), duplicate student guards, overbooking caps (`MAX_CLASS_CAPACITY = 4`), and payment decline auditing.
3. **In-Memory Cloud Deployment Hardening & Cost Protection**: Designing application-layer sliding-window rate limiting (`60 req/min` general, `15 req/min` mutations), request body caps (`16 KB`), security headers, and bounded ring-buffer storage (`500` dynamic bookings max) so deploying an in-memory API publicly on Cloudflare Workers (`*.irfankurniawan.com`) cannot cause memory leaks or inflate Cloudflare Worker billing on a free/non-WAF plan.
4. **Automated Tests & Multi-Target Packaging**: Generating the 9 Vitest unit/concurrency tests (`Promise.all` race verification), multi-stage `Dockerfile` + `docker-compose.yml`, and Cloudflare Workers `wrangler.jsonc` files.

---

## 3. One Place Where AI Helped You Move Faster

- **Everything from Zero-to-Working Full-Stack Scaffolding, Strategy, Seeding, and Documentation**:
  AI accelerated almost every layer—code generation, architectural planning, deterministic edge-case seeding (`3/4` last-seat race class, `1/4` open class, `4/4` full class), Vitest concurrency suites, and documentation.
- **The Key Caveat**:
  That speed was **only possible because I invested ~36 minutes upfront writing a complete, unambiguous initial prompt (`docs/prompts/prompt-1.md`)** and enforcing repository rules (`AGENTS.md`). Without locking down the tech stack, coding standards, and invariants upfront, a fast model like Gemini Flash would have made conflicting assumptions and wasted time in rework.

---

## 4. One Place Where You Disagreed With, Corrected, or Rejected AI Output

I had to reject and steer the AI's output in two major areas—**Frontend UI Bloat** and **Backend/Product Framing (Demo Simulator vs. Production-Grade Product)**:

1. **Rejecting Bloated Initial UI & Steering With `frontend-design` + `lavish`**:
   - On its first UI pass, Gemini generated a bloated layout filled with marketing subtitles, explanatory sub-labels, and decorative prose cards.
   - I rejected that design, brought in the `lavish` + `frontend-design` skills to inspect component wireframes visually, and stripped out all decorative sub-texts.
   - Even after the initial build, I noticed monospace fonts (`JetBrains Mono`) rendered dotted zeros (`0`) that made numbers and millisecond timestamps unpleasant to read, so I instructed the AI to remove `font-mono` globally and format timestamps cleanly with `date-fns` (`dd MMM yyyy, HH:mm:ss.SSS`).
2. **Rejecting the "Demo Simulator" Mentality in Favor of a Production-Grade Checkout Product**:
   - Initially, the AI treated the assignment like a toy "edge-case simulator demo" (building a dedicated `/simulator` page and assuming seat selection locked priority).
   - I pushed back multiple times: I had the `/simulator` route deleted completely, clarified that **FIFO payment execution order (`POST /api/bookings/:id/pay`)—not seat confirmation order—determines who wins the last seat**, aligned the flow to a real production-grade Traveloka-style checkout (`Confirm Seat` $\rightarrow$ class-scoped `Pending Checkouts` $\rightarrow$ `Pay` / `Pay All`), and added 4 non-intrusive **`Auto-Select & Confirm to Pending`** shortcut buttons on `/` so a reviewer can either test manually or stage edge cases (`Random Seat`, `Same Taken Seat Race (2x)`, `Duplicate Child (2x)`, `Overbook Class (>4 Cap)`) in one click before clicking `Pay All`.

---

## 5. What You Would Change About Your AI Workflow If You Had to Do This Again

1. **Use a Higher-Reasoning Model (`Claude Opus` or `OpenAI Sol / Astra`) Instead of Gemini Flash**:
   While Gemini 3.8 Flash (High) was fast for the 4-hour clock, it required heavy human steering to stop making assumptions (such as building a demo simulator instead of a production checkout flow). Next time, I would use **Claude Opus** or **OpenAI Sol/Astra** at least for the initial architectural planning and product flow alignment—not because those models have zero hallucinations, but because their reasoning depth and instruction adherence on subtle domain requirements are significantly stronger.
2. **Write a More Structured, Requirement-First Initial Prompt**:
   Because of time pressure, my initial prompt (`docs/prompts/prompt-1.md`) mixed job context, infrastructure preferences, and coding rules in a raw stream of consciousness. If doing this again, I would structure the initial prompt with a strict **Product State Machine & UI Flow Contract** table upfront so the model immediately understands the exact checkout lifecycle without needing mid-session course corrections.

---

## 6. How You Verified the Final Implementation

My verification standard was simple: **Does this behave like a real production-grade product, does it satisfy every assignment requirement without fragile hacks, and can I as a human engineer understand the core engine and test every edge case directly from the UI?**

1. **Requirements & Extensibility Check**:
   Verified against [`docs/TAKE_HOME_ASSIGNMENT.md`](./docs/TAKE_HOME_ASSIGNMENT.md) that every invariant holds (`MAX_CLASS_CAPACITY = 4`, no duplicate `(studentId, trialClassId)` confirmed bookings, payment failure isolation in `payment_attempts`, and atomic FIFO `409 LAST_SEAT_RACE_LOST` resolution inside `store.runAtomic()`), and confirmed we could extend the UI with class creation and 1-click auto-stage presets without breaking core backend rules.
2. **Human Codebase Audit & Automated Gate (`pnpm verify && pnpm test`)**:
   Reviewed [`apps/server/src/booking-engine.ts`](./apps/server/src/booking-engine.ts) and [`apps/server/src/store.ts`](./apps/server/src/store.ts) directly to ensure the critical section logic is clean and human-readable, backed by **9 passing Vitest unit & `Promise.all` concurrency tests**, zero ESLint errors (`no-explicit-any`), and strict Nuxt/TypeScript typechecks.
3. **Hands-On Manual Testing on `/` (`Book Trial`), `/roster`, and `/history`**:
   Manually tested both manual seat selection and the 4 **`Auto-Select & Confirm to Pending`** buttons (`Random Seat`, `Same Taken Seat Race (2x)`, `Duplicate Child (2x)`, `Overbook Class (>4 Cap)`), triggered `Pay` and `Pay All`, verified the top high-contrast outcome alert (showing HTTP status codes and `date-fns` millisecond timestamps for `Hold Created` vs. `Payment Executed`), and confirmed that `Class Roster` (`Confirmed Roster` vs. `Excluded Attempts`) and `History` reflect the exact same truth.
