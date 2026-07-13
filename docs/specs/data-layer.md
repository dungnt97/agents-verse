# Data Layer — Spec

> The dual-mode data floor: one flag decides whether every screen reads Postgres or the mock singleton.
> Owner-of-truth for: the `USE_DB` contract, the repository layer, the Drizzle schema (tables, enums, load-bearing
> uniques), migrations, the seed, the real auth gate, and the server-action guard.

## Boundary

**In scope:** `lib/repositories/*`, `lib/db/*` (client, schema, seed), `lib/actions/*`, `lib/auth/*`, `middleware.ts`,
`drizzle/migrations/`, `drizzle.config.ts`, and the demo-mode persistence in `lib/providers/workspace-state-provider.tsx`.

**Out of scope:** *what* each subsystem writes into these tables (its own spec owns that); the meaning/defaults of env
vars (`../env-reference.md`); the rationale for any invariant (`../invariants.md`).

**Runtime split — this is the part people get wrong:**

| Module | Runs in `web` (Next server) | Runs in `worker` (tsx) | Has `import 'server-only'` |
|---|---|---|---|
| `lib/repositories/*` | yes | **never** | yes (all modules) |
| `lib/actions/*` | yes | never | via `guard.ts` |
| `lib/auth/session.ts` | yes | never | yes |
| `lib/auth/server.ts` | yes | yes (seed under tsx) | **no** — relative imports |
| `lib/db/client.ts`, `lib/db/schema/*` | yes | **yes** | **no** — deliberately |

`lib/db/client.ts` has no `server-only` marker *on purpose*: that omission is what lets the Inngest worker and the
`tsx` seed import the DB. Worker code therefore reaches Postgres through `lib/db/*` directly and **never** through a
repository. The sanctioned escape hatch when both sides need one write: put it in a worker-safe module and re-export
it from the repository — `upsertDiscoveredLeads` lives in `lib/discovery/upsert-discovered-leads.ts` and is
re-exported by `lib/repositories/leads.ts` so web/test callers keep one import site.

## Contracts

### The flag

`USE_DB` — `lib/repositories/config.ts`. `process.env.USE_DB === 'true'`, evaluated **once at module load**.
Strict equality: `'1'`, `'TRUE'` and `''` are all **false**. A test that needs to flip it must `vi.resetModules()` and
re-import (`tests/repositories/config.test.ts`).

The server threads the flag to the client — `app/layout.tsx` and `app/(workspace)/layout.tsx` pass `USE_DB` into the
providers/shell; client code reads `useDb` from `useWorkspaceState()`. A `'use client'` file must never import
`config.ts` itself.

### Repository surface — READ

Every exported function branches on `USE_DB` **first**. The degrade shapes:

| Shape | Functions |
|---|---|
| **Mock `AV`** (a mock equivalent exists) | `getLeads`, `auditedLeads`, `getAudit` (`leads.ts`); `getRooms`, `getRoom`, `roomProjects`, `roomMetrics` (`rooms.ts`); `getAgents`, `getAgent`, `agentDetail` (`agents.ts`); `getDemos`, `demoByLead`, `getDeals`, `getDeal`, `dealByLead` (`pipeline.ts`); `getMetrics`, `getEscalations`, `getOpenEscalations`, `getActivity`, `getDemoRequests` (`ops.ts`) |
| **Empty / neutral** (no mock equivalent — the feature simply does not exist in demo mode) | `getAuditScreenshot → null` (`leads.ts`); `getSettings → null` (`ops.ts`); `getAuditJobs → {}` (`audit-jobs.ts`); `getAgentActivity → {}` (`agent-activity.ts`); `getActivePipelineRuns → []` (`pipeline-runs.ts`); `getReadyGeneratedDemoLeadIds → []`, `getGeneratedDemo → null` (`generated-demos.ts`); `getBuild → null` (`builds.ts`) |
| **Mode-independent** | `roomTimeline()` (`rooms.ts`) — no `USE_DB` check at all; always `[]`, because no per-room event log exists in either mode. An honest empty state, not an oversight. |

`lib/repositories/index.ts` is a **partial** barrel (config, rooms, agents, leads, pipeline, pipeline-runs, builds,
ops). `agent-activity`, `audit-jobs` and `generated-demos` are **not** in it — pages import those modules by path.
Follow whichever the neighbouring page already does; do not "fix" the barrel.

### Server-action surface — WRITE

All under `lib/actions/`, all `'use server'` **except `guard.ts`** (it must stay a plain module so it can export a
non-action helper). The degrade styles:

