# Pipeline Orchestrator — Spec

> One durable Inngest function routes a lead through audit → demo → outreach. Owner-of-truth for: the `pipeline_runs` ledger, the hop/guard table, the autonomy gate, the Inngest event catalogue and registration, pipeline/gate escalations, run idempotency, and the cost ledger.

## Boundary

**In scope**

- `lib/inngest/pipeline-machine.ts` — the pure decision brain (no I/O). Legal hops, the autonomy gate, resume/halt, `ACTIVE_RUN_STATUSES`.
- `lib/inngest/functions/orchestrate-pipeline.ts` — the only writer of `pipeline_runs.stage/status` once a run exists.
- `lib/inngest/start-pipeline-run.ts` — opens the run ticket + fires the first event (worker-safe, shared with the discovery auto-chain).
- `lib/inngest/client.ts` — the Inngest client + **all** event payload interfaces.
- `lib/inngest/worker-entrypoint.ts` — the registry: a function not listed here never runs.
- `lib/db/schema/pipeline-runs.ts` (ledger + active-lead index), the `escalations` gate rows, `lib/actions/escalations.ts` (approve/reject/take-over), `lib/actions/start-pipeline.ts`, `lib/repositories/pipeline-runs.ts`, `lib/data/cost-meter.ts`, `lib/inngest/functions/auto-discovery.ts`, `lib/inngest/functions/reap-stale-runs.ts` (the stranded-run backstop).

**Out of scope** — what each worker *does* inside its steps: `audit.md`, `demo-gen.md`, `outreach-inbound.md`, `discovery.md`. Everything **after** `outreach/sent` (reply → deal → proposal → delivery) is **deal-driven, not run-tracked**: `deals-proposals-delivery.md`.

**Runtime.** Every Inngest function runs **only in the `worker` container**, registered over an outbound `connect()` in `worker-entrypoint.ts`. The `web` container never imports a function module — it only `inngest.send`s (server actions, `app/api/*`). Worker-chain modules are tsx-safe: relative imports, no `server-only` (invariant **B1**).

## Contracts

### Tables (`lib/db/schema/pipeline-runs.ts`, `lib/db/schema/ops.ts`)

| Table | Shape that other code depends on |
|---|---|
| `pipeline_runs` | `id` (`text` PK holding a `randomUUID` minted by `startPipelineRun` — *not* leadId), `lead_id` (FK → leads, `ON DELETE CASCADE`), `stage`, `status`, `autonomy_snapshot`, `error`, `started_at`, `updated_at`. Index `pipeline_runs_active_lead_idx`: **partial-unique on `lead_id` WHERE status ∈ `ACTIVE_RUN_STATUSES`** — at most one in-flight run per lead. |
| `escalations` | `kind` is free **TEXT** (no enum), `status` ∈ open\|resolved\|dismissed, nullable `deal_id` and `run_id` (both FK `ON DELETE SET NULL`). A gate row carries the run; a parked draft carries the draft (`title` = subject, `rec` = body). |

Enums: `pipeline_stage` = `audit｜demo｜outreach｜reply｜deal｜delivery` (a forward-compatible superset — only `audit`, `demo`, `outreach` are reachable today); `pipeline_run_status` = `running｜waiting_approval｜paused｜done｜failed`; `autonomy_mode` = `manual｜review｜guarded｜full` (`lib/db/schema/enums.ts` → `autonomyModeEnum`; the TS type is `AutonomyMode` in `lib/data/deal-stage-machine.ts`). **There is no `autopilot` mode.**

### Events (payload interfaces all live in `lib/inngest/client.ts`; call sites cast — there is no zod schema)

