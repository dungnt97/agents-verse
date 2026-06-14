# Project Changelog — Agents Verse

Significant milestones and releases. For detailed implementation phases, see `plans/` directory (Vietnamese).

---

## [2026-06-14] Repository Cleanup — Legacy Prototype Removed

**Removed:**
- Deleted the original buildless CDN-React prototype: root `index.html`, `styles.css`, `.thumbnail`, `data.js`/`data2.js`/`data3.js`/`data4.js`, and all 24 root `*.jsx` files (`app.jsx`, `app-shell.jsx`, `i18n.jsx`, `agents.jsx`, `deals.jsx`, `demos.jsx`, `rooms.jsx`, `landing.jsx`, `pages.jsx`, etc.). These were retained for visual reference only and are no longer needed.
- Deleted dev artifact directories: `uploads/` (9 pasted PNGs) and `screens/` (2 PNGs).

**Moved:**
- Relocated `styles/globals.css` → `app/globals.css` (Next.js App Router convention); updated the import in `app/layout.tsx`.

**Housekeeping:**
- Added `/uploads/`, `/screens/`, and `.thumbnail` to `.gitignore`.
- Synced docs to drop references to the deleted prototype: `README.md`, `CLAUDE.md`, `docs/system-architecture.md`, `docs/code-standards.md`, `docs/codebase-summary.md`, `docs/project-overview-pdr.md`.

**Verification:**
- `npm run typecheck`, `npm run lint`, and `npm run build` all pass (build exit 0, all routes compile) in mock mode (no DB or keys).

---

## [2026-06-14] Audit Subsystem Complete (Subsystem 2)

**Features:**
- Real website audits via PageSpeed Insights API + Playwright headless screenshots + Google Gemini 2.5 Flash vision analysis.
- 8-dimensional scoring: visual design, mobile UX, CTA clarity, trust signals, SEO, performance, content quality, conversion potential (0–100 each).
- Durable job orchestration via self-hosted Inngest + Redis. Worker container isolates Playwright + Gemini compute (prevents OOM on VPS).
- Audit state tracked in `audit_jobs` table (queued → running → done/failed). Results persisted to `audits` table.
- Per-lead concurrency limit (serial audits for the same lead) + global concurrency guard (max 2 Chromium instances for 2GB VPS RAM).
- SSRF protection: `captureScreenshots` validates URLs before `page.goto()`.

**Deploy:**
- Added `Dockerfile.worker`, worker entrypoint, Inngest function (`lib/inngest/functions/run-audit.ts`).
- Docker Compose includes `redis`, `inngest`, and `worker` services (in addition to existing `web` and `db`).
- Environment variables: `GEMINI_API_KEY`, `GOOGLE_PAGESPEED_API_KEY`, `INNGEST_*`, `REDIS_URL`, `AUDIT_CONCURRENCY`.

**Verification:**
- `/audits/[id]` shows mock results by default. Click "Run real audit" to queue a job (visible only if `USE_DB=true` and Gemini key is set).
- Job status badge updates from the `audit_jobs` table. Results appear in 8-dim breakdown once complete.

---

## [2026-06-13] Foundation, Lead Discovery & State Machine Complete

**Phase 0 — Database Foundation:**
- Drizzle ORM + PostgreSQL 17 schema (15 tables: rooms, agents, leads, audits, demos, deals, escalations, activity, requests, demoRequests, users, sessions, verifications, accounts, authenticators).
- Single direct Postgres connection (`postgres-js` client-side pool, no transaction pooler).
- Migrations in `drizzle/migrations/`, idempotent and fail-fast.
- Seed: founder account (Better Auth scrypt hash), 8 leads, 11 agents, 8 rooms, 5 demo requests, 4 deals, mock activity/escalations.

**Subsystem 1 — Lead Discovery (Google Places API):**
- 2-phase discovery: Pro tier (text search, 1K calls ~$2.50) + optional Enterprise (enrichment, 1K calls ~$7).
- Chunked field masks to minimize cost: Pro fetches name, address, website, phone; Enterprise adds internationalPhoneNumber.
- Email scraping via cheerio/JSDOM from discovered websites.
- Deduplication by composite key (place ID unstable; falls back to name + address).
- Daily quota enforcement (`DISCOVERY_DAILY_CAP`, default 100).
- Server action `runDiscovery()` wires to `/leads` "Run discovery" button.

