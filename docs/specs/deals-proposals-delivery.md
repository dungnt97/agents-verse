# Deals, Proposals & Delivery — Spec

> Subsystems 5 + 6: what happens to a lead **after** a client replies. Owner-of-truth for: the deal stage machine,
> the Closer reply loop, proposals/quotes + the PDF path, the `builds` delivery table, post-sale onboarding, and the
> cost ledger.

## ⚠ Read this before you build anything here

**No code path ever CREATES a `deals` row.** The only `insert(deals)` in the repo is `lib/db/seed.ts` — and it lives in
`seedDemoData()`, which is opt-in behind `SEED_DEMO_DATA=true` (the DB-integration-test fixture). In a real DB the
`deals` table is **empty and unfillable**:

- `lib/inngest/pipeline-machine.ts` (`decideNextHop`) terminates the acquisition funnel at `outreach/sent` → `{ kind: 'done' }`. It never hops to reply/deal/delivery.
- Both inbound webhooks map sender → `leads` → `deals` and **200-ignore** when no deal row matches (`app/api/inbound/route.ts`, `app/api/whatsapp/route.ts`).
- `handleReply` early-returns `deal not found`. `runBuild` / `runSupport` / `sendProposal` all start from a `dealId`.

So **the entire reply → deal → delivery half of the funnel is unreachable for a real discovered lead.** Any doc, prompt,
or demo script claiming "discover → audit → demo → outreach → reply → deal → delivery runs end-to-end" is describing
something the code cannot do. Building the missing hop is the highest-value work in this subsystem — recipe below.

## Boundary

**In scope:** `lib/data/deal-stage-machine.ts` · `lib/agents/defs/closer-sales.ts` · `lib/inngest/functions/handle-reply.ts`,
`run-build.ts`, `run-support.ts`, `send-proposal.ts` · `lib/proposals/*` · `lib/actions/deals.ts`, `email-proposal.ts`,
`ingest-reply.ts`, the deal/support halves of `escalations.ts` · `lib/db/schema/builds.ts` + the `deals` table ·
`lib/data/cost-meter.ts`, `lib/data/agent-rates.ts` · `components/workspace/deals/*` · `app/(workspace)/deals/[id]/proposal/page.tsx`.

**Out of scope:** the outreach channels + the inbound webhooks (`app/api/inbound`, `app/api/whatsapp`) that *produce* `reply/received` → [outreach-inbound.md](./outreach-inbound.md).
`pipeline_runs`, `decideNextHop`, autonomy gates, the cost escalation → [pipeline-orchestrator.md](./pipeline-orchestrator.md).
`runAgent` / validators / the `claude` CLI → [agents-runtime.md](./agents-runtime.md).

**Runtime split:** `handleReply`, `runBuild`, `runSupport` and `sendProposal` run **only in the worker** container
(registered in `lib/inngest/worker-entrypoint.ts`; they shell `claude` and/or drive Playwright). Web owns the server actions, the
repositories, and the print page — web may only `inngest.send`.

**Not run-tracked.** Deals are decoupled from `pipeline_runs`; these functions must **not** emit pipeline fact events.
Their durability contract is an `onFailure` escalation, not a fact.

## Contracts

