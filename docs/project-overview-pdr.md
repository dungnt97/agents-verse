# Agents Verse — Product & Design Requirements Overview

> Status: **Full-stack SaaS (Phase 0 + Subsystem 1 complete).** Next.js 16 + React 19 + Postgres + Drizzle + Better Auth + Google Places API. Dual-mode runtime: demo (localStorage) or production (Postgres). All screens live; lead discovery subsystem operational (requires credentials). Inngest deferred to future plan.

## 1. Product Vision

Agents Verse positions itself as an **autonomous, demo-first web agency**: a software product that runs an AI workforce which finds local businesses with outdated websites, audits those sites, generates a working redesign preview, prepares outreach, and carries the resulting conversation through to a closed deal — with a human founder retaining approval and financial control via guardrails.

The core differentiator is captured directly in the landing copy: *"We don't send proposals. We send working demos."* Instead of the traditional 2–3 week discovery/proposal/wait cycle, the product promises a live, working website demo within ~48 hours, so the prospect sees the result first and decides in minutes.

The product framing is **controlled autonomy**: 11 specialized AI agents work across 8 virtual "rooms" (departments), but the founder sets an autonomy level and the system escalates anything risky (high-value deals, cost-limit warnings, requests for a human, low-confidence outputs) to a review queue.

## 2. Target Users

The product is built around a single primary operator persona, with prospects as a secondary audience reached through generated demos.

- **Primary — Solo founder / agency operator** ("the founder"). The authenticated workspace is explicitly the founder's command surface: the default login is `founder@agentsverse.ai`, the sidebar footer reads "Founder," and screens are framed as CEO/founder decision-making (Floor Overview greeting, Command Center escalation review). This user wants high-leverage oversight without doing the production work: approve demos, approve deals above a threshold, watch AI cost, and tune guardrails.
- **Secondary — Prospect / local business owner** (the lead). They never log into the workspace; they receive a generated demo and outreach, and can self-submit a request via the public demo-request modal. Sample leads span Healthcare, Wellness, Hospitality, Real Estate, Logistics, and Fitness.
- **(inferred) Small operating team / future seats.** Per-agent enable/review toggles and an autonomy ladder suggest the design anticipates more granular delegation, but only a single founder account is modeled today.

## 3. Core Workflow

The product is organized around one end-to-end pipeline. Each stage maps to data models (`AV.leads`, `AV.audits`, `AV.demos`, `AV.deals`) and to dedicated screens.

1. **Find** — Research agents scan for businesses with weak websites; each becomes a lead with a current site score and an estimated deal value. Pipeline stage: `found`.
2. **Audit** — Website Critic / audit agents score the current site across 8 dimensions (Performance, Mobile, Accessibility, SEO, Design, CTA, Content, Trust), detect problems, and propose a redesign direction (visual style, sections, CTA, content angle). Stage: `audited`.
3. **Generate demo** — Design and Code agents produce a working before/after redesign preview with a quality checklist, key changes, AI notes, and a shareable demo URL. Demo status: `draft → review → approved`.
4. **Outreach** — Sales agents send the demo with a tone-selectable outreach message (Friendly / Premium / Direct / Local). Stage: `contacted`; demo status: `sent`.
5. **Reply & interpret** — Incoming client replies are interpreted with an AI confidence score and a suggested next action. Stage: `replied`.
6. **Deal** — Quote, package, price, and probability are tracked; deals above a threshold, calls requested, or other triggers escalate to the founder. On acceptance: stage `won`, moving into a production timeline (Intake → Content → Production → QA → Client review → Delivered → Monthly care).

Throughout, **escalations** route to the founder: human-requested contact, deals above value threshold, and cost-budget warnings each carry severity, reason, AI recommendation, and confidence. The selected **autonomy mode** governs how much the agents do before pausing for approval.

### Autonomy ladder

Four ranked modes (persisted as `av-mode`, default `guarded`):

| Mode | Behavior |
|------|----------|
| Manual | AI suggests; founder approves every action |
| Review before action | AI prepares work; founder approves anything external |
| Autonomous + guardrails | AI completes low-risk work; founder approves risk |
| Fully autonomous | AI acts within rules; escalates only critical issues |

## 4. Feature Areas Mapped to Screens

### Public / marketing surface

