# CLAUDE.md

Guidance for Claude Code working in this repository. Read `./README.md` first for the project overview.

## What this is

**Agents Verse** — a demo-first autonomous AI web agency on **Next.js 16 (App Router) + React 19 + TypeScript (strict)**, now **full-stack**: self-hosted **PostgreSQL + Drizzle ORM + Better Auth + self-hosted Inngest**, deployable via **Docker Compose on one VPS** (no Supabase, no managed services).

**Dual-mode via the `USE_DB` env flag — the single most important thing to know:**
- `USE_DB` unset/false (default) → the app runs **entirely on the mock `AV` singleton** (`lib/data/`), no database. `npm run dev` works with **zero credentials** — this is the demo/showcase.
- `USE_DB=true` (+ a migrated & seeded Postgres) → the same screens read **real data** through the server-only **repository layer** (`lib/repositories/`), auth is real (Better Auth), and writes persist via **server actions** (`lib/actions/`).

**Components NEVER import `AV` directly** — they receive entity data via async Server-Component props (page → screen), with a small server-seeded directory context (`workspace-data-provider`) for pervasive room/agent lookups. The mock `AV` is now only the repositories' fallback when `USE_DB` is off. Every new mutation MUST honor dual-mode (degrade gracefully with no DB).

**Built so far** (all merged to `main`): Foundation (DB client/schema/seed/repos), Lead Discovery (Google Places + the **Orion** LLM qualifier), real Auth, mutable-state→DB, Docker self-host Postgres, the **Audit subsystem** (PageSpeed + Playwright + Gemini, durable via an Inngest worker), the full workspace **state machine** wired to Postgres, and Subsystems **3 demo-generation**, **4 outreach/email**, **5 deal/CRM**, and **6 delivery + inbound + Ledger** — all code-complete. What's left is runtime enablement, not code: they're **key-gated** (demo-gen needs the `claude` CLI backend; outreach/onboarding/inbound need `RESEND_API_KEY` / `RESEND_INBOUND_SECRET`) and degrade gracefully when a key is absent. See `docs/development-roadmap.md`.

The original buildless CDN-React prototype has been removed (preserved in git history only); the codebase is now Next.js-first.

## Commands

```bash
npm run dev         # dev server (Turbopack) → http://localhost:3000  (USE_DB=false → mock, no creds)
npm run build       # production build
npm run typecheck   # tsc --noEmit  (PRIMARY gate — always run after .ts/.tsx changes)
npm run test        # vitest run (pure unit suite: agents, discovery, inngest machines, i18n parity — no DB/keys)
npm run lint        # eslint app lib components
npm run db:generate # drizzle-kit generate (after editing lib/db/schema/*)
npm run db:migrate  # apply migrations  (needs DATABASE_URL in .env.local)
npm run db:seed     # seed org chart (rooms+agents+settings) + founder; business fixtures opt-in via SEED_DEMO_DATA=true (needs DATABASE_URL + BETTER_AUTH_SECRET + FOUNDER_PASSWORD)
docker compose up -d --build   # full stack: web + db(Postgres) + inngest + redis + worker
```

Always run `npm run typecheck` and `npm run test` after changing `.ts`/`.tsx` files (and ideally `npm run build`). All three pass with **no DB or keys** (mock fallback); that's the standard verification gate. Note: `package-lock.json` IS committed (Docker `npm ci` needs it).

## Architecture

