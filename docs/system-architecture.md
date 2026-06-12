# System Architecture — Agents Verse

**Status (June 2026):** Agents Verse migration to Next.js is **functionally complete**. This document covers:

- **Sections 1–10:** The **Next.js app (Sets 1 + 2 — LIVE)** — cookie-SSR, TypeScript, App Router, context providers, workspace shell, 14 authenticated routes.
- **Sections 11+:** The **legacy buildless prototype** (root `*.jsx`, `index.html`, `styles.css`; still in repo for reference, not used).

---

## NEXT.JS ARCHITECTURE (SETS 1 + 2 — LIVE) — Start here

Agents Verse now runs **entirely on Next.js 16.2.9 + React 19.2.7 + TypeScript**. Both the marketing surface (Set 1) and the full authenticated workspace (Set 2) are deployed and operational.

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

styles/
└── globals.css                        # Design system: tokens, theme, utilities (byte-identical to root styles.css)

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

**Auth gate (middleware.ts):** Workspace routes (`/overview`, `/rooms`, `/agents`, `/leads`, `/audits`, `/demos`, `/deals`, `/settings`, `/activity`, `/requests`) are protected — if `av-auth` cookie is absent, redirect to `/login`.

### 9.5 Providers & Hooks

Five stacked providers wire app-level and workspace state:

1. **ThemeProvider** → `useTheme()` → reads/writes `av-theme` cookie; sets `data-theme` on `<html>`.
2. **I18nProvider** → `useI18n()` → reads `av-lang` cookie; manages `en`/`vi` dictionary; provides `t()` helper.
3. **ToastProvider** → `useToast()` → global toast queue; mounts `ToastHost` once at root.
4. **AuthProvider** → `useAuth()` → reads `av-auth`/`av-user` cookies; provides `login(email)`, `logout()`, `isAuthed`.
5. **WorkspaceStateProvider** → `useWorkspaceState()` → manages mode, requests, leads (Set 2 only). Seeded from `AV` and persisted to `localStorage`.

Wired in `app/providers.tsx` and composed in `app/layout.tsx`:

```tsx
<ThemeProvider initialTheme={...}>
  <I18nProvider initialLang={...}>
    <AuthProvider initialAuth={...}>
      <ToastProvider>
        <WorkspaceStateProvider>
          {children}
        </WorkspaceStateProvider>
      </ToastProvider>
    </AuthProvider>
  </I18nProvider>
</ThemeProvider>
```

All hooks are safe to call from any client component:
- Marketing routes use Theme, I18n, Toast, Auth.
- Workspace routes additionally use WorkspaceState to manage session state (autonomy mode, demo request inbox, lead pipeline).

### 9.6 Component Reuse: Primitives & UI Library

**Reused from legacy:** All buildless primitives (`brand/`, `ui/`, `site-mock.tsx`, `floor-map.tsx`) are ported unchanged. The CSS-custom-property design system (`styles/globals.css` = byte-copy of root `styles.css`) is the single visual source of truth.

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
- UI parity with legacy buildless verified (including punctuation, spacing, colors).

**Set 2 (Workspace) — Complete:**
- 14 authenticated routes: overview, command, rooms (index + detail), agents (index + detail), leads, audits, demos, deals, settings, activity, requests.
- `lib/data` extended with typed versions of `data2.js`, `data3.js`, `data4.js` (agentDetail, roomProjects, roomTimeline, roomMetrics, REDESIGN templates, SCORE_PROFILES, demos, audits, deals, demoRequests).
- Workspace shell layout (`app/(workspace)/layout.tsx`): Sidebar, TopBar, CommandPalette, scroll-reset, global keyboard handlers (Cmd/Ctrl+K palette, ESC).
- WorkspaceStateProvider manages autonomy mode, demo requests inbox, lead pipeline (all persisted to localStorage).
- Auth-gated via middleware: workspace routes redirect to `/login` if `av-auth` cookie absent.
- Reuses all Set 1 infrastructure: providers, primitives, theming, i18n, toast, auth.

---

## LEGACY BUILDLESS ARCHITECTURE (RETAINED FOR REFERENCE, NOT USED) — See below

The following sections document the original buildless prototype (`index.html`, `*.jsx`, `*.js`, `styles.css` in repo root) for historical reference. **This code is not loaded by the Next.js app.** It is intentionally retained in the repo for visual review before cleanup.

---

