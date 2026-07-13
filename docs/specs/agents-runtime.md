# Agent Runtime — Spec

> The generic `claude`-CLI runtime every LLM agent runs on. Owner-of-truth for: `lib/agents/*` — the runner
> (spawn/retry/model resolution), the `AgentDef` contract, validators, the registry, the review board, the agent
> roster, and the shared concurrency budget of the claude-CLI Inngest functions.

Not owned here: the demo pipeline itself (`lib/agents/pipelines/demo.ts` + `lib/demo-gen/*`) → `demo-gen.md`.
The Inngest functions that call these agents → `pipeline-orchestrator.md`, `outreach-inbound.md`,
`deals-proposals-delivery.md`. Env-var defaults and which file they belong in → `../env-reference.md`.

## Boundary

- **Runtime: worker only.** `runAgent` spawns the `claude` binary, which exists only in the worker image
  (`Dockerfile.worker`). Web must never import `lib/agents/*` — it emits an Inngest event instead (B2).
- **tsx-safe.** Every module here runs under `tsx` in the worker: relative imports only, never `import 'server-only'`,
  never `next/*`, never `lib/repositories/*` (B1).
- **The CLI is not the only LLM path.** `lib/integrations/assistant.ts` (`completeText`) talks HTTP to the same
  gateway and *is* web-safe; Orion, the AI summary and the chat widget use it. It is not part of this runtime.
- **Pure + side-effect-free except `runner.ts`.** Defs, validators, board and `pipelines/delivery-seo.ts` are pure
  functions — that is why they are unit-testable and why they carry the coverage threshold.

## Contracts

**`lib/agents/types.ts`** — the public shape everything else depends on:

| Symbol | Meaning |
|---|---|
| `AgentId` | union of roster ids + the two board-internal lenses (`copy`, `niche`) |
| `AgentModel` | `'opus' \| 'sonnet' \| 'haiku'` — a *tier*, resolved to a real model id at spawn time. `haiku` has no def today. |
| `AgentTool` | `'Read' \| 'Bash' \| 'WebFetch' \| 'WebSearch'` → `claude --allowedTools` |
| `AgentLimits` | `{ timeoutMs, maxTurns }` — `timeoutMs` SIGKILLs the CLI; `maxTurns` bounds the agentic loop |
| `AgentDef<I,O>` | `{ id, role, model, tools, limits, buildPrompt(input): string, validate(raw): O }` — the whole contract |
| `AnyAgentDef` | erased supertype (`buildPrompt: (input: never) => string`) so heterogeneous defs fit one map |
| `AgentContext` | `{ signal?: AbortSignal }` — **no caller passes it today**; the cancellation path is dead code |
| `AgentResult<O>` | declared for future ledger provenance; **unused** |

**`lib/agents/runner.ts`** — `runAgent(def, input, ctx?): Promise<O>` and `runBoard(defs, input, ctx?): Promise<O[]>`.
**`lib/agents/validators.ts`** — `makeHtmlValidator()`, `makeTextValidator()`, `makeJsonValidator(zodSchema)`.
**`lib/agents/registry.ts`** — `AGENTS` (`satisfies Record<string, AnyAgentDef>`) + `getAgent(id)`.
**`lib/agents/board.ts`** — `REVIEW_BOARD`, fixed order `iris(uiux) → copy → niche → kira(art)`.
**`lib/agents/defs/review-persona.ts`** — `reviewDef(id, role, persona)` factory + `personaByKey(key)` (throws on an
unknown key). Personas themselves live in `lib/demo-gen/prompt.ts` (`REVIEW_PERSONAS`).

**Env this runtime reads** (placement + defaults: `../env-reference.md`): `AGENT_MODEL_<TIER>` (dynamic, see below),
`CLAUDE_CODE_OAUTH_TOKEN` / `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` (the backend gate; the spawned `claude` CLI
reads them from the inherited env — `runner.ts` never reads them), `CLAUDE_AGENT_CONCURRENCY` (read by the *functions*,
not by the runner).

## How it works

**1. Spawn.** `runClaude` runs `claude -p --model <resolved> --output-format json --max-turns <N>` and, only when the
def declares tools, `--allowedTools <space-joined>`. **The prompt goes on stdin**, never `argv` — prompts are tens of
KB. `env: process.env` is inherited whole, which is how the CLI picks up its gateway credentials.

