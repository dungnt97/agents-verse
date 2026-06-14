# Agents Verse — Codebase Summary

A high-level map of the codebase for engineer/LLM onboarding. Factual, grounded in the current source tree.

## What This Project Is — Current State

Agents Verse is a **production-ready full-stack SaaS** for autonomous, demo-first web agency operations. An AI workforce of 11 specialized agents operating across 8 virtual departments ("rooms") finds local businesses with outdated websites, audits them, generates live redesign demos, and prepares outreach. The founder retains control through escalation gates, autonomy modes, and cost/outreach guardrails.

**Technology Stack (all production-grade, all live):**
- **Frontend:** Next.js 16.2.9 + React 19.2.7 + TypeScript strict (17 routes: marketing + workspace)
- **Backend:** Self-hosted PostgreSQL 17 (docker-compose `db` service) + Drizzle ORM + Better Auth email/password
- **Jobs & Audit:** Inngest (self-hosted durable queue) + Playwright (screenshots) + Google Gemini 2.5 Flash (vision scoring)
- **Lead Discovery:** Google Places API 2-phase (Pro mandatory, optional Enterprise) + cheerio email scraping
- **Deployment:** Docker Compose on a single VPS (web + db + redis + inngest + worker) fronted by reverse proxy (Caddy/Nginx) for TLS

**Dual-mode runtime:** Single codebase, environment flag `USE_DB` switches behavior:
- **Demo mode** (default, `USE_DB=false` or unset): All data from typed mock `AV` singleton (`lib/data/`), persisted to localStorage. Zero credentials required. Perfect for showcase, local dev, and testing.
- **Production mode** (`USE_DB=true` + Docker Compose): Real Postgres backend, Better Auth sessions in DB, durable Inngest jobs, guarded server actions. Requires `.env.local` with `POSTGRES_*`, `BETTER_AUTH_SECRET`, and optional keys for external APIs.

**Build status:** Complete and deployable. `npm run typecheck`, `npm run build`, and `npm run lint` all pass. All 17 routes are live and data-backed. Lead discovery is code-complete (requires `GOOGLE_MAPS_API_KEY` to execute). Audit subsystem is code-complete (requires `GEMINI_API_KEY` + `GOOGLE_PAGESPEED_API_KEY` + Inngest/worker setup). See `docs/deployment-guide.md` for full setup.

## Run Model (Next.js + React Server Components)

Next.js 16 App Router with TypeScript. No legacy buildless code is used at runtime.

**Demo mode (default, no credentials required):**
```bash
cp .env.example .env.local
npm run dev   # http://localhost:3000
# All data flows from mock AV singleton (lib/data/index.ts) → localStorage
```

**Production mode (requires credentials):**
```bash
# .env.local must include:
POSTGRES_USER=agentsverse
POSTGRES_PASSWORD=<strong>     # openssl rand -base64 32
POSTGRES_DB=agentsverse
DATABASE_URL=postgresql://agentsverse:<strong>@db:5432/agentsverse  # single direct URL (app+migrations+seed)
BETTER_AUTH_SECRET=<32-byte hex>
GOOGLE_MAPS_API_KEY=<key>     # Optional, for lead discovery
USE_DB=true                   # Enable Postgres
docker compose up -d --build  # web + db; or host dev with localhost:5432
```

**Docker deployment:**
```bash
docker compose up
# Entrypoint runs: migrate → seed → start
# Requires env vars in .env file
```

### Build & Verification

- **Typecheck:** `npm run typecheck` (tsc --noEmit, strict mode)
- **Build:** `npm run build` (Next.js standalone; all routes dynamic SSR)
- **Dev:** `npm run dev` (Turbopack on :3000)
- **Lint:** `npm run lint` (ESLint 9)

All 13 workspace + 4 public routes are **dynamic** (no static export) because `app/layout.tsx` reads cookies on the server.

## Architecture & Conventions (Next.js + Dual-Mode)