## 1. Buildless Browser Architecture (Legacy Prototype — Root `*.jsx` Files)

### 1.1 No build toolchain

There is no `package.json`, no bundler, no ES module graph, and no TypeScript. The whole app is delivered as plain `.js` and `.jsx` files referenced directly from `index.html`. JSX is not pre-compiled — it is transpiled in the browser at load time by `@babel/standalone`.

External runtime dependencies are loaded from CDN (`unpkg`) and pinned by version with Subresource Integrity hashes:

- `react@18.3.1` (UMD, development build)
- `react-dom@18.3.1` (UMD, development build)
- `@babel/standalone@7.29.0`
- Google Fonts (Hanken Grotesk, JetBrains Mono) via `@import` in `styles.css`

React's UMD build exposes a global `React` and `ReactDOM`. Every `.jsx` file is loaded as `<script type="text/babel">`, which Babel discovers, transpiles, and executes in the browser.

### 1.2 Global-scope script composition and the window-globals "module system"

Each `<script type="text/babel">` is compiled into its **own isolated scope**. Babel-standalone does not link scripts together — there are no `import`/`export` statements anywhere. The only shared surface between files is the global `window` object. This is the de-facto module system:

- **Producers** publish symbols by writing to globals at the bottom of a file, e.g. `Object.assign(window, { t, LangToggle, AV_DICT })` in `i18n.jsx`, or `window.AV = (function(){ ... })()` in `data.js`.
- **Consumers** reference those globals by bare name (`Icon`, `StatusBadge`, `AV`, `t`, `useState`).
- Because each compiled script runs in global scope, top-level `function`/`const` declarations in a `.jsx` file also become reachable from later scripts (subject to script load order). Components like `FloorOverview`, `Sidebar`, `LoginScreen` are referenced from `app.jsx` without any explicit export.

A small but critical bootstrap in `index.html` re-exposes React's hooks as globals so any Babel script can use them without destructuring `React` itself:

```html
<script>
  window.useState = React.useState; window.useEffect = React.useEffect;
  window.useRef = React.useRef; window.useCallback = React.useCallback;
  window.useMemo = React.useMemo; window.useLayoutEffect = React.useLayoutEffect;
</script>
```

(Some files, e.g. `components.jsx`, additionally redeclare `const { useState, ... } = React;` at the top — both styles coexist.)

### 1.3 data*.js as a global data layer

The data layer is plain JavaScript (not Babel/JSX) so it loads and executes before any component script. It is split across four files that progressively build a single global namespace `window.AV`:

- **`data.js`** — IIFE returning the base `AV` object: `rooms`, `agents`, `leads`, `metrics`, `escalations`, `activity`, `stages`, `statusMap`, formatting helpers (`fmt.money`, `fmt.k`), and lookups (`agentById`, `roomById`).
- **`data2.js`** — extends `AV` in place with derived helpers (`agentDetail`, `roomProjects`, `roomTimeline`, `roomMetrics`) layered on the base entities.
- **`data3.js`** — audit + demo data: industry-keyed `REDESIGN` templates, `SCORE_PROFILES`, and a `demos` array derived from `leads` (those where `demo !== 'none'`), plus `audit()` / `demoByLead()` helpers.
- **`data4.js`** — deal-stage data: `deals`, `demoRequests`, and the reply → quote → approval → production model.

Each extension file assumes `AV` already exists (load order guarantees this) and mutates the same singleton. The result is one global mock "database" with no fetch/API/backend — all reads are synchronous property access, and all "mutations" are local React state or `localStorage`.

---

## 2. Rendering and Boot Flow

### 2.1 Splash overlay + MutationObserver handoff

`index.html` renders two elements before any script runs: a fixed `#boot` splash overlay and an empty `#root` mount point. Because Babel must download, parse, and transpile every `.jsx` file at runtime, first paint is delayed; the splash covers that gap.

A `MutationObserver` watches `#root` for its first child. When React mounts the `<App />` tree (giving `#root` a child node), the observer fades and then removes the splash:

```js
const obs = new MutationObserver(() => {
  if (document.getElementById('root').children.length) {
    document.getElementById('boot').classList.add('hide');
    obs.disconnect();
    setTimeout(() => { const b = document.getElementById('boot'); if (b) b.remove(); }, 500);
  }
});
obs.observe(document.getElementById('root'), { childList: true });
```

### 2.2 Mount

`app.jsx` is the last Babel script and performs the actual mount:

```js
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

`App` is a single large function component holding all top-level application state.

### 2.3 Load order (the dependency contract)

Load order in `index.html` **is** the dependency graph — there is no resolver to reorder anything. Scripts must appear in an order where every global a file reads has already been published by an earlier file:

```
index.html
  │
  ├─ CDN: react.development.js          → window.React
  ├─ CDN: react-dom.development.js      → window.ReactDOM
  ├─ CDN: babel.min.js                  → enables <script type="text/babel">
  ├─ inline: hooks → window.useState…   (React hooks exposed as globals)
  │
  ├─ data.js   → window.AV (base)       ┐
  ├─ data2.js  → AV += helpers          │  global data layer
  ├─ data3.js  → AV += audits/demos     │  (plain JS, runs first)
  ├─ data4.js  → AV += deals/requests   ┘
  │
  ├─ brand.jsx        → Mark, Logo, Icon          ┐
  ├─ components.jsx   → useTheme, StatusBadge,…    │  primitives
  ├─ i18n.jsx         → t, LangToggle, AV_DICT     │  (shared building blocks)
  ├─ site-mock.jsx    → SiteMock / OldSite/NewSite │
  ├─ floor-map.jsx    → FloorMap                   ┘
  │
  ├─ landing-sections.jsx   ┐
  ├─ landing-sections2.jsx  │  landing page composition
  ├─ landing.jsx            ┘  (LandingPage assembles sections)
  │
  ├─ app-shell.jsx   → Sidebar, TopBar, CommandPalette   ┐
  ├─ floor-overview.jsx, command.jsx, rooms.jsx,         │
  │  agents.jsx, pipeline.jsx, audit.jsx, demos.jsx,     │  workspace screens
  │  deals.jsx, settings.jsx, activity.jsx, requests.jsx │
  ├─ pages.jsx  → InfoPage, window.INFO_PAGES            │
  ├─ auth.jsx   → LoginScreen                            │
  ├─ chat.jsx   → ChatWidget                             ┘
  │
  └─ app.jsx   → App (routing/state) + ReactDOM mount    ← runs last
```

### 2.4 Component composition at runtime

`App` chooses exactly one of three top-level branches per render (landing / info page / workspace), then composes from the shared primitive and screen globals:

```
App  (app.jsx — owns: route, param, theme, lang, auth, mode, toasts, requests, leads)
 │
 ├─ route === 'landing'
 │     └─ LandingPage ─ LandingNav, Hero/HeroVisual, DifferenceSection,
 │                       HowItWorks, Showcase (SiteMock), InsideCompany,
 │                       WhyWins, Pricing, TrustSafety, FinalCTA, Footer
 │
 ├─ route ∈ window.INFO_PAGES
 │     └─ InfoPage (about/careers/contact/cases/guarantees/legal…)
 │
 ├─ route === 'login' || !authed
 │     └─ LoginScreen   ← auth gate
 │
 └─ workspace (authed)
       ├─ Sidebar       (NAV tree, autonomy mode selector, badges)
       ├─ TopBar        (breadcrumbs, theme toggle, search, review)
       ├─ <main id="app-scroll">
       │     └─ one screen by route:
       │        FloorOverview | CommandCenter | RoomsIndex/RoomDetail |
       │        AgentsIndex/AgentDetail | LeadPipeline | AuditScreen |
       │        DemoManager | DealsScreen | SettingsScreen |
       │        ActivityScreen | RequestsScreen | ComingSoon (fallback)
       ├─ CommandPalette (Cmd/Ctrl+K)
       ├─ ReviewCenter   (right drawer)
       ├─ ToastHost
       └─ ChatWidget