**2. `resolveModel`.** Reads `process.env['AGENT_MODEL_' + model.toUpperCase()]` — i.e. `AGENT_MODEL_OPUS`,
`AGENT_MODEL_SONNET`. This lookup is **dynamic and grep-invisible**: no code in `lib/agents/` names those vars (they
appear in `runner.ts` only inside a comment). Empty/unset ⇒ the literal tier name (`"opus"`) is sent as the model id,
which a gateway rejects. (`AGENT_MODEL_SONNET` *is* read literally elsewhere — by `lib/integrations/assistant.ts`,
which is a different LLM path.)

**3. `--output-format json` is mandatory.** `resultText` `JSON.parse`s the envelope, throws when `is_error`, and
strips a leading `<thinking>…</thinking>` block (some gateway providers prepend one). Plain-text print mode drops the
START of long output when captured non-interactively — do not "simplify" this away.

**4. Failure surfacing.** A non-zero exit rejects with `signal=` (SIGKILL = our own timeout/abort), `stderr=` **and**
`stdout=` (each truncated) — the CLI writes the real cause (auth / gateway / limit) to *stdout* on a non-zero exit,
so discarding stdout is what once left the infamous bare `claude exited 1`.

**5. The stdin error handler is load-bearing.** `child.stdin.on('error', () => {})` — if the CLI dies before draining
stdin (ENOENT, instant auth failure, our SIGKILL mid-write), Node raises EPIPE on the stream; with **no listener that
is an uncaughtException and the whole worker container dies**, killing every concurrent run. Never remove it (R6).

**6. Retries.** `runAgent` makes five attempts over **any** failure — CLI/gateway blip *or* a validation throw —
with exponential backoff capped at 30s (≈65s total), logging `[agent <id>] attempt i/5 failed: …` each time.
Inngest then retries the whole step on top of that. This is why a validator must throw (O6).

**7. `runBoard`.** `Promise.allSettled` over the defs: failures are dropped, survivors keep board order. A reviewer
that dies weakens the board; it never fails the run.

**The roster** — `id` → primary def in `AGENTS`; extra task defs live in the same file and are imported directly by
the pipeline (the registry only holds the primary):

| id | file | model | tools | extra task defs in the same file |
|---|---|---|---|---|
| `atlas` | `defs/atlas-strategist.ts` | opus | — | `atlasConceptor`, `atlasSynthesizer` (primary: `atlasDirector`) |
| `nova` | `defs/nova-designer.ts` | opus | `Read` (reviser only) | `novaReviser`, `novaLayoutFixer`, `novaQaFixer` (primary: `novaBuilder`) |
| `vega` | `defs/vega-researcher.ts` | opus | `Read` | — |
| `iris` | `defs/iris-ux.ts` | opus | `Read` | wraps the `uiux` persona |
| `kira` | `defs/kira-qa.ts` | opus | `Read` | wraps the `art` persona |
| `echo` | `defs/echo-outreach.ts` | sonnet | — | JSON `{subject, body}` |
| `closer` | `defs/closer-sales.ts` | sonnet | — | JSON `{kind, interpretation, suggested, recommendedStage, conf}` |
| `mira` | `defs/mira-support.ts` | sonnet | — | JSON `{subject, body}` |
| `cipher` | `defs/cipher-coder.ts` | sonnet | — | JSON SEO/OG metadata; `pipelines/delivery-seo.ts` injects it |
| `copy`, `niche` | built in `board.ts` via `reviewDef` | opus | `Read` | board-internal lenses — **deliberately no roster card, not in `AGENTS`** |

Every demo-path def is **opus**; every ops def is **sonnet**, no tools, one turn. The `role` string is a human label
only — it is never sent to the model (the model sees `buildPrompt(input)` and nothing else).

**`AGENTS` / `getAgent` have no production consumer today** — only `tests/agents/agent-defs.test.ts` imports them.
The pipelines import concrete typed defs directly. Treat the registry as the roster's identity assertion, not a
dispatch mechanism.

## Invariants

Governed by (full text + what-breaks + what-enforces in [`../invariants.md`](../invariants.md)):

