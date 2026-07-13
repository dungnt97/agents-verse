# Agents Verse

A demo-first **autonomous AI web agency**. A roster of specialized AI agents hunts local businesses on Google Maps,
audits the website they have (or the one they don't), builds a real redesign demo grounded in the venue's own photos
and reviews, and prepares the outreach — all under founder oversight, with a human gate on anything that leaves the
building.

**Next.js 16 + React 19 + TypeScript (strict)**, full-stack and fully self-hosted: **PostgreSQL + Drizzle ORM +
Better Auth + Inngest**, deployed with **Docker Compose on a single VPS**. No managed services.

## Dual-mode: `USE_DB`

One env flag decides where the app reads from — this is the key thing to understand:

- **Demo mode** (`USE_DB` unset/false — the default): the app runs entirely on the mock dataset in `lib/data/`.
  **No database, no credentials.** `npm run dev` just works. This is the showcase, and it is how CI runs.
- **DB mode** (`USE_DB=true` + a migrated Postgres): the same screens read real data through the server-only
  repository layer, auth is real, and every workspace action persists.

Pages are async Server Components that fetch the repository layer and pass plain props to client screens. Components
never touch the database or the mock directly.

## Stack

- **Next.js 16** (App Router, dynamic SSR) · **React 19** · **TypeScript** strict
- **PostgreSQL** (self-hosted) + **Drizzle ORM** + postgres-js — one direct connection, no pooler
- **Better Auth** — email/password, sessions in the DB; sign-up is disabled (the founder is the only account)
- **Inngest** (self-hosted) for durable jobs. A separate `worker` container runs them; the web app only sends events.
  Playwright, Lighthouse, Gemini and the `claude` CLI live **only** in the worker.
- **No CSS framework** — a hand-built CSS-variable design system in `app/globals.css` (light + dark)
- **i18n** — English + Tiếng Việt, switchable live

## Getting started

### Demo mode (zero credentials)

```bash
npm install
npm run dev        # → http://localhost:3000
```

Sign in at `/login` with any email and password, land on `/overview`. Toggle EN/VI and light/dark from the top bar.

### Full stack (Postgres + auth + the agent pipeline)

```bash
cp .env.example .env.local     # app config: DATABASE_URL, USE_DB=true, BETTER_AUTH_SECRET, API keys…
                               # NOTE: some vars must go in ./.env instead — see docs/env-reference.md
docker compose up -d --build   # web + db + redis + inngest + 9router + worker
```

The web container's entrypoint runs migrate → seed → start. Front it with a reverse proxy for TLS.

⚠️ `docker-compose.override.yml` is **auto-merged by every `docker compose` command in this directory** and forces a
keyless dev Inngest. Delete it (or pass `-f docker-compose.yml`) before deploying for real.

Full procedure: [`docs/deployment-guide.md`](./docs/deployment-guide.md). Every environment variable, what reads it,
and which file it belongs in: [`docs/env-reference.md`](./docs/env-reference.md).

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Dev · production build · serve |
| `npm run typecheck` | `tsc --noEmit` — **the primary gate**. Passes with no DB and no keys. |
| `npm run test` | Vitest unit suite. No DB, no keys. |
| `npm run test:db` | DB-mode suite (needs `DATABASE_URL`). A CI gate. |
| `npm run test:e2e` | Playwright, against a running seeded app. Not in CI. |
| `npm run lint` | ESLint. Has no `--max-warnings`, so it cannot fail — not a gate. |
| `npm run db:generate` / `db:migrate` / `db:seed` | Drizzle migrations and the seed |

## What works today

Discovery (Google Places or Apify), the website audit (hosted PageSpeed *or* self-hosted Lighthouse — no Google
account required), demo generation, outreach across four channels, deal automation, delivery and the cost ledger are
all built. Most are **key-gated** and degrade cleanly when a key is absent, so the demo never breaks.

Honest done-vs-pending, including the known gaps: [`docs/development-roadmap.md`](./docs/development-roadmap.md).

## Repo map

```
app/            App Router — marketing routes, the auth-gated workspace, API + demo route handlers
components/     Screens and shared UI (workspace · landing · marketing · ui · brand)
lib/
  data/         The mock AV singleton (the repository fallback) + client-safe formatting helpers
  db/           Drizzle client, schema, seed          repositories/  server-only data access (USE_DB switch)
  actions/      'use server' mutations                auth/          Better Auth
  discovery/    Lead discovery + the market hunter    audit/         The website audit engines
  agents/       The claude-CLI agent runtime          demo-gen/      Demo build, render, QA guards
  inngest/      The durable functions + the worker    integrations/  Outreach channels + the LLM gateway
  i18n/ providers/                                    proposals/
docs/           Specs (see below)                     tests/         Vitest + Playwright
```

## Docs

Start at [`docs/specs/architecture-map.md`](./docs/specs/architecture-map.md) — the module graph, the event bus, the
route inventory, and which spec owns what.

- [`docs/invariants.md`](./docs/invariants.md) — **the rules that break the repo when forgotten**, each with what
  breaks and what (if anything) enforces it
- [`docs/specs/`](./docs/specs) — one spec per subsystem: contracts, invariants, extension recipes, traps
- [`docs/env-reference.md`](./docs/env-reference.md) — every env var and which file it must live in
- [`docs/deployment-guide.md`](./docs/deployment-guide.md) — the VPS runbook
- [`docs/product-vision.md`](./docs/product-vision.md) — the product thesis
- [`docs/journals/`](./docs/journals) — dated session reflections. An archive; not a description of current behavior.

`CLAUDE.md` is the contract for AI agents working in this repo. `plans/` holds implementation plans (in Vietnamese)
and is gitignored — it is not in a fresh clone.