| Kind | Symbol / name | Notes |
|---|---|---|
| Table | `deals` (`lib/db/schema/pipeline.ts`) | NOT NULL: `id`, `leadId`, `client`, `industry`, `city`, `pkg`, `price`, `value`, `probability`, `stage`, `aiRec`, `conf`, `reply` (jsonb). Nullable: `escReason`, `production`. |
| Table | `builds` (`lib/db/schema/builds.ts`) | PK = **`leadId`** (one build per lead; a re-run overwrites). `dealId` is a plain column, no FK. `status`: `building \| ready \| failed`. |
| Events | `reply/received` → `handleReply` · `deal/won` → **both** `runBuild` and `runSupport` · `proposal/requested` → `sendProposal` · `support/approved` → `runSupport` · `delivery/completed` (emitted, **no consumer**) | Payload types in `lib/inngest/client.ts` (`ReplyReceivedData`, `DealWonData`, `ProposalRequestedData`, `SupportApprovedData`, `DeliveryCompletedData`). |
| Pure machine | `DEAL_TRANSITIONS`, `canTransition`, `nextStages`, `isTerminalStage`, `isDealStage`, `requiresApproval`, `decideReplyOutcome`, `DEAL_AUTO_APPROVE_LIMIT` (4000), `DEAL_CONF_FLOOR` (70), `MAX_REPLY_CHARS` (4000) | Client-safe: no `server-only`, no drizzle. Shared by the drawer, the actions, the worker, and the tests. |
| Proposals | `buildProposal(deal, pricing) → ProposalDoc` · `buildProposalHtml(doc, date) → string` | Pure. `ProposalPricing` = `{ landingPage?, businessWebsite?, monthlyGrowthCare? }`, read defensively off the `settings.pricing` jsonb. |
| Repos | `getDeals`, `getDeal`, `dealByLead` (`lib/repositories/pipeline.ts`) · `getBuild` (`lib/repositories/builds.ts`) | All branch on `USE_DB` first; `getBuild` returns `null` in mock mode. |
| Actions | `updateDealStage`, `setProductionStage`, `toggleProductionAsset` · `emailProposal` · `ingestReply` · `approveDealEscalation` / `rejectDealEscalation` / `approveSupportEscalation` / `rejectSupportEscalation` | All auth-guarded; all degrade with no DB. |
| Ledger | `computeCostMeter`, `DEFAULT_COST_PER_RUN`, `DEFAULT_DAILY_CAP`, `COST_ALERT_FRACTION` · `AGENT_UNIT_RATE`, `estCost` | Estimates. See "Ledger" below. |
| Env | `RESEND_API_KEY`, `OUTREACH_FROM` (gate every send), `APP_URL` / `BETTER_AUTH_URL` (canonical URL), `CLAUDE_AGENT_CONCURRENCY` | Defined in `../env-reference.md` — do not re-explain them here. |

**Stage graph** (`DEAL_TRANSITIONS`, the single source of truth — `isDealStage`/`nextStages`/`isTerminalStage` all derive from it):

| from | legal next |
|---|---|
| `pricing` | `quoted`, `lost` |
| `created` | `quoted`, `lost` |
| `quoted` | `won`, `approval`, `lost` |
| `approval` | `won`, `call`, `lost` |
| `call` | `won`, `lost` |
| `won` / `lost` | — (terminal) |

## How it works

### 1. Reply → deal move (`handleReply`, worker)

1. `load-deal` (memoized step): reads the deal + `settings` (`autonomyMode`, `guardrails.autoApproveLimit`) so the decision is stable across an Inngest replay.
2. Terminal guard: `isTerminalStage(deal.stage)` → skip. A late/duplicate reply on a `won`/`lost` deal must never re-open it.
3. `interpret` (its own step, so an apply failure never re-spends the LLM call): `runAgent(closerSales, { deal, legalNextStages, text })` — sonnet, zod-validated `{ kind, interpretation, suggested, recommendedStage, conf }`. `recommendedStage` is a `DealStage` **or `'hold'`**.
4. `decideReplyOutcome` — the only gate that matters. First match wins:
   `'hold'` → escalate · illegal transition → escalate · `won` while `autonomyMode !== 'full'` → escalate ·
   `requiresApproval({value, conf, autonomyMode, threshold})` → escalate · else **advance**.
   `requiresApproval` = `manual` always gates; `review`/`guarded` gate at/above the value threshold; **any** mode gates when `conf < DEAL_CONF_FLOOR`.
5. `apply`: an advance is a conditional `UPDATE … WHERE id = ? AND stage = <the stage we decided from>` with `.returning()`. **Zero rows ⇒ the deal moved under us ⇒ fall through to the escalate branch** (the reply is surfaced, never dropped). The escalate branch is one transaction: write `reply`/`aiRec`/`conf`/`escReason` onto the deal + upsert `esc-reply-<dealId>` (kind `sales`).
6. Only an advance **to `won`** emits `deal/won` (`id: deal/won:<dealId>`).

`onFailure` re-uses the same `esc-reply-<dealId>` row with `conf: 0` — a verified reply whose interpretation terminally
fails is the founder's problem, not a lost message (the webhook's dedup id blocks re-emission, so this is its last chance).

### 2. Founder-driven moves (`updateDealStage`, web)

`guardMutation()` → `isDealStage` → `canTransition`. **Only the direct `quoted → won` shortcut is gated**: it re-reads
`settings`, runs `requiresApproval`, and on a trip parks the deal in `approval` + upserts `esc-deal-<dealId>` **in one
transaction**. From `approval`/`call`, a `won` is already the founder's decision and passes straight through.
`approveDealEscalation` resolves the row and closes the deal (only if `won` is still legal); `rejectDealEscalation`
dismisses and marks it `lost` (only if `lost` is still legal). Both do that resolve+stage write in **one transaction**;
approve then `inngest.send`s `deal/won` **after** the commit, wrapped in try/catch — a dead event bus must never fail a
committed close (reject emits nothing). This is the deliberate exception to C6's emit-first ordering.