- **App Router.** Next.js 16 with `app/` directory. Routes are `.tsx` files with TypeScript strict mode. Route groups organize marketing (`/(marketing)`) and workspace (`/(workspace)`) screens.
- **Dual-mode data access.** Data flows from mock `AV` singleton (`lib/data/index.ts`) when `USE_DB=false`, or from Postgres via Drizzle repositories when `USE_DB=true`. Components remain agnostic.
- **Server Components by default.** Workspace layout is an RSC; child routes are client components (marked `'use client'`). Auth check happens in RSC via `getCurrentUser()`.
- **React Context for state.** Theme, language, auth, toast, workspace mode/requests/leads flow via providers (`lib/providers/`). No Redux/Zustand; localStorage persists across sessions (theme, lang, mode, requests, leads).
- **Server Actions for mutations.** Create/update/delete operations live in `lib/actions/` and guard auth server-side.
- **Styling.** CSS custom-property design system in `styles/globals.css` (tokens for color, shadow, radius, typography, layout) plus utility classes (`.btn`, `.card`, `.badge`, `.row/.col`); inline `style={{}}` objects throughout. Fonts: Hanken Grotesk (sans) and JetBrains Mono (mono) via Google Fonts. Primary color is orange. No Tailwind.
- **i18n.** Dictionary keys in `lib/i18n/keys/*.ts` (en + vi); merged in `I18nProvider`. Components call `t('ns.key')` to get translation. Strings are kept in English for code/UI; proper nouns/market data stay English always.
- **Naming.** Kebab-case filenames (`marketing-frame.tsx`, `floor-overview.tsx`); TypeScript interfaces for types. File size target: <200 LOC per file.
- **No extra libraries.** No state library, no date library, no animation library. CSS `@keyframes` + CSS transitions for motion.

## File Inventory (Next.js Structure)

### App Router & Routing
- `app/layout.tsx` — Root layout: server-side cookie read (theme, lang, auth), provider composition, dynamic rendering.
- `app/page.tsx` — Landing page (public).
- `app/(marketing)/[slug]/page.tsx` — 9 info pages (about, careers, contact, cases, guarantees, privacy, terms, security, status).
- `app/login/page.tsx` — Auth gate (email/password form).
- `app/(workspace)/layout.tsx` — Workspace shell: RSC, calls `getCurrentUser()` for auth gate, fetches directory, wraps with providers.
- `app/(workspace)/overview/page.tsx`, `command/`, `rooms/`, `agents/`, `leads/`, `audits/[id]/`, `demos/[id]/`, `deals/[id]/`, `settings/`, `activity/`, `requests/` — 14 authenticated workspace screens (client components).
- `app/api/auth/[...all]/route.ts` — Better Auth dynamic route handler (login, signup, session, callback).
- `middleware.ts` — Edge middleware: cheap auth cookie check, redirects workspace routes to `/login` if missing.

### Components & Primitives
- `components/brand/` — Mark, Logo, Icon (45+ SVG icons).
- `components/ui/` — Button, Card, Badge, Breadcrumb, etc. (reused from legacy).
- `components/landing/` — LandingNav, Hero, HeroVisual, sections, Pricing, Footer, etc.
- `components/marketing/` — MarketingFrame, DemoRequestModal, ContactForm, ChatWidget.
- `components/workspace/` — Sidebar, TopBar, CommandPalette, AutonomyControl, ReviewCenter, FloorMap, Workspace shell components.

### Data & Repositories
- `lib/data/` — Types + mock singleton:
  - `types.ts` — Room, Agent, Lead, Audit, Demo, Deal, Request interfaces.
  - `index.ts` — `AV` singleton (rooms, agents, leads, metrics, escalations, activity, demos, deals, requests, helpers).
  - `format.ts` — Formatting helpers (`money`, `k`, `truncate`, etc.).
- `lib/repositories/` — Server-only data access (dual-mode via `USE_DB`):
  - `leads.ts`, `rooms.ts`, `agents.ts`, `audits.ts`, `demos.ts`, `deals.ts`, `requests.ts` — CRUD functions returning same types as `AV`.
  - When `USE_DB=false`: return mock data from `AV`.
  - When `USE_DB=true`: fetch from Postgres via Drizzle.
- `lib/db/` — Database layer:
  - `client.ts` — Drizzle client over a single direct connection (postgres-js client-side pool); no pooler.
  - `schema/` — Table definitions (rooms, agents, leads, audits, demos, deals, escalations, activity, requests, demoRequests, users, sessions, etc.).
  - `seed.ts` — Idempotent seed with founder creation via Better Auth.
- `lib/discovery/` — Lead discovery (Google Places API):
  - `places-fetcher.ts` — HTTP fetch with field masks.
  - `dedup.ts` — Deduplication by composite key.
  - `cheerio-scraper.ts` — Email extraction from websites.