| Event | Payload | Sent by | Handled by |
|---|---|---|---|
| `audit/requested` | `AuditRequestedData` | `startPipelineRun` (id `audit/requested:<runId>`); `lib/actions/run-audit.ts` (no runId); the orchestrator on resume-from-pause | `run-audit` |
| `demo/requested` | `DemoRequestedData` | orchestrator hop; `lib/actions/run-demo-gen.ts` (no runId) | `run-demo-gen` |
| `outreach/requested` | `OutreachRequestedData` | orchestrator hop; `lib/actions/send-outreach.ts` (no runId) | `run-outreach` |
| `audit/completed` | `PipelineFactData` | `run-audit` success **and** its `onFailure` — same id `audit/completed:<runId>` | `orchestrate-pipeline` |
| `demo/completed` | `PipelineFactData` | `run-demo-gen` success + `onFailure` — id `demo/completed:<runId>` | `orchestrate-pipeline` |
| `outreach/sent` | `OutreachSentData` | `run-outreach` (send, every skip path, `onFailure`); `rejectOutreachEscalation` / `takeOverEscalation` — id `outreach/sent:<runId>` | `orchestrate-pipeline` |
| `outreach/approved` | `OutreachApprovedData` | `approveOutreachEscalation` (subject/body read off the escalation row) | `run-outreach` |
| `pipeline/resumed` | `PipelineControlData` | `approvePipelineEscalation` (id `pipeline/resumed:<escId>`); `resumePipelineRun` (id keyed by the run's `updatedAt`, one per pause cycle) | `orchestrate-pipeline` |
| `pipeline/halted` | `PipelineControlData` | `rejectPipelineEscalation`, `takeOverEscalation` on a `pipeline` row | `orchestrate-pipeline` |
| `deal/won` | `DealWonData` | `approveDealEscalation`, `lib/actions/deals.ts`, `handle-reply` — id `deal/won:<dealId>` | **fans out to `run-build` AND `run-support`** |
| `reply/received` | `ReplyReceivedData` | `/api/inbound`, `/api/whatsapp`, `lib/actions/ingest-reply.ts` | `handle-reply` |
| `proposal/requested` | `ProposalRequestedData` | `lib/actions/email-proposal.ts` — **no event id** | `send-proposal` |
| `support/approved` | `SupportApprovedData` | `approveSupportEscalation` | `run-support` |
| `delivery/completed` | `DeliveryCompletedData` | `run-build` | **nobody** — no trigger consumes it |
| cron | — | `AUTO_DISCOVERY_CRON` (UTC) | `auto-discovery` |
| cron | — | `REAP_STALE_RUNS_CRON` | `reap-stale-runs` |

### Public functions

| Symbol | File | Notes |
|---|---|---|
| `startPipelineRun(leadId, autonomySnapshot)` | `lib/inngest/start-pipeline-run.ts` | Worker-safe. Insert `onConflictDoNothing().returning()` → empty means a run is already active → `{ok:false}`. |
| `startPipeline`, `pausePipelineRun`, `resumePipelineRun` | `lib/actions/start-pipeline.ts` | `'use server'`, auth-gated, degrade without DB. **Zero callers in `app/` or `components/`** — see Traps. |
| `getActivePipelineRuns()` | `lib/repositories/pipeline-runs.ts` | Web-side read; `[]` in mock mode. Also zero UI callers; the dashboard reads `pipeline_runs` directly in `lib/repositories/agent-activity.ts` and `lib/repositories/ops.ts`. |
| `decideNextHop`, `decideResume`, `decideHalt`, `ACTIVE_RUN_STATUSES`, `FACT_FROM_STAGE`, `RESUME_HOP`, `STAGE_REQUEST_EVENT` | `lib/inngest/pipeline-machine.ts` | Pure; imported by the orchestrator, the schema (index predicate), the repos, and the unit tests. |
| `computeCostMeter(runs, {costPerRun, dailyCap})` | `lib/data/cost-meter.ts` | Pure, client-safe. |

Env vars this slice reads (**explained only in `../env-reference.md`**): `INNGEST_DEV`, `INNGEST_BASE_URL`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `AUTO_DISCOVERY_CRON`, `REAP_STALE_RUNS_CRON`, `PIPELINE_RUN_TIMEOUT_MIN`, `PIPELINE_DAILY_CAP`, `CLAUDE_AGENT_CONCURRENCY`, `AUDIT_CONCURRENCY`.

## How it works

**1 — Start.** `startPipelineRun` inserts a `pipeline_runs` row (`stage: 'audit'`, `status: 'running'`, `autonomySnapshot` = live settings) and sends `audit/requested` with id `audit/requested:<runId>`. The partial-unique index is the arbiter: a concurrent/duplicate start inserts nothing and returns `{ok:false}` — no event is sent. Callers: the discovery auto-chain (`lib/discovery/run-discovery-core.ts`) and the (currently uncalled) `startPipeline` action.

**2 — Workers stay dumb.** A worker function does its work, then emits exactly one fact (`PipelineFactData`) — `outcome:'ok'` on success, `outcome:'failed'` from its `onFailure` (retries exhausted) or from any early-return skip path. `run-audit` and `run-demo-gen` emit the fact **only when `runId` is present**; without it the event is a one-off and drives no run.

**3 — The orchestrator decides.** `orchestrate-pipeline` triggers on `audit/completed`, `demo/completed`, `outreach/sent`, `pipeline/resumed`, `pipeline/halted`; `retries: 2`; serialized per run (`concurrency: [{ limit: 1, key: 'event.data.runId' }]`). Its first step, `step.run('decide')`, reads the run row + **live** settings (missing settings row ⇒ `guarded`) and calls the machine. The decision is memoized inside the step because the orchestrator's own writes mutate the row it read (invariant **C3**).

**Guards, in this order** (`decideNextHop`), before any hop is considered:

1. `status === 'paused'` → `stop`.
2. `status === 'waiting_approval'` → `stop`. **A redelivered fact can never release a gate**, even if autonomy was flipped to `full` in the meantime. Only `pipeline/resumed` releases it.
3. `status` is `done` or `failed` → `stop`.
4. `run.stage !== FACT_FROM_STAGE[fact]` → `stop` (stale / duplicate at-least-once delivery).
5. `outcome === 'failed'` → `fail` the run.

**Hop table** (only then):

| Fact | `manual` / `review` | `guarded` / `full` |
|---|---|---|
| `audit/completed` | `gate` at `audit` | `emit demo/requested` (audit → demo) |
| `demo/completed` | `gate` at `demo` | `emit outreach/requested` (demo → outreach) |
| `outreach/sent` | `done` | `done` |

**`guarded` and `full` are IDENTICAL inside the machine** (`PRECLIENT_AUTOHOP_MODES = ['guarded','full']`). The send gate is **downstream, in `run-outreach`**: it sends unattended only when the live `autonomyMode === 'full'`; every other mode (including `guarded`) parks the draft as an `outreach` escalation. So the founder gate lands at audit→demo and demo→outreach under manual/review, and at **the send itself** under manual/review/**guarded** (invariant **O3**).

**4 — Applying the hop.**

- `emit` → `step.run('advance-stage')` updates the row **pinned to `(id, stage = hop.from, status = hop.fromStatus)`** (an auto-hop claims a `running` row; a founder resume claims `waiting_approval`/`paused`), then `step.sendEvent` fires the next request with id `<event>:<runId>`. A resume-from-pause (`hop.from === hop.to`) mints a **fresh** id from the delivery (`<event>:<runId>:<event.id>`) because the stage-keyed id was already consumed.
- `gate` → `step.run('park-and-escalate')` runs **one transaction**: conditionally park (`running` → `waiting_approval`, `.returning()`) and, only if this delivery is the one that parked it, insert the escalation `esc-pipeline-<runId>-<stage>` (kind `pipeline`, `runId` set) with `onConflictDoUpdate` re-opening it. Rolling back together is what keeps a retry from finding the run parked with no escalation (invariant **C5**).
- `done` → mark `done` (pinned to `stage = hop.from`, `status = 'running'`), then `step.run('cost-check')`.
- `fail` → set `status: 'failed'`, `error: reason`, conditioned on `status ∈ ACTIVE_RUN_STATUSES`.
- `stop` → return; nothing is written.

**5 — Resume / halt.** `decideResume`: a `waiting_approval` run releases `RESUME_HOP[stage]` (audit → `demo/requested`, demo → `outreach/requested`); a `paused` run **re-fires its current stage** via `STAGE_REQUEST_EVENT[stage]` (`from === to`) — a fact that arrived during the pause was already consumed by the `stop` branch, so waiting for it would strand the run. Re-running a stage is safe by design (audit re-audits, the demo save is idempotent, outreach's sendable-guard + idempotency key prevent a double send). `decideHalt` acts only on a `waiting_approval` run → `fail`.

**6 — Cost ledger.** On the `done` hop only, `cost-check` counts all `pipeline_runs` started since **local** midnight and calls `computeCostMeter` with `settings.guardrails.costPerRun` (default `0.4`) and `settings.guardrails.dailyCostLimit` (default `50`). At ≥80 % (`nearCap`) it upserts a single `esc-cost-<YYYY-MM-DD>` escalation (`setWhere status <> 'dismissed'`), sev `high` at ≥100 %. It is an **ESTIMATE, not a bill** (the subscription has no per-token billing) and it **never halts a run** (invariant **M5**).

**7 — Terminal safety.** If the orchestrator itself exhausts retries, its `onFailure` marks the run `failed` — otherwise it would sit `running` forever with no fact left to move it, and the active-lead index would block every future run for that lead.

**8 — Stranded-run reaper (backstop).** Section 7's `onFailure` only fires when a function *finishes* failing. It cannot catch the case where a **worker process** dies mid-step (an OOM kill, a crash, a lost gateway that outlasts the retries): no `onFailure` runs at all, so the run keeps `status: 'running'` with no fact left to move it. `reap-stale-runs` (cron `REAP_STALE_RUNS_CRON`, `retries: 0`, keyless `concurrency: 1`) is the backstop: one `step.run` UPDATEs every run whose `status = 'running'` and whose `updatedAt` is older than `PIPELINE_RUN_TIMEOUT_MIN` to `failed`, freeing the lead from the active-lead index. It touches **only** `'running'` — never `'waiting_approval'` (a founder gate) or `'paused'` (the kill switch), whose holds are intentional and must not age out. It is the last resort, not the primary rule: invariant **C1** (every terminal worker path emits its fact) is what keeps runs from ever needing it.

## Invariants

Governed by (one-line imperative; rationale + what-enforces live in **`../invariants.md`** — do not restate it here):

- **B1** — worker-chain modules use relative imports and never `import 'server-only'` / `next/*` / `lib/repositories/*`.
- **C1** — every terminal path in a worker function emits its fact (`outcome:'ok'|'failed'`), including every early-return.
- **C2** — run-scoped fact event ids are keyed by `runId`, never `leadId`; the success emit and the `onFailure` emit deliberately **share** the id.
- **C3** — never decide a hop outside `step.run('decide')`.
- **C4** — every conditional stage write pins **both** `from`-stage and `from`-status.
- **C5** — park + insert-escalation happen in ONE transaction.
- **C6** — approve/reject/take-over actions `inngest.send` **before** marking the escalation resolved/dismissed.
- **C7** — only the orchestrator writes `pipeline_runs.stage/status` (besides the initial insert and `pausePipelineRun`).
- **C8** — escalation ids are load-bearing keys, not labels: `esc-pipeline-<runId>-<stage>`, `esc-outreach-<leadId>`, `esc-support-<leadId>`, `esc-support-failed-<leadId>`, `esc-reply-<dealId>`, `esc-proposal-failed-<dealId>`, `esc-cost-<YYYY-MM-DD>`. The approve actions recover the entity by stripping the prefix.
- **C9** — a run parked at a gate must never be paused (`pausePipelineRun` conditions on `status = 'running'`).
- **C10** — no PNG/Buffer payload crosses an Inngest `step.run` boundary.
- **F1** — `ACTIVE_RUN_STATUSES` is load-bearing DDL: the partial-unique index predicate is generated from it; changing the array requires `npm run db:generate` + migrate.
- **M2** — the auto-discovery cron keeps `retries: 0` and `concurrency: 1`.
- **M4** — do not weaken the `notExists(pipeline_runs WHERE leadId = lead.id)` re-pipeline guard in the discovery auto-chain.
- **M5** — the cost meter is an estimate, never a bill, and never blocks a run.
- **O3** — `guarded` ≠ "sends": only `full` sends unattended. Any new outbound channel replicates that gate.
- **O5** — never cold-contact a lead whose `stage !== 'found'` or `demo === 'sent'`; never resurrect a founder-**dismissed** draft.
- **R3** — a keyless fn-scoped Inngest concurrency limit is per function, not a shared budget.

## Extension recipes

### To add a new hop (e.g. `outreach → follow-up`)

1. `lib/db/schema/pipeline-runs.ts` — if the stage isn't already in `pipelineStageEnum` (`reply`, `deal`, `delivery` are reserved and unused), add it → `npm run db:generate` → commit the migration.
2. `lib/inngest/client.ts` — declare `XRequestedData { leadId; runId?: string }`, add the fact name to `PipelineFactName`; keep the fact payload as `PipelineFactData`.
3. `lib/inngest/pipeline-machine.ts` — add the stage to `PipelineStage`, the fact to `PipelineFact`, the entry to `FACT_FROM_STAGE`, the emit name to `PipelineEmitEvent`, a `case` in `decideNextHop` returning `emit` under the modes you allow and `gate` otherwise, **plus** entries in `RESUME_HOP` **and** `STAGE_REQUEST_EVENT` — omitting either makes `decideResume` return `stop` and strands every gated/paused run at the new stage.
4. `lib/inngest/functions/run-<x>.ts` — new function: relative imports, no `server-only`; per-lead concurrency key; memoize each expensive call in its own `step.run`; on success `step.sendEvent` the fact with id `<fact>:<runId>` **only when `runId` is present**; add an `onFailure` emitting the SAME id with `outcome:'failed'`; make **every** early-return skip path emit the failed fact too (**C1**).
5. `orchestrate-pipeline.ts` — add `{ event: '<new>/completed' }` to `triggers`.
6. `worker-entrypoint.ts` — register the function. Unregistered ⇒ its events queue forever and the run strands.
7. `tests/inngest/pipeline-machine.test.ts` — add cases: auto-hop per mode, gate per mode, stale-fact stop, failed-outcome fail, resume, halt.
8. If the hop needs its own founder gate: add an approve/reject action to `lib/actions/escalations.ts` (**emit before update**) **and** a branch for the new `kind` in **both** `components/workspace/command/command-center.tsx` and `components/workspace/review-center.tsx` — miss either and the founder's click falls through to the generic `resolveEscalation`, which resolves the row and strands the run.
9. `npm run typecheck && npm run test` (pass with no DB/keys); `npm run test:db` for the DB suites.

### To add a deal-driven (non-pipeline) worker function

Trigger off an existing domain event (`deal/won`, `reply/received`) — **not** `pipeline_runs`, which stops at `outreach/sent`. Give the emitter a deterministic event id (`deal/won:<dealId>`), keep the writes idempotent (upsert keyed by `leadId`/`dealId`), register in `worker-entrypoint.ts`. Remember `deal/won` already fans out to two functions.

### To add a founder-gated draft ("approve before send")

Mirror Echo (`run-outreach`): deterministic escalation id `esc-<kind>-<entityId>`; draft in `title` (subject) + `rec` (body); `onConflictDoUpdate(... setWhere status <> 'dismissed')` + `.returning()` to detect a previously-dismissed row; an `<x>/approved` event carrying subject/body (and `runId` if the flow belongs to a run); an approve action that emits **before** resolving; and — if it belongs to a run — a failed-fact emit on **every** path that does not send.

## Traps

- **`guarded` looks autonomous but does not send.** Inside the machine it is identical to `full`. The only difference is `run-outreach`'s send check. Do not "simplify" the two modes into one.
- **A `pipeline` escalation with a NULL `run_id` strands its run.** Both `command-center.tsx` and `review-center.tsx` branch on `kind === 'pipeline' && !!e.runId`; a null `runId` (the FK is `ON DELETE SET NULL`) falls through to the generic `resolveEscalation` — the row resolves, the run stays `waiting_approval` forever, and the lead can never start a new run.
- **The reaper is a backstop, not a licence to skip a fact.** `reap-stale-runs` (see "How it works") now fails a run left `running` at a stage whose request event was never consumed (worker down, event dropped before registration) — but only once it ages past `PIPELINE_RUN_TIMEOUT_MIN`. Until then the partial-unique index blocks every future run for that lead, so a run reaped instead of completed is still a lost stage-plus for that lead. This is why **C1** still matters more than anything else in this file — `run-outreach` emits the failed fact on every non-sending exit: `loadSendable`'s skips (channel not configured, no absolute app URL configured, lead not found, opted out via `doNotContact`, already contacted, lead past `found`, no recipient, no ready demo), a previously-dismissed draft, and `onFailure`.
- **`run-outreach`'s SUCCESS emits are not `runId`-guarded.** `run-audit` and `run-demo-gen` wrap every fact emit in `if (runId)`; `run-outreach` does so on its skip paths and `onFailure`, but **not** on the two `emit-sent` steps (`outreach/requested` full-autonomy send, `outreach/approved` send) — they send `outreach/sent` with `runId: undefined` and an id falling back to `outreach/sent:<leadId>`. A one-off outreach from `lib/actions/send-outreach.ts` therefore still triggers `orchestrate-pipeline`, whose `decide` step queries `pipeline_runs` with an undefined id and whose concurrency key is undefined. Guard `runId` before adding logic there.
- **`proposal/requested` is the only send with no event id** — a double-click can enqueue two proposal jobs; only Resend's `idempotencyKey: proposal:<dealId>` stops the duplicate email.
- **`delivery/completed` has no consumer.** Emitting it does nothing today.
- **The autonomy gate is read LIVE per hop.** `pipeline_runs.autonomy_snapshot` is record-only. Do not "fix" the orchestrator to read the snapshot.
- **The cost check only runs on the `done` hop.** A day full of gated or failed runs never re-evaluates the cap. And the guardrail keys are `dailyCostLimit` / `costPerRun` — an earlier draft read `dailyCostCap`, so the founder's cap silently never applied.
- **The machine is imported from both runtimes**: relatively by `lib/db/schema/pipeline-runs.ts` (worker/tsx, for the index predicate) and via `@/` by `lib/repositories/pipeline-runs.ts` (web, `server-only`). It must therefore never gain a `server-only` or `@/` dependency (**B1**).
- **The `claude`-CLI functions share ONE concurrency budget.** `run-demo-gen`, `run-build`, `run-outreach`, `run-support`, and `handle-reply` each carry an identical `{ scope: 'account', key: '"claude-agent"', limit: CLAUDE_AGENT_CONCURRENCY }` as their **first** concurrency entry (a per-`leadId`/`dealId` key is the second). An account-scoped key is deliberately shared across every function that declares it, so the true global ceiling on concurrent `claude` CLI invocations is `CLAUDE_AGENT_CONCURRENCY` itself — **not** that limit multiplied once per function. Raising it without raising the worker's memory OOM-kills the worker. Do not confuse this shared key with the keyless fn-scoped `concurrency: 1` on `auto-discovery` / `reap-stale-runs`, which is per-function (**R3**).
- **No global kill-switch exists**, despite what the deleted docs claimed. `pausePipelineRun(runId)` is per-run. Setting autonomy to `manual` does **not** stop in-flight runs — it only makes the **next** hop gate.
- **The pipeline has no UI surface.** `startPipeline`, `pausePipelineRun`, `resumePipelineRun` and `getActivePipelineRuns` have zero callers in `app/` or `components/`. Runs start **only** from the discovery auto-chain (guarded/full, contactable lead, no real website, never previously piped, under `PIPELINE_DAILY_CAP`). Today the founder can only approve/reject/take-over a run's gate escalation; runs surface read-only through the agent overlay and the dashboard metrics.

## Tests

**What guards this today**

| Suite | Command | Covers |
|---|---|---|
| `tests/inngest/pipeline-machine.test.ts` | `npm run test` (no DB, no keys) | The pure machine: `FACT_FROM_STAGE`, the exact value of `ACTIVE_RUN_STATUSES`, auto-hop vs gate per mode, `done` in every mode, failed-outcome → fail, paused/parked/terminal/stale stops, a parked run not released by a redelivered fact, `decideResume` (gate + pause re-fire), `decideHalt`. |
| `tests/db/pipeline-orchestration.test.ts` | `npm run test:db` (needs `DATABASE_URL` + `USE_DB=true`; runs in CI on a Postgres service) | `startPipeline` idempotency against the active-lead index; `pausePipelineRun` pauses a `running` run and refuses a parked one (**C9**). |
| `tests/db/pipeline-gates.test.ts` | `npm run test:db` | Approve → `pipeline/resumed` + resolved; reject → `pipeline/halted` + dismissed; an escalation with no `runId` emits nothing; a failed `inngest.send` leaves the row **open** and re-actionable (**C6**). |
| `tests/db/delivery-flow.test.ts` | `npm run test:db` | `getActivePipelineRuns` surfaces an in-flight run and drops it once terminal. |
| `tests/discovery/run-discovery-core-worker-safety.test.ts` | `npm run test` | **B1**, statically: walks the runtime import closure of its `ENTRY_FILES` — of this slice, only `start-pipeline-run.ts` and `auto-discovery.ts`. Add a new worker function's entry file to `ENTRY_FILES` or it is unguarded. |

**What does NOT guard it — say it plainly**

- **No test executes any Inngest function.** `orchestrate-pipeline`, `run-audit`, `run-demo-gen`, `run-outreach`, `run-build`, `run-support`, `handle-reply`, `send-proposal`, `auto-discovery`, `reap-stale-runs` are never executed by the suite. The machine's *decisions* are pinned; their *application* — the conditional stage writes, the park+escalate transaction, the event ids, the `cost-check` upsert, the reaper's age-out UPDATE, the `onFailure` handlers — has **zero automated coverage**.
- `vitest.config.ts` excludes `lib/inngest/functions/**` and `lib/inngest/worker-entrypoint.ts` from coverage, so the gap is invisible in the coverage report.
- Nothing links `ACTIVE_RUN_STATUSES` to the generated migration (**F1**); a unit test pins the array's value, not the DDL.
- Nothing tests the escalation-id formats end to end (**C8**) or the NULL-`runId` fall-through in the UI.
