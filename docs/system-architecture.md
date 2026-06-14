# System Architecture — Agents Verse

**Status (June 2026):** Agents Verse is a **production-ready full-stack Next.js SaaS** with self-hosted PostgreSQL + Drizzle ORM + Better Auth + Inngest. Dual-mode runtime: demo mode (mock data, no credentials) or production mode (Postgres, requires keys). This document covers:

- **Sections 9–12:** The **Next.js app (Sets 1 + 2 — LIVE in production)** — cookie-SSR, TypeScript, App Router, Drizzle + Postgres, Better Auth, server actions, lead discovery (Google Places), and audit subsystem (Inngest + Playwright + Gemini). This is the only architecture in use.

---

## NEXT.JS ARCHITECTURE (SETS 1 + 2 — LIVE) — Start here

Agents Verse is a **production-ready full-stack SaaS** running on **Next.js 16.2.9 + React 19.2.7 + TypeScript + Drizzle ORM + self-hosted PostgreSQL 17 + Inngest + Playwright + Google Gemini**. It operates in **dual-mode** via a single environment flag:

- **Demo mode** (`USE_DB=false`, the default): All data from a typed mock `AV` singleton (`lib/data/index.ts`), persisted locally via localStorage. Runs without any external services or credentials — perfect for showcase/development. `npm run dev` just works.
- **Production mode** (`USE_DB=true` + Docker Compose): Real Postgres backend, auth via Better Auth (sessions in DB), mutations via guarded server actions, and durable jobs via Inngest. Requires `POSTGRES_*`, `BETTER_AUTH_SECRET`, and optional keys for lead discovery (Google Places) and real audits (Gemini, PageSpeed Insights).

Both marketing surface (Set 1) and authenticated workspace (Set 2) are **live and mode-agnostic** — the same code path serves both demo and production data, switching based on the `USE_DB` flag.

### 9.1 Stack & Project Structure

```
app/                                    # Next.js App Router (17 routes)
├── layout.tsx                         # Root layout: SSR cookie read, providers wired
├── page.tsx                           # Landing page (/)
├── providers.tsx                      # ThemeProvider, I18nProvider, ToastProvider, AuthProvider
├── (marketing)/                       # Set 1: marketing pages
│   └── [slug]/page.tsx               # 9 info pages (about, careers, contact, …)
├── login/
│   └── page.tsx                       # Auth gate (email/password)
└── (workspace)/                       # Set 2: workspace screens (14 routes, all live)
    ├── layout.tsx                     # Workspace shell (Sidebar, TopBar, CommandPalette, scroll-reset)
    ├── overview/page.tsx              # Floor overview + escalations + activity
    ├── command/page.tsx               # Escalation review / approvals
    ├── rooms/
    │   ├── page.tsx                   # Rooms index (filterable grid)
    │   └── [id]/page.tsx              # Room detail + projects + agents + timeline
    ├── agents/
    │   ├── page.tsx                   # Agents index (confidence rings)
    │   └── [id]/page.tsx              # Agent detail + skills + chat
    ├── leads/page.tsx                 # Lead pipeline (kanban board)
    ├── audits/
    │   └── [id]/page.tsx              # Audit detail report (8 dimensions + problems)
    ├── demos/
    │   └── [id]/page.tsx              # Demo manager (before/after, checklist, templates)
    ├── deals/
    │   └── [id]/page.tsx              # Deal approval + production tracking
    ├── settings/page.tsx              # Brand, autonomy, pricing, guardrails, budgets
    ├── activity/page.tsx              # Cross-room activity timeline
    └── requests/page.tsx              # Demo requests (public inbox + triage)

components/
├── brand/                             # Mark, Logo, Icon (45+ SVG icons)
├── ui/                                # Primitives: Button, Card, Badge, Breadcrumb, etc.
├── landing/                           # LandingNav, Hero, sections, Pricing, etc.
├── marketing/                         # MarketingFrame, ChatWidget, DemoRequestModal
├── workspace/                         # Workspace shell components
│   ├── sidebar.tsx                    # Nav tree, autonomy selector, badges
│   ├── top-bar.tsx                    # Breadcrumbs, theme/language toggles, review drawer
│   ├── command-palette.tsx            # Cmd/Ctrl+K search
│   ├── autonomy-control.tsx           # Mode selector
│   ├── review-center.tsx              # Right drawer for escalations
│   ├── coming-soon.tsx                # Placeholder for future routes
│   └── route-meta.tsx                 # Route metadata (labels, icons, descriptions)
├── site-mock.tsx                      # Before/after device wireframes
└── floor-map.tsx                      # Animated room schematic

lib/
├── data/                              # Base + extended AV types & data
│   ├── index.ts                       # rooms, agents, leads, metrics, escalations, activity
│   ├── data-2.ts                      # agentDetail, roomProjects, roomTimeline, roomMetrics helpers
│   ├── data-3.ts                      # REDESIGN templates, SCORE_PROFILES, demos, audits
│   ├── data-4.ts                      # deals, demoRequests
│   └── types.ts                       # Room, Agent, Lead, Metrics, Escalation, Activity, etc.
├── i18n/                              # Dictionary en/vi, I18nProvider, useI18n
├── providers/                         # Context providers
│   ├── theme.tsx                      # ThemeProvider + useTheme
│   ├── toast.tsx                      # ToastProvider + useToast
│   ├── auth.tsx                       # AuthProvider + useAuth
│   └── workspace-state.tsx            # WorkspaceStateProvider (mode, requests, leads)
├── cookies.ts                         # Helper to read/write av-* cookies
└── info-slugs.ts                      # Marketing page route mapping

app/
└── globals.css                        # Design system: tokens, theme, utilities (single visual source of truth)

middleware.ts                          # Auth gate: redirects workspace routes to /login if !av-auth

public/                                # Static assets (fonts, icons, etc. from Google CDN via CSS @import)
```

