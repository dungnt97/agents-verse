# Architecture Map — Spec

> START HERE. The orientation map for the whole repo.
> Owner-of-truth for: the **web/worker runtime boundary**, the **module import graph**, the **Inngest event bus**, the **route inventory**, the **subsystem → spec index**, and the **where-truth-lives table**.
> Nothing else enumerates routes or events. Nothing else re-explains an invariant (`../invariants.md` owns those) or an env var (`../env-reference.md` owns those).

## Boundary

In scope: how the pieces fit and who may call whom. Out of scope: how any single subsystem works — that is its spec (see [Subsystem map](#subsystem-map)).

Two runtimes ship, from two images:

| Runtime | Image / entry | Executes | Never contains |
|---|---|---|---|
| `web` | `Dockerfile` → `scripts/docker-entrypoint.sh` → `next start` | App Router pages, server actions, repositories, API route handlers, `inngest.send()` | Playwright/Chromium, Lighthouse, Gemini, the `claude` CLI |
| `worker` | `Dockerfile.worker` → `npx tsx lib/inngest/worker-entrypoint.ts` → Inngest `connect()` (outbound only, no inbound port) | Every Inngest function: audit, demo-gen, orchestrator, outreach, reply, build, support, proposal, auto-discovery cron | `next/*`, `server-only`, `@/` alias, `lib/repositories/*` |

The worker base image is `mcr.microsoft.com/playwright:v1.60.0-noble` and installs `@anthropic-ai/claude-code` globally (`Dockerfile.worker`). That is why the heavy engines exist only there.

**There is no `app/api/inngest` route.** Functions are registered in exactly one place — the `functions: [...]` array in `lib/inngest/worker-entrypoint.ts`. Consequences an agent must internalise:
- `npx inngest dev` on its own runs **nothing**; without the `worker` container, events queue and nobody serves them.
- A new function that is not added to that array is silently dead: the event is accepted, the run never happens, and (if it is a pipeline event) the lead strands (C1).
- `web` never imports a function module. It imports `lib/inngest/client.ts` and sends events. Keep it that way (B2).

## Contracts

### Module graph — who may import whom

| Directory | Runtime | May import | Must NOT import |
|---|---|---|---|
| `app/**`, `components/**` | web | `lib/repositories/*`, `lib/actions/*`, `lib/data/format.ts`, `lib/providers/*`, `lib/i18n/*`, `lib/inngest/client.ts` | `lib/audit/*`, `lib/agents/*`, `lib/demo-gen/*`, `lib/inngest/functions/*` (B2). Client files additionally must not **value**-import `lib/repositories/*`, `lib/db/*`, `lib/auth/session.ts`, `lib/actions/guard.ts`, `next/headers` (B3) or the mock `AV` (B4) |
| `lib/actions/**` (`'use server'`) | web | `lib/repositories/*`, `lib/db/*`, `lib/auth/*`, `lib/inngest/client.ts`, `lib/inngest/start-pipeline-run.ts` | worker engines (B2) |
| `lib/repositories/**` (`import 'server-only'`) | web | `lib/db/*`, `lib/data/*` (mock fallback), `lib/inngest/pipeline-machine.ts` (pure) | worker engines (B2) |
| `lib/inngest/functions/**`, `lib/agents/**`, `lib/demo-gen/**`, `lib/audit/**` — **the engines** | worker only | each other + the shared modules below, via **relative** paths only | `server-only`, `next/*`, `@/` value imports, `lib/repositories/*` (B1). `import type` from `@/` is erased and therefore allowed |
| `lib/db/**`, `lib/data/**`, `lib/discovery/**`, `lib/integrations/**`, `lib/proposals/**`, `lib/inngest/{client,pipeline-machine,start-pipeline-run,activity-log}.ts` — **shared, tsx-safe** | both | each other, relative paths | same as above (B1) — they are in the worker's runtime closure |

The shared row is the one to get right (its modules are tsx-safe by rule; `lib/inngest/activity-log.ts` is tsx-safe too but is only ever called from worker functions). Web legitimately imports: `lib/actions/run-discovery.ts` → `lib/discovery/run-discovery-core.ts`; `app/api/{chat,inbound,telegram,whatsapp}` + `lib/actions/summary.ts` → `lib/integrations/*`; `app/(workspace)/deals/[id]/proposal/page.tsx` → `lib/proposals/proposal.ts`; repositories → `lib/inngest/pipeline-machine.ts` (`ACTIVE_RUN_STATUSES`); `lib/actions/start-pipeline.ts` → `lib/inngest/start-pipeline-run.ts`. **None of these may ever gain a `server-only` or `@/` value import** — the worker loads them under `tsx` and would stop booting, and typecheck would stay green.

**Sanctioned boundary crossings** (do not "clean these up"):
1. `lib/repositories/leads.ts` re-exports `upsertDiscoveredLeads` from `lib/discovery/upsert-discovered-leads.ts` — one worker-safe writer used by both the web discovery action and the worker cron.
2. `lib/providers/workspace-data-provider.tsx` is a `'use client'` file that imports the mock `AV` as `FALLBACK_DIRECTORY`, so `useWorkspaceData()` still resolves on marketing routes where no provider is mounted. It is the **only** legal `AV` import in client code (B4).

### Event bus

Payload contracts are TypeScript interfaces in `lib/inngest/client.ts` — no zod, no runtime validation; call sites cast. Event ids are the idempotency mechanism (C2).

| Event | Payload type | Sent by | Consumed by |
|---|---|---|---|
| `audit/requested` | `AuditRequestedData` | `lib/inngest/start-pipeline-run.ts`; `lib/actions/run-audit.ts` (no `runId`); orchestrator resume | `run-audit` |
| `demo/requested` | `DemoRequestedData` | orchestrator hop; `lib/actions/run-demo-gen.ts` (no `runId`) | `run-demo-gen` |
| `outreach/requested` | `OutreachRequestedData` | orchestrator hop; `lib/actions/send-outreach.ts` (no `runId`) | `run-outreach` |
| `audit/completed` | `PipelineFactData` | `run-audit` (success **and** `onFailure`, sharing one id) | `orchestrate-pipeline` |
| `demo/completed` | `PipelineFactData` | `run-demo-gen` (success and `onFailure`) | `orchestrate-pipeline` |
| `outreach/sent` | `OutreachSentData` | `run-outreach` (send, every skip path, `onFailure`); `lib/actions/escalations.ts` (reject / take-over) | `orchestrate-pipeline` |
| `pipeline/resumed` | `PipelineControlData` | `lib/actions/escalations.ts` (approve gate); `lib/actions/start-pipeline.ts` (resume a paused run) | `orchestrate-pipeline` |
| `pipeline/halted` | `PipelineControlData` | `lib/actions/escalations.ts` (reject gate / take-over) | `orchestrate-pipeline` |
| `outreach/approved` | `OutreachApprovedData` (carries the parked draft) | `lib/actions/escalations.ts` | `run-outreach` |
| `reply/received` | `ReplyReceivedData` | `app/api/inbound/route.ts`, `app/api/whatsapp/route.ts`, `lib/actions/ingest-reply.ts` | `handle-reply` |
| `deal/won` | `DealWonData` | `lib/actions/deals.ts`, `lib/actions/escalations.ts`, `handle-reply` | **fans out to two functions**: `run-build` AND `run-support` |
| `support/approved` | `SupportApprovedData` | `lib/actions/escalations.ts` | `run-support` |
| `proposal/requested` | `ProposalRequestedData` | `lib/actions/email-proposal.ts` — **the only send with no event id** | `send-proposal` |
| `delivery/completed` | `DeliveryCompletedData` | `run-build` | **nobody. Dead-end event today.** |
| (cron, no event) | — | `AUTO_DISCOVERY_CRON` schedule | `auto-discovery` |

Two contracts the payload types do not tell you:
- **An event without `runId` drives no pipeline.** The worker does the work, writes its rows, and emits no fact. That is how the manual "Run audit" / "Generate demo" buttons stay one-off.
- **`deal/won` is a fan-out.** Adding a third consumer costs nothing; removing the event id (`deal/won:<dealId>`) double-runs both.

### Route inventory

This is the **only** place routes are enumerated. Verify with `find app -name page.tsx -o -name route.ts`.

**Pages** (`page.tsx`):

| Route | File | Kind |
|---|---|---|
| `/` | `app/page.tsx` | client (landing) |
| `/[slug]` | `app/(marketing)/[slug]/page.tsx` | server; slugs come from `lib/info-slugs.ts` (`INFO_PAGES`); unknown → `notFound()` |
| `/login` | `app/login/page.tsx` | client |
| `/overview` `/command` `/rooms` `/rooms/[id]` `/agents/[id]` `/leads` `/audits` `/demos` `/deals` `/deals/[id]/proposal` `/activity` `/settings` | `app/(workspace)/…/page.tsx` | **async Server Components** — they `await` repositories and pass serializable props to `'use client'` screens |
| `/agents` `/requests` | `app/(workspace)/agents/page.tsx`, `app/(workspace)/requests/page.tsx` | the only two `'use client'` workspace pages |
| `/inquire/[leadId]` | `app/inquire/[leadId]/page.tsx` | **public** — the prospect's response page reached from the demo's injected CTA: a lead-scoped chat + a requirements form that writes a `demo_requests` inquiry for `/requests`. Trusted first-party page (normal CSP), unlike the sandboxed `/demo` |

**Route handlers** (`route.ts`):

| Route | File | Auth |
|---|---|---|
| `/demo/[leadId]` | `app/demo/[leadId]/route.ts` | **public** — serves the LLM-authored demo HTML under the strict `DEMO_CSP`; prefers a ready `builds` row over the raw generated demo (D6) |
| `/audit-shot/[leadId]` | `app/audit-shot/[leadId]/route.ts` | auth-gated PNG (the captured old-site screenshot) |
| `/api/auth/[...all]` | Better Auth handler | public by design; `disableSignUp: true` is what keeps it safe (D5) |
| `/api/chat` | `app/api/chat/route.ts` | public, rate-limited (D7) |
| `/api/inquire-chat` | `app/api/inquire-chat/route.ts` | public, rate-limited; the per-demo inquiry chat (lead-scoped system prompt, never quotes a price); 503-degrades to the form when the gateway/DB is off |
| `/api/inbound` | Resend/Svix inbound email | signature-verified (D2) |
| `/api/whatsapp` | WhatsApp Cloud webhook | signature-verified (D2) |
| `/api/telegram` | Telegram bot webhook | secret-token check; notify + ack only, never emits `reply/received` |

**Routes that do NOT exist** — do not link them, do not smoke-test them:
- no `/audits/[id]`, no `/demos/[id]`, no `/deals/[id]`. `/audits`, `/demos` and `/deals` are list screens with a `?lead=<id>` deep-link contract (`searchParams.lead`). The only detail subroutes are `/rooms/[id]`, `/agents/[id]`, `/deals/[id]/proposal`.
- no `app/api/inngest`.

Every route is dynamic SSR (the root layout reads theme/lang cookies and the workspace layout runs the auth gate). There is no static export.

## How it works

**A workspace request.** `app/layout.tsx` (server) reads cookies + `getCurrentUser()`/`getLeads()`/`getDemoRequests()`/`getSettings()` on *every* request, including marketing routes → `app/providers.tsx` mounts Theme > I18n > Auth > WorkspaceState > Toast → `app/(workspace)/layout.tsx` runs the **real auth gate** (`getCurrentUser()` from `lib/auth/session.ts`; `middleware.ts` is only a cookie-existence bounce, U8) and mounts `WorkspaceDataProvider` → the page `await`s repositories → the `'use client'` screen renders props. Repositories branch on `USE_DB` first and fall back to the mock `AV` (O1).

**A mutation.** Client screen → `WorkspaceStateProvider` (optimistic) → a `'use server'` action in `lib/actions/*` → the `USE_DB` degrade branch → the auth guard (`guardMutation()` from `lib/actions/guard.ts`, or a direct `getCurrentUser()` check) → Drizzle write → optionally `inngest.send(...)` → `revalidatePath()`. In demo mode the action no-ops and the *provider* persists to localStorage.

**A pipeline run** (the autonomous path). `auto-discovery` (cron, worker) or `lib/actions/run-discovery.ts` (web) both call the one worker-safe core `lib/discovery/run-discovery-core.ts` → eligible leads get a `pipeline_runs` row via `startPipelineRun` → `audit/requested` → `run-audit` works, writes `audits`/`audit_jobs`, emits `audit/completed` → `orchestrate-pipeline` re-reads the run row *inside* `step.run('decide')`, asks the pure `decideNextHop` (`lib/inngest/pipeline-machine.ts`) and either emits the next request event, parks the run and opens an escalation, completes it, or fails it. Worker functions stay dumb: **do work → emit exactly one fact** (C1, C7). Everything after `outreach/sent` (reply → deal → delivery) is deal-driven, not run-tracked.

## Subsystem map

| Subsystem | Entry file | Spec |
|---|---|---|
| Data layer, dual-mode, schema, auth | `lib/repositories/config.ts` | [data-layer.md](./data-layer.md) |
| Lead discovery + the autonomous market hunter | `lib/discovery/run-discovery-core.ts` | [discovery.md](./discovery.md) |
| Website audit (PageSpeed / Lighthouse / Gemini / greenfield) | `lib/inngest/functions/run-audit.ts` | [audit.md](./audit.md) |
| Agent runtime (`claude` CLI runner, registry, validators) | `lib/agents/runner.ts` | [agents-runtime.md](./agents-runtime.md) |
| Demo generation (the pass pipeline + `/demo/[leadId]`) | `lib/agents/pipelines/demo.ts` | [demo-gen.md](./demo-gen.md) |
| Pipeline orchestrator, autonomy gates, escalations | `lib/inngest/pipeline-machine.ts` | [pipeline-orchestrator.md](./pipeline-orchestrator.md) |
| Outreach channels + inbound webhooks | `lib/integrations/outreach-channel.ts` | [outreach-inbound.md](./outreach-inbound.md) |
| Deals, Closer, proposals, delivery builds, ledger | `lib/data/deal-stage-machine.ts` | [deals-proposals-delivery.md](./deals-proposals-delivery.md) |
| App Router, design system, i18n | `app/(workspace)/layout.tsx` | [ui-i18n.md](./ui-i18n.md) |
| Compose topology, env files, CI, gates | `docker-compose.yml` | [ops-runtime.md](./ops-runtime.md) |

## Where truth lives

| Doc | Owns |
|---|---|
| `CLAUDE.md` | The AI contract: dual-mode in one paragraph, the verification gate, the top NEVER lines, conventions, and the routing table to these specs. |
| `README.md` | Human front door: what this is, stack, quickstart, repo map. Owns no spec fact. |
| `docs/invariants.md` | **Every rule whose violation breaks the repo** — with WHAT BREAKS and ENFORCED BY. The rationale lives here and nowhere else; specs cite invariants by ID. |
| `docs/env-reference.md` | **Every env var**: reader, default, unset behavior, and which file it must live in (`.env.local` vs `./.env`). No other doc explains a var. |
| `docs/specs/architecture-map.md` (this file) | Runtimes, module graph, event bus, routes, subsystem index, this table. |
| `docs/specs/*.md` | One subsystem each — its contracts, flow, extension recipes, traps, test coverage. |
| `docs/deployment-guide.md` | Runbook only: stand up and operate a VPS. |
| `docs/development-roadmap.md` | Done vs pending vs key-gated, per subsystem. Status claims live only here. |
| `docs/product-vision.md` | Product thesis, personas, funnel narrative. No status, no architecture. |
| `docs/journals/` | **A dated ARCHIVE of session reflections. Never cite a journal as current behavior** — the newest entry predates most of the system described here. |
| `.env.example` | The machine-readable twin of `env-reference.md`. |
| `plans/` | Vietnamese plan files. **Gitignored** — not present in a fresh clone. |

Counts (tables, routes, tests, agents) are deliberately absent from prose everywhere. The code is the count — `find`, `ls`, `grep`.

## Invariants

Governing this file's surface; full text in [../invariants.md](../invariants.md):

- **B1** — worker-chain modules: relative imports, no `server-only`, no `next/*`, no `lib/repositories/*`.
- **B2** — web never imports `lib/audit/*`, `lib/agents/*`, `lib/demo-gen/*`, `lib/inngest/functions/*`; it may only `inngest.send()`.
- **B3** — a `'use client'` file never value-imports repositories, `lib/db/*`, `lib/auth/session.ts` or `next/headers`.
- **B4** — components never import the mock `AV` (sole exception: `workspace-data-provider.tsx`).
- **C1** — every terminal path in a pipeline worker function emits its fact event.
- **C2** — run-scoped fact event ids are keyed by `runId`, never `leadId`.
- **C7** — only the orchestrator writes `pipeline_runs` stage/status.
- **D6** — the `/demo/[leadId]` CSP stays.
- **U6** — props crossing server→client are serializable; `params`/`searchParams`/`cookies()` are Promises.
- **U8** — `app/(workspace)/layout.tsx` is the real auth gate; middleware is not.

## Extension recipes

**To add a route:**
1. Create `app/(workspace)/<name>/page.tsx` as an async Server Component that `await`s repositories and passes serializable props (only make it `'use client'` if it needs zero server data).
2. Create the `'use client'` screen under `components/workspace/<name>/`.
3. Add the sidebar `NAV` entry, the `components/workspace/route-meta.ts` entry, and the `middleware.ts` matcher path.
4. Add the i18n keys (EN **and** VI) — see [ui-i18n.md](./ui-i18n.md) for the full recipe.
5. **Update the route inventory in this file.** It is the only inventory; a route missing here does not exist to the next agent.

**To add an Inngest event + worker function:**
1. Declare the payload interface in `lib/inngest/client.ts`.
2. Create `lib/inngest/functions/<name>.ts` — relative imports, no `server-only` (B1); give it a concurrency guard; if it belongs to a pipeline run, emit its fact on **every** terminal path including `onFailure` (C1) with a `runId`-keyed id (C2).
3. Register it in the `functions: [...]` array of `lib/inngest/worker-entrypoint.ts`. Unregistered = silently dead.
4. Send the event from web with `inngest.send()` — never import the function (B2).
5. Add the entry file to `ENTRY_FILES` in `tests/discovery/run-discovery-core-worker-safety.test.ts` so its import closure is actually checked for tsx-safety.
6. **Add the event to the event-bus table above** (name, payload, sender, consumer).
7. `npm run typecheck && npm run test`, then rebuild the worker image.

## Traps

- **`npx inngest dev` alone runs nothing.** No `app/api/inngest` route exists; only the `worker` container serves functions.
- **A function you forgot to register in `worker-entrypoint.ts` fails silently** — `inngest.send()` succeeds, the work never happens, and a pipeline lead strands with no fact to close its run.
- **`delivery/completed` has no consumer.** If you assumed a delivery hop exists, it does not; the pipeline machine terminates at `outreach`.
- **`proposal/requested` carries no event id** — a double-click can enqueue two jobs; only Resend's `idempotencyKey` prevents the duplicate email.
- **The mock `AV` still ships in the client bundle** via `workspace-data-provider.tsx`. Seeing `AV` in a client file is not automatically the bug you think it is — but adding a second one is.
- **`docker-compose.override.yml` is auto-merged by every `docker compose` command run in the repo dir**, replacing the Inngest command with keyless `inngest dev` and setting `INNGEST_DEV=1` on `web` + `worker`. See [ops-runtime.md](./ops-runtime.md) before deploying.
- **`docs/journals/` reads like documentation and is not.** It is a dated archive; its "current state" was current months ago.

## Tests

What guards this map today:
- `tests/discovery/run-discovery-core-worker-safety.test.ts` statically walks the runtime import closure of `run-discovery-core.ts`, `auto-discovery.ts` and `start-pipeline-run.ts` and fails on `server-only` / `@/` / `next/*` (B1).
- `tests/inngest/pipeline-machine.test.ts` covers the pure hop decisions; `tests/db/pipeline-orchestration.test.ts` and `tests/db/pipeline-gates.test.ts` cover the actions (DB suite, `npm run test:db`).

What guards **nothing**:
- **B2 is enforced by nothing** — no lint rule, no test, no bundler externals stop `app/**` from importing `lib/audit/*` or a worker function. It is clean today by discipline alone.
- **B1 is enforced only for the entry files in that test's `ENTRY_FILES`** (`run-discovery-core.ts`, `auto-discovery.ts`, `start-pipeline-run.ts`). Every other worker function — `run-audit`, `run-demo-gen`, `orchestrate-pipeline`, `run-outreach`, `run-build`, `run-support`, `handle-reply`, `send-proposal` — is unguarded; a bad import there surfaces only when the container boots.
- **No test imports any Inngest function**, and `vitest.config.ts` excludes `lib/inngest/functions/**` from coverage. Event wiring (triggers, ids, fan-out, `worker-entrypoint` registration) is verified by nobody.
- **B3 is a build-time guarantee only.** Vitest stubs `server-only` (`tests/shims/empty.ts`), so the unit suite can never catch a client-boundary violation — `npm run build` is what catches it.
- Route existence is unverified: no test asserts the route table, and `tests/e2e/` (Playwright) is not run in CI.
