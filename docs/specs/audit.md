# Website Audit (Subsystem 2) — Spec

> Score a lead's current website (or its absence) and hand demo-gen a redesign brief.
> Owner-of-truth for: the `audit/requested` → `audit/completed` contract, the two performance engines and the
> `AUDIT_PROVIDER` dispatch, the greenfield path, the dimension rubric, and the `audits` / `audit_jobs` /
> `audit_screenshots` tables.

## Boundary

| | |
|---|---|
| **Runtime** | **Worker only.** `runAudit` is registered exactly once, in `lib/inngest/worker-entrypoint.ts`. Chromium, Lighthouse and Gemini run there. |
| **Web's only role** | `lib/actions/run-audit.ts` (`requestAudit`) upserts `audit_jobs` = `queued` and `inngest.send`s. It imports the Inngest **client**, never the function. Reads go through `lib/repositories/audit-jobs.ts` (`getAuditJobs`) and `lib/repositories/leads.ts` (`getAudit`, `getAuditScreenshot`). |
| **In scope** | `lib/audit/*`, `lib/inngest/functions/run-audit.ts`, `app/audit-shot/[leadId]/route.ts`, `components/workspace/audit/audit-screen.tsx`. |
| **Out of scope** | Who decides the next hop after an audit (→ `pipeline-orchestrator.md`), what demo-gen does with the brief (→ `demo-gen.md`), how a lead's `url` got there (→ `discovery.md`). |

## Contracts

**Events** (payload types in `lib/inngest/client.ts`)

| Event | Data | Emitted by |
|---|---|---|
| `audit/requested` | `AuditRequestedData = { leadId, runId? }` | `requestAudit` (manual, no `runId`) and `startPipelineRun` (orchestrated, event id `audit/requested:${runId}`) |
| `audit/completed` | `{ leadId, runId, outcome: 'ok' \| 'failed' }`, event id `audit/completed:${runId}` | `runAudit` success path **and** its `onFailure` — only when `runId` is present |

**Tables** (`lib/db/schema/pipeline.ts`, `lib/db/schema/audit.ts`) — all three are PK `leadId`, all writes are upserts.

| Table | Columns | Notes |
|---|---|---|
| `audits` | `scores` jsonb `$type<ScoreProfile>`, `problems` jsonb, `redesign` jsonb `$type<Redesign>`, `confidence`, `summary` | Every column **NOT NULL**. Written only on completion. |
| `audit_jobs` | `status` (`auditStatusEnum`: `queued\|running\|done\|failed`), `error`, `startedAt`, `finishedAt`, `updatedAt` | Lifecycle only. No `metadata`, no `createdAt`, no indexes. |
| `audit_screenshots` | `png` text (base64 desktop PNG), `updatedAt` | Served by `app/audit-shot/[leadId]/route.ts` (auth-gated, 401/404, `cache-control: private, max-age=30`). |

**Types** — `ScoreProfile` and `Redesign` in `lib/data/types.ts` are the jsonb `$type`s. Changing them changes the row shape with **no migration**, so old rows silently lack new keys.

**Public functions** — `runPerformanceAudit` (`lib/audit/perf-audit.ts`), `runPageSpeedAudit` / `PageSpeedResult` (`pagespeed-client.ts`), `runLighthouseAudit` (`lighthouse-client.ts`), `captureScreenshots` / `closeBrowser` / `Screenshots` (`screenshot.ts`), `scoreScreenshots` / `VisionScore` (`vision-scoring.ts`), `buildVisionPrompt` (`scoring-rubric.ts`), `mapAuditResult` (`map-audit-result.ts`), `greenfieldAudit` (`greenfield-audit.ts`).

**Downstream** — `run-demo-gen` reads the `audits` row and **throws `no audit for lead: <id>`** if it is absent. It consumes `redesign.cta`, `redesign.content` and `redesign.sections` (`lib/demo-gen/prompt.ts`); `redesign.sections` **is** the demo's required section list and the review pass's coverage checklist.

**Env** (defaults, unset behavior and which file each must live in: `../env-reference.md`)

| Var | Effect inside this subsystem |
|---|---|
| `AUDIT_PROVIDER` | Engine dispatch — see below. |
| `GOOGLE_PAGESPEED_API_KEY`, `GOOGLE_MAPS_API_KEY` | PSI key (the Maps key is the fallback); their *presence* also flips the auto-dispatch to PageSpeed. |
| `GEMINI_API_KEY` | **Mandatory** for any lead with a website. `GEMINI_MODEL` overrides the model. |
| `AUDIT_CONCURRENCY` | Global parallel-audit cap (Chromium OOM guard). |

## How it works

### 1. Engine dispatch (`lib/audit/perf-audit.ts`)