Always present across branches: ToastHost, ChatWidget, DemoRequestModal
(landing/info branches), so toasts and the assistant follow the user everywhere.
```

---

## 3. Routing

Routing is a hand-rolled state machine inside `App`, not a router library. There is no URL/History API integration; routes live in React state and `localStorage`.

- **State:** `route` (page id) and `param` (detail id), both initialized from `localStorage` (`av-route`, `av-param`), defaulting to `landing`.
- **Navigation helper:** `go(r, p)` sets `route`/`param`, closes the mobile nav, and syncs `localStorage`:
  ```js
  const go = (r, p = null) => {
    setRoute(r); setParam(p); setMobileNav(false);
    localStorage.setItem('av-route', r);
    if (p) localStorage.setItem('av-param', p); else localStorage.removeItem('av-param');
  };
  ```
- **Dispatch:** a chain of `if (route === …)` assignments selects the screen component and constructs breadcrumbs. Detail routes (`room`, `agent`, `audits`, `demos`, `deals`) resolve `param` against `AV` lookups (e.g. `AV.roomById(param)`), with sensible fallbacks (`design`, `nova`).
- **Metadata:** `ROUTE_META` maps each route to a label/icon/description, also consumed by the `ComingSoon` placeholder for unimplemented Phase-2 screens.
- **Side effects on navigation:**
  - Scroll reset (`window.scrollTo(0,0)` plus resetting `#app-scroll`) runs in an effect keyed on `[route, param]`.
  - Global keyboard handler: `Cmd/Ctrl+K` toggles the command palette; `Escape` closes palette and review center.

Because route state is persisted, a reload restores the last screen. The trade-off is that navigation is not URL-addressable: there is no deep-linkable URL, no back/forward integration, and no shareable links to a specific screen.

---

## 4. Theming

Theming is CSS-custom-property driven and toggled via a single attribute on the document root.

- **`useTheme()`** (`components.jsx`) holds `theme` (`'light'` | `'dark'`, default from `localStorage` key `av-theme`) and, on change, writes `document.documentElement.setAttribute('data-theme', theme)` and persists it.
- **`styles.css`** defines tokens on `:root` (warm-ivory light mode) and overrides them under `[data-theme="dark"]` (deep graphite). Tokens cover color (`--bg`, `--surface*`, `--border*`, `--ink`…`--ink-4`, `--primary` orange, semantic `--success/--warning/--danger/--info/--violet`, chart `c1`–`c6`), shadows (`--sh-xs`…`--sh-xl`, `--sh-glow`, `--ring`), radii (`--r-xs`…`--r-pill`), typography, and layout (`--maxw`, `--shell-side`, `--shell-top`).
- Because every component reads colors through `var(--token)` (in CSS classes and inline styles), flipping `data-theme` re-cascades the entire UI with no re-render of style logic.

`App` threads `theme`/`toggleTheme` down to landing, info, login, and `TopBar`, so the toggle is available in all top-level branches.

---

## 5. Internationalization (i18n)

i18n is a minimal global dictionary, not a library (`i18n.jsx`).

- **Dictionary:** `AV_DICT = { en: {...}, vi: {...} }` with dot-scoped keys grouped by feature (`nav.*`, `hero.*`, `diff.*`, `how.*`, `price.*`, `trust.*`, `app.*`, `set.*`, `auth.*`, …). English and Vietnamese (`vi`) are supported.
- **Lookup:** `t(key)` reads the active language from the global `window.__lang`, returns `AV_DICT[lang][key]`, and falls back to the English value, then to the raw key string.
- **Active language plumbing:** `App` owns `lang` state (default from `localStorage` key `av-lang`), publishes the current value to `window.__lang` on every render, and exposes a setter `window.__setLang(l)` that persists and updates state. `LangToggle` (also a global) flips the language without prop threading.

This deliberately avoids prop drilling: any component, anywhere in the tree, can call the global `t()` and read the current language. The cost is that `t()` is impure (depends on a mutable global) and the full dictionary loads up-front with no chunking, interpolation, or pluralization support.

---

## 6. Data Flow: Globals → Screens

```
 data.js / data2.js / data3.js / data4.js
        │  (build & extend)
        ▼
   window.AV  ── singleton mock "database" (rooms, agents, leads,
        │         deals, demos, audits, metrics, escalations,
        │         activity, demoRequests + helper functions)
        │
        │  read synchronously by every screen (no fetch)
        ▼
   Screen components (FloorOverview, CommandCenter, RoomsIndex,
        │  AgentsIndex, LeadPipeline, DealsScreen, …)
        │     • read entities directly: AV.rooms, AV.agentById(id)
        │     • derive views via AV helpers (audit(), roomMetrics(), …)
        │     • hold local UI state: filters, sort, selection, drawers
        │
        ├─ user actions ─► onAction(label, severity) ──► App.pushToast()
        │                                                  (useToasts → ToastHost)
        │
        └─ navigation   ─► onNav / go(route, param) ──► route state machine
```

Key data-flow properties grounded in the source:

- **One source of truth, read-mostly.** Screens read `AV` directly; there is no props-drilling of data, only of UI callbacks (`onAction`, `onNav`, `go*`).
- **A few mutable slices live in `App`, not in `AV`.** Specifically `requests` and `leads` are lifted into `App` state, seeded from `AV.demoRequests` / `AV.leads`, and persisted to `localStorage` (`av-requests`, `av-leads`). This is what lets a submitted demo request become a real pipeline lead (`addRequest` → `addLead`) and survive reload. Most other entities remain static reads from `AV`.
- **Cross-screen actions are callbacks, not events.** Every screen receives `onAction` (→ toast) and navigation callbacks from `App`. There is no event bus or global store beyond `AV` + `App` state + `localStorage`.
- **Autonomy mode** (`mode`: e.g. `guarded` default) is `App` state persisted to `av-mode`, surfaced in the `Sidebar` selector and `SettingsScreen`; it is presentational in the prototype (it gates UI affordances, not real automation).

### localStorage keys (the persistence surface)

`av-route`, `av-param`, `av-theme`, `av-lang`, `av-mode`, `av-auth`, `av-user`, `av-requests`, `av-leads`. These constitute the entire persistence layer — there is no backend.

### Authentication gate

`App` reads `av-auth` to decide whether the workspace is accessible. `login(email)` sets `av-auth='1'` + `av-user` and routes to `overview`; `logout()` clears auth and returns to `landing`. Any workspace route with `!authed` falls through to `LoginScreen`. This is a UI gate only — credentials are demo/pre-filled and there is no server-side verification.

---

## 7. Architectural Constraints and Risks

These follow directly from the buildless, global-scope design and are intrinsic to the current approach:

- **Global namespace collisions.** All components, hooks, data, and helpers share one `window` namespace with no encapsulation. Two files declaring the same top-level name, or accidentally shadowing a global, fail silently or unpredictably. Refactors must track names across every file by hand.
- **Load-order fragility.** `index.html` script order is the only dependency mechanism. Reordering, removing, or inserting a script in the wrong place produces `undefined is not a function`/reference errors at runtime with no compile-time check. The `data*.js` files in particular must run before any consumer and in the right sequence (base → extensions).
- **In-browser transpilation cost.** `@babel/standalone` downloads and compiles every `.jsx` on each page load. This adds startup latency (mitigated visually by the splash overlay) and means production-grade performance/minification is absent. Development React/ReactDOM builds are shipped, which are larger and slower than production builds.
- **Hard CDN dependency.** React, ReactDOM, and Babel are all loaded from `unpkg`. If `unpkg` is unreachable or a pinned version is unpublished, the app cannot boot at all. SRI hashes protect integrity but not availability; there is no offline/local vendor fallback.
- **No tests, no type safety, no lint gate.** There is no test framework, no TypeScript, and no static analysis. Correctness rests entirely on manual verification in the browser; regressions in data shapes or global wiring are not caught automatically.
- **Impure globals as shared state.** `t()` depends on mutable `window.__lang`; data is a mutable singleton (`AV`) extended by side effect. This is convenient (no prop drilling) but makes behavior order- and timing-sensitive and harder to reason about than explicit data flow.
- **No real URL routing.** Routing lives in state + `localStorage`. There is no deep-linking, no browser history integration, and no SEO-addressable pages for the marketing/landing content.
- **Mock-only data layer.** All "mutations" are local state/`localStorage`; there is no API, persistence beyond the browser, validation, or multi-user state. Several screens are explicit `ComingSoon` placeholders (Phase-2), so the architecture currently demonstrates the workflow rather than executing it.

---

## 8. Summary

Agents Verse is a single-page React prototype whose architecture optimizes for **zero-setup editability and fast visual iteration**: drop a `.jsx` file in the root, list it in `index.html`, publish your symbols to `window`, and read shared data from the `AV` global. The cost of that simplicity is the absence of every normal safety net — modules, types, tests, bundling, and URL routing — replaced by load-order discipline and a shared global namespace. The design is well-suited to its stated purpose (a polished, demo-first prototype with three "design-bar" screens and several Phase-2 placeholders) but would require a build/module/test foundation before evolving into a production application.

---

## Unresolved Questions

- Legacy buildless files (root `*.jsx`, `*.js`, `index.html`, `styles.css`) remain in repo for visual review before deletion. Plan cleanup after stakeholder sign-off.
- `middleware.ts` will be renamed to `proxy.ts` in a future Next.js upgrade (deprecation only; functional as-is).