### Providers & Auth
- `lib/providers/theme.tsx` — ThemeProvider + useTheme.
- `lib/providers/toast.tsx` — ToastProvider + useToast.
- `lib/providers/auth.tsx` — AuthProvider + useAuth (reads cookies in demo mode, Better Auth session in DB mode).
- `lib/providers/workspace-data.tsx` — WorkspaceDataProvider (room/agent directory cache).
- `lib/providers/workspace-state.tsx` — WorkspaceStateProvider (mode, requests, leads; persisted to localStorage).
- `lib/auth/server.ts` — `getCurrentUser()` (RSC-safe), `getSession()` (Better Auth when USE_DB=true).
- `lib/auth/client.ts` — Client-side `useSession()` hook.
- `app/providers.tsx` — Provider composition.

### Actions & Mutations
- `lib/actions/leads.ts` — `createLead()`, `updateLead()` (drag/drop, stage change).
- `lib/actions/requests.ts` — `createDemoRequest()` (public), `updateDemoRequest()`, `convertToLead()`.
- `lib/actions/settings.ts` — `setAutonomyMode()`.
- `lib/actions/run-discovery.ts` — `runDiscovery()` (trigger Google Places + enrichment).
- `lib/actions/run-audit.ts` — `requestAudit()` (auth-guarded, queues real audit via Inngest).

### Audit Engine (Inngest Subsystem 2)
- `lib/audit/` — Scoring modules:
  - `pagespeed-client.ts` — Google PageSpeed Insights API (performance, accessibility, SEO, best-practices).
  - `screenshot.ts` — Playwright headless browser (desktop + mobile viewports).
  - `vision-scoring.ts` — Google Gemini 2.5 Flash structured JSON output (visual, cta, trust, content, conversion).
  - `scoring-rubric.ts` — Combines PageSpeed + Gemini into 8-dim profile; maps to redesign direction.
  - `map-audit-result.ts` — Merges scores, problems, confidence, summary into `MappedAudit`.
- `lib/inngest/` — Durable job orchestration:
  - `client.ts` — Inngest client (web sends events).
  - `functions/run-audit.ts` — Job function (4 steps: mark-running → pagespeed → screenshot-and-score → save).
  - `worker-entrypoint.ts` — Worker main entry (registers function, polls for events, graceful shutdown).
- `lib/repositories/audit-jobs.ts` — Tracks job state (queued → running → done/failed); repo pattern matching leads/demos/deals.

### i18n & Styling
- `lib/i18n/` — `I18nProvider`, `useI18n()`, keys in `keys/*.ts` (en + vi).
- `styles/globals.css` — CSS custom-property design system (tokens, utilities, animations, responsive breakpoints).

## Domain Model (from lib/data/types.ts + lib/db/schema/)

Core entities are defined in `lib/data/types.ts` and mirrored in `lib/db/schema/` when `USE_DB=true`. Everything hangs off the `AV` singleton (demo mode) or Postgres tables (production). Entities:

- **rooms** `[{ id, name, short, purpose, status, agents[], active, running, done, health, mission, x, y, pos }]` — 8 rooms: CEO Control, Research, Audit, Design, Code, Sales, Support, Finance. `x`/`y` (0–100) drive the floor-map layout; `status` ∈ active|idle|review|warning.
- **agents** `[{ id, name, role, room, status, conf, tasks, quality, cost, task, hue }]` — 11 agents (e.g., "Lead Hunter Agent", "UI Designer Agent"). `status` ∈ working|idle|waiting|review|escalate; `conf`/`quality` are 0–100; `hue` colors avatars.
- **leads** `[{ id, company, industry, city, url, site, score, value, agent, stage, demo }]` — 8 prospects. `stage` pipeline: found → audited → demo → contacted → replied → won. `demo` status: none → draft → review → approved → sent → replied → won.
- **metrics** `{ scanned, leads, demos, outreach, replies, won, forecast, cost, costLimit, escalations, online, inProgress, completed, margin, netProfit }` — daily headline KPIs.
- **escalations** `[{ id, kind, sev, title, who, value, agent, reason, rec, conf, time }]` — 3 items awaiting founder decision. `kind` ∈ human|deal|cost; `sev` ∈ high|medium.
- **activity** `[{ t, agent, room, type, text, status }]` — 20 recent events. `type` taxonomy: lead|demo|escalate|audit|outreach|reply|production|cost|deal; `status` badge ∈ info|success|warning|review|danger.
- **demos** (derived from leads where `demo !== 'none'`) `[{ id, leadId, business, industry, city, url, oldScore, newScore, status, agents[], generated, demoUrl, changes[], checklist, outreach }]`.
- **deals** `[{ id, leadId, client, pkg, price, value, probability, stage, escReason, aiRec, conf, reply{...}, production{...} }]` — 4 deals. `stage`: pricing → created → quoted → approval → call → won/lost.
- **audits** — multi-dimensional scoring: visual, mobile, cta, trust, seo, speed, content, conversion (0–100 each), plus `problems[]` and an industry-keyed `redesign` template.
- **demoRequests** `[{ id, business, url, industry, city, name, email, message, t, status }]` — 5 inbound requests; `status` ∈ new|reviewing|contacted|converted|declined.

