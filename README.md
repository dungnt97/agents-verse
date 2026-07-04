# Agents Verse

A demo-first **autonomous AI web agency** — an AI workforce of specialized agents that finds outdated business websites, audits them, generates redesign demos, and prepares outreach, all under founder oversight.

**Next.js 16 + React 19 + TypeScript (strict)**, now **full-stack**: self-hosted **PostgreSQL + Drizzle ORM + Better Auth + self-hosted Inngest**, deployable via **Docker Compose on a single VPS**. No managed services (no Supabase). It began as a buildless CDN-React prototype, since fully migrated and removed (preserved in git history).

## Dual-mode: `USE_DB`

The app runs in two modes via one env flag — this is the key thing to understand:

- **Demo mode** (`USE_DB` unset/false, the default): runs entirely on the mock `AV` dataset in `lib/data/` — **no database, no credentials**. `npm run dev` just works. This is the showcase.
- **DB mode** (`USE_DB=true` + a migrated & seeded Postgres): the same screens read **real data** through the server-only repository layer; auth is real (Better Auth); workspace actions (lead/deal/demo/request stage changes, escalation resolve, settings, lead discovery, audits) **persist to Postgres**.

Components never import the mock directly — pages are async Server Components that fetch the repository layer and pass props down.

## Stack

- **Next.js 16** (App Router, Turbopack, dynamic SSR) · **React 19** · **TypeScript** (strict)
- **PostgreSQL** (self-hosted) + **Drizzle ORM** + **postgres-js** (single direct connection)
- **Better Auth** (email/password, sessions in DB) — dual-mode with a cookie demo fallback
- **Inngest** (self-hosted) for durable jobs — the Audit subsystem runs PageSpeed + Playwright + Gemini in a separate `worker` container
- **No CSS framework** — a custom CSS-variable design system in `app/globals.css` (light/dark)
- **i18n**: English + Tiếng Việt, switchable live
- Client state via React Context (Theme / i18n / Toast / Auth / WorkspaceState / WorkspaceData)

## Getting started

### Demo mode (zero credentials)

```bash
npm install
npm run dev        # → http://localhost:3000  (USE_DB unset → mock data)
```

Go to `/login`, sign in with **any email + password** (demo), land on `/overview`. Toggle **EN/VI** and **light/dark** top-right.

### Full stack (Postgres + auth + audit), via Docker

```bash
cp .env.example .env.local      # fill POSTGRES_*, a matching DATABASE_URL, BETTER_AUTH_SECRET, USE_DB=true
docker compose up -d --build    # web + db + inngest + redis + worker
```

The web container's entrypoint runs `migrate → seed → start`. Front it with a reverse proxy for TLS. Full instructions + the **required external keys** are in [`docs/deployment-guide.md`](./docs/deployment-guide.md).

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` / `build` / `start` | Dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` — the primary gate (passes with no DB/keys) |
| `npm run lint` | ESLint (`app`, `lib`, `components`) |
| `npm run db:generate` | Drizzle: generate a migration from `lib/db/schema/*` |
| `npm run db:migrate` / `db:seed` | Apply migrations / seed (need `DATABASE_URL` in `.env.local`) |

## Build-out status

| Area | State |
|------|-------|
| Foundation (DB client, schema, seed, repositories, dual-mode) | ✅ Done |
| Lead Discovery (Google Places, 2-phase) | ✅ Code-complete (needs `GOOGLE_MAPS_API_KEY` to run) |
| Real Auth (Better Auth), mutable-state→DB, Docker self-host | ✅ Done |
| Audit subsystem (PageSpeed + Playwright + Gemini, durable via Inngest) | ✅ Code-complete (needs `GEMINI_API_KEY` + `GOOGLE_PAGESPEED_API_KEY` + worker stack) |
| Workspace state machine (all interactions persist to Postgres) | ✅ Done |
| Subsystem 3 (demo generation) | ✅ Code-complete (needs the `claude` CLI backend — 9router gateway or `CLAUDE_CODE_OAUTH_TOKEN` — + worker stack) |
| Subsystem 4 (outreach/email) · 5 (deal/CRM) · 6 (delivery + inbound + Ledger) | ✅ Code-complete (outreach/onboarding/inbound key-gated on `RESEND_API_KEY` / `RESEND_INBOUND_SECRET`) |

See [`docs/development-roadmap.md`](./docs/development-roadmap.md) for detail.

## Routes

- **Public:** `/` (landing), `/login`, info pages (`/about /careers /contact /cases /guarantees /status /privacy /terms /security`)
- **Workspace** (auth-gated): `/overview`, `/command`, `/rooms` · `/rooms/[id]`, `/agents` · `/agents/[id]`, `/leads`, `/audits`, `/demos`, `/deals`, `/settings`, `/activity`, `/requests` (`?lead=` for detail context)

## Project structure

```
app/                 # App Router: routes (async Server Components) + root layout + providers
  (marketing)/ (workspace)/   # public + auth-gated screens
  api/auth/[...all]/ api/inngest/   # Better Auth + (worker) Inngest
components/workspace|landing|marketing|ui|brand   # screens + shared UI
lib/
  data/              # mock AV singleton (repository fallback) + format.ts (client-safe helpers)
  db/                # Drizzle client + schema/* + seed.ts ; drizzle/migrations/
  repositories/      # server-only data access (USE_DB → mock or Postgres)
  auth/              # Better Auth server/client/session
  actions/           # 'use server' mutations (state machine, discovery, audit-request)
  audit/ inngest/    # Audit engine + durable worker (worker container only)
  providers/ i18n/   # React context + localization
Dockerfile  Dockerfile.worker  docker-compose.yml  scripts/   # deploy
middleware.ts        # cheap Edge cookie gate (real gate = getCurrentUser in workspace layout)
```

Design + architecture docs live in [`docs/`](./docs); implementation plans (in Vietnamese) in [`plans/`](./plans).
