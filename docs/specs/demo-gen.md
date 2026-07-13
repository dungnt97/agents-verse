# Demo Generation — Spec

> Turn an audited lead into a complete, self-contained redesign page built from that business's REAL facts.
> Owner-of-truth for: the pass pipeline in `lib/agents/pipelines/demo.ts`, everything under `lib/demo-gen/`, the
> `run-demo-gen` worker function, and the public `/demo/[leadId]` route — including the fact-grounding contract,
> the venue-photo flow, and the deterministic guards.

## Boundary

| In scope | Out of scope (owner) |
|---|---|
| `lib/agents/pipelines/demo.ts` — `generateDemoHtml`, `STYLE_LANES`, `boardPassesClean` | The generic agent runtime (`runAgent`, `runBoard`, `AgentDef`, validators, registry, board) → `agents-runtime.md` |
| `lib/demo-gen/*` — `prompt.ts`, `render.ts`, `layout-audit.ts`, `layout-defects.ts`, `webapp-qa.ts`, `qa-findings.ts`, `fetch-venue-photos.ts`, `locale.ts` | `pipeline_runs`, hops, gates, escalations → `pipeline-orchestrator.md` |
| `lib/inngest/functions/run-demo-gen.ts` (the durable function) | Where `mapsData.photos` / `phone` come from → `discovery.md` |
| `lib/actions/run-demo-gen.ts` (`requestDemoGeneration` — the web trigger) | The `audits` row that IS the redesign brief → `audit.md` |
| `app/demo/[leadId]/route.ts` (public serve + CSP) | Every env var's default/unset behavior → `../env-reference.md` |

**Runtime:** everything above runs in the **worker** container except `lib/actions/run-demo-gen.ts` and
`app/demo/[leadId]/route.ts`. The pipeline shells the `claude` CLI and launches Playwright; web must only
`inngest.send({ name: 'demo/requested' })` and read `generated_demos` through the repository layer (B1, B2).

## Contracts

**Events.** In: `demo/requested` → `DemoRequestedData { leadId, runId? }` (`lib/inngest/client.ts`). Two producers:
`requestDemoGeneration` (manual, **no** `runId` ⇒ drives no pipeline) and the orchestrator's `audit → demo` hop
(with `runId`). Out: `demo/completed` `{ leadId, runId, outcome: 'ok' | 'failed' }`, event id
`demo/completed:${runId}`, emitted from **both** the success path and `onFailure`, and **only when `runId` exists**
(C1, C2).

**Table** `generated_demos` (`lib/db/schema/pipeline.ts`): PK **`leadId`** (every write is an upsert on it),
`html` (null until the first success), `status` `'generating' | 'ready' | 'failed'`, `error`, `updatedAt`.
On success the function also sets `leads.demo = 'review'` — but **only** from `none | draft`, so a lead already at
`sent`/`approved` is never downgraded.

**Public functions** other code depends on:

| Symbol | File | Contract |
|---|---|---|
| `generateDemoHtml(input, step)` | `agents/pipelines/demo.ts` | The whole pipeline. `step` is a `StepRunner` (`run(id, handler): Promise<string>`); the default inline runner just executes. |
| `DemoGenInput` | `demo-gen/prompt.ts` | The single input type every prompt builder consumes. |
| `buildResearchPrompt` · `buildConceptPrompt` · `buildDirectorPrompt` · `buildBuildPrompt` · `buildPersonaReviewPrompt` · `buildReviewSynthesisPrompt` · `buildRevisePrompt` · `buildLayoutFixPrompt` · `buildQaFixPrompt` · `REVIEW_PERSONAS` | `demo-gen/prompt.ts` | Pure. No I/O. The only place prompt text lives. |
| `renderHtmlToPng` · `renderHtmlToPdf` · `DESKTOP_WIDTH` (1440) · `MOBILE_WIDTH` (390) | `demo-gen/render.ts` | Widths are exported so the prompt labels each slice with the width it was actually rendered at. |
| `auditLayout` → `LayoutDefect[]`; `formatLayoutFixList` · `hasBlockingDefects` | `demo-gen/layout-audit.ts` / `layout-defects.ts` | Browser side vs pure side, split so the pure side is unit-testable. |
| `runWebappQa` → `QaFinding[]`; `formatQaReport` · `hasBlockingQa` · `majorQaCount` | `demo-gen/webapp-qa.ts` / `qa-findings.ts` | Same split. |
| `fetchVenuePhotos(urls, { max, judgeWidth })` → `VenuePhoto[]` | `demo-gen/fetch-venue-photos.ts` | Best-effort; never throws. |
| `demoLanguageForAddress(address)` | `demo-gen/locale.ts` | `'Vietnamese'` iff the address matches `/vi[eệ]t\s?nam/i`, else `'English'`. |

