# CLAUDE.md

The contract for any AI agent working in this repo. It is short on purpose: it holds the rules that break things
when forgotten, and a router to the spec that owns each subsystem. **Read the spec before you change the code.**

## What this is

**Agents Verse** — a demo-first autonomous AI web agency. It discovers businesses on Google Maps, audits their
site (or lack of one), generates a real redesign demo, and prepares outreach — under founder oversight.

**Next.js 16 (App Router) + React 19 + TypeScript (strict)** · self-hosted **Postgres + Drizzle + Better Auth +
Inngest** · **Docker Compose on one VPS**. No managed services.

**Two runtimes, and the boundary between them is load-bearing:**
- **`web`** (Next.js) — pages, screens, server actions, repositories. It may only `inngest.send()` an event.
- **`worker`** (tsx + Inngest `connect()`) — every durable job. Playwright, Lighthouse, Gemini and the `claude`
  CLI exist **only** here.

**Dual-mode via `USE_DB`:**
- unset/false (default) → the whole app runs on the mock `AV` singleton (`lib/data/`). `npm run dev` works with
  **zero credentials** — that is the showcase, and it is how CI runs.
- `true` (+ a migrated Postgres) → the same screens read real data through `lib/repositories/`, auth is real, and
  writes persist via `lib/actions/`. **Every new mutation must work in both modes.**

## Commands

```bash
npm run dev         # → localhost:3000 (USE_DB unset → mock data, no credentials)
npm run typecheck   # tsc --noEmit — THE PRIMARY GATE (also covers tests/, scripts/, *.config.ts)
npm run test        # vitest — the unit suite. No DB, no keys.
npm run test:db     # DB-mode suite (needs DATABASE_URL). A CI gate — run it if you touched DB-mode code.
npm run build       # next build
npm run lint        # eslint — has no --max-warnings, so it CANNOT fail. Not a gate.
npm run db:generate # after editing lib/db/schema/* (and exporting from the barrel)
npm run db:migrate  # apply migrations
npm run db:seed     # org chart + founder; business fixtures need SEED_DEMO_DATA=true
docker compose up -d --build   # web + db + redis + inngest + 9router + worker
```

**The gate before any PR:** `npm run typecheck && npm run test && npm run build` — all three pass with **no DB and
no keys**. That is the standard. Add `npm run test:db` when you touched DB-mode code.

## The Top-10 NEVER list

Break one of these and you break the repo. Full list (~60 rules) with *what breaks* and *what enforces it*:
**[`docs/invariants.md`](./docs/invariants.md)** — read it before your first commit. "Enforced by: nothing" appears
often, and those are the rules that actually get violated.

1. **B1** — Worker-chain code (`lib/inngest/**`, `lib/agents/**`, `lib/demo-gen/**`, `lib/audit/**`,
   `lib/discovery/run-discovery-core.ts`, `lib/proposals/**`, `lib/db/**`) uses **relative imports**, never
   `import 'server-only'`, never `next/*`, never `lib/repositories/*`. It runs under `tsx`. Typecheck won't catch it.
2. **B2** — Web code **never** imports a worker engine: `lib/audit/*`, `lib/agents/*`, `lib/demo-gen/*`,
   `lib/inngest/functions/*`. From `lib/inngest` it may import only the engine-free modules (`client.ts`,
   `start-pipeline-run.ts`, `pipeline-machine.ts`). Otherwise Playwright and the `claude` CLI land in `next build`.
3. **B3** — A `'use client'` file **never** value-imports `lib/repositories/*`, `lib/db/*`, `lib/actions/guard.ts`,
   `lib/auth/session.ts` or `next/headers`. (`import type` is fine.)
4. **C1** — Every terminal path of a pipeline worker function **emits its fact event** (`ok` or `failed`), including
   every early return. A run left `running` blocks that lead from a new run until the `reap-stale-runs` cron fails it
   (a slow backstop that discards the in-flight work — not a substitute for emitting the fact).
5. **C2** — Run-scoped event ids are keyed by **`runId`, never `leadId`** (Inngest dedupes for ~24h).
6. **D1** — Any fetch or navigation of a **lead-supplied URL** goes through `safeFetch` / `assertSafeUrl`. Never a
   bare `fetch()`. Those URLs are attacker-influenceable and we fetch them from inside the Docker network.
7. **M1** — **Never** add `websiteUri` (or any Enterprise-SKU field) to `DISCOVERY_FIELD_MASK`. It bills *every*
   search at ~$7/1k instead of ~$2.50/1k. Enterprise fields belong only in `ENRICH_FIELD_MASK`.
8. **O1** — Every repository function branches on `USE_DB` **first** and returns a mock/neutral value; every server
   action degrades (`guardMutation()` → `{ok:false, message}`). `npm run dev` with no credentials must still work.
9. **O2** — **The demo never invents a business fact.** Real phone / address / reviews / photos are threaded
   `leads` row → `DemoGenInput` → the prompt, with explicit never-invent language. A fact we don't have is omitted,
   not fabricated. Nothing enforces this — it regressed once and shipped a fake phone number.
