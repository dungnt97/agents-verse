# Agents Verse — Codebase Summary

A high-level map of the codebase for engineer/LLM onboarding. Factual, grounded in the current source tree.

## What This Project Is

Agents Verse is a frontend prototype for an autonomous, demo-first web agency — an AI-workforce SaaS concept. The product narrative: an AI workforce of 11 specialized agents operating across 8 virtual departments ("rooms") finds local businesses with outdated websites, audits them, generates live redesign demos, and prepares outreach, all before human intervention. The founder retains control through escalation gates, autonomy modes, and cost/outreach guardrails.

The public landing page positions the offering against traditional agencies: instead of weeks of discovery and proposals, a prospect sees a working redesign demo within ~48 hours. Inside the authenticated workspace, a CEO-style operator reviews escalations, approves deals, and oversees the agent floor.

All data is mock/seed data held in browser globals. There is no backend, no network fetches, and no persistence beyond `localStorage`.

## Run Model (Buildless)

This is a buildless single-page app. There is no `package.json`, no bundler, no ES modules, no TypeScript, and no test framework. Files are flat in the repo root. The app runs by serving the directory with any static file server and opening `index.html`.

`index.html` loads, from CDN (unpkg, pinned with SRI hashes):

- React 18.3.1 UMD (`react.development.js`)
- ReactDOM 18.3.1 UMD (`react-dom.development.js`)
- Babel Standalone 7.29.0 (`babel.min.js`)

Each `.jsx` file is a separate `<script type="text/babel">` transpiled in-browser at runtime; each runs in its own scope. Because there are no imports/exports, modules communicate exclusively through `window` globals:

- React hooks are aliased to globals in a bootstrap `<script>`: `window.useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, `useLayoutEffect`.
- `data*.js` are plain JS that build the `window.AV` namespace.
- Every `.jsx` ends with `Object.assign(window, { ... })` to publish its components.

A `MutationObserver` in `index.html` watches `#root` for first child render, then fades and removes the `#boot` splash overlay.

### Load Order (from index.html)

1. React UMD → ReactDOM UMD → Babel Standalone → hook-aliasing script
2. Data: `data.js` → `data2.js` → `data3.js` → `data4.js` (each extends `window.AV`)
3. Primitives: `brand.jsx` → `components.jsx` → `i18n.jsx` → `site-mock.jsx` → `floor-map.jsx`
4. Landing: `landing-sections.jsx` → `landing-sections2.jsx` → `landing.jsx`
5. App screens: `app-shell.jsx` → `floor-overview.jsx` → `command.jsx` → `rooms.jsx` → `agents.jsx` → `pipeline.jsx` → `audit.jsx` → `demos.jsx` → `deals.jsx` → `settings.jsx` → `activity.jsx` → `requests.jsx` → `pages.jsx` → `auth.jsx` → `chat.jsx`
6. Root: `app.jsx`

Load order matters: data and primitives must publish their globals before screens reference them, and `app.jsx` (the root) loads last.

## Architecture & Conventions

- **Window-global module pattern.** No imports/exports. Components and data are published onto `window` and read directly by name.
- **State-machine routing.** `app.jsx` holds `route` + `param` and renders conditionally (`route === 'overview'`, etc.). A `go(route, param)` helper updates state and syncs to `localStorage`. Cross-screen navigation flows through callbacks passed down as props (`onNav`, `goRoom`, `goLead`, `goDemos`, etc.).
- **Auth gate.** If unauthenticated, `app.jsx` renders the landing page or `LoginScreen`; otherwise it renders the workspace shell.
- **localStorage keys.** `av-route`, `av-param`, `av-theme`, `av-auth`, `av-user`, `av-mode` (autonomy), `av-lang`, `av-requests`, `av-leads`.
- **Theming.** `useTheme` writes a `data-theme` attribute on `<html>`; CSS in `styles.css` cascades light (warm ivory) vs. dark (deep graphite) via `[data-theme="dark"]`.
- **i18n.** `i18n.jsx` holds `AV_DICT` with `en`/`vi` branches and a `t(key)` lookup that reads `window.__lang` and falls back to the English key, then the raw key string. No i18n library, no pluralization/interpolation.
- **Styling.** A CSS custom-property design system in `styles.css` (tokens for color, shadow, radius, typography, layout) plus utility classes (`.btn`, `.card`, `.badge`, `.row/.col`, `.chip`, `.mono`); inline `style={}` objects used heavily in JSX. Fonts: Hanken Grotesk (sans) and JetBrains Mono (mono) via Google Fonts. Primary color is orange.
- **Naming.** Kebab-case multi-word filenames (`floor-overview.jsx`, `landing-sections2.jsx`); exported function names match their feature.
- **No state library, no date library, no fetch/axios, no animation library.** Animations are CSS keyframes/transitions plus SVG `animateMotion`.

## File Inventory by Concern