| Area | Screen(s) | Purpose |
|------|-----------|---------|
| Landing | `landing.jsx`, `landing-sections.jsx`, `landing-sections2.jsx` | Hero ("working demos, not proposals"), how-it-works (6 steps), before/after showcase, inside-the-company, value props, 3-tier pricing, trust & safety guardrails, final CTA, footer |
| Demo request | `requests.jsx` (`DemoRequestModal`) | Public form: business name, industry, URL, contact |
| Info pages | `pages.jsx` | About, Careers, Contact, Case studies, Guarantees, Status, Privacy, Terms, Security |
| Site mockups | `site-mock.jsx` | Old-site vs new-site wireframes used in showcase and demos |

### Authenticated workspace (gated by login)

| Area | Screen | File | Purpose |
|------|--------|------|---------|
| Floor Overview | `FloorOverview` | `floor-overview.jsx` | Founder command dashboard: 6 headline metrics, spatial floor map, escalation queue, live activity |
| Floor map | `FloorMap` | `floor-map.jsx` | Animated spatial schematic of 8 rooms with a flowing workflow path |
| Command Center | `CommandCenter` | `command.jsx` | Escalation review: forecast/net-profit/demos/cost metrics, expandable escalation cards, revenue/cost chart, recommended actions, system health, top agents |
| Rooms | `RoomsIndex` / `RoomDetail` | `rooms.jsx` | Department grid + per-room detail (projects, agents, timeline, demo peek) |
| Agents | `AgentsIndex` / `AgentDetail` | `agents.jsx` | AI workforce grid + per-agent detail (task, confidence, skills, tools, outputs, history, founder chat) |
| Demo requests | `RequestsScreen` | `requests.jsx` | Triage inbox: reply, decline, or convert a request into a real pipeline lead |
| Leads | `LeadPipeline` | `pipeline.jsx` | Kanban (Found → Audited → Demo → Contacted → Replied → Won/Lost), drag-to-move, filters |
| Audits | `AuditScreen` | `audit.jsx` | Master list + audit report (current vs redesigned scores, 8 dimensions, problems, redesign direction) |
| Demos | `DemoManager` / `DemoDrawer` | `demos.jsx` | Demo grid with before/after scores, checklist, changes, outreach templates |
| Deals | `DealsScreen` / `DealDrawer` | `deals.jsx` | Approval flow, reply interpretation, escalation flags, production timeline |
| Activity | `ActivityScreen` | `activity.jsx` | Full filterable/searchable system timeline |
| Settings | `SettingsScreen` | `settings.jsx` | Brand, autonomy mode, pricing rules, outreach guardrails, escalation triggers, AI cost budgets, per-agent toggles |
| Auth | `LoginScreen` | `auth.jsx` | Workspace login gate (pre-filled demo credentials) |

### Cross-cutting shell features

- **App shell** (`app-shell.jsx`): grouped sidebar nav, autonomy selector, command palette (Cmd/Ctrl+K) searching pages/agents/leads, top bar with breadcrumbs, review center bell.
- **Review center** (`app.jsx`): right-side drawer aggregating items needing approval (demo, outreach, deal, human request, cost).
- **Assistant chat widget** (`chat.jsx`): bottom-right helper with rule-based replies about approvals, demos, cost, pipeline, and daily summary.
- **Theming & i18n**: light/dark via `data-theme`; English/Vietnamese dictionary (`i18n.jsx`).

## 5. What Exists Today vs. Planned

### Built today (production-ready, live)

**Full-stack Next.js 16 + Postgres + Drizzle + Better Auth + Inngest:**

- **All 17 routes live:** Landing + 9 public info pages + login gate + 14 authenticated workspace screens (overview, command, rooms detail, agents detail, leads pipeline, audits detail, demos, deals, settings, activity, requests).
- **Real backend:** PostgreSQL 17 (self-hosted or Docker), 15 tables (domain + Better Auth). Single direct connection; migrations + seed idempotent.
- **Real authentication:** Better Auth (email/password). Sessions stored in DB. Demo mode falls back to localStorage cookies for zero-credential showcase.
- **Lead Discovery:** Google Places API 2-phase (Pro tier mandatory, optional Enterprise enrichment). Email scraping via cheerio. Bulk insertion into `leads` table.
- **Website Audits (Subsystem 2):** PageSpeed Insights + Playwright screenshots + Google Gemini 2.5 Flash vision analysis. 8-dimensional scoring (visual, mobile, cta, trust, seo, speed, content, conversion). Results durable via Inngest + Redis + Postgres. Worker container isolates Playwright/Gemini compute.
- **Mutable state → DB:** All workspace interactions (lead stage, deal status, demo approval, autonomy mode, settings, request conversion) persist via server actions. Optimistic UI in client, reconciled with DB.
- **Docker deployment:** docker-compose.yml runs web (Next.js) + db (Postgres) + redis + inngest + worker (audit engine). Entrypoint migrates, seeds, and starts the app. Reverse proxy (Caddy/Nginx) handles TLS.
- **Demo mode (zero credentials):** Same codebase, `USE_DB=false` → mock data from `lib/data/` + localStorage. Perfect for showcase and local development.