```
explicit     = (AUDIT_PROVIDER || '').trim().toLowerCase()
hasGoogleKey = !!(GOOGLE_PAGESPEED_API_KEY || GOOGLE_MAPS_API_KEY)
provider     = explicit || (hasGoogleKey ? 'pagespeed' : 'lighthouse')
provider === 'lighthouse' ? runLighthouseAudit(url) : runPageSpeedAudit(url)
```

- **Only the literal `lighthouse` selects the self-hosted engine.** Any other non-empty value — `auto`, `psi`, a typo — falls through to **PageSpeed**, which then throws `GOOGLE_PAGESPEED_API_KEY (or GOOGLE_MAPS_API_KEY) is required for audit` when no Google key exists. There is no `auto` literal; "auto" means *unset/empty*.
- `runLighthouseAudit` dynamically imports `playwright` (for `chromium.executablePath()`), `chrome-launcher` and `lighthouse` (real prod deps), launches headless Chromium with `--no-sandbox`, runs `formFactor: 'mobile'` over `performance, seo, accessibility, best-practices`, and kills Chrome in a `finally`. Needs no Google account at all.
- Both engines return the identical `PageSpeedResult`, so everything downstream is provider-agnostic.

### 2. `runAudit` (`lib/inngest/functions/run-audit.ts`)

Config: `retries: 2`; `concurrency: [{ limit: AUDIT_CONCURRENCY || 2 }, { limit: 1, key: 'event.data.leadId' }]`; `onFailure` emits the `failed` fact (only when `runId` is present).

Steps actually executed:

- `mark-running` — upsert `audit_jobs` = `running`.
- Read the lead **outside** a step (cheap, idempotent on retry, keeps `Date` fields live).
- **Greenfield branch** — `if (!hasAuditableWebsite(lead.url))` (the exported `hasAuditableWebsite` helper in `lib/discovery/website-presence.ts` tests for a real website *host*: a bare domain like `acme.com` is a site, while the `'(no site yet)'` placeholder, an empty value and anything unparseable are not): `save-greenfield` (audit row + lead write-back + `audit_jobs` = `done`) → `emit-audit-completed` (if `runId`) → `log-activity-greenfield` → return. **No PSI, no Playwright, no Gemini — the only fully keyless audit path.**
- **Site-lead preflight** — for a lead that *has* a website: a `GEMINI_API_KEY` presence check (outside any step) throws immediately if the key is unset — so a keyless deploy fails *before* a Chromium capture, not after. Then the `resolve-url` step runs `safeFetch(lead.url)` (the SSRF guard, before any navigation): it normalises a bare host to an absolute `https://` URL, follows redirects manually and re-validates EVERY hop, then returns the settled public URL as `safeUrl` — so every downstream pass navigates the resolved-and-validated target, not the raw entry URL. A throw from either — unset key, blocked host, too many redirects — lands in the function `catch` → `mark-failed`.
- **Normal branch** — `resolve-url` (the `safeFetch` pre-flight above → `safeUrl`) → `pagespeed` (`runPerformanceAudit` on the settled `safeUrl`) → `screenshot-and-score` (capture, cache the base64 desktop PNG into `audit_screenshots`, and call `scoreScreenshots` — all in ONE step) → `save` (`mapAuditResult` → upsert `audits` + lead write-back + `audit_jobs` = `done`) → `emit-audit-completed` (if `runId`) → `log-activity`.
- `catch` → `mark-failed` (upsert `audit_jobs` = `failed` + `error`) then rethrow. The catch is function-level and runs on the **first failing attempt**, i.e. *before* Inngest has exhausted `retries: 2` — `audit_jobs.status = 'failed'` is therefore NOT a "retries exhausted" marker; a later successful attempt overwrites it with `done` (the memoized `mark-failed` step does not re-run). Only `onFailure` (→ `audit/completed` `outcome: 'failed'`) is genuinely terminal.
- Every audit records an activity row as agent `vega`, room `audit`.

### 3. The eight dimensions

`ScoreProfile` = `visual, mobile, cta, trust, seo, speed, content, conversion`.

| Dim | Source |
|---|---|
| `speed` | `round(performance * 100)`; missing category → **50** |
| `seo` | `round(seo * 100)`; missing → 50 |
| `mobile` | `round(((performance + accessibility) / 2) * 100)`; if either is missing, falls back to the `speed` mapping |
| `visual`, `cta`, `trust`, `content`, `conversion` | Gemini vision (`vision-scoring.ts`), clamped 0-100, non-finite → 50 |

Accessibility and best-practices are **not** dimensions — they only feed `problems[]`. Identical Lighthouse-category mapping lives in **both** `pagespeed-client.ts` and `lighthouse-client.ts`; change one, change the other.

### 4. Vision