- **B1** — worker-chain modules: relative imports, no `server-only`, no `next/*`, no `lib/repositories/*`.
- **B2** — web (`app/**`, `components/**`, `lib/actions/**`) never imports `lib/agents/*`; it only `inngest.send`s.
- **O6** — **validators MUST THROW on empty/unusable output, never return `''`.** Returning `''` feeds an empty spec
  downstream and silently defeats the retry loop.
- **R3** — every claude-CLI function shares ONE account-scoped concurrency budget (`scope:'account',
  key:'"claude-agent"'`); a keyless fn-scoped limit would be per-function and escape it.
- **R6** — the `child.stdin.on('error', () => {})` handler stays.
- **R2** — do not raise `CLAUDE_AGENT_CONCURRENCY` (or `AUDIT_CONCURRENCY`) without raising the worker `mem_limit`.
- **D3** — `MAX_REPLY_CHARS` is capped at every ingest boundary and the Closer prompt keeps its `<reply>` data fence.
- **C10** — a pipeline step must return small JSON (a string, for demo-gen); no Buffers, no cross-step `/tmp` files.

## Extension recipes

**Add a new agent to the roster**
1. Add the id to the `AgentId` union in `lib/agents/types.ts`.
2. Create `lib/agents/defs/<name>.ts` exporting its PRIMARY `AgentDef` (plus extra task defs from the same file, as
   Atlas and Nova do). Pick `validate`: `makeHtmlValidator` / `makeTextValidator` / `makeJsonValidator(schema)`.
3. Register the primary def in `AGENTS` (`lib/agents/registry.ts`).
4. If it is a review lens: build it with `reviewDef(id, role, personaByKey(key))` and add the persona to
   `REVIEW_PERSONAS` in `lib/demo-gen/prompt.ts`; board order in `board.ts` is fixed and the synthesis pass depends
   on it.
5. Add its rate to `lib/data/agent-rates.ts` and its dashboard/i18n copy if it needs a roster card.
6. Tests: extend `tests/agents/agent-defs.test.ts` (identity/model/tools/limits + a `buildPrompt` substring) — the
   registry test asserts every def carries the id it is keyed under. A JSON agent also needs a schema test
   (`closer-output.test.ts` is the template: clean parse, fenced parse, prose-wrapped parse, every rejection path).
7. `npm run typecheck && npm run test`. New pure files under `lib/agents/` must reach **100% coverage** or be added
   to `coverage.exclude` in `vitest.config.ts`.

**Add a task def to an existing agent** — same file, same `id`, different `role`/`limits`/`buildPrompt`/`validate`.
Do not add it to `AGENTS` (that map is one primary per agent); import it where it runs.

**Add a new model tier** — extend `AgentModel`. `AGENT_MODEL_<TIER>` resolves automatically; add the var to
`.env.example` + `../env-reference.md`, and give it a compose default if it must work in Docker.

**Change the model / gateway** — set `AGENT_MODEL_OPUS` / `AGENT_MODEL_SONNET`. In Docker, `ANTHROPIC_BASE_URL` and
`AGENT_MODEL_SONNET` are set under compose `environment:`, so **`.env.local` cannot override them** — use `./.env`
(I1). `AGENT_MODEL_OPUS` has no compose default and must come from `.env.local`.

## Traps

- **CONCURRENCY BUDGET.** All five claude-CLI Inngest functions — `run-demo-gen`, `run-build`, `run-outreach`,
  `run-support`, `handle-reply` — declare an **identical** first concurrency entry:
  `{ scope: 'account', key: '"claude-agent"', limit: Number(process.env.CLAUDE_AGENT_CONCURRENCY) || 2 }`. The shared
  account-scoped key makes them ONE queue, so the true ceiling is **N** (default 2) concurrent `claude` CLIs against
  the 4g worker — not 5 × N. Each also carries a second, keyed entry (`event.data.leadId`, or `event.data.dealId`
  for `handle-reply`) with `limit: 1` that serializes work per lead/deal. The pitfall is a **new** claude function:
  it MUST reuse the same `scope:'account', key:'"claude-agent"'` to stay inside the budget — a keyless fn-scoped
  limit would be per-function and silently raise the ceiling again (R3).
- **`AGENT_MODEL_OPUS` unset is silent.** `resolveModel` falls back to the literal `"opus"`, the gateway rejects it,
  and every pass burns 5 runner retries × Inngest retries before failing as an opaque `claude exited 1`.