### 9.2 Render Model: Cookie-SSR (No Flash-of-Unstyled-Content)

The key innovation in Set 1 is **server-side cookie reading in the root layout** to eliminate theme/language flash on load:

```tsx
// app/layout.tsx (simplified)
export default function RootLayout({ children }) {
  const theme = cookies().get('av-theme')?.value || 'light';  // read on server
  const lang = cookies().get('av-lang')?.value || 'en';
  const auth = cookies().get('av-auth')?.value;
  
  return (
    <html data-theme={theme} lang={lang.slice(0, 2)}>
      {/* Head … */}
      <body>
        <Providers initialTheme={theme} initialLang={lang} initialAuth={auth}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

**Every route is dynamically rendered (`ƒ`)** because the layout reads cookies. This ensures no stale theme/language attributes in the initial HTML. Hydration is instant (no provider-level state mismatch).

**Deploy target:** Node or edge runtime (Vercel, Netlify, etc.). Static export (`output: 'export'`) is **not** used.

### 9.3 Module System & Data Layer

Files use **ES modules with TypeScript**. The buildless global-scope pattern is replaced:

```tsx
// Old: window.AV = { rooms: [...], agents: [...], ... }
// New: lib/data/index.ts (fully typed)
export const AV = {
  rooms: [...],
  agents: [...],
  leads: [...],
  metrics: { ... },
  escalations: [...],
  activity: [...],
  // helpers from data-2.ts, data-3.ts, data-4.ts:
  agentById: (id) => Agent | undefined,
  roomById: (id) => Room | undefined,
  demoByLead: (leadId) => Demo | undefined,
  dealByLead: (leadId) => Deal | undefined,
  audit: (siteUrl) => AuditReport,
  // data3: REDESIGN templates, SCORE_PROFILES, demos array
  // data4: deals, demoRequests
};

// Consumers:
import { AV } from '@/lib/data';
const agent = AV.agentById(id);
const demo = AV.demoByLead(leadId);
```

**Context providers** manage mutable app state (replaces window-globals):

```tsx
// Theme, language, auth, toast, workspace state flow via React Context
import { useTheme } from '@/lib/providers/theme';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/lib/providers/toast';
import { useAuth } from '@/lib/providers/auth';
import { useWorkspaceState } from '@/lib/providers/workspace-state'; // Set 2