### Shell / Routing
- `index.html` — CDN script loading, hook aliasing, boot splash, data + screen load order.
- `app.jsx` — Root component: routing state machine, `localStorage` sync, keyboard shortcuts (Cmd/Ctrl+K palette, ESC), scroll reset on nav, auth gate, screen dispatch, toasts. Wires every screen via the `go()` callback.
- `app-shell.jsx` — Sidebar nav tree (`NAV` grouped by section), top bar, command palette (Cmd+K search), review center, autonomy mode selector, responsive mobile sidebar (`.av-sidebar.open` + `.av-backdrop`).
- `components.jsx` — Shared hooks/primitives: `useTheme`, `useToasts` (auto-dismiss ~3.4s), `useCountUp`, `StatusBadge`, `AgentAvatar` (oklch gradient), `AvatarStack`, `ConfidenceRing`, `Sparkline`, `Reveal` (scroll animation).
- `brand.jsx` — `Mark` (orange "A" monogram), `Logo`, `Icon` (45+ line SVG icons, 18px default, strokeWidth 1.6).

### Core Screens (the polished "design-bar" workspace)
- `floor-overview.jsx` — Founder command dashboard: headline metric strip, `FloorMap` visualization, escalation queue (`EscalationMini`), live activity feed, `RoomPeek` drill-down drawer, reusable `MetricStat`.
- `command.jsx` — CEO escalation review: headline metrics, expandable `EscalationCard` queue (human/deal/cost), revenue/cost trend chart, today's AI work stats, recommended actions, system health, top agents by quality.
- `floor-map.jsx` — Animated spatial schematic of 8 rooms on a floorplan; workflow path drawn as a Catmull-Rom spline with animated "packet" circles and a dashed CEO→Design oversight link; `RoomNode` buttons with hover/selection states.
- `rooms.jsx` — `RoomsIndex` (filterable/sortable grid of room cards) and `RoomDetail` (metrics strip, projects with progress, agents, timeline, `DemoPeek` drawer).
- `agents.jsx` — `AgentsIndex` (grid of agent cards with confidence rings) and `AgentDetail` (skills/tools, recent outputs, task history, `FounderChat` canned-reply interface).

### Business Screens (workflow)
- `pipeline.jsx` — `LeadPipeline` kanban (Found → Audited → Demo → Contacted → Replied → Won/Lost) with drag-drop, industry/agent filters, value tracking; pipeline state persisted.
- `audit.jsx` — `AuditScreen`: master list + detail report with current vs. redesigned scores across 8 dimensions, problems detected, suggested redesign direction.
- `demos.jsx` — `DemoManager` + `DemoDrawer`: demo grid with before/after scores, quality checklist, key changes, AI notes, tone-selectable outreach templates.
- `deals.jsx` — `DealsScreen` + `DealDrawer`: approval workflow, escalation flags, client-reply interpretation with AI confidence, production timeline with assets.
- `settings.jsx` — `SettingsScreen`: brand, autonomy mode, pricing rules, outreach guardrails, escalation triggers, AI cost budgets, per-agent enable/review toggles.
- `activity.jsx` — `ActivityScreen`: filterable/searchable timeline of all agent actions, colored dots per type, live badge.
- `requests.jsx` — `RequestsScreen` + `DemoRequestModal`: public demo-request submission and admin inbox to triage/reply/convert-to-lead/decline.
- `auth.jsx` — `LoginScreen`: email/password gate with pre-filled demo credentials.
- `chat.jsx` — `ChatWidget`: bottom-right assistant with static rule-based replies (no streaming).
- `pages.jsx` — Public marketing/info pages (About, Careers, Contact, Cases, Guarantees, Status, Privacy/Terms/Security), `ContactForm`, `CasesPage`; builds `window.INFO_PAGES`.

### Landing
- `landing.jsx` — `LandingNav` (scroll-transparent header, theme/language toggles, CTAs), `Hero`, `HeroVisual`; assembles the landing page.
- `landing-sections.jsx` — `DifferenceSection`, `HowItWorks` (6-step timeline), `Showcase` (before/after case switcher), `InsideCompany`, `WhyWins`.
- `landing-sections2.jsx` — `Pricing` (3 tiers), `TrustSafety` (6 guardrail cards), `FinalCTA`, `Footer`.
- `site-mock.jsx` — `SiteMock` device wireframes (`OldSite` vs `NewSite`) used in showcases and demos.

### Data
- `data.js` — IIFE that creates `window.AV`: `rooms`, `agents`, `leads`, `metrics`, `escalations`, `activity`, `statusMap`, `fmt`, and lookup helpers (`agentById`, `roomById`).
- `data2.js` — Extends `AV` with detail helpers: `agentDetail`, `roomProjects`, `roomTimeline`, `roomMetrics`.
- `data3.js` — `REDESIGN` industry templates, `SCORE_PROFILES` (8-dimension audit scores), derived `demos`, `audit()`, `demoByLead()`.
- `data4.js` — `deals` (4 live deals with reply interpretation and production tracking) and `demoRequests` (5 inbound public requests).

### Design / i18n
- `styles.css` — CSS custom-property design system: color/shadow/radius/typography/layout tokens; light defaults + `[data-theme="dark"]` overrides; component and utility classes; responsive breakpoints (1180/980/720px); Google Fonts `@import`.
- `i18n.jsx` — `AV_DICT` (en/vi, ~scoped dot-notation keys), `t()` lookup, `LangToggle`, published as globals.