| Style | Actions |
|---|---|
| **Silent no-op** (returns `void`; the provider owns demo-mode persistence) | `createLead` (`leads.ts`), `createDemoRequest` (`requests.ts`), `setAutonomyMode` (`settings.ts`) |
| **`guardMutation()`** → `{ ok: false, message: 'This action needs the database (set USE_DB=true).' }` | `updateLeadStage`, `updateDemoStatus`, `updateRequestStatus`, `convertRequestToLead`, `updateGuardrails`, `updatePricing`, and everything in `deals.ts` / `escalations.ts` |
| **Bespoke message** (names the feature) | `requestAudit` (`run-audit.ts`), `requestDemoGeneration` (`run-demo-gen.ts`), `runDiscovery` (`run-discovery.ts`), `sendOutreach` (`send-outreach.ts`), `startPipeline` / `pausePipelineRun` / `resumePipelineRun` (`start-pipeline.ts`), `emailProposal` (`email-proposal.ts`), `ingestReply` (`ingest-reply.ts`) |
| **No DB gate** (writes nothing) | `requestSummary` (`summary.ts`) — auth-checks, then gates on `assistantConfigured()`; `USE_DB` only decides whether live metrics enrich the prompt |

`guardMutation()` (`lib/actions/guard.ts`): returns the degrade result when `!USE_DB`; **throws `Unauthorized`** when
there is no current user; returns `null` when the caller may proceed. Actions whose signature is `void` (e.g.
`setAutonomyMode`) can't return the degrade shape, so they inline `if (!USE_DB) return;` plus their own
`getCurrentUser()` check — same two gates, different plumbing.

`createDemoRequest` is the **only** deliberately unauthenticated action (public marketing form). It still honours
`!USE_DB`, clamps every free-text field, and uses `randomUUID()` ids so two submissions in the same millisecond can't
collide on the PK.

### Auth surface

| Symbol | File | What it is |
|---|---|---|
| `middleware` | `middleware.ts` | Edge **cookie-existence** bounce only — accepts `av-auth=1` (demo) **or** `better-auth.session_token` / `__Secure-better-auth.session_token`. Forgeable. Not a security boundary. Its `matcher` lists `/deals` but **not** `/deals/:path*`. |
| **`getCurrentUser()`** | **`lib/auth/session.ts`** | The **real gate**. DB mode: validates a Better Auth session against Postgres. Demo mode: reads the `av-auth` cookie. Called by `app/(workspace)/layout.tsx` → `redirect('/login')`, and by every guarded action. |
| `auth` | `lib/auth/server.ts` | The `betterAuth` instance — **and nothing else**. It does *not* export `getCurrentUser`. Relative imports so the tsx seed can import it without pulling in `next/headers`. `disableSignUp: true` lives here. |
| `authClient` | `lib/auth/client.ts` | The browser client. |

### Tables — the full inventory

| Table | Schema file | Written by |
|---|---|---|
| `rooms` | `schema/agents.ts` | seed (`seedConfig`) — org chart, not mock data |
| `agents` | `schema/agents.ts` | seed (`seedConfig`); live status/task/cost is **overlaid at read**, never stored |
| `leads` | `schema/leads.ts` | `upsertDiscoveredLeads` (worker), `actions/leads.ts`, `actions/requests.ts`, worker `run-demo-gen` (`demo:'review'`) and `run-outreach` (`demo:'sent'`) |
| `demo_requests` | `schema/leads.ts` | `actions/requests.ts` (public form) |
| `audits` | `schema/pipeline.ts` | worker `run-audit` (upsert by `leadId`) |
| `audit_screenshots` | `schema/pipeline.ts` | worker `run-audit` |
| `audit_jobs` | `schema/audit.ts` | worker `run-audit` **and the web action** — `requestAudit` (`actions/run-audit.ts`) upserts a `queued` row before sending the event. Web reads via `repositories/audit-jobs.ts` |
| `demos` | `schema/pipeline.ts` | seed (`SEED_DEMO_DATA` only) + `actions/demos.ts` — **see Traps** |
| `generated_demos` | `schema/pipeline.ts` | worker `run-demo-gen`, **plus** `requestDemoGeneration` (`actions/run-demo-gen.ts`), which pre-marks `generating` (that row is also the double-click guard). **This** is what the Demos screen reads in DB mode |
| `deals` | `schema/pipeline.ts` | **updated** by `actions/deals.ts`, `actions/escalations.ts`, worker `handle-reply`. **No code path inserts a deal** — the only INSERT is the seed (`SEED_DEMO_DATA`), so with the production default the Deals screen stays empty forever |
| `builds` | `schema/builds.ts` | worker `run-build` |
| `escalations` | `schema/ops.ts` | worker (`orchestrate-pipeline`, `run-outreach`, `handle-reply`, `run-support`, `send-proposal`) + `actions/escalations.ts` + `actions/deals.ts` |
| `activity` | `schema/ops.ts` | worker (`lib/inngest/activity-log.ts`) |
| `metrics` | `schema/ops.ts` | seed (`SEED_DEMO_DATA` only) — **dead, nothing reads it. See Traps** |
| `settings` | `schema/ops.ts` | `actions/settings.ts` + seed. Singleton row, id `'default'` |
| `pipeline_runs` | `schema/pipeline-runs.ts` | the orchestrator + `lib/inngest/start-pipeline-run.ts` |
| `hunted_markets` | `schema/markets.ts` | the hunt rotation in `lib/discovery/run-discovery-core.ts` (upsert on `huntedMarkets.id`) |
| `user`, `session`, `account`, `verification` | `schema/auth.ts` | Better Auth + `seedFounder()` |