**Full-Stack Wiring (Dual-Mode State Machine):**
- **Repository layer** (`lib/repositories/`) abstracts data: USE_DB flag switches between mock `AV` and Postgres.
- **Server actions** (`lib/actions/`) handle all mutations: lead stage, demo approval, deal status, autonomy mode, settings, discovery, audit requests.
- **Optimistic UI:** Client components update state immediately; server actions reconcile with DB (or localStorage in demo mode).
- **Auth gate:** Better Auth (email/password, sessions in DB) + demo mode fallback (localStorage cookie).
- **Docker Compose:** web + db + Postgres entrypoint (migrate → seed → start).

**Verification:**
- `npm run typecheck`, `npm run build`, `npm run lint` all pass.
- Demo mode (`USE_DB=false`): `npm run dev`, zero credentials, all screens live with mock data.
- DB mode (`USE_DB=true`): Postgres required, migrations applied, founder can log in, lead discovery executes if `GOOGLE_MAPS_API_KEY` is set.

---

## [2026-06-11] Next.js Migration Complete (Sets 1 + 2)

**App Router & Routing (17 routes live):**
- Set 1 (marketing): Landing (`/`), 9 info pages (`/(marketing)/[slug]`), login (`/login`).
- Set 2 (workspace): 14 screens under `/(workspace)/` — overview, command, rooms (index + detail), agents (index + detail), leads, audits, demos, deals, settings, activity, requests.
- All routes dynamic SSR (no static export). Root layout reads `av-*` cookies on server → no theme/language flash.

**Tech Stack:**
- Next.js 16.2.9 + React 19.2.7 + TypeScript strict.
- App Router with route groups and dynamic segments.
- Server Components by default; client screens marked `'use client'`.
- Context providers: Theme, I18n, Auth, Toast, WorkspaceData, WorkspaceState.

**UI Parity with Legacy Buildless:**
- All 45+ SVG icons (brand/) + primitives (ui/) + landing sections ported unchanged.
- CSS custom-property design system (styles/globals.css) byte-identical to legacy styles.css.
- Inline `style={{}}` objects + utility classes throughout (no Tailwind).
- Light/dark toggle via `data-theme`, en/vi translations via `t('ns.key')`.

**Data & State:**
- `lib/data/` includes typed `AV` singleton (rooms, agents, leads, metrics, escalations, activity).
- `lib/providers/` manages theme, i18n, auth, toast, workspace state (mode, requests, leads).
- localStorage persistence: `av-theme`, `av-lang`, `av-auth`, `av-mode`, `av-requests`, `av-leads`.

**Verification:**
- Demo mode: `npm run dev`, login works, all 17 routes render with mock data.
- All components render correctly; theme + language toggles work.
- Responsive layout on mobile and desktop.

---

## [2026-05-30] Project Kickoff

**Initial brief:** Migrate buildless CDN-React prototype to a full-stack SaaS (Next.js + Postgres).

**Retained legacy code:** Root `index.html`, `*.jsx`, `data*.js`, `styles.css` for visual reference (not used by Next.js app).

---

## Known Limitations (As of June 2026)

- **Subsystem 3 (Demo Generation):** Placeholder URLs only. No real Claude + Imagen + render pipeline yet.
- **Subsystem 4 (Outreach/Email):** Resend integration not implemented. Outreach actions trigger toasts, not real sends.
- **Chat widget:** Rule-based static replies (setTimeout). No streaming Claude API.
- **Agent outputs:** Mock/seeded only for a few roles; others use defaults. No live model inference.
- **Deal automation:** UI wired, state partially mutable, but production timeline is display-only.
- **Test suite:** No Jest/Vitest. Manual browser testing is the standard.

---

## Build-Out Status

| Phase | Area | Status |
|-------|------|--------|
| 0 | Foundation (DB, schema, seed, dual-mode) | ✅ Complete |
| S1 | Lead Discovery (Google Places) | ✅ Complete |
| S2 | Audit (PageSpeed + Playwright + Gemini via Inngest) | ✅ Complete |
| S3 | Demo Generation | ⬜ Not started (key-gated) |
| S4 | Outreach / Email | ⬜ Not started (key-gated) |
| S5 | Deal Automation | ⬜ Partial (UI wired, state machine TBD) |

---

## How to Continue

See `docs/development-roadmap.md` for next steps (Subsystems 3, 4, 5) and `docs/deployment-guide.md` for production setup on a VPS.