**Stage machines** (lead pipeline, demo status, deal stage) and **escalation gates** (human request, deal above threshold, cost approaching limit) are the central control-flow concepts. **Lookup helpers** (`agentById`, `roomById`, `demoByLead`, `dealByLead`) resolve entities by id.

### Conventions in data
- IDs are lowercase kebab-case (`atlas-d`, `nova-r`, `d-nova`).
- Money via `AV.fmt.money(n)` → `$X,XXX` and `AV.fmt.k(n)` → `$X.Xk`.
- Times are relative strings (`just now`, `2m`, `1h`).
- Status CSS classes: `badge-success`, `badge-warning`, `badge-danger`, `badge-info`, `badge-primary`, `badge-neutral`, `badge-violet`.

## Key Shared Primitives

| Hook / Component | Source | Purpose |
|-----------------|--------|---------|
| `useTheme` | `lib/providers/theme.tsx` | Light/dark toggle; writes `data-theme` on `<html>`, persists to `av-theme` cookie |
| `useI18n` / `t()` | `lib/i18n/` | en/vi translation lookup; reads `av-lang` cookie; call `t('ns.key')` |
| `useToast` / `pushToast` | `lib/providers/toast.tsx` | Auto-dismissing (3.4s) toast queue |
| `useAuth` | `lib/providers/auth.tsx` | Auth state; reads `av-auth` cookie (demo) or Better Auth session (DB) |
| `useWorkspaceState` | `lib/providers/workspace-state.tsx` | Workspace state: mode, requests, leads (persisted to localStorage) |
| `useWorkspaceData` | `lib/providers/workspace-data.tsx` | Room/agent directory cache (seeded by workspace layout RSC) |
| `StatusBadge` | `components/ui/` | Status pill with color coding |
| `AgentAvatar` / `AvatarStack` | `components/ui/` | oklch-gradient avatars; overlapped stacks |
| `ConfidenceRing` | `components/ui/` | Circular 0–100% SVG gauge |
| `Sparkline` | `components/ui/` | 7-point mini trend chart |
| `Icon` / `Logo` / `Mark` | `components/brand/` | 45+ line SVG icons and brand marks |
| `SiteMock` | `components/ui/` | Before/after device wireframes |
| `FloorMap` | `components/workspace/` | Animated spatial room schematic |

## Next Steps & Known Limitations

**Code-complete features (require credentials to run):**
- **Database:** Drizzle ORM + 15 tables (design complete, migrations generated; apply with `npm run db:migrate` against `DATABASE_URL`)
- **Auth:** Better Auth (setup complete, requires `BETTER_AUTH_SECRET` + Postgres to authenticate)
- **Lead Discovery:** Google Places API 2-phase (code complete, requires `GOOGLE_MAPS_API_KEY` to execute)
- **Subsystem 2 (Audit):** Real website scoring via PageSpeed Insights + Playwright + Gemini vision (8-dimension: visual, mobile, cta, trust, seo, speed, content, conversion). Durable execution via self-hosted Inngest + Redis. Requires `GEMINI_API_KEY`, `GOOGLE_PAGESPEED_API_KEY`, `INNGEST_*` keys, and a separate `worker` container (see docker-compose). Demo mode shows mock audit results.
- **Docker deploy:** Multi-service setup with entrypoint (web + db + redis + inngest + worker). Requires VPS + env vars + reverse proxy for TLS.

**Future subsystems (roadmap, not in this release):**
- **Subsystem 3:** Demo Gen (template + Claude + Imagen/Nano → single renderer)
- **Subsystem 4:** Outreach (Resend + approval gate + CAN-SPAM compliance)