// Any component can call these hooks (no prop drilling)
const { theme, toggleTheme } = useTheme();
const { t, lang, setLang } = useI18n();
const { pushToast } = useToast();
const { isAuthed, login, logout, user } = useAuth();
const { mode, setMode, requests, addRequest, leads, updateLead } = useWorkspaceState(); // Set 2
```

**WorkspaceStateProvider (Set 2)** manages session state unique to the workspace:
- `mode` (autonomy: guarded / review / autopilot / manual), persisted to `av-mode`
- `requests` (demo request inbox, seeded from `AV.demoRequests`), persisted to `av-requests`
- `leads` (lead pipeline, seeded from `AV.leads`), persisted to `av-leads`

### 9.3a Data Access Layer (DAL) — Repository Pattern with Dual-Mode Flag

**Dual-mode runtime via `USE_DB` environment variable:**

```tsx
// lib/repositories/leads.ts (example)
export async function getLeads() {
  if (!process.env.USE_DB || process.env.USE_DB === 'false') {
    // Demo mode: return mock data from AV
    return AV.leads.map(lead => transformLeadToRaw(lead));
  }
  // DB mode: fetch from Postgres via Drizzle
  const db = getDB();
  return await db.query.leads.findMany({
    with: { audit: true, demo: true, deal: true }
  });
}
```

**Repositories live in `lib/repositories/` (server-only):**
- `leads.ts` — CRUD for prospects (discovery, pipeline state, deal tracking)
- `rooms.ts` — Room status and agent assignments
- `agents.ts` — Agent metrics and task queue
- `audits.ts` — Audit results (8-dimension scoring)
- `demos.ts` — Demo records and outreach templates
- `deals.ts` — Deal lifecycle (quote → approval → production)
- `requests.ts` — Public demo-request inbox

All repositories return the same TypeScript types as mock `AV`, ensuring UI components work unchanged whether data flows from Postgres or localStorage.

**Database layer: `lib/db/`**
- `client.ts` — Drizzle client over **self-hosted PostgreSQL 17** (docker-compose `db` service)
  - A single direct connection (`db:5432`); postgres-js manages a client-side pool
  - One `DATABASE_URL` shared by app queries, migrations, and seed — no pooler / no `DIRECT_URL` split
  - Prepared statements ON (postgres-js default); the `prepare:false` workaround is only needed behind a transaction pooler, which is not used here
- `schema/` — 15 tables + 5 pgEnums via Drizzle TypeSchema (`*.ts` in `schema/`)
  - `rooms`, `agents`, `leads`, `audits`, `demos`, `deals`, `escalations`, `activity`, `requests`, `demoRequests`, `users`, `sessions`, `verifications`, `accounts`, `authenticators`
- `seed.ts` — Idempotent seed (Better Auth hashes password; seed does not override)

**Workspace Data Provider (cache for directory):**

The workspace layout (`app/(workspace)/layout.tsx`) is a Server Component that:
1. Calls `getCurrentUser()` to gate auth (server-side check, not just cookie)
2. Fetches room/agent directory once via `getWorkspaceDirectory()`
3. Wraps children with `WorkspaceDataProvider` (client context) — seeding the room/agent lookup for leaf components

This avoids prop-drilling while keeping directory reads close to the auth gate.

### 9.4 Routing (Next.js App Router)

Routes are file-based under `app/`. All 17 routes are live:

| Category | Route | File | Behavior |
|----------|-------|------|----------|
| **Marketing** | `/` | `app/page.tsx` | Landing page |
| | `/(marketing)/{slug}` | `app/(marketing)/[slug]/page.tsx` | 9 info pages (about, careers, contact, cases, guarantees, privacy, terms, security, status) |
| | `/login` | `app/login/page.tsx` | Auth gate (email/password) |
| **Workspace** | `/overview` | `app/(workspace)/overview/page.tsx` | Floor overview (headline metrics, escalations, activity) |
| | `/command` | `app/(workspace)/command/page.tsx` | Escalation review / CEO decisions |
| | `/rooms` | `app/(workspace)/rooms/page.tsx` | Rooms index (grid, filters) |
| | `/rooms/[id]` | `app/(workspace)/rooms/[id]/page.tsx` | Room detail (projects, agents, timeline, metrics) |
| | `/agents` | `app/(workspace)/agents/page.tsx` | Agents index (confidence rings, grid) |
| | `/agents/[id]` | `app/(workspace)/agents/[id]/page.tsx` | Agent detail (skills, outputs, chat) |
| | `/leads` | `app/(workspace)/leads/page.tsx` | Lead pipeline (kanban board: found → audited → demo → contacted → replied → won) |
| | `/audits/[id]` | `app/(workspace)/audits/[id]/page.tsx` | Audit detail (8-dimension scores, problems, redesign direction) |
| | `/demos/[id]` | `app/(workspace)/demos/[id]/page.tsx` | Demo manager (before/after, quality checklist, outreach templates) |
| | `/deals/[id]` | `app/(workspace)/deals/[id]/page.tsx` | Deal approval (escalation flags, client reply, production timeline) |
| | `/settings` | `app/(workspace)/settings/page.tsx` | Settings (brand, autonomy mode, pricing, guardrails, AI budgets) |
| | `/activity` | `app/(workspace)/activity/page.tsx` | Activity timeline (filterable, searchable, type badges) |
| | `/requests` | `app/(workspace)/requests/page.tsx` | Demo requests inbox (triage, reply, convert-to-lead, decline) |

**Detail routes with query params:**
- `/requests?lead=leadId` — demo request detail
- `/leads` with sidebar selection — lead card expanded

**Auth gate (dual-mode):**
- **Edge middleware (`middleware.ts`):** Checks `av-auth` cookie (cheap check on edge); redirects workspace routes to `/login` if missing.
- **Server Component auth (`lib/auth/server.ts`):** When `USE_DB=true`, Server Components call `getCurrentUser()` which validates the session against the database (Better Auth).
- **Demo mode auth:** When `USE_DB=false`, auth uses demo email/cookie (founder credentials from seed).

**Better Auth integration (`lib/auth/`, when `USE_DB=true`):**
- `server.ts` — `getCurrentUser()`, `getSession()`, RSC-safe session checks.
- `client.ts` — Client hook `useSession()` for reading auth state in browsers.
- `session.ts` — Session handler for route callbacks.
- `app/api/auth/[...all]` — Dynamic route handler for Better Auth flows (login, signup, callback, session).

Email verification is disabled (no transactional email service); founder created via seed with scrypt-hashed password.

### 9.4b Server Actions & Mutable Operations (when `USE_DB=true`)

Mutations are handled via Server Actions in `lib/actions/`:
- `leads.ts` — `createLead()`, `updateLead()` (drag/drop, stage change)
- `requests.ts` — `createDemoRequest()` (public), `updateDemoRequest()`, `convertToLead()`
- `settings.ts` — `setAutonomyMode()` (guarded/review/autopilot/manual)
- `run-discovery.ts` — `runDiscovery()` (trigger lead discovery, Google Places API)

Server actions are:
- **Auth-guarded** (call `getCurrentUser()` first; public actions like `createDemoRequest` explicitly allow unauthenticated)
- **Dual-mode:** When `USE_DB=false`, mutations go to localStorage; when `USE_DB=true`, they commit to Postgres
- **Optimistic UI:** Client components call actions and optimistically update state, then reconcile with server

Example:

```tsx
// app/(workspace)/leads/page.tsx
'use client';
import { updateLead } from '@/lib/actions/leads';