## De-facto Domain Model (from data\*.js)

Everything hangs off the single global `window.AV`. Core entities:

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

| Primitive | Source | Purpose |
|-----------|--------|---------|
| `useTheme` | `components.jsx` | Light/dark toggle; writes `data-theme`, persists to `localStorage` |
| `useToasts` / `pushToast` | `components.jsx` / `app.jsx` | Auto-dismissing toast notifications |
| `useCountUp` / `CountUp` | `components.jsx` | Animated number transitions |
| `StatusBadge` | `components.jsx` | Status pill via `AV.statusMap` |
| `AgentAvatar` / `AvatarStack` | `components.jsx` | oklch-gradient avatars; overlapped stacks |
| `ConfidenceRing` | `components.jsx` | Circular 0–100% SVG gauge, color-coded |
| `Sparkline` | `components.jsx` | 7-point mini trend chart |
| `Reveal` | `components.jsx` | Scroll-triggered reveal wrapper with delay |
| `Icon` / `Logo` / `Mark` | `brand.jsx` | 45+ line SVG icons and brand marks |
| `t()` / `LangToggle` | `i18n.jsx` | en/vi translation lookup and switch |
| `SiteMock` | `site-mock.jsx` | Before/after device wireframes |
| `FloorMap` | `floor-map.jsx` | Animated spatial room schematic |
| `MetricStat` | `floor-overview.jsx` | Compact metric card with sparkline/meter |

## File Table

| File | Concern | Role |
|------|---------|------|
| `index.html` | shell | CDN loads, hook aliasing, load order, boot splash |
| `app.jsx` | shell/routing | Root: routing state machine, auth gate, screen dispatch, toasts |
| `app-shell.jsx` | shell | Sidebar, top bar, command palette, review center, mobile nav |
| `components.jsx` | primitives | Hooks + shared UI primitives |
| `brand.jsx` | primitives | Icons, logo, mark |
| `i18n.jsx` | design/i18n | `AV_DICT` en/vi, `t()`, `LangToggle` |
| `styles.css` | design | CSS-variable design system, theming, utilities |
| `site-mock.jsx` | primitives | Before/after site wireframes |
| `floor-map.jsx` | core | Animated room floorplan |
| `floor-overview.jsx` | core | Founder dashboard + escalations + activity |
| `command.jsx` | core | Escalation review / approvals |
| `rooms.jsx` | core | Rooms index + room detail |
| `agents.jsx` | core | Agents index + agent detail + chat |
| `pipeline.jsx` | business | Lead kanban pipeline |
| `audit.jsx` | business | Website audit reports |
| `demos.jsx` | business | Demo manager + outreach templates |
| `deals.jsx` | business | Deal approval + production tracking |
| `settings.jsx` | business | Brand, autonomy, pricing, guardrails, budgets |
| `activity.jsx` | business | Cross-room activity timeline |
| `requests.jsx` | business | Public demo requests + admin inbox |
| `auth.jsx` | business | Login gate |
| `chat.jsx` | business | Assistant chat widget (rule-based) |
| `pages.jsx` | landing/info | Public marketing/legal pages, `INFO_PAGES` |
| `landing.jsx` | landing | Nav + hero + landing assembly |
| `landing-sections.jsx` | landing | Difference, How-it-works, Showcase, Inside, Why |
| `landing-sections2.jsx` | landing | Pricing, Trust, Final CTA, Footer |
| `data.js` | data | `AV` core: rooms/agents/leads/metrics/escalations/activity |
| `data2.js` | data | Agent/room detail helpers |
| `data3.js` | data | Redesign templates, audit scores, demos |
| `data4.js` | data | Deals, demo requests |

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
**Set 2 (workspace) — Complete.** 14 routes live; all workspace screens operational (14 total: overview, command, rooms detail, agents detail, leads pipeline, audits, demos, deals, settings, activity, requests, + 2 layout routes).

**Known gaps (mock-only, expected):**
- No backend — all data is `lib/data` types (Next.js); mutations are local state or `localStorage` only.
- Outreach/reply/demo "send" actions trigger toast callbacks, not real sends.
- Chat widget is static rule-based (`setTimeout`), not streaming AI.
- Demo URLs are placeholders (e.g. `demo.agentsverse.ai/[leadId]`).
- Agent history/outputs are richly seeded only for a couple of roles; others fall back to defaults.
- No per-agent real-time spend tracking; settings expose config only.
- Production timelines and `demoRequests` lifecycles are partially seeded, not fully interactive.
- No automated test framework; linting and type-checking pre-commit (no CI enforced).

## Unresolved Questions

- Some reader analysis described several business screens as "Coming Soon," but `index.html` and `app.jsx` show them wired and routed (pipeline, audit, demos, deals, settings, activity, requests). The summary reflects the actual wiring; remaining "Coming Soon" applies only to unrecognized routes. Confirm whether any wired screen is intentionally a stub.
- `autonomy mode` values appear inconsistently across analyses (manual/review/guarded/full vs. guarded/autopilot). The exact enum was not re-verified against `settings.jsx` / `app-shell.jsx` for this summary.