Enums (`pgEnum`): `lead_stage`, `demo_status`, `deal_stage`, `req_status`, `escalation_status`, `autonomy_mode`
(`schema/enums.ts`); `audit_status` (`schema/audit.ts`); `pipeline_stage`, `pipeline_run_status`
(`schema/pipeline-runs.ts`).

**Autonomy modes are `manual | review | guarded | full`.** There is no `autopilot` — older docs invented it.

### Uniques and indexes that carry logic

| Constraint | Where | Why it exists |
|---|---|---|
| `leads.company` UNIQUE | `schema/leads.ts` | Lets `createLead` / `convertRequestToLead` use `onConflictDoNothing` as a concurrency-safe dedupe. |
| `leads.place_id` UNIQUE | `schema/leads.ts` | The conflict target for `upsertDiscoveredLeads` — re-running discovery refreshes a lead instead of duplicating it. |
| `pipeline_runs_active_lead_idx` (partial unique on `leadId WHERE status IN (…)`) | `schema/pipeline-runs.ts` | The **only** enforcement of "at most one in-flight run per lead". Its predicate is generated in TS from `ACTIVE_RUN_STATUSES` (imported from `lib/inngest/pipeline-machine`). |

## How it works

**Read.** An App Router page is an async Server Component: it calls repository functions and passes plain,
serializable props to a `'use client'` screen. Components never import `AV` (the sole exception:
`lib/providers/workspace-data-provider.tsx` uses `AV` as its `FALLBACK_DIRECTORY` for marketing surfaces that have no
server-seeded directory). The workspace layout additionally fetches `getRooms()` / `getAgents()` /
`getOpenEscalations()` and seeds the directory context.

**Write, DB mode.** Client handler → server action → `guardMutation()` → Drizzle write → `revalidatePath('/<screen>')`
for every screen the write touches. `WorkspaceStateProvider` applies the change optimistically first, so
`revalidatePath` is what reconciles the truth.

**Write, demo mode.** The action returns immediately (no-op or degrade). **Persistence is the client's job:**
`WorkspaceStateProvider` writes `av-mode` / `av-requests` / `av-leads` to `localStorage` when `!useDb`, and only calls
the action `if (useDb)`. A screen that calls an action directly (not through the provider) must read `useDb` and show a
cosmetic result instead — `components/workspace/demos/demo-manager.tsx` is the template.

**Auth chain.** `middleware.ts` (cheap Edge bounce) → `app/(workspace)/layout.tsx` calls `getCurrentUser()` (the real
gate) → each action calls `guardMutation()` again (defense in depth; a server action is a public HTTP endpoint).

**Boot chain** (`scripts/docker-entrypoint.sh`, `web` container): wait for Postgres → `npm run db:migrate`
(**fail-fast**, `set -e`) → `npm run db:seed` (**non-fatal**, `|| echo`) → `next start`.

## Invariants

Governed by — see `../invariants.md` for what breaks and what enforces each:

- **O1** — every repository fn branches on `USE_DB` first; every action degrades. The repository owns the branch, never the action.
- **B3** — no `'use client'` file may value-import `lib/repositories/*`, `lib/db/*`, `lib/actions/guard.ts`, `lib/auth/session.ts` or `next/headers`. `import type` is fine.
- **B4** — components never import the mock `AV` singleton (one sanctioned exception, above).
- **B1** — worker-chain modules use relative imports, no `server-only`, no `lib/repositories/*`.
- **D5** — `disableSignUp: true` stays.
- **U8** — `app/(workspace)/layout.tsx` is the real auth gate; middleware is a forgeable bounce.
- **F1** — `ACTIVE_RUN_STATUSES` is load-bearing DDL.
- **F2** — `leads.company` is UNIQUE but the discovery upsert conflicts only on `place_id`.
- **F3** — migrations are append-only; a new schema module must be added to the barrel.
- **F4** — `audits` columns stay NOT NULL; job lifecycle stays in `audit_jobs`.
- **F5** — all audit writes are upserts keyed by `leadId`; there is no audit history.
- **F6** — a new provider field must be added to the `set:{}` of `upsert-discovered-leads.ts`, not just the insert.
- **F7** — `postgres-js` prepared statements are ON.
- **F8** — the `metrics` table is dead; `getAgents()` forces `idle/0/0` on purpose.
- **I5** — migrate is fail-fast, seed is non-fatal.

## Extension recipes

**To add a table**

1. Add it to an existing `lib/db/schema/<domain>.ts`, or create one. camelCase TS fields — `casing: 'snake_case'` in
   `drizzle.config.ts` converts them. Per-lead artifacts reference `leads.id` with `onDelete: 'cascade'` (pattern:
   `schema/builds.ts`).
2. **Export it from `lib/db/schema/index.ts`.** `drizzle.config.ts` points at that barrel — a module missing from it is
   invisible to drizzle-kit and silently never migrated.
3. `npm run db:generate` → read the emitted `drizzle/migrations/00NN_*.sql` → commit it. Apply with `npm run db:migrate`
   (Docker does this at boot). **Never hand-edit an applied SQL file** — the journal hash drifts.
4. Optional seed: `onConflictDoNothing` insert in `seedConfig()` (product configuration) or `seedDemoData()` (business
   fixtures, gated behind `SEED_DEMO_DATA`).
5. Read path: a new fn in `lib/repositories/<domain>.ts` starting with `import 'server-only'` and
   `if (!USE_DB) return <mock or neutral>`.
6. If the **worker** writes it: put the write in a worker-safe module (relative imports, no `server-only`) and
   re-export it from the repository — see `lib/discovery/upsert-discovered-leads.ts`.
7. `npm run typecheck && npm run test` (both pass with no DB), then add a case to `tests/db/*.test.ts` guarded by
   `const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true'` + `describe.skipIf(!hasDb)`.

**To add a server action**

1. New file (or existing one) in `lib/actions/` with `'use server'` at the top. Do **not** put a non-action export in a
   `'use server'` module — that is why `guard.ts` is separate.
2. First lines of the body: `const blocked = await guardMutation(); if (blocked) return blocked;`
3. Validate every enum input against the Drizzle enum (`xEnum.enumValues.includes(v as X)`) and return
   `{ ok: false, message }`. Never trust the client. Clamp free text on any public path.
4. Write via `db`, then `revalidatePath('/<screen>')` for **every** screen the write affects.
5. Wire the client: shared mutable state → add it to `WorkspaceStateProvider` (optimistic `setState`, then
   `if (useDb) void action().catch(() => {})`). Screen-local → read `useDb` from `useWorkspaceState()` and degrade
   visibly instead of firing the action.
6. Test in `tests/db/server-actions.test.ts` style: hoisted `vi.mock('next/cache')` and
   `vi.mock('@/lib/auth/session', …)` **before** importing the action; snapshot and restore any row you mutate.

**To change `ACTIVE_RUN_STATUSES`**

Edit the constant in `lib/inngest/pipeline-machine`, then **`npm run db:generate` + migrate** — the partial-unique index
predicate is generated from it. Skipping this leaves the DB's notion of "active" and the code's notion divergent, and
duplicate concurrent runs per lead slip through. Nothing links the two for you.

## Traps

- **`updateDemoStatus` is a 0-row no-op in production.** It updates the legacy `demos` table `WHERE demos.id = demoId`.
  But in DB mode the Demos screen is *derived* — `getDemos()` / `demoByLead()` build rows from
  `generated_demos ⋈ leads ⋈ audits`, the row id is `'demo-' + lead.id`, and the **displayed status comes from
  `leads.demo`**. With `SEED_DEMO_DATA=false` (the production default) `demos` is empty: the action updates nothing,
  returns `{ ok: true }`, and the screen never changes. Only the worker writes `leads.demo` (`run-demo-gen` → `review`,
  `run-outreach` → `sent`). The DB suite hides this because it seeds `demos` fixtures whose ids happen to match.