**Demo data:** Seed includes 8 leads (dentists in Austin, TX) + 11 agents + 8 rooms + 5 demo requests + 4 deals. Fully functional UI with mock state; discovery and real audits require credentials to execute (Google Places API, Gemini, PageSpeed Insights).

## Migration Status: FUNCTIONALLY COMPLETE (Dual-Stack, Pending Cleanup)

**As of June 2026, the Agents Verse buildless→Next.js migration is functionally complete.** The full app now runs on Next.js; legacy buildless files remain in the repo root **pending visual review and cleanup**.

### Next.js App (Sets 1 + 2 — LIVE)
**Next.js 16.2.9 + React 19.2.7 + TypeScript** handles all 17 routes (marketing + workspace):

- **Set 1 (Marketing, live):** 11 routes: `/` (landing), `/(marketing)/[slug]` (9 info pages), `/login`.
- **Set 2 (Workspace, live):** 14 routes: `/overview`, `/command`, `/rooms`, `/rooms/[id]`, `/agents`, `/agents/[id]`, `/leads`, `/audits`, `/demos`, `/deals`, `/settings`, `/activity`, `/requests` (detail/initial-lead via `?lead=` query).
- **Render model:** Cookie-SSR (root layout reads `av-theme`, `av-lang`, `av-auth` cookies on server → no flash). All routes are dynamic (`ƒ`).
- **Auth gate:** `middleware.ts` protects workspace routes; unauthenticated users redirect to `/login`.
- **Data layer:** `lib/data/` includes base `AV` (rooms, agents, leads, metrics, escalations, activity) + extended helpers (`agentDetail`, `roomProjects`, `roomTimeline`, `roomMetrics`, demos, audits, deals, demoRequests).
- **Workspace shell:** `app/(workspace)/layout.tsx` wires Sidebar, TopBar, CommandPalette, scroll-reset, and global keyboard handlers (Cmd/Ctrl+K palette, Escape).
- **State management:** `WorkspaceStateProvider` manages mode (autonomy), requests (demo inbox), and leads (pipeline), seeded from extended `lib/data` and persisted to localStorage (`av-mode`, `av-requests`, `av-leads`).

### Legacy Buildless Files (Retained, Not Removed)
The original buildless prototype (`index.html`, `*.jsx`, `*.js`, `styles.css` in repo root) **still exists** as a complete reference. It is not loaded by the Next.js app and is intentionally retained in git history for visual review before deletion. **Do not use or modify**; the codebase is now Next.js-first.

### Build-out Status
**Set 1 (marketing) — Complete.** 11 routes live; `tsc` + lint + `next build` pass.
**Set 2 (workspace) — Complete.** 14 routes live; all workspace screens operational (overview, command, rooms detail, agents detail, leads pipeline, audits detail, demos, deals, settings, activity, requests, + 2 layout routes).
**Subsystems:**
- **Subsystem 1 (Lead Discovery)** — Complete. Google Places API 2-phase (Pro + optional Enterprise) with email scraping.
- **Subsystem 2 (Audit)** — Complete. Real website scoring via PageSpeed Insights + Playwright + Gemini 2.5 Flash. Durable execution via self-hosted Inngest + Redis. Worker runs Chromium + vision analysis in isolation.

**Known gaps (mock-only or future, expected):**
- Demo generation (Subsystem 3) — mock demo URLs only; no real Claude+Imagen renderer yet.
- Outreach engine (Subsystem 4) — replies and "send" actions trigger toast callbacks, not real Resend sends yet.
- Chat widget — static rule-based (`setTimeout`), not streaming Claude AI yet.
- Agent history/outputs — richly seeded only for a couple of roles; others fall back to defaults.
- No per-agent real-time spend tracking; settings expose config UI only.
- Production timelines — `deals` lifecycle is partially seeded, not fully interactive yet.
- No automated test framework; linting and type-checking pre-commit (no CI enforced yet).

## Unresolved Questions

- Some reader analysis described several business screens as "Coming Soon," but `index.html` and `app.jsx` show them wired and routed (pipeline, audit, demos, deals, settings, activity, requests). The summary reflects the actual wiring; remaining "Coming Soon" applies only to unrecognized routes. Confirm whether any wired screen is intentionally a stub.
- `autonomy mode` values appear inconsistently across analyses (manual/review/guarded/full vs. guarded/autopilot). The exact enum was not re-verified against `settings.jsx` / `app-shell.jsx` for this summary.