export default function LeadsPage() {
  const { leads, updateLead: updateLocal } = useWorkspaceState();
  
  const handleDragEnd = async (leadId, newStage) => {
    // Optimistic: update local state immediately
    updateLocal(leadId, { stage: newStage });
    
    // Server action: commit to DB (if USE_DB=true) or localStorage
    await updateLead(leadId, { stage: newStage });
  };
}
```

### 9.5 Providers & Hooks

Six stacked providers wire app-level and workspace state:

1. **ThemeProvider** → `useTheme()` → reads/writes `av-theme` cookie; sets `data-theme` on `<html>`.
2. **I18nProvider** → `useI18n()` → reads `av-lang` cookie; manages `en`/`vi` dictionary; provides `t()` helper.
3. **ToastProvider** → `useToast()` → global toast queue; mounts `ToastHost` once at root.
4. **AuthProvider** → `useAuth()` → reads `av-auth` / `av-user` cookies (demo) OR Better Auth session (DB mode); provides `login(email)`, `logout()`, `isAuthed`.
5. **WorkspaceDataProvider** → provides room/agent directory cache (seeded in workspace layout Server Component).
6. **WorkspaceStateProvider** → `useWorkspaceState()` → manages mode, requests, leads (Set 2 only). Persisted to `localStorage`.

Wired in `app/providers.tsx` and composed in `app/layout.tsx`:

```tsx
<ThemeProvider initialTheme={...}>
  <I18nProvider initialLang={...}>
    <AuthProvider initialAuth={...}>
      <ToastProvider>
        <WorkspaceDataProvider initialRooms={...} initialAgents={...}>
          <WorkspaceStateProvider>
            {children}
          </WorkspaceStateProvider>
        </WorkspaceDataProvider>
      </ToastProvider>
    </AuthProvider>
  </I18nProvider>
