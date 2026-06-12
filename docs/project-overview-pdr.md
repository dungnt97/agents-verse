# Agents Verse — Product & Design Requirements Overview

> Status: front-end prototype ("design-bar" demo). This document describes the product as observed in the codebase. Items not directly evidenced in code are marked **(inferred)**.

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

### Built today (interactive)

All sidebar destinations render real, data-backed screens routed in `app.jsx`:

- Landing + all public info pages (About, Careers, Contact, Cases, Guarantees, Status, Privacy, Terms, Security) and the public demo-request modal.
- Login gate with mocked auth (localStorage flag, pre-filled credentials).
- Floor Overview, Command Center, Rooms (index + detail), Agents (index + detail), Demo Requests, Leads pipeline, Audits, Demos, Deals, Activity, Settings.
- Working interactions: kanban drag-to-move (persisted to localStorage), converting a demo request into a pipeline lead, escalation approve/open actions, toasts, command palette, theme + language toggles, autonomy mode selection.

The codebase frames the first three screens — **Landing, Floor Overview, Command Center** — as the polished "design bar" the rest aims to match.

### Planned / not real yet

- **Backend & persistence.** No API or server; all state is mock data in `window.AV` plus a few localStorage keys (`av-route`, `av-param`, `av-theme`, `av-auth`, `av-user`, `av-mode`, `av-lang`, `av-requests`, `av-leads`). Drag-drop, requests, and lead conversion mutate local state only.
- **Real authentication.** Login accepts the demo credentials and flips a localStorage flag; there is no identity provider, password storage, or session security.
- **Real AI / agents.** Agent activity, confidence, audits, demos, and replies are seeded static data, not live model output. The assistant chat and founder chat use canned/rule-based responses, not streaming.
- **Actual outreach / sending.** Outreach and reply actions trigger toasts; no email is sent.
- **Demo generation & hosting.** Demo URLs are placeholders (`demo.agentsverse.ai/[leadId]`); before/after previews are wireframe mockups, not generated sites.
- **`ComingSoon` fallback.** Present in `app.jsx` but only renders for **unrecognized** routes; it is a safety fallback, not the state of the main screens. **(inferred)**
- **Live case-study links / "View live demo"** on the landing showcase need a backend. **(inferred)**
- **Production timeline interactivity** (deal `production.stages`) is displayed but not yet a manipulable workflow.

## 6. Non-Functional Notes

This is a **buildless, design-bar prototype**, and several requirements follow from that choice rather than from production engineering.

- **Architecture.** Single static `index.html` loads pinned CDN React 18.3.1 UMD + ReactDOM 18.3.1 + `@babel/standalone` 7.29.0 (all with SRI integrity hashes). Every screen is a `<script type="text/babel">` file compiled in the browser; there is **no bundler, no package.json, no ES modules, no TypeScript, and no test framework** in the repo. Files are flat in the repo root.
- **Module pattern.** No imports/exports; React hooks are aliased to `window` (`useState`, `useEffect`, etc.) and every component/data namespace attaches itself via `Object.assign(window, …)`. Data lives in `data.js`–`data4.js` as plain-JS globals on `window.AV` with lookup/derivation helpers (`agentById`, `roomById`, `audit`, `demoByLead`, `dealByLead`, `roomProjects`, `roomMetrics`, `roomTimeline`).
- **Routing.** A localStorage-backed state machine in `app.jsx` (route + optional param), with scroll reset on navigation and conditional render of landing / info page / login / workspace.
- **Design system.** CSS custom properties in `styles.css` define color, shadow, radius, typography, and layout tokens with light (warm ivory) and dark (graphite) variants toggled by `data-theme`. Fonts: Hanken Grotesk + JetBrains Mono via Google Fonts. Styling is split between these tokens/utility classes and heavy inline styles in JSX.
- **Performance.** In-browser Babel transpilation means first paint depends on compiling every JSX file at load; a `MutationObserver` splash hides the boot overlay once React first paints. Acceptable for a prototype; **a real build step would be required for production performance.** **(inferred)**
- **Internationalization.** Custom `t()` lookup over an `AV_DICT` (en/vi); the full dictionary loads up front. No pluralization or interpolation helpers.
- **Accessibility.** Interactive elements use a `focusable` class and aria labels in places; a full audit has not been observed. **(inferred)**
- **Responsiveness.** Mobile off-canvas sidebar, `hide-mobile`/`hide-desktop` utilities, and `clamp()` headings exist; full mobile coverage is partial. **(inferred)**
- **Security posture.** As a demo, there is no real auth, no input sanitization layer, and no secret handling; everything runs client-side. Not production-safe by design.

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