- **App Router** under `app/`. Route groups: `app/(marketing)/[slug]` info pages, `app/(workspace)/*` (auth-gated shell + screens). All routes are **dynamic SSR** (root layout reads theme/lang cookies; workspace layout fetches data + runs the auth gate). No static export; deploy on Node.
- **Data access (`lib/repositories/`, server-only):** async functions mirroring the old `AV` helpers. `USE_DB` flag → return mock `AV` or query Drizzle. NEVER import these (or `lib/db/*`, `next/headers`) from a `'use client'` file. Pure presentation helpers (`fmt`, `statusMap`, enums, `hueFor`) live in `lib/data/format.ts` (client-safe). Pages are **async Server Components** that fetch repos and pass props to client screens.
- **DB (`lib/db/`):** Drizzle + postgres-js → self-hosted Postgres. `client.ts` = single direct connection (one `DATABASE_URL`, no pooler split). `schema/*` = domain tables + enums + Better Auth tables + `audit_jobs`. `seed.ts` ports the mock `AV` into Postgres + founder. Migrations in `drizzle/migrations/` — `db:generate` then apply via `db:migrate` (committed; don't hand-edit applied SQL).
- **Auth (`lib/auth/`, Better Auth, dual-mode):** `middleware.ts` does a cheap cookie-existence check (Edge, no DB); the REAL gate is `getCurrentUser()` in the workspace Server-Component layout. Demo mode uses the legacy `av-auth` cookie. Server actions are auth-guarded via `lib/actions/guard.ts`.
- **Mutations (`lib/actions/`, `'use server'`):** state-machine writes (lead/deal/demo/request stage+status, escalation resolve, settings, discovery, audit-request). `WorkspaceStateProvider` does optimistic update + action (DB mode) or localStorage (demo). Each action degrades gracefully without DB.
- **Audit subsystem:** `lib/audit/*` (PageSpeed/screenshot/vision) + `lib/inngest/*` (durable function + worker). **Playwright + Gemini run ONLY in the `worker` container** (outbound `connect()`); `web` only `inngest.send`s — keep it that way (don't import the audit function/engine into web).
- **Styling:** CSS-variable design system in `app/globals.css` (light + `[data-theme="dark"]`). **No Tailwind.** Use existing tokens (`var(--…)`) + utility classes (`.btn`, `.card`, `.row/.col`, …); heavy inline `style={}`. **UI fidelity is sacred** — match existing markup; don't restyle.
- **Worker tsx-safety:** the Inngest worker chain runs under `tsx`, where `import 'server-only'` THROWS and the `@/` alias isn't resolved. Worker-chain modules (`lib/audit/*`, `lib/inngest/*`) use **relative imports** and **no `server-only`**.

## Conventions (follow these)

- **kebab-case** file names; **no `window` globals** (use ES imports/exports + context).
- Add `'use client'` to any component using hooks/effects/handlers (all workspace screens are client).
- **i18n**: UI strings go through `t('ns.key')` from `useI18n()`. Keys live in `lib/i18n/keys/*.ts` (each exports `en` + `vi`, same keys) and are merged in `lib/i18n/i18n-provider.tsx`. To add UI text: wrap it in `t('ns.key')` and add EN+VI to a keys module. **Keep proper nouns + mock data content in English.** Preserve typographic apostrophes `’` / curly quotes `“ ”` exactly (don't let an editor flip them to straight ASCII — it has broken builds before).
- **UI fidelity**: this is a faithful port — match existing markup/inline styles; don't introduce new visual frameworks or restyle.
- Code comments explain the *why* and must **not** reference plan phases/finding codes; keep them self-contained.
- File size: prefer < ~200 LOC; split large files into focused modules.

## Plan language (MANDATORY)

- **All plan files MUST be written in Vietnamese** — everything under `./plans/` (`plan.md`, `phase-XX-*.md`, research/reports `*.md`). Prose, headings, descriptions, todo items, success criteria → Tiếng Việt.
- **Keep in English** (do NOT translate): code, identifiers, file/dir paths, commands, type/field names, API/library names, proper nouns, and code-block contents. Only the surrounding narrative prose is Vietnamese.
- This applies to plans authored directly and by any delegated `planner`/`researcher` subagent — pass this instruction along when spawning them.

## Where things live

- Docs: `./docs/` — `codebase-summary.md` (START HERE for current state), `system-architecture.md`, `deployment-guide.md` (run/deploy + required keys), `development-roadmap.md` (done vs pending), `code-standards.md`, `journals/`.
- Plans: `./plans/` (**written in Vietnamese** — see "Plan language" above). Done: `260613-…-backend-foundation-discovery`, `260614-…-audit-subsystem-…`.
- ClaudeKit workflow rules: `./.claude/rules/`

## Required external keys (only to RUN built features; not needed for typecheck/build/demo)
- **`GOOGLE_MAPS_API_KEY`** (Google Cloud, Places API New, **billing**) — Lead Discovery.
- **`GEMINI_API_KEY`** (Google AI Studio; `GEMINI_MODEL` overridable) — Audit vision.
- **`GOOGLE_PAGESPEED_API_KEY`** (free; falls back to the Maps key) — Audit performance.
- Self-generated (no purchase): `BETTER_AUTH_SECRET`, `POSTGRES_PASSWORD`, `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY`. Postgres + Inngest are self-hosted (free). See `.env.example` + `docs/deployment-guide.md`.