- **The `metrics` table is dead.** `getMetrics()` (`lib/repositories/ops.ts`) computes every KPI live with
  COUNT/SUM/derive over `leads`/`audits`/`generated_demos`/`deals`/`escalations`/`pipeline_runs`, including a derived
  `bottleneck`. Nothing reads `metrics`; only `seedDemoData()` writes it. Do not "fix" a KPI by writing to it.
- **`getAgents()` deliberately discards the seeded activity fields**, forcing `status:'idle'`, `task:'Idle — awaiting
  work'`, `tasks:0`, `cost:0` before applying the live overlay from `getAgentActivity()`. Seeded vanity numbers can
  never surface. `roomMetrics()` derives from live agents for the same reason. This is the fix, not the bug.
- **Prepared statements are ON** (`lib/db/client.ts`) — one direct connection, no pooler. Introducing a transaction
  pooler without `prepare: false` produces `prepared statement does not exist` errors.
- **The cost figures are estimates, not spend.** `getMetrics()` runs `computeCostMeter` over today's run count; the
  founder overrides live under `settings.guardrails.costPerRun` / `settings.guardrails.dailyCostLimit` — those exact
  keys.
- **Optimistic writes swallow their errors.** Every provider call is `void action().catch(() => {})`. A failed DB write
  is invisible to the user until the next revalidation contradicts the optimistic state.
- **The seed skips the founder when `FOUNDER_PASSWORD` is unset** — it warns and moves on (a default literal in a
  committed file would be a permanent public credential, made permanent by `onConflictDoNothing`). You cannot log in
  until it is set and the seed re-runs. The seed also throws outright without `DATABASE_URL` or `BETTER_AUTH_SECRET`.
- **`demos` vs `generated_demos`, `audits` vs `audit_jobs`** — different tables, on purpose. `generated_demos` is the
  real AI output; `demos` is the mock-shaped legacy table. `audits` is the NOT-NULL result so the audit screen always
  renders; `audit_jobs` is the queued/running/failed lifecycle. Do not merge either pair.
- **`getAudit()` never returns null.** With no stored `audits` row it falls back to `buildAuditFor(lead)` — a derived
  view of *that* lead, not a mock placeholder. A screen showing an audit is not proof an audit ran; `audit_jobs` is.
- **`lib/db/schema/pipeline-runs.ts` imports from `lib/inngest/pipeline-machine`.** The schema depends on machine
  code. Keep that module pure (constants/logic only) or you will drag the worker chain into drizzle-kit.

## Tests

**Guarded today**

| What | Where |
|---|---|
| `USE_DB` flag semantics (strict `=== 'true'`, `'1'`/`'TRUE'`/`''` false) | `tests/repositories/config.test.ts` — runs in the default suite |
| Repository reads, server actions, pipeline gates, deals, outreach, delivery against a real migrated + **seeded** Postgres | `tests/db/*.test.ts` — `npm run test:db` (`USE_DB=true vitest run --config vitest.config.db.ts`), every file `describe.skipIf(!hasDb)` |

**NOT guarded — know this before you rely on green**

- **`npm run test` / `typecheck` / `build` all run with `USE_DB` off and no DB.** An unguarded `db.select()` in a new
  page or repository function passes every gate and only explodes at request time in production.
- **Vitest stubs `server-only`** (`vitest.config.ts` and `vitest.config.db.ts` alias it to `tests/shims/empty.ts`). The
  unit suite therefore **can never catch a client-boundary violation** (B3). Only `next build` catches it.
- **ESLint has no import-boundary rule** (`eslint.config.mjs` registers unused-vars + prefer-const, nothing else).
- **`tests/db/**` is not in CI** (it needs Postgres) and is skipped automatically without `DATABASE_URL` + `USE_DB=true`
  — a change that only breaks the DB path can be merged fully green.
- **The DB suite runs with `SEED_DEMO_DATA` fixtures**, so it exercises a database shape production never has. That is
  exactly what hides the `updateDemoStatus` no-op above.
- **`upsertDiscoveredLeads` is covered only in the DB suite** (`tests/db/repositories.test.ts` — insert, then
  re-upsert by `placeId` without duplicating), which never runs in CI. Nothing covers the `leads.company` UNIQUE vs
  `place_id` conflict-target mismatch (F2): one discovered row whose company name already exists raises a unique
  violation that is caught nowhere, so the whole multi-row insert fails.
- **Nothing links `ACTIVE_RUN_STATUSES` to its migration** (F1). A test pins the array's value; no test notices when the
  index predicate drifts from it.