The codebase frames the first three screens — **Landing, Floor Overview, Command Center** — as the polished "design bar" the rest aims to match. All now back by real data when `USE_DB=true`.

### Planned / not real yet (key-gated, future subsystems)

- **Demo generation (Subsystem 3).** Placeholder demo URLs (`demo.agentsverse.ai/[leadId]`); before/after previews are wireframe mockups, not generated sites. Requires Claude API + Imagen + a rendering service.
- **Outreach & email (Subsystem 4).** Outreach actions trigger toasts, not real Resend sends. Requires `RESEND_API_KEY` and CAN-SPAM templates.
- **Real AI agent outputs.** Agent activity, confidence scores, and AI recommendations are seeded mock data, not live model inference.
- **Chat widget streaming.** Assistant chat uses static rule-based replies (setTimeout), not streaming Claude API.
- **Deal automation (Subsystem 5).** Deal production timeline is displayed, not yet a fully manipulable workflow.
- **Per-agent real-time spend tracking.** Settings expose config UI only; actual spend metering is not implemented.

## 6. Non-Functional Notes

**This is a production-ready full-stack SaaS**, not a prototype. Architecture, performance, security, and deployment follow modern best practices.

- **Architecture.** Next.js 16 App Router + React 19 + TypeScript strict + Drizzle ORM. Server Components by default for data fetching; client components marked `'use client'` for interactivity. Database is self-hosted PostgreSQL 17 (docker-compose). Deployment is Docker Compose on a single VPS with a reverse proxy for TLS.
- **Module system.** ES modules throughout. TypeScript strict mode enforced at build and commit gates. Absolute imports via `@/` alias (app, lib, components). Server-only code uses `'use server'` directive and `server-only` package to prevent client-side import.
- **Routing.** Next.js App Router (file-based). All 17 routes are dynamic SSR because `app/layout.tsx` reads cookies on the server. No static export; deploy on Node runtime.
- **Design system.** CSS custom properties in `styles/globals.css` (identical byte-for-byte with legacy `styles.css`) define color, shadow, radius, typography tokens with light/dark variants toggled by `data-theme`. Fonts: Hanken Grotesk + JetBrains Mono via Google Fonts. No Tailwind; inline `style={{}}` objects + utility classes throughout.
- **Performance.** Next.js production build with Turbopack (dev) and SWC compilation. All routes are dynamic SSR with cookie-based initial state hydration (no flash). Server-side cookie reads eliminate theme/language flicker on load.
- **Internationalization.** Dictionary keys split by namespace in `lib/i18n/keys/*.ts` (en + vi), merged in `I18nProvider`. Call `t('ns.key')` for translations; no pluralization yet (KISS).
- **Accessibility.** ARIA labels in interactive components; focus management in modals and sidebars. A11y audit planned but not yet comprehensive.
- **Responsiveness.** Mobile-first media queries at 1180px, 980px, 720px breakpoints. Off-canvas sidebar on mobile; full-width desktop. Tested on Chrome/Safari/Firefox.
- **Security.** Real auth via Better Auth (sessions in DB, password hashed with scrypt). CSRF protection via Better Auth. Input validation on server actions. No secrets hardcoded; all keys in `.env.local`. HTTPS required in production (reverse proxy enforces TLS).

## 7. Success Criteria (inferred from the product framing)

These restate the prototype's implicit goals; they are **inferred** and not yet measured in code.

- A prospect can go from "scanned" to a working demo preview in ~48 hours.
- The founder reviews only what crosses a guardrail (e.g., demos below a confidence threshold, deals above a value threshold, cost approaching the daily budget).
- The landing's claimed lift metrics (e.g., 3.4× reply rate, before/after score jumps such as 34→88) are the experience the demos are meant to deliver.

## Open Questions

- Confidence threshold and value/cost thresholds are shown in Settings as defaults — is there a canonical default set the product commits to, or are these placeholder seeds?
- Is multi-user / multi-seat in scope, or is the single-founder model intentional for v1?
- Vietnamese localization exists alongside English — is `vi` a launch market, or a demonstration of i18n capability?
- The `screens/` and `uploads/` directories hold reference PNGs (landing hero, logo check, pasted mockups); these appear to be design references rather than shipped assets — confirm they are not product surfaces.