</ThemeProvider>
```

All hooks are safe to call from any client component:
- Marketing routes use Theme, I18n, Toast, Auth.
- Workspace routes additionally use WorkspaceDataProvider (room/agent lookup) and WorkspaceState (autonomy mode, request inbox, lead pipeline).

### 9.6 Component Reuse: Primitives & UI Library

**Shared UI primitives:** The primitives (`brand/`, `ui/`, `site-mock.tsx`, `floor-map.tsx`) are reused across marketing and workspace surfaces. The CSS-custom-property design system (`app/globals.css`) is the single visual source of truth.

**New layout components:** `MarketingFrame` wraps public routes and provides shared chrome (header with theme/language toggles, chat widget, demo request modal, footer).

### 9.7 Data Persistence: Cookies & localStorage

| Key | Type | Scope | Use |
|-----|------|-------|-----|
| `av-auth` | cookie | All | Auth gate; middleware redirects on missing |
| `av-user` | cookie | Session | Logged-in user email |
| `av-theme` | cookie | Persistent | Light/dark mode; read on server (no flash) |
| `av-lang` | cookie | Persistent | en/vi; read on server (no flash) |
| `av-mode` | localStorage | Session | Autonomy mode (Set 2) |
| `av-requests` | localStorage | Session | Demo request inbox state (Set 2) |
| `av-leads` | localStorage | Session | Lead pipeline state (Set 2) |

Cookies are read in the server layout for initial HTML; providers sync them on client-side changes.

### 9.8 Set 1 (Marketing) + Set 2 (Workspace) — BOTH LIVE

**Set 1 (Marketing) — Complete:**
- 11 routes: landing, 9 info pages, login.
- Base `AV` from `lib/data`.
- All primitives (brand, ui, landing, marketing) ported and tested.
- UI parity verified (punctuation, spacing, colors).

**Set 2 (Workspace) — Complete:**
- 14 authenticated routes: overview, command, rooms (index + detail), agents (index + detail), leads, audits, demos, deals, settings, activity, requests.
- `lib/data` contains typed versions of the original mock datasets (agentDetail, roomProjects, roomTimeline, roomMetrics, REDESIGN templates, SCORE_PROFILES, demos, audits, deals, demoRequests).
- Workspace shell layout (`app/(workspace)/layout.tsx`): Sidebar, TopBar, CommandPalette, scroll-reset, global keyboard handlers (Cmd/Ctrl+K palette, ESC).
- WorkspaceStateProvider manages autonomy mode, demo requests inbox, lead pipeline (all persisted to localStorage).
- Auth-gated via middleware: workspace routes redirect to `/login` if `av-auth` cookie absent.
- Reuses all Set 1 infrastructure: providers, primitives, theming, i18n, toast, auth.

### 9.9 Subsystem 1: Lead Discovery (Google Places API)

When `USE_DB=true` and `GOOGLE_MAPS_API_KEY` is set, the `/leads` page includes a **Discover** button that triggers a 2-phase discovery process via `runDiscovery()` server action:

**Phase 1 (Pro):** Find local businesses matching seed criteria (market: dentists/clinics in configured US metros).
- Uses Google Places API with `textSearch` + field mask `["places.id", "places.displayName", "places.formattedAddress", "places.websiteUri", "places.internationalPhoneNumber"]`
- Cost: ~$2.50/1K queries (Pro tier)
- Results: placeId, business name, address, website, phone

**Phase 2 (Enterprise, optional):** Enrich with contact info if needed.
- Field mask: `["places.websiteUri", "places.internationalPhoneNumber"]` (Enterprise only)
- Cost: ~$7/1K queries (Enterprise tier)
- Configured via `DISCOVERY_ENABLE_ENTERPRISE_ENRICHMENT` env var

**Discovery Pipeline (`lib/discovery/`):**
- `places-fetcher.ts` — HTTP fetch to Google Places API with masked fields
- `dedup.ts` — Deduplication by composite key (placeId is not stable >12 months; uses name+address)
- `cheerio-scraper.ts` — Email scraping from business website (cheerio/JSDOM)

**Rate Limiting & Cost Control:**
- Daily cap: `DISCOVERY_DAILY_CAP` (default 100, configurable)
- Quota per day: app tracks `usedQuota` per day and stops when cap is reached
- Inngest (async job queue) deferred to future plan; currently discovery is synchronous server action

**Lead Creation:**
Discovered prospects are bulk-inserted into the `leads` table with:
- `stage`: 'found' (initial)
- `company`, `industry`, `city`, `url` from Places API
- `site`: `{ domain, emailsFound: [...] }` from web scraping

Lead then flows through audit → demo → outreach pipeline.

### 9.10 Subsystem 2: Website Audit (Real Scoring via Inngest Worker)

The audit subsystem performs **live, multi-dimensional scoring** of a lead's website using PageSpeed Insights, Playwright screenshots, and Gemini vision analysis. Results are durable via **self-hosted Inngest + Redis**, with Playwright + Gemini computation isolated in a dedicated worker container to keep the web app slim.

**High-level flow:**
1. User clicks "Run real audit" on the audit detail page (`/audits/[id]`)
2. Server action `requestAudit()` queues an Inngest event (authenticated, guarded)
3. The `run-audit` function orchestrates 4 steps: mark-running → fetch PageSpeed + screenshot → score with Gemini → save results
4. Results written to `audits` table (8-dim scores: visual, mobile, cta, trust, seo, speed, content, conversion; plus problems, redesign direction, confidence, summary)
5. UI badge/status reflects job state from `audit_jobs` table (queued → running → done/failed)

**Architecture (web-stays-slim boundary):**

- **Web container** (`web`): Knows Inngest client only (`lib/inngest/client.ts`). Sends audit events via `Inngest.send()` after auth check. Never imports Playwright, Gemini SDK, or the audit engine.
- **Worker container** (`worker`): Runs the actual job function (`lib/inngest/functions/run-audit.ts`). Has Inngest `connect()` outbound to the event queue, runs all PageSpeed/screenshot/vision steps, commits results to shared Postgres, closes gracefully on SIGTERM.
- **Shared services** (via docker-compose): Redis (Inngest event store), Inngest server (event ingestion + job orchestration), Postgres (audits + audit_jobs tables).

**Engine modules (`lib/audit/`):**
- `pagespeed-client.ts` — Calls Google PageSpeed Insights API with `GOOGLE_PAGESPEED_API_KEY` (or falls back to `GOOGLE_MAPS_API_KEY`). Returns performance, accessibility, SEO, and best-practices scores (0–100 each); also computes a blended `mobile` score.
- `screenshot.ts` — Uses Playwright to navigate to `lead.url` and capture screenshots (desktop + mobile viewports). Buffers are kept in memory and not serialized across Inngest step boundaries.
- `vision-scoring.ts` — Calls Google Gemini 2.5 Flash (`@google/genai` v2.x, structured JSON output) to analyze screenshots. Scores: visual design, CTA clarity, trust signals, content quality, conversion potential (0–100 each).
- `scoring-rubric.ts` — Combines PageSpeed + Gemini scores into the 8-dim profile, applies clamp/rounding guards, maps to redesign direction (e.g., "Mobile UX" if speed/mobile are weak).
- `map-audit-result.ts` — Merges PageSpeed + Gemini outputs into the `MappedAudit` structure (scores, problems, redesign, confidence, summary).

**Job state tracking (`audit_jobs` table + `AuditJob` enum):**
- `status`: queued → running → done/failed
- `error`: stores the root cause if a step fails (not shown to unauthenticated users)
- `audit_jobs` is a separate table (not nullable columns on `audits`) so the `/audits/[id]` screen always renders full mock/discovered results even if the real audit is queued/failed

**Inngest configuration (self-hosted, durable concurrency):**
- `INNGEST_BASE_URL` — the Inngest server (e.g., `http://inngest:3000` in docker-compose)
- `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` — authentication between web + worker and the Inngest server
- `INNGEST_DEV=0` (production) or `INNGEST_DEV=1` (local dev with `npx inngest dev`)
- Concurrency guards: a **global cap** (e.g., 2 concurrent Chromium instances to prevent OOM on 2 GB worker) AND a **per-lead serialization** (key: `leadId`, limit: 1) so the same lead never has overlapping audits
- Worker uses `inngest.connect()` to register the `run-audit` function and poll for events