10. **R1** — Keep the audit `concurrency` **array** with both entries (a keyless global cap *and* the per-lead key).
    A lone keyed limit means unbounded parallel Chromium instances and an OOM-killed worker.

## Building something? Read its spec first

| Touching… | Read first |
|---|---|
| anything — start here for orientation | [`docs/specs/architecture-map.md`](./docs/specs/architecture-map.md) |
| repositories, schema, migrations, server actions, auth | [`docs/specs/data-layer.md`](./docs/specs/data-layer.md) |
| lead discovery, providers, the market hunter, the cron | [`docs/specs/discovery.md`](./docs/specs/discovery.md) |
| website audit, PageSpeed/Lighthouse, vision, greenfield | [`docs/specs/audit.md`](./docs/specs/audit.md) |
| any `claude`-CLI agent, prompts, defs, the registry | [`docs/specs/agents-runtime.md`](./docs/specs/agents-runtime.md) |
| demo generation, `lib/demo-gen/*`, `/demo/[leadId]` | [`docs/specs/demo-gen.md`](./docs/specs/demo-gen.md) |
| any Inngest function, a new hop, escalations, autonomy | [`docs/specs/pipeline-orchestrator.md`](./docs/specs/pipeline-orchestrator.md) |
| outreach channels, inbound webhooks | [`docs/specs/outreach-inbound.md`](./docs/specs/outreach-inbound.md) |
| deals, the Closer, proposals, delivery, the cost ledger | [`docs/specs/deals-proposals-delivery.md`](./docs/specs/deals-proposals-delivery.md) |
| pages, screens, styling, i18n | [`docs/specs/ui-i18n.md`](./docs/specs/ui-i18n.md) |
| Docker, CI, which test suite is actually a gate | [`docs/specs/ops-runtime.md`](./docs/specs/ops-runtime.md) |
| any environment variable | [`docs/env-reference.md`](./docs/env-reference.md) |
| **before any PR** | [`docs/invariants.md`](./docs/invariants.md) |

## New-feature checklist

1. **Read the spec** for what you're touching, plus `docs/invariants.md`. Crossing two subsystems? Read both specs —
   the boundary is where the invariants bite.
2. **Pick your runtime.** Worker code: relative imports, no `server-only` (B1). Web code: `@/` imports, and it may
   only send events (B2). Client components: no repositories, no `db`, no `AV` (B3, B4).
3. **Honor dual-mode.** New read → a repository function that branches on `USE_DB` first. New write → a `'use server'`
   action that starts with `guardMutation()`, degrades with `{ok:false, message}`, ends with `revalidatePath()` (O1).
4. **Honor the money and durability rules** if you touch discovery (M1–M4) or any Inngest function (C1–C10 — above
   all: every terminal path emits its fact).
5. **i18n** — every user-visible string is `t('ns.key')` with **EN and VI in the same commit**. A new key module must
   be registered in `i18n-provider.tsx` *and* in both parity tests, or it is silently invisible (U1, U2).
6. **Schema change?** Edit `lib/db/schema/*` → export it from the barrel `index.ts` → `npm run db:generate` → commit
   the generated SQL → `npm run db:migrate`. Never hand-edit an applied migration (F3).
7. **Add the tests.** Pure logic → `tests/<area>/`. DB behavior → `tests/db/` (must self-skip without `DATABASE_URL`).
   A new worker function → add its entry file to `ENTRY_FILES` in the worker-safety test, which guards only a few of
   them today. A new env var → `.env.example` **and** `docs/env-reference.md`, saying *which file* it lives in.
8. **Run the gate** (above).
9. **Record what you learned.** A new trap → the subsystem spec's *Traps* section. A rule whose violation breaks the
   repo → `docs/invariants.md`, **with its enforced-by column**. If nothing enforces it, write `nothing` — that is
   the most useful word in that file.

## Conventions

- **kebab-case** file names. No `window` globals. Prefer < ~200 LOC per file.
- `'use client'` on any component with hooks/handlers. Workspace *pages* are async Server Components; the *screens*
  they render are client components.
- **No Tailwind, no CSS-in-JS, no new CSS files.** Use the tokens and utility classes in `app/globals.css`, plus
  inline `style={}`. **UI fidelity is sacred** — match the existing markup; don't restyle.
- Preserve typographic apostrophes `’` and curly quotes `“ ”` byte-exact. Flipping them to ASCII has broken the build.
- Comments explain the **why**. They must never cite a plan phase, a finding code, or a PR number.
- `package-lock.json` stays committed (Docker and CI run `npm ci`).

## Plan language (MANDATORY)

- **Everything under `./plans/` is written in Vietnamese** — prose, headings, todo items, success criteria.
- **Keep in English:** code, identifiers, paths, commands, type/field names, library names, proper nouns, and the
  contents of code blocks. Only the surrounding narrative is Vietnamese.
- Pass this rule on to any `planner` / `researcher` subagent you spawn.
- Note: `plans/` is **gitignored** — a fresh clone does not have it.

`./.claude/rules/` holds the workflow rules (delegation, review, docs).