`scoreScreenshots` throws `GEMINI_API_KEY is required for vision scoring` when the key is absent, uses `@google/genai` with a `responseSchema` (typed JSON, no fragile parsing), and passes both PNGs inline as base64. `scoring-rubric.ts` is **only** `buildVisionPrompt` — it does no merging and no clamping.

### 5. Merge (`map-audit-result.ts`)

- `problems = [...vision.problems, ...psi.problems].slice(0, 8)`.
- `confidence = min(97, 60 + 8 × (PSI categories present) + (vision.summary ? 5 : 0))` — a `null` category costs 8 points; the value `0` counts as present.
- `summary = vision.summary || derived.summary`.
- `redesign = buildAuditFor(lead).redesign` — **the static per-industry `REDESIGN` map in `lib/data/index.ts`, with a `Healthcare` default for an unknown industry. The LLM does not produce the redesign brief.**

### 6. Greenfield brief (`greenfield-audit.ts`)

All eight scores `0`; a fixed `problems` list; a fixed `Redesign` (`template: 'first-website'`, sections `hero, services, about, reviews, hours & location, book`, cta `Book an appointment`); `confidence: 88`; a templated summary interpolating `company` + `industry`.

### 7. Lead headline write-back (both paths — this has shipped, it is not an open decision)

```
site  = round(mean of the eight dims)     // measured current-site quality
score = min(95, site + 40)                // redesign potential
```
written to `leads` inside the same step as the audit upsert. Greenfield ⇒ `site` 0, `score` 40.

## Invariants

Governed by (rationale, what-breaks and what-enforces live in **`../invariants.md`** — do not restate them here):

- **B1** — worker-chain modules use relative imports and never `import 'server-only'`.
- **B2** — web code never imports `lib/audit/*` or `lib/inngest/functions/*`; only the Inngest client.
- **C1** — every terminal path emits its fact event, including early returns (the greenfield return does).
- **C2** — the fact event id is keyed by `runId`, and the success emit deliberately shares it with `onFailure`.
- **C10** — PNG Buffers never cross a `step.run` boundary; capture + cache + score stay in one step.
- **D1** — any fetch/navigation of a lead-supplied URL goes through the SSRF guard.
- **R1** — the audit `concurrency` array keeps BOTH entries (global cap + `key: 'event.data.leadId'`).
- **R2** — do not raise `AUDIT_CONCURRENCY` without raising the worker `mem_limit`.
- **R4** — `closeBrowser()` closes the process-wide Playwright singleton this subsystem owns; only the worker entrypoint may call it.
- **F4** — `audits` columns stay NOT NULL; job state stays in `audit_jobs`.
- **F5** — all three tables are upserts keyed by `leadId`. **There is no audit history**; a re-run overwrites.

## Extension recipes

### Add a performance provider
1. New `lib/audit/<name>-client.ts` — relative imports, no `server-only`, heavy deps behind `await import()` cast to minimal structural types (copy `lighthouse-client.ts`).
2. Return the exact `PageSpeedResult` shape: `speed`/`seo`/`mobile` 0-100, `problems` (≤5 strings), `categoryScores` with four nullable fields (each `null` costs 8 confidence points).
3. Normalise a schemeless URL to `https://` and validate it with `assertPublicUrl` from `lib/discovery/safe-fetch.ts` before any navigation.
4. Add the branch in `runPerformanceAudit` and extend `tests/audit/perf-audit.test.ts` (mock the client; assert dispatch for the explicit value **and** for the auto path).
5. Document the value in `.env.example` and `../env-reference.md`.

### Add a ninth dimension
1. Extend `ScoreProfile` (`lib/data/types.ts`) — no migration, but existing rows will lack the key.
2. Populate it: from Lighthouse (map the category in **both** `pagespeed-client.ts` and `lighthouse-client.ts`) or from vision (add to `RESPONSE_SCHEMA` + its `required` list + the clamp block in `vision-scoring.ts`, and to `buildVisionPrompt`).
3. Add it in `mapAuditResult`, in `greenfieldAudit` (zero), and in `SCORE_PROFILES` + the `buildAuditFor` fallback in `lib/data/index.ts` — otherwise demo mode breaks.
4. Add the dim to `components/workspace/audit/audit-screen.tsx` + EN/VI i18n keys.
5. Extend `tests/audit/map-audit-result.test.ts` (it pins the merge and the confidence math). Remember `site` is the mean of ALL dims — a ninth dim shifts every lead's headline.

### Add an audit step
1. `step.run('<name>', …)` between `pagespeed` and `save`. Keep any Buffer/blob **inside** one step; return small JSON.
2. If it fetches `lead.url`, validate the URL first (D1).
3. Feed the result into `mapAuditResult` (extend its `opts`) so the merge stays in one place.
4. Mirror it in the greenfield branch or deliberately skip it there.
5. Emit no new fact event — the orchestrator contract is one `audit/completed` per run (C2).