**Env vars read here** (names only — behavior lives in `../env-reference.md`): `CLAUDE_CODE_OAUTH_TOKEN`,
`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `AGENT_MODEL_OPUS`, `CLAUDE_AGENT_CONCURRENCY`, `APIFY_MAX_IMAGES`.
`generateDemoHtml` **throws immediately** unless `CLAUDE_CODE_OAUTH_TOKEN` **or** `ANTHROPIC_BASE_URL` is set.

**Route:** `GET /demo/[leadId]` — public, `force-dynamic`. Serves `getBuild(leadId)` (the delivery build, if
`status === 'ready'` **and** it has `html`) **in preference to** the raw generated demo; then the demo `html` if present (even while a
re-generation is in flight, so "Improve with AI" never makes a live demo go dark); else a status placeholder.

## THE FACT-GROUNDING CONTRACT

The product's core claim is that the demo shows the client's **real** business, not an invented one. A real fact
travels through exactly **three layers**, and all three must be edited together (O2):

| Layer | Symbol | What it does |
|---|---|---|
| 1. Source | `lib/inngest/functions/run-demo-gen.ts` | The **only** producer of `DemoGenInput` in DB mode. Maps `phone: lead.phone`, `address: lead.formattedAddress`, `mapsData: lead.mapsData`, `language: demoLanguageForAddress(lead.formattedAddress)`, plus the `audits` row's `scores`/`problems`/`redesign`/`summary`. |
| 2. Type | `DemoGenInput` in `lib/demo-gen/prompt.ts` | `phone?`, `address?`, `mapsData?` — all optional + nullable so demo mode stays green. |
| 3. Prompt | `clientBlock` / `mapsFactsBlock` in `lib/demo-gen/prompt.ts` | Emits each fact with explicit NEVER-invent language. |

What the prompt actually says (do not soften these strings):

- `clientBlock` — phone: *"put this EXACT number on every call/contact/booking CTA; **NEVER invent or alter a phone
  number**"*. Address: *"use verbatim in the contact/location/hours section (do not invent a street)"*. Both lines
  are **omitted entirely** when the value is falsy — there is no placeholder to hallucinate around.
- `mapsFactsBlock` — rating + review count (trust signal), opening hours (*"use verbatim"*), categories, price
  level, the review pool (*"SELECT the 3-5 STRONGEST … Keep the reviewer's own words + first name; never invent or
  embellish a quote"*), and the first 8 photo URLs. Returns `''` when `mapsData` is null.
- `craftConstraints` (shared by the build + revise passes) repeats it in the CONTENT rule: *"NEVER invent or alter a
  PHONE NUMBER or STREET ADDRESS … **if a fact isn't provided, omit it rather than fabricate**"*.

**Nothing enforces any of this.** Typecheck and the unit suite pass with all three fields dropped. It **has
regressed once** — the demo printed a fabricated phone number, fixed in `804138b`. Treat a change here as
high-risk.

**Note the surgical fix passes never see the facts.** `buildLayoutFixPrompt` / `buildQaFixPrompt` do **not** include
`clientBlock` — they get the current HTML plus "fix exactly these defects and NOTHING else". Real facts survive
those passes by *"change nothing else"*, not by a repeated rule. A new guard whose prompt licenses content edits
must re-inject `clientBlock`.

## How it works

`generateDemoHtml` runs six checkpointed `step.run` blocks. Each one is memoized by Inngest, so a retry or a worker
restart resumes from the last completed pass instead of re-spending the whole ~20–32 min run.

| step id | Pass | Agent def | tools | timeout / maxTurns | On failure |
|---|---|---|---|---|---|
| `research` | 0 | `vegaResearcher` | `Read` | 360 s / 8 | best-effort → `''` |
| `concept` | 0.5 | `atlasConceptor` | — | 180 s / 1 | best-effort → `''` |
| `director` | 1 | `atlasDirector` | — | 180 s / 1 | **FAILS THE RUN** |
| `build` | 2 | `novaBuilder` | — | **900 s / 4** | **FAILS THE RUN** |
| `review-revise` | 3–5 | `REVIEW_BOARD` → `atlasSynthesizer` → `novaReviser` | board + reviser: `Read` | board 420 s / 8 · reviser 600 s / 10 | best-effort → the built page |
| `layout-guard` | 6 | `novaLayoutFixer`, then `novaQaFixer` | — | 600 s / 4 each | best-effort → the reviewed page |

Every agent is **opus**. Only `director` and `build` may sink the run: the result must never be worse than a single
clean build (O7 in spirit; the try/catch shape is the mechanism).

1. **`research`** — `captureScreenshots(input.url)` (best-effort; the hunter deliberately targets businesses with no
   real site, so a capture failure is normal). Only the **desktop** shot is written to `/tmp` and handed to Vega:
   one full-page screenshot already costs ~150 k vision tokens and two would blow the context window.
   `closeBrowser()` is called in a `finally` — see R4 before you copy that. Then `fetchVenuePhotos` (below). Vega
   `Read`s the shot + the photos and returns a ~250-word brief containing `CLIENT REALITY`, an optional
   `VENUE PHOTOS` block, and `REFERENCE BAR`.
2. **`concept`** — one lane is picked **at random** from `STYLE_LANES` (aesthetic provocations: maximalist
   editorial, neo-brutalist, kinetic type, warm organic, Swiss minimal, retro-future, spatial scroll, tactile
   product-forward, dark immersive) so consecutive demos diverge instead of converging on the dark-glass AI default.
   Atlas explores three concepts and emits `<<<WINNER>>>` before the winning brief; `extractWinner` splits on that
   marker and falls back to the whole output if it is absent. **Two runs on the same lead legitimately differ. This
   is not a bug.**
3. **`director`** — Atlas expands the winning concept into a ~250–350-word build spec.
4. **`build`** — Nova emits one complete self-contained HTML document. `buildBuildPrompt` **re-injects the entire
   research brief** as a `=== VENUE PHOTOS ===` directive whenever `/VENUE PHOTOS/i` matches it, because the short
   spec routinely drops the long photo URLs and without this the real photos never reach the HTML.
5. **`review-revise`** — up to **2 rounds**: render → board → synthesize → revise. `renderHtmlToPng` shoots at
   `DESKTOP_WIDTH` and `MOBILE_WIDTH`. `runBoard` runs the board lenses in parallel (`Promise.allSettled`; a lens
   that fails is simply dropped). Board order is fixed: **uiux (Iris) → copy → niche → art (Kira)**; `copy` and
   `niche` are board-internal sub-lenses with `AgentId`s but no roster card. The loop breaks when the board returns
   nothing, or when `boardPassesClean(reviews)` — every lens says `VERDICT: PASS` and no lens flags
   `severity: blocker`. Otherwise Atlas synthesizes ≤ 6 prioritized fixes and Nova revises.
6. **`layout-guard`** — two deterministic guards, both keep-only-if-better (O7):
   - `auditLayout` (headless DOM measurement at both viewports): horizontal overflow, text straddling the viewport
     edge, wrapped nav/labels, a decorative spine crossing a centered heading (probing `::before`/`::after`),
     broken/zero-size images, card groups using CSS multi-column, and a pixel-accurate header-contrast probe.
     Up to **2** `novaLayoutFixer` passes; a fix is kept **only if the defect count strictly drops** — `after.length
     >= defects.length` breaks the loop and keeps the previous page. Note the loop fires on **any** defect count
     `> 0`, not on `hasBlockingDefects` (which is exported but unused by the pipeline).
   - `runWebappQa` (console/JS errors, failed or ≥ 400 asset requests, a11y: missing alt, unnamed controls, no
     `lang`/viewport/`<h1>`, tiny mobile tap targets). If `hasBlockingQa`, **one** `novaQaFixer` pass, kept only if
     it **did not regress layout AND** `majorQaCount` strictly dropped.

Then `run-demo-gen` upserts `html` + `status: 'ready'`, bumps `leads.demo`, emits `demo/completed`, and records an
activity row. Any throw upserts `status: 'failed'` with the message and re-throws (so Inngest's `retries: 2` and
then `onFailure` see it).

### Real venue photos

Photos originate in discovery (Apify, capped by `APIFY_MAX_IMAGES`) and are stored on
`leads.mapsData.photos`. `fetchVenuePhotos` downloads a **downscaled judging copy** — Google user-content URLs end
in a size token (`=w1920-h1080-k-no`, `=s1600`), which `judgeUrl` swaps for `=w640` — through the SSRF-guarded
`safeFetch` (D1), skipping any response that is not `ok` or is under 1 KB. It hands back the **ORIGINAL** URL to
embed. The cap is **dynamic: 3 when an old-site screenshot exists, 6 when not** — a no-site lead can afford more
vision budget. Vega views the local files, judges them like a photo editor, and lists only the chosen ones in the
brief's `VENUE PHOTOS` block (or writes `VENUE PHOTOS: none usable`). If `APIFY_MAX_IMAGES=0`, there are no venue
photos and the demo falls back to Unsplash stock.

### Demo language

`demoLanguageForAddress(lead.formattedAddress)` — **English unless the Maps address matches Vietnam**. Every prompt
interpolates `${input.language}`. Demos are English-first now; `board.ts` still carries a stale *role label*
mentioning Vietnamese (a display string only — the persona brief itself uses `input.language`).

## Invariants

Governed by the following — rationale, what-breaks and what-enforces live in `../invariants.md`; do not restate them here.

- **B1** — worker-chain modules use relative imports and never `import 'server-only'`.
- **B2** — web never imports `lib/demo-gen/*`, `lib/agents/*`, or `lib/inngest/functions/*`; it only `inngest.send`s.
- **C1 / C2** — every terminal path emits `demo/completed`; the id is keyed by `runId` and shared with `onFailure`.
- **C10** — a `step.run` must return a **string** and must not depend on `/tmp` files created in a *different* step.
- **D1** — a lead-supplied URL is fetched only through `safeFetch` / `assertSafeUrl`.
- **D6** — the `/demo/[leadId]` CSP stays.
- **O1** — `requestDemoGeneration` degrades without a DB; no repository call outside `USE_DB`.
- **O2** — the demo never invents a business fact; a new real-fact field is threaded through all three layers.
- **O6** — agent validators throw on empty/unusable output; they never return `''`.
- **O7** — a deterministic guard keeps its fix only if the measured defect count strictly drops.
- **R2** — do not raise `CLAUDE_AGENT_CONCURRENCY` or the render bounds without raising the worker `mem_limit`.
- **R3** — a keyless fn-scoped Inngest concurrency limit is per-function, not a shared global budget.
- **R4** — never call `closeBrowser()` from a new pass.
- **R5** — in-page Playwright logic is a **string expression**, never a closure.
- **R6** — keep `child.stdin.on('error', () => {})` in the runner.

## Extension recipes

**Add a new real-fact field (the anti-hallucination path).**
1. `lib/demo-gen/prompt.ts` — add the field to `DemoGenInput` (optional + nullable).
2. Emit it in `clientBlock` (contact facts) or `mapsFactsBlock` (Maps facts) with explicit *use verbatim / never
   invent* wording, and omit the line entirely when the value is falsy.
3. Map it from the `leads` / `audits` row in `lib/inngest/functions/run-demo-gen.ts` — **this is the step that gets
   forgotten.**
4. If it comes from discovery, extend `MapsData` (`lib/data/types.ts`), the Apify mapper, and the `set:{}` of
   `upsert-discovered-leads.ts` (F6) — otherwise re-discovery keeps the stale value.
5. **Add tests**: one asserting the value reaches the built prompt (`tests/demo-gen/prompt.test.ts`) and one
   asserting `run-demo-gen` maps it. O2 is otherwise enforced by nothing.

**Add a new pass.**
1. Write a pure prompt builder in `lib/demo-gen/prompt.ts`. Reuse `clientBlock` + `outputRule` and pick
   `craftConstraints()` (creative passes) or `surgicalConstraints()` (fix passes) — never hand-write a tool clause.
2. Add an `AgentDef` in `lib/agents/defs/` (`id` from the `AgentId` union, `model`, `tools`, `limits`,
   `buildPrompt`, `validate` via `makeHtmlValidator` / `makeTextValidator` / `makeJsonValidator`).
3. Wire it into `generateDemoHtml` as a **new `step.run('<unique-id>', …)` returning a string**. Decide up front:
   best-effort (try/catch → fall back to the previous artifact) or fatal. Default to best-effort.
4. Keep any `/tmp` artifacts inside the same step (C10).
5. If the pass produces a measurable signal, gate the keep on "strictly better" (O7).
6. Tests: prompt shape in `tests/demo-gen/prompt.test.ts`, def identity/limits in `tests/agents/agent-defs.test.ts`.
7. `npm run typecheck && npm run test && npm run lint`.

**Add a new deterministic guard (like layout / web-app QA).**
1. Pure model + formatter in `lib/demo-gen/<name>-findings.ts`: severity type, dedupe, cap, `format…` +
   `hasBlocking…` + `major…Count`. This file is unit-testable and must be tested.
2. Browser side in `lib/demo-gen/<name>.ts`: dynamic `import('playwright')`, launch with
   `['--no-sandbox','--disable-dev-shm-usage']`, in-page logic as a **string** (R5), per-viewport `try/catch` so the
   guard can never sink a run, **launch and close your OWN browser** (R4), and add the file to `vitest.config.ts`
   `coverage.exclude`.
3. A dedicated fixer `AgentDef` on a `surgicalConstraints()` prompt; keep the fix only if the count strictly drops.
4. Call it inside the `layout-guard` step (or its own step).

**Change the model or gateway.** Set `AGENT_MODEL_OPUS` / `AGENT_MODEL_SONNET`. In Docker these are compose
`environment:` entries, so `.env.local` **cannot** override them — use `./.env` (I1). A new tier is just a new value
in `AgentModel`; `AGENT_MODEL_<TIER>` resolves automatically.

## Traps

- **`AGENT_MODEL_OPUS` has no compose default** (only `AGENT_MODEL_SONNET` does). Unset ⇒ the literal string
  `"opus"` is passed to the gateway, which rejects it, and **every** demo pass fails after 5 CLI retries × 2 Inngest
  retries — surfacing only as an opaque `claude exited 1`.
- **The `/demo/[leadId]` CSP silently blocks new capabilities.** It is `default-src 'none'; script-src
  'unsafe-inline'; style-src 'unsafe-inline' + fonts.googleapis.com; font-src fonts.gstatic.com; img-src https:
  data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'`. Any demo feature that needs `fetch`/XHR or a form
  submit **will not work and will not warn you** — it is contained LLM-authored HTML, by design (D6). The route's
  placeholder pages are still hard-coded Vietnamese.
- **`sharp` is used but is NOT a declared dependency.** `layout-audit.ts` does `await import('sharp')` for the
  pixel-accurate header-contrast probe; it resolves only transitively. The probe sits inside a `try/catch`, so a
  missing `sharp` **silently disables header-contrast detection** with no error.
- **Memory.** `render.ts` bounds exist because a 2 g worker was OOM-killed by photo-rich builds (`848bee0`):
  `HARD_MAX_PX` 13000, `SLICE_PX` 2600, `MAX_SLICES` 6, `DEVICE_SCALE_FACTOR` 0.75. The critique PNGs are held in
  memory by Chromium **and** the `claude` CLI simultaneously — they are the worker's peak-memory driver. Worker
  `mem_limit` is 4 g and is shared with the audit function's Chromium.
- **`CLAUDE_AGENT_CONCURRENCY` is not a global budget.** `run-demo-gen` declares a keyless fn-scoped limit from it —
  but so do `run-build`, `run-outreach`, `run-support` and `handle-reply`, and a keyless limit is per-function, not
  shared. The real ceiling on concurrent `claude` processes is (number of such functions) × the env value (R3).
- **Double-click guard lives in the action, not the event.** `demo/requested` carries no dedup id (a lead may
  legitimately be re-generated), so `requestDemoGeneration` refuses when a `generating` row is younger than 45 min.
- **`hasBlockingDefects` is exported and tested but unused by the pipeline** — the layout loop fires on any defect,
  including minor-only. Don't assume it gates anything.
- **The demo requires an existing `audits` row** — it IS the redesign brief. The action pre-checks; the worker
  throws `no audit for lead`.

## Tests

**Guarded today** (`npm run test`, no DB and no keys):

| File | Covers |
|---|---|
| `tests/demo-gen/prompt.test.ts` | Prompt shape for every builder; `REVIEW_PERSONAS` keys; that the surgical prompts omit the creative playbook (no `STRUCTURE MANDATE`); that `mapsData` **rating / reviews / hours** reach the build prompt and that no facts block is emitted when `mapsData` is absent. |
| `tests/demo-gen/layout-defects.test.ts`, `qa-findings.test.ts` | Dedupe, major-first ordering, cap, `hasBlocking…`, `majorQaCount`. |
| `tests/demo-gen/locale.test.ts` | `demoLanguageForAddress` both branches. |
| `tests/agents/agent-defs.test.ts` | Each def's id/model/tools/limits and that its `buildPrompt` interpolates its inputs. |
| `tests/agents/board-passes-clean.test.ts` | `boardPassesClean`. |
| `tests/agents/validators.test.ts` | Validators throw on empty/unusable output (O6). |

**Guarded by NOTHING — say it plainly:**

- **No test asserts `phone` or `address` reaches any prompt**, and no test asserts `run-demo-gen` maps them from the
  `leads` row. This is the highest-value missing test in the subsystem (O2, and it has regressed before).
- **No test covers venue photos at all**: not `fetchVenuePhotos`, not the `=w640` `judgeUrl` swap, not the
  `mapsFactsBlock` photo list, not `buildBuildPrompt`'s `VENUE PHOTOS` re-injection.
- **No test imports any Inngest function** — `run-demo-gen` (its upserts, the `leads.demo` bump, the
  `demo/completed` emit, the `onFailure` path) is executed by nothing in CI.
- `generateDemoHtml` itself is untested (it is in `vitest.config.ts` `coverage.exclude`, along with `runner.ts`,
  `render.ts`, `layout-audit.ts`, `webapp-qa.ts`). The pass ordering, the best-effort fallbacks, the review loop and
  both keep-only-if-better guards are **convention, verified by reading**.
- `lib/demo-gen/fetch-venue-photos.ts` is neither excluded from coverage nor covered by a test — and the 100 %
  coverage threshold in `vitest.config.ts` is **not a gate**, because CI (`.github/workflows/ci.yml`) runs
  `typecheck`, `lint`, `test`, `build` and the DB-integration job (`test:db`), never `npm run coverage` (I7).
- There is no e2e or DB-mode test for `/demo/[leadId]` (the build-over-demo preference, the CSP header).