### 3. Proposals

`buildProposal` is pure; its consumers:

- **In-app print page** — `app/(workspace)/deals/[id]/proposal/page.tsx` (Server Component) → `components/workspace/deals/proposal-document.tsx`. The founder prints to PDF from the browser. Deliberately English-only (no `t()`): it is a client-facing document.
- **Worker PDF email** — `sendProposal`: `buildProposal` → `buildProposalHtml` (standalone HTML, concrete colours, **no app CSS vars**) → `renderHtmlToPdf` (Playwright, `lib/demo-gen/render.ts`) → read the file → return **base64** from the step → `sendEmail` with a base64 attachment, `supportEmailHtml` (transactional: **no unsubscribe**), `idempotencyKey: proposal:<dealId>`. The `/tmp` html+pdf are unlinked inside the same step.

**The price ladder, and the reason this file exists:** `deal.price ?? pricing.businessWebsite ?? deal.value ?? 0`, each
rung filtered by `pos()` (finite **and** > 0). Monthly care appears only when `pricing.monthlyGrowthCare` is positive —
and it adds its own scope + terms lines. **Never fabricate a number, a date, or a discount anywhere in this path.**

`emailProposal` (web) is the approval gate: `USE_DB` → `RESEND_API_KEY` + `OUTREACH_FROM` → auth → deal exists →
`lead.email` exists → `inngest.send('proposal/requested')`. Each failure returns a toast message, never throws.
`sendProposal.onFailure` opens `esc-proposal-failed-<dealId>` + an error activity row.

### 4. Delivery (`deal/won` fans out to `runBuild` + `runSupport`)

**`runBuild` (Cipher).** Loads lead + `generated_demos` + `audits`. No `ready` demo ⇒ upsert a `failed` build
(`no ready demo to build`) and stop. Otherwise: `seo` step calls `runAgent(cipherCoder, …)` inside a **try/catch that
falls back to `fallbackMeta`** — Cipher is the **only** agent in this subsystem with a degrade path (Closer and Mira
throw and let Inngest retry). Then `injectSeo` + `localBusinessJsonLd` + `sitemapXml`/`robotsTxt` → upsert `builds`
(status `ready`) → emit `delivery/completed`. `onFailure` marks the build failed with `setWhere: status <> 'ready'` so a
committed build is never demoted. The canonical URL comes from `APP_URL || BETTER_AUTH_URL`; **unset ⇒ empty canonical**,
a sitemap with an empty `<loc>`, and a `robots.txt` with no `Sitemap:` line.

`app/demo/[leadId]/route.ts` prefers `getBuild(leadId)` when `status === 'ready'` and falls back to the raw generated
demo — that is the entire user-visible payoff of a build.

**`runSupport` (Mira).** Drafts a Vietnamese asset-request email; `autonomyMode === 'full'` sends it, every other mode
parks `esc-support-<leadId>` for founder approval (`support/approved` → send + resolve). Transactional email
(`supportEmailHtml`, `idempotencyKey: support:<leadId>`).

### 5. Ledger

`computeCostMeter(runsToday, { costPerRun: guardrails.costPerRun, dailyCap: guardrails.dailyCostLimit })` — called from
`getMetrics` (`lib/repositories/ops.ts`), which also derives `forecast = Σ(value × probability / 100)` over non-`lost`
deals. `AGENT_UNIT_RATE` + `estCost` overlay a per-agent estimated spend in `lib/repositories/agent-activity.ts`; agents
with no countable unit (closer, mira, ledger) keep their seeded cost. **All of it is an estimate, never a bill, and it
never blocks a run.**

## Invariants

Governed by (one-line imperative; rationale + what-enforces live in [`../invariants.md`](../invariants.md)):