**Environment variables (audit-specific, added to `.env.local`):**
```
GEMINI_API_KEY=<your-key>                      # Google Gemini API key
GEMINI_MODEL=gemini-2.5-flash                  # Gemini model (overridable; default used in code)
GOOGLE_PAGESPEED_API_KEY=<key>                 # PageSpeed Insights API key (optional; falls back to GOOGLE_MAPS_API_KEY)
INNGEST_EVENT_KEY=<key>                        # Inngest auth: web → server
INNGEST_SIGNING_KEY=<key>                      # Inngest auth: server → worker
INNGEST_BASE_URL=http://inngest:3000           # Inngest server (docker-compose) or https://... (managed)
INNGEST_DEV=0                                  # 0 = production; 1 = local dev
REDIS_URL=redis://redis:6379                   # Redis for Inngest (docker-compose)
AUDIT_CONCURRENCY=2                            # Global concurrency limit (Chromium OOM guard)
```

**Migration (`drizzle/migrations/0001_high_sauron.sql`):**
- `audit_jobs` table (leadId FK, status, error, metadata); new `audit_status` enum; indexes on (leadId, createdAt)
- `audits` table: unchanged (existing 8-dim + problems + redesign stay NOT NULL for demo/fallback)

**Fallback (graceful degradation without Inngest/keys):**
When `USE_DB=false` or Inngest is unreachable, `requestAudit()` returns a friendly message: "Real audits require database + Inngest. Use demo mode to see mock results."
The `getAudit()` repository falls back to `buildAuditFor(lead)` (static mock), ensuring the screen never crashes.