### Change what counts as "no website"
The gate is the exported `hasAuditableWebsite()` helper in `lib/discovery/website-presence.ts` (imported by `run-audit.ts`); the placeholder `'(no site yet)'` is written by `lib/discovery/map-place-to-lead.ts` (`url: enrichment.websiteUri ?? '(no site yet)'`) and `hasAuditableWebsite` treats it as no-site. Change the brief in `greenfield-audit.ts` (`scores` must stay a full `ScoreProfile`; `sections` becomes the demo's section order) and remember the write-back.

## Traps

- **The greenfield gate keys on a *dotted host*, not just any parseable URL.** `hasAuditableWebsite()` (exported from `lib/discovery/website-presence.ts`, guarded by `tests/discovery/website-presence.test.ts`) correctly classifies a bare domain (`atlasdentalhou.com` — how the mock/seeded leads in `lib/data/index.ts` are stored, and what `SEED_DEMO_DATA=true` puts in Postgres) as a real site, so those leads get a full audit rather than the greenfield brief. But it requires `hostname.includes('.')`: a dotless host (`http://localhost`, an intranet name) and anything unparseable fall to greenfield — all-zero scores, `site` 0, `score` 40. The helper is unit-tested; its dispatch inside `run-audit` is not.
- **The SSRF guard runs before any navigation AND on every request.** `runAudit`'s `resolve-url` step pre-flights with `safeFetch(lead.url)`, which validates the WHOLE redirect chain hop-by-hop and returns the settled public `finalUrl` (`safeUrl`); both the perf engine and the screenshot capture then navigate that settled URL — not the raw `lead.url` — so the worker's Chromium can no longer be steered at `db`, `redis`, `inngest` or `9router` from inside the compose network. On top of that, `screenshot.ts` installs a Playwright `page.route('**/*')` guard that re-runs `assertSafeUrl` on EVERY request the page makes — redirect hops and subresources, not just the entry URL — and aborts any non-public target (so `assertSafeUrl` is live per-request defence, not dead code). **Residual:** the Lighthouse perf engine has only the settled-URL pre-flight — no per-request guard — so it trusts `safeUrl` already being public; and neither layer stops DNS-rebinding (a public domain resolving to a private A record), an accepted residual given the semi-trusted input. Any *new* navigation must reuse `safeUrl` or re-validate via the exported `assertPublicUrl` / `safeFetch` from `lib/discovery/safe-fetch.ts` — never the raw `lead.url`.
- **`.env.example` ships `AUDIT_PROVIDER=pagespeed` uncommented.** Copy it verbatim and you lose the keyless default and hard-fail without a Google key.
- **The audit does NOT degrade without `GEMINI_API_KEY`** — for any lead *with* a website `runAudit` throws a preflight `GEMINI_API_KEY is required…` right after the greenfield gate (before the performance + screenshot passes — so it fails fast, burning no Chromium capture, rather than deep inside the vision step); the error escapes to the function catch, `audit_jobs.status` becomes `failed`, and (for an orchestrated run) `onFailure` fails the whole pipeline run. Only the greenfield path survives keyless.
- **`redesign` is not LLM output.** A new industry with no `REDESIGN` entry silently gets the dental-clinic brief, and demo-gen will build *that* page.
- `requestAudit` sends `audit/requested` **without** an event id, so a double-click enqueues two events; only the per-lead concurrency key stops them overlapping.
- A missing Lighthouse category becomes a score of **50**, not `0` and not "unknown" — a partially-failed audit still looks mediocre-but-real on the screen.

## Tests

Guarded today (`tests/audit/`, no DB and no keys):

| File | Covers |
|---|---|
| `perf-audit.test.ts` | the four dispatch paths (explicit `lighthouse`, explicit `pagespeed`, unset + key, unset + no key) |
| `lighthouse-client.test.ts` | category→dim mapping, the missing-category → 50 fallback, chrome killed even when Lighthouse returns nothing |
| `map-audit-result.test.ts` | dimension sourcing, problem concat + cap, the confidence formula and its floor/cap, summary fallback, the industry redesign + Healthcare default |
| `scoring-rubric.test.ts` | prompt substrings and determinism |

**NOT guarded — no test file exists for any of these:** `run-audit.ts` (the whole orchestration, the greenfield branch, the lead write-back, `mark-failed`), `greenfield-audit.ts`, `screenshot.ts` (including the SSRF guard), `vision-scoring.ts` (including the mandatory-key throw), `pagespeed-client.ts`. The worker-safety walker test (`tests/discovery/run-discovery-core-worker-safety.test.ts`) **does not include the audit chain** in its entry files — B1 is convention-only here, and a violation surfaces only in a booted worker container. An invalid `AUDIT_PROVIDER` value is untested. `npm run coverage` has 100% thresholds but is not a CI gate.