- **O4** — a reply may only auto-close (`won`) under `autonomyMode: 'full'`, only via `decideReplyOutcome`; every stage write goes through `canTransition`; `won`/`lost` are terminal.
- **O3** — `guarded` ≠ "sends". Any new outbound message in this subsystem must gate on `full` like `runSupport` does.
- **O1** — every repo branches on `USE_DB` first; every action degrades (`guardMutation()` → `{ ok: false, message }`).
- **B1** — worker-chain modules (incl. all of `lib/proposals/`) use relative imports, no `server-only`; `import type` from `@/` is the only sanctioned alias use.
- **B2** — web never imports a worker function; web only `inngest.send`s.
- **C6** — approve/reject actions `inngest.send` **before** marking the escalation resolved. `approveSupportEscalation` follows this; the deal-escalation actions are the exception above (commit the close, then best-effort send).
- **C8** — escalation ids are load-bearing keys: `esc-deal-<dealId>`, `esc-reply-<dealId>`, `esc-support-<leadId>`, `esc-proposal-failed-<dealId>`, `esc-support-failed-<leadId>`.
- **C10** — no Buffer/PNG crosses a `step.run` boundary (this is why `render-pdf` returns base64).
- **D3** — `MAX_REPLY_CHARS` is capped at every ingest boundary; the Closer prompt keeps its `<reply>` data fence.
- **D9** — commercial mail carries `List-Unsubscribe`, transactional mail must not; every send carries a stable `idempotencyKey`.
- **M5** — the cost meter is an estimate, never a bill, never a blocker.
- **R3** — `CLAUDE_AGENT_CONCURRENCY` is per-function, not global: `handleReply`, `runBuild` and `runSupport` each declare their own limit from it (`sendProposal` hardcodes `{ limit: 2 }` and never reads the env var).

## Extension recipes

### To build the missing "reply → deal" hop (the load-bearing gap)

1. Decide the trigger: a new `deal/created` emitted from a positive `reply/received`, or a founder "Create deal" action on a `replied` lead. A reply-driven creator must run in the **worker** (it needs the Closer to judge intent); a founder action lives in `lib/actions/`.
2. Insert into `deals` with **every NOT NULL column** populated (see Contracts). `price`/`value` must come from real signals (`leads.value` from Orion, or founder input) — never a constant. `probability` feeds the dashboard forecast; `0` silently zeroes it. `reply` is `NOT NULL` jsonb — seed it with the actual inbound message, not `{}`.
3. Start the deal at `pricing` or `created` (both lead to `quoted`). Do not start at `quoted` unless a quote really went out.
4. Make it idempotent per lead: one deal per lead is the implicit assumption everywhere (`dealByLead`, `builds.leadId`). Use a deterministic id and `onConflictDoNothing`, or add a unique index on `leadId` + a migration.
5. Only after a deal exists does anything else fire — re-point the inbound routes (they currently 200-ignore an unknown sender) and confirm the pipeline machine's `outreach/sent → done` decision still holds (or extend it; that is [pipeline-orchestrator.md](./pipeline-orchestrator.md)'s file).
6. Tests: extend `tests/db/deal-automation.test.ts` (DB mode) for the insert + the NOT NULL columns, and add a unit test for whatever pure "should this reply create a deal?" predicate you introduce.

### To add a deal stage

1. Add it to `DealStage` **and** `DEAL_TRANSITIONS` (both directions — as a key and in the `readonly DealStage[]` of every stage that may reach it).
2. Add the literal to `RECOMMENDABLE_STAGES` in `lib/agents/defs/closer-sales.ts` (`satisfies readonly DealStage[]` fails the typecheck otherwise) — that array feeds the zod enum the model is validated against.
3. Re-check `decideReplyOutcome`'s special cases (the `won`-needs-`full` rule) and `updateDealStage`'s `quoted → won` gate.
4. Update the deals-screen stage filters/labels + i18n keys, and extend `tests/data/deal-stage-machine.test.ts` (it asserts graph integrity, not just examples).

### To change proposal content or pricing

Edit `lib/proposals/proposal.ts` only — both consumers read it. Keep every number on the `pos()` ladder. If you add a
rendered field, add it to **both** `proposal-document.tsx` and `buildProposalHtml` (they must not drift), keep
`proposal-html.ts` free of app CSS vars, and extend `tests/proposals/proposal.test.ts` + `proposal-html.test.ts`
(the HTML test asserts deal-supplied values are escaped).

### To add a delivery artifact (e.g. a favicon set, an og-image)

Produce it in a `runBuild` step, store it in `builds` (extend `BuildMeta` + a migration if it is metadata; a new column
if it is bytes), and serve it from `app/demo/[leadId]/route.ts` or a sibling route. Anything that needs Playwright must
launch and close **its own** browser. Give the new step a deterministic fallback like `fallbackMeta` — a build must
always ship.

## Traps