**Applied from code review:**
- **Concurrency** uses the array form `[{ limit: AUDIT_CONCURRENCY }, { limit: 1, key: 'event.data.leadId' }]` — a global cap (VPS OOM guard) AND per-lead serialization (a single keyed limit would give neither).
- **SSRF guard** — `captureScreenshots` runs `assertSafeUrl()` before `page.goto`, rejecting non-http(s) and non-public hosts (localhost / link-local-metadata / RFC1918) by literal hostname.

**Known limitations / verify-at-runtime:**
1. **Headline numbers** — after a real audit, the report header `site`/`score`/delta and the rail sort still reflect the lead's stored values; only the 8-dim breakdown updates from the audit row. Updating the lead's headline score from the audit is a deliberate open decision (touches a user-facing number).
2. **Playwright base image (`mcr.microsoft.com/playwright:v1.60.0-noble`)** — verify it does NOT pin `NODE_ENV=production` (would make `npm ci` skip `tsx`).
3. **Inngest self-hosted flags / `connect()`** — docker-compose runs `inngest/inngest:v1.27.0 start`; confirm the exact env/flags and that self-hosted `connect()` is supported for the pinned version.
4. **Gemini model id** — `GEMINI_MODEL` (default `gemini-2.5-flash`) is env-overridable; confirm a current vision model at deploy.