- **The language split — mostly closed.** Echo, **Closer and Mira** now all write in the recipient's **market
  language**: each carries a `language` input, computed by `demoLanguageForAddress(lead.formattedAddress)` at the
  Inngest boundary (`run-outreach`, `handle-reply`, `run-support`) — English by default, Vietnamese only for a VN
  address — and their prompt bodies interpolate `${language}` rather than hardcoding "Vietnamese"/"…, Vietnam". The
  demo prompts interpolate `input.language` the same way. The proposal email is localized too: `send-proposal` picks
  its cover + subject from the client's language via `proposalCover()` (the PDF body was already English). **The one
  remaining holdout is Cipher**, whose prompt still hardcodes Vietnamese (and "…, Vietnam" after the city), so an
  English-market lead now gets an English cold email, English suggested reply, and English onboarding + proposal
  emails — but still Vietnamese SEO metadata. Fixing it means threading a `language` input into Cipher the same way.
- `board.ts` labels the `copy` lens "fluent local Vietnamese" in its `role` string. Harmless — `role` never reaches
  the model — but do not read it as the lens's actual behavior (the persona prompt uses `${input.language}`).
- **Validation failure is indistinguishable from a gateway failure** in the retry loop: five attempts, backoff, then
  throw. A def whose prompt reliably produces output its own validator rejects will burn ~65s per attempt-set and
  fail expensively. Keep validators strict but not stricter than the prompt.
- `AgentContext.signal` exists and is honored by `runClaude`, but **nothing passes a context** — you cannot cancel a
  running agent today. Do not document it as a feature.
- `--allowedTools` is only passed when `tools` is non-empty — but an empty `tools` list does **not** mean no tool
  turns: the CLI's own default tools can still burn one. That is why `novaBuilder` (`tools: []`) carries
  `maxTurns: 4` — at `maxTurns: 1` the model spent its single turn on a tool call and hit `error_max_turns`.
  Budget `maxTurns` above the turns you expect, and don't hand an agent a tool it does not need.

## Tests

Guarded today (`tests/agents/`, all pure, no DB and no keys):

| file | what it pins |
|---|---|
| `validators.test.ts` | every branch of `extractHtml`, the HTML thresholds, fence/prose stripping, **`makeTextValidator` throws on empty** (this is what enforces O6), the JSON parse/schema failure modes |
| `agent-defs.test.ts` | identity/model/tools/limits + `buildPrompt` substrings for the Atlas, Nova (`novaBuilder`/`novaReviser` only), Vega and review defs; `REVIEW_BOARD` order + its opus/Read-only membership; the `AGENTS` map and `getAgent`. It does **not** pin the ops defs (Echo/Closer/Mira/Cipher) or the Nova fixers — nothing asserts their model/tools/limits |
| `closer-output.test.ts` | the zod schema rejects a non-`DealStage` recommendation and out-of-range confidence; the prompt neutralises a literal `</reply>` and caps the reply length |
| `echo-output.test.ts`, `mira-output.test.ts`, `cipher-output.test.ts` | each JSON schema's accept/reject paths; Echo's language directive |
| `board-passes-clean.test.ts` | the early-stop predicate (lives in `pipelines/demo.ts`) |
| `delivery-seo.test.ts` | `injectSeo` / `fallbackMeta` / JSON-LD escaping / sitemap / robots |

**Guarded by NOTHING:**

- **`lib/agents/runner.ts` has no test at all** — no test file imports it, and it is in `vitest.config.ts`
  `coverage.exclude`. That means `resolveModel`, the argv assembly, the stdin write, the JSON envelope parse, the
  `<thinking>` strip, the SIGKILL timeout, the 5-attempt backoff, the stdout-on-failure diagnostics, the stdin EPIPE
  handler and `runBoard`'s drop-on-failure are **all unverified**. Change them by reading, not by trusting a suite.
- The **concurrency budget** (R3) — no test pins that the five claude functions share one account-scoped key, so a
  new function that omits the key (escaping the budget) would pass the suite.
- **B1/B2** for this directory — the worker-safety import walker
  (`tests/discovery/run-discovery-core-worker-safety.test.ts`) only walks the discovery entries; nothing walks
  `run-demo-gen`, `run-outreach`, `run-build`, `run-support` or `handle-reply`, so a `server-only` or `@/` import
  added anywhere under `lib/agents/` passes typecheck, passes the suite, and crashes the worker at boot.