- **`lib/proposals/proposal.ts` imports `@/lib/data/types` — and that is safe ONLY because it is `import type`** (erased at compile). `sendProposal` reaches this module in the worker, which runs under `tsx` where the `@/` alias is unresolved. Adding a **value** import from `@/…` here breaks the worker container at boot, and **typecheck will not catch it**.
- **`delivery/completed` has no consumer.** `runBuild` emits it; nothing subscribes, no UI reads it. Treat it as a hook you must wire, not a working notification.
- **The Closer's `suggested` reply is never actually sent.** It lands on `deals.aiRec` and `escalations.rec` for the founder to copy. No channel sends it.
- **Two escalation namespaces, one deal.** `esc-deal-<dealId>` is a *decision* (approve = close the deal; reject = mark it lost). `esc-reply-<dealId>` is a *review flag* — it never mutates the deal and is resolved via the generic `resolveEscalation`. Routing a reply into the `deal` namespace would let a "Reject" click flip a deal to `lost`.
- **`sendProposal` casts the drizzle row: `buildProposal(deal as unknown as Deal, pricing)`.** The `deals` row shape and `lib/data/types`'s `Deal` are kept compatible by hand; a divergence compiles and fails at runtime.
- **The per-agent cost overlay for `cipher` counts `generated_demos` rows, not builds** (it is in `DEMO_TASK`), while `AGENT_UNIT_RATE`'s comment calls it "per delivery build". The rate comment also says opus, but `cipherCoder.model` is `sonnet`. The numbers are estimates — do not "fix" one without fixing the story.
- **`price` and `value` are different columns.** `value` drives the approval threshold, the forecast, and escalation severity; `price` is the negotiated quote — read by the proposal (`buildProposal`) and displayed by the deals screen (`fmt.money(d.price)`), nothing else. A deal with `price: 0` silently falls back to list price.
- **Mira's onboarding email and the proposal cover letter are hardcoded Vietnamese**, while Echo writes in the lead's market language. An English-market client gets an English cold email and a Vietnamese onboarding email.
- **These functions are not pipeline-tracked**, so the "always emit your fact" rule does not apply — but there is also no sweeper. A terminally-failed deal-side function is visible **only** through its `onFailure` escalation. If you add a function here, add the `onFailure` escalation.

**Corrections to older docs (all deleted now, but the claims circulate):** the chat widget is **not** rule-based —
`app/api/chat/route.ts` opens a real gateway stream (`connectAssistant`) and pipes `parseTextDeltas` to the client; the
rule-based replies are only the 502/503 fallback. `setProductionStage` / `toggleProductionAsset` are real DB writes, not
"display-only". Resend outreach is real, not a toast.

## Tests

**Guarding today** (`npm run test`, no DB, no keys):

| File | What it pins |
|---|---|
| `tests/data/deal-stage-machine.test.ts` | Graph integrity, `requiresApproval` matrix, every `decideReplyOutcome` branch (incl. `won`-needs-`full` and the conf floor). |
| `tests/agents/closer-output.test.ts` | The zod contract + the `<reply>` data fence + the length cap. |
| `tests/proposals/proposal.test.ts`, `proposal-html.test.ts` | The full price ladder, the monthly-care branch, HTML escaping of deal-supplied values. |
| `tests/agents/delivery-seo.test.ts`, `cipher-output.test.ts` | `injectSeo` (incl. a `<head>`-less document), `fallbackMeta` clamping, JSON-LD `<` escaping, sitemap/robots. |
| `tests/data/cost-meter.test.ts`, `agent-rates.test.ts` | The meter math + `estCost` rounding/clamping. |

**DB-gated** (`npm run test:db`, needs Postgres + `SEED_DEMO_DATA=true`; a CI gate): `tests/db/deal-automation.test.ts`
(legal/illegal transitions, the approval gate parking a deal + opening the escalation, approve/reject paths, the
configured threshold), `tests/db/closer-reply.test.ts` (`ingestReply` event + dedup id), `tests/db/delivery-flow.test.ts`
(`getBuild` before/after a build; the seeded guardrails the Ledger reads).

**Guarded by NOTHING** — say it out loud:

- **No test imports `handle-reply`, `run-build`, `run-support`, or `send-proposal`.** `lib/inngest/functions/**` is excluded from coverage by design. Every worker orchestration rule above (the conditional `.returning()` fallback, the `setWhere: status <> 'ready'` demotion guard, the `onFailure` escalations, the `deal/won` fan-out) is convention only.
- **No test renders a proposal PDF** or asserts the base64 attachment / `idempotencyKey` reaches Resend from `sendProposal`.
- **Nothing enforces the worker-tsx safety of `lib/proposals/`** — the import-closure walker (`tests/discovery/run-discovery-core-worker-safety.test.ts`) walks only its `ENTRY_FILES`: `run-discovery-core.ts`, `auto-discovery.ts`, `start-pipeline-run.ts`. None of this subsystem's functions are in that closure.
- **Nothing tests deal creation**, because there is none.
- `lib/actions/ingest-reply.ts` has **no UI caller** — it exists only for `tests/db/closer-reply.test.ts`.