### 9.11 Deployment

**Self-hosted Docker + VPS (`Dockerfile`, `docker-compose.yml`):**
- Next.js 16 image (`output: 'standalone'` set; entrypoint uses `next start` with the full toolchain)
- Entrypoint: `scripts/docker-entrypoint.sh` runs `migrate → seed → start`
- Port 3000 (app), requires reverse proxy + SSL (nginx/Caddy)
- **Environment setup (`.env.local`, loaded by compose `env_file`):**
  - `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` (consumed by the `db` service on first boot)
  - `DATABASE_URL=postgresql://<user>:<pw>@db:5432/<db>` (single URL: app + migrations + seed)
  - `BETTER_AUTH_SECRET` (32-byte hex, for session signing)
  - `GOOGLE_MAPS_API_KEY` (for lead discovery)
  - Optional: `DISCOVERY_DEFAULT_INDUSTRY`, `DISCOVERY_DEFAULT_CITY`, `DISCOVERY_DAILY_CAP`, `USE_DB=true`

**Postgres requirements:**
- Self-hosted PostgreSQL 17 (docker-compose `db` service, `postgres:17-alpine`)
- Not published to the host (no `ports:` on `db`); reached internally as `db:5432`
- Single direct connection (prepared statements ON); no pooler / no `DIRECT_URL`
- Seed is idempotent (can rerun safely); migrate is fail-fast, seed is non-fatal in the entrypoint

**Deploy (Docker Compose, single VPS):**
1. `cp .env.example .env.local`; set `POSTGRES_*` + a matching `DATABASE_URL`, `BETTER_AUTH_SECRET`, `USE_DB=true`
2. `docker compose up -d --build` — starts `db` then `web`; the entrypoint waits for Postgres → migrate → seed → start
3. Front `web` with a reverse proxy (Caddy/Nginx) for TLS
4. Backups are now your responsibility — see `scripts/backup.sh` (pg_dump + off-site upload)

**Local host dev (no Docker):** point `DATABASE_URL` at `localhost:5432`, then `npm run db:migrate && npm run db:seed && npm run dev`.

**Build verification:**
- All 13 workspace + 4 public routes are **dynamic SSR** (no static export) because layout reads cookies server-side
- `npm run typecheck` + `npm run build` must pass before deploy
- Real audits require Inngest + worker container; lead discovery runs synchronously in the web container

### 9.12 Summary: Full-Stack Production Architecture

**Agents Verse is NOT a prototype.** It is a complete, production-ready full-stack SaaS built on Next.js 16 + Postgres + Drizzle + Better Auth + Inngest. The app:

1. **Dual-mode:** Single codebase, `USE_DB` flag switches between demo (localStorage, zero credentials) and production (Postgres, guarded auth, real APIs).
2. **Frontend:** Next.js 16 App Router, 17 routes (marketing + workspace), React 19, TypeScript strict.
3. **Backend:** Self-hosted PostgreSQL 17, 15 tables (domain + Better Auth), idempotent migrations and seed.
4. **Auth:** Better Auth (email/password, sessions in DB), demo-mode cookie fallback.
5. **Jobs/Audit:** Inngest worker runs PageSpeed + Playwright + Gemini vision analysis; results durable in DB.
6. **Discovery:** Google Places API 2-phase (Pro + optional Enterprise) with email scraping.
7. **Deploy:** Docker Compose (web + db + redis + inngest + worker) on a single VPS, fronted by a reverse proxy for TLS.
8. **Development:** `npm run dev` works with zero credentials (demo mode). Production requires `.env` keys for external services (Google, Gemini, Inngest).

The app passes `typecheck`, builds, and runs in both modes. The original buildless prototype files (root `*.jsx`, `index.html`) were removed in the June 2026 cleanup; the current app is **Next.js-only**.

---

> The original buildless CDN-React prototype (root *.jsx / data*.js / index.html / styles.css) was removed in the June 2026 cleanup. See git history and docs/project-changelog.md. The Next.js architecture documented above is the only one in use.

---

## Unresolved Questions

- `middleware.ts` will be renamed to `proxy.ts` in a future Next.js upgrade (deprecation only; functional as-is).
