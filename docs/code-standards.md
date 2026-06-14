# Code Standards — Agents Verse

**Status (June 2026):** Agents Verse is a **production-ready full-stack Next.js SaaS** with self-hosted PostgreSQL + Drizzle + Better Auth + Inngest. Dual-mode runtime (demo with zero credentials, or production with Postgres + keys). Code-complete and deployable via Docker Compose. This document covers:

- **Sections 1–9:** **Next.js code standards (active, production)** — App Router, TypeScript strict, RSC, Drizzle, Better Auth, server actions, lead discovery, audit subsystem.
- **Sections 10+:** **Legacy buildless code standards** (root `*.jsx`, `index.html` — retained in repo for historical reference, not used by Next.js app).

## NEXT.JS CODE STANDARDS (SET 1, LIVE) — Start here if building in `app/`, `lib/`, `components/`

### Setup

- **Framework:** Next.js 16.2.9, React 19.2.7, TypeScript 5 (strict).
- **Build:** `npm run build` → `npm start` (Node/edge host; not static export).
- **Dev:** `npm run dev` (local on `:3000`).
- **Lint:** `npm run lint` (ESLint 9 + next config).
- **Type-check:** `npm run typecheck` (tsc --noEmit).

### File Structure & Naming

- **App Router files** (`app/`): `layout.tsx`, `page.tsx`, `route.ts`, `error.tsx`, `loading.tsx`. Follow Next.js conventions.
- **Components** (`components/`): Kebab-case filenames (`marketing-frame.tsx`, `site-mock.tsx`). Function components with TypeScript.
- **Library** (`lib/`): Utilities, data, providers. Organized by concern (`data/`, `i18n/`, `providers/`, `cookies.ts`).
- **Styles** (`styles/`): Global CSS only (`globals.css`). Component styles are inline or CSS modules (not used currently; avoid for consistency).

### Module System & Imports

- **Use ES modules.** `import`/`export` are standard.
- **Use TypeScript.** All `.ts` and `.tsx` files must have types. No `any` without a comment explaining why.
- **Absolute imports:** `@/app`, `@/components`, `@/lib` (configured in `tsconfig.json`). Do not use relative paths.
- **Server vs Client:** Mark client components with `'use client'` at the top. Layouts and data-fetching functions are server-by-default.

### State & Providers

- **App-level state:** Theme, language, auth, toast → Context providers (`ThemeProvider`, `I18nProvider`, `AuthProvider`, `ToastProvider`).
- **Local state:** Use React hooks (`useState`, `useEffect`) in client components.
- **No fetch in components:** Data reads from `lib/data/AV` (typed mock). For real APIs (Set 2), fetch in server components or route handlers.
- **Cookies:** Read on server in layout (`cookies().get('av-*')`); provider hooks expose values and sync to client.

### TypeScript Conventions

- **Strict mode:** `"strict": true` in `tsconfig.json`. Resolve all type errors before committing.
- **Data types:** Export interfaces from `lib/data/types.ts` (e.g., `Room`, `Agent`, `Lead`, `Metrics`). Keep `lib/data/index.ts` typed.
- **Component props:** Use `interface ComponentProps { ... }` or inline types. Include callback prop types.
- **Avoid implicit any:** Annotate hook return types, function parameters, and API responses.

### Styling (Reused from Legacy)

- **Design tokens:** Use CSS custom properties from `styles/globals.css` (byte-identical to root `styles.css`).
- **Inline styles:** `style={{ color: 'var(--ink)', background: 'var(--surface)' }}`. Prefer tokens over literals.
- **CSS classes:** Use existing utility classes (`.btn`, `.card`, `.badge`, `.row`, `.col`, `.chip`, `.mono`).
- **Animations:** Use CSS `@keyframes` defined in globals (e.g., `fade-in`, `slide-in`, `flow-dash`). No animation library.
- **Responsive:** Breakpoints at 1180px, 980px, 720px (mobile-first in media queries).

### Testing & Linting

- **Linting:** Run `npm run lint` before commit. Fix ESLint errors (next + eslint-config-next).
- **Type-check:** Run `npm run typecheck` before commit. Resolve all `tsc` errors.
- **No test framework currently.** Manual browser testing is the standard. Add tests (Jest/Vitest) if needed, but do not require them in CI.

### Workspace-Specific Patterns (Set 2)

Workspace screens use `WorkspaceStateProvider` to manage autonomy mode, demo requests, and lead pipeline:

```tsx
// app/(workspace)/settings/page.tsx
'use client';

import { useWorkspaceState } from '@/lib/providers/workspace-state';
import { useI18n } from '@/lib/i18n';

export default function SettingsPage() {
  const { mode, setMode } = useWorkspaceState();
  const { t } = useI18n();
  
  return (
    <div>
      <h1>{t('set.title')}</h1>
      <label>
        <input type="radio" value="guarded" checked={mode === 'guarded'} onChange={(e) => setMode(e.target.value)} />
        {t('set.mode.guarded')}
      </label>
    </div>
  );
}
```

### Workspace Shell Integration

The workspace shell (`app/(workspace)/layout.tsx`) wraps all workspace routes. It renders:
- Sidebar (NAV tree, autonomy selector, status badges)
- TopBar (breadcrumbs, theme/language toggles, review drawer button)
- CommandPalette (Cmd/Ctrl+K search)
- Global keyboard handlers (Escape closes palette and review drawer)
- Scroll-reset effect on route change

Child routes render inside `<main id="app-scroll">` and inherit all providers.

### Example: Adding a Workspace Detail Route

```tsx
// app/(workspace)/rooms/[id]/page.tsx
'use client';

import { useI18n } from '@/lib/i18n';
import { AV } from '@/lib/data';
import { useParams } from 'next/navigation';

export default function RoomDetailPage() {
  const params = useParams();
  const roomId = params.id as string;
  const room = AV.roomById(roomId) || AV.roomById('design'); // fallback
  const { t } = useI18n();
  
  return (
    <div>
      <h1>{room.name}</h1>
      <p>{room.purpose}</p>
      {/* Render room projects, agents, timeline, metrics */}
    </div>
  );
}
```

### Database Access Layer (Dual-Mode via `USE_DB` Flag)

Repositories in `lib/repositories/*` follow a consistent pattern: they return the same TypeScript types whether data comes from mock `AV` or Postgres.

**Demo mode (USE_DB=false):**
```tsx
// lib/repositories/leads.ts (demo branch)
export async function getLeads() {
  return AV.leads.map(lead => ({
    id: lead.id,
    company: lead.company,
    // ... transform AV.Lead to raw DB shape
  }));
}
```

**Production mode (USE_DB=true):**
```tsx
// lib/repositories/leads.ts (DB branch)
export async function getLeads() {
  const db = getDB();
  return await db.query.leads.findMany({
    with: { audit: true, demo: true, deal: true }
  });
}
```

**Usage (component stays the same):**
```tsx
// app/(workspace)/leads/page.tsx — agnostic to data source
'use client';
import { getLeads } from '@/lib/repositories/leads';

export default async function LeadsPage() {
  const leads = await getLeads(); // Works in both modes
  // ...
}
```

All components use repositories, never import `getDB()` or Drizzle directly. This ensures clean demo/production split.

### Server Actions for Mutations

Mutations use Server Actions in `lib/actions/*` and must:
1. Call `getCurrentUser()` first (returns user or `undefined`)
2. Check `USE_DB` flag for behavior (DB commit or localStorage)
3. Guard auth before proceeding (public actions like `createDemoRequest` explicitly allow unauthenticated)

```tsx
// lib/actions/leads.ts
'use server';

import { getCurrentUser } from '@/lib/auth/server';
import { updateLeadInDB, updateLeadInMock } from '@/lib/repositories/leads';

export async function updateLead(leadId: string, data: Partial<Lead>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  
  if (process.env.USE_DB === 'true') {
    return await updateLeadInDB(leadId, data);
  } else {
    return updateLeadInMock(leadId, data);
  }
}
```

---

## LEGACY BUILDLESS CODE STANDARDS — See below (retained for reference, not used)

These standards describe how the buildless prototype is built. The project is a **buildless single-page app**: there is no bundler, no
package manager, no compile step, and no test runner. The browser loads CDN React
and transpiles JSX with Babel at runtime. Every rule below exists to preserve that
setup. Read this before touching legacy root `*.jsx`, `*.js`, `index.html`, or legacy `styles.css`.

> Guardrail in one line: never introduce anything that needs `npm`, a build, or ES
> module resolution. If a change would require those, it does not belong here.

---

## 1. The Buildless Constraint (non-negotiable)

`index.html` is the only entry point. It loads, in order:

1. React 18.3.1 UMD, ReactDOM 18.3.1 UMD, and `@babel/standalone` 7.29.0 — all
   from `unpkg` with pinned versions and Subresource Integrity (`integrity=...`)
   hashes.
2. An inline `<script>` that aliases React hooks onto `window`
   (`window.useState = React.useState`, and so on).
3. The `data*.js` plain-JS files.
4. The `.jsx` files as `<script type="text/babel" src="...">` tags, which Babel
   transpiles in the browser.

Hard rules:

- **No `import` / `export` statements anywhere.** Each `<script type="text/babel">`
  runs in its own scope; there is no module graph. Anything shared between files
  must be placed on `window` (see Section 4).
- **No bundler, no `package.json`, no build script, no TypeScript.** Files are flat
  in the repo root and served statically (any static file server). Do not add a
  `src/` directory, `node_modules`, `tsconfig`, `vite`/`webpack` config, or similar.
- **No `.ts` / `.tsx`.** JSX only, transpiled by Babel standalone.
- **Keep React/Babel pinned and CDN-loaded.** If you change a CDN URL or version,
  you must update the matching `integrity` hash in `index.html`, or the script will
  be blocked by the browser.
- **The app must run by opening `index.html` from a static server.** Verify any
  change by serving the directory and loading the page — there is no test suite to
  catch regressions.
- **Do not break the boot splash.** A `MutationObserver` in `index.html` watches
  `#root` and hides the `#boot` overlay on the first React render. Keep `#root` and
  `#boot` intact and keep rendering React into `#root`.

---

## 2. File Naming

- Use **kebab-case multi-word filenames**: `app-shell.jsx`, `floor-map.jsx`,
  `landing-sections2.jsx`, `site-mock.jsx`.
- Screens and components use `.jsx` and are transpiled by Babel.
- Data files use `.js` (plain JavaScript, **not** transpiled — no JSX inside them).
- Long, descriptive filenames are preferred over abbreviations: the name should make
  the file's purpose obvious without opening it.
- Group related sections by suffix when a single feature spans files, following the
  existing pattern (`landing-sections.jsx`, `landing-sections2.jsx`).

---

## 3. Component Style

- **Function components only**, with hooks. No class components.
- **Use hooks via the `window` globals** set up in `index.html`: call `useState`,
  `useEffect`, `useRef`, `useCallback`, `useMemo`, `useLayoutEffect` directly
  (unprefixed). Do **not** write `React.useState`. If you need a hook that is not
  yet aliased, add the alias to the inline script in `index.html` first.
- Cross-screen communication is done with **callback props**, following the existing
  conventions:
  - `onAction(label, severity)` — surface a toast / activity entry up to the app.
  - `onNav(route)` / `go(route, param)` style handlers — navigate between screens.
  - `goXxx(...)` helpers (e.g. `goCommand`, `goRoom`, `goDemos`) — targeted jumps.
- **Read shared data from the `AV` global**, not from props. Props carry UI state
  (selection, open/closed, form fields) and callbacks; bulk domain data comes from
  `window.AV`.
- Keep files focused. The codebase splits screens, primitives (`components.jsx`),
  brand/icons (`brand.jsx`), and i18n (`i18n.jsx`). Prefer adding a new file over
  bloating an existing one; large files should be split along component boundaries.
- **Every file ends by exporting its public symbols to `window`** via a single
  `Object.assign(window, { ... })` call (see Section 4).

---

## 4. The `window` Namespace (how files share code)

Because there are no modules, sharing happens through global scope.

- **Export pattern (mandatory).** The last statement of every `.jsx` file is:

  ```js
  Object.assign(window, { ComponentA, helperB, CONSTANT_C });
  ```

  List every symbol other files depend on. Symbols not assigned to `window` are
  effectively private to that file.

- **Consume globals directly.** Reference `Icon`, `StatusBadge`, `ConfidenceRing`,
  `Reveal`, `AV`, `t`, etc. by their bare names. They are already on `window` by the
  time later scripts run, thanks to the load order in `index.html`.

- **Respect load order.** A file may only use globals defined by scripts that appear
  **earlier** in `index.html`. Primitives (`brand.jsx`, `components.jsx`,
  `i18n.jsx`, `site-mock.jsx`, `floor-map.jsx`) load before landing and app screens;
  `app.jsx` loads last so it can reference everything.

- **App-level globals.** `app.jsx` exposes `window.__lang` (current language string)
  and `window.__setLang(l)` (language setter) so any component — including those that
  receive no props — can read and change language without prop threading.

- **Reserved primitives.** Do not shadow or reassign existing globals: React hooks,
  `AV`, `Icon`/`ICONS`, `Logo`/`Mark`, the `components.jsx` primitives (`useTheme`,
  `useToasts`, `useCountUp`, `CountUp`, `StatusBadge`, `AgentAvatar`, `AvatarStack`,
  `ConfidenceRing`, `Sparkline`, `Reveal`, `ThemeToggle`, `ToastHost`), and the i18n
  globals (`t`, `LangToggle`, `AV_DICT`).

---

## 5. Styling

The visual system is a CSS-custom-property design system in `styles.css` plus inline
styles in JSX. Follow both layers.

- **Use design tokens, never hard-coded colors.** Reference CSS variables:
  - Surfaces/structure: `--bg`, `--surface`, `--surface-elev`, `--surface-muted`,
    `--surface-sunk`, `--border`, `--border-soft`, `--border-strong`.
  - Text hierarchy: `--ink`, `--ink-2`, `--ink-3`, `--ink-4`.
  - Brand/semantic: `--primary` (orange), `--primary-press`, `--primary-soft`,
    `--success`, `--warning`, `--danger`, `--info`, `--violet`, chart colors
    `--c1`…`--c6`.
  - Shadows: `--sh-xs` … `--sh-xl`, `--sh-glow`, `--ring`.
  - Radii: `--r-xs` … `--r-2xl`, `--r-pill`.
  - Typography: `--font-sans` (Hanken Grotesk), `--font-mono` (JetBrains Mono).
  - Layout: `--maxw`, `--shell-side`, `--shell-top`.
- **Theming is token-driven.** Light (warm ivory) and dark (graphite) modes are the
  same token names with different values under the `[data-theme="dark"]` selector.
  `useTheme` writes the `data-theme` attribute on `document.documentElement` and
  persists to `localStorage` (`av-theme`). Add new colors as tokens with both
  light and dark values — never branch on theme in JS.
- **Inline styles are expected** for component-specific layout and one-off values:
  `style={{ ... }}` with token references like `background: 'var(--surface)'`,
  `color: 'var(--ink-2)'`. Prefer tokens over literals even inline.
- **Structural/repeated styling uses the shared CSS classes**: `.row`/`.col`
  (flexbox), `.card`/`.card-elev`, `.btn` and variants (`.btn-primary`, `.btn-ghost`,
  `.btn-sm`, `.btn-lg`, `.btn-icon`), `.badge` variants (`badge-success`,
  `badge-warning`, `badge-danger`, `badge-info`, `badge-primary`, `badge-neutral`,
  `badge-violet`), `.chip`, `.eyebrow`, `.mono`, `.focusable`,
  `.hide-mobile`/`.hide-desktop`.
- **Spacing** follows the existing 4px-based scale (gaps and padding in multiples of
  4: 8, 12, 14, 16, 18, 22, 28…). Use `clamp()` for fluid heading sizes as the
  current code does.
- **Animations** are CSS `@keyframes` in `styles.css` (e.g. `fade-in`, `slide-in`,
  `float-y`, `flow-dash`, `grow-bar`) applied via class or inline. SVG flow visuals
  use `animateMotion`. Do not add an animation library.
- Status icon backgrounds use the existing soft-tint idiom:
  `color-mix(in oklab, var(--success) 14%, transparent)`.

---

## 6. Data Conventions (`data*.js`)

Domain/mock data lives in plain-JS files that build a single global namespace.

- **`data.js` creates the base.** It wraps an IIFE and assigns the result to
  `window.AV`, returning the base shape:
  `{ rooms, agents, leads, metrics, escalations, activity, stages, statusMap, fmt, agentById, roomById }`.
- **`data2.js`, `data3.js`, `data4.js` extend `AV` in place.** Each is its own IIFE
  that assumes `AV` already exists and attaches more keys/helpers
  (e.g. `AV.hueFor`, audit/demo/deal helpers, `demoRequests`). Keep this additive
  pattern — do not re-create `AV` in later files.
- **No JSX in `data*.js`.** These load as plain `<script>` tags and are not
  transpiled. Plain JavaScript only.
- **No `import`/`export`, no fetch, no API calls.** All data is local. Mutations are
  React `useState` updates or `localStorage` writes (see Section 8).
- **Conventions for data shape:**
  - IDs are lowercase kebab-case (`atlas-d`, `nova-r`, `d-nova`).
  - Status strings are lowercase single words (`working`, `idle`, `waiting`,
    `review`, `escalate`).
  - Times are relative strings (`just now`, `2m`, `1h`).
  - Money via `AV.fmt.money(n)` → `$X,XXX` and `AV.fmt.k(n)` → `$X.Xk`.
  - Agent/industry color via a `hue` integer; resolve industries through
    `AV.hueFor(industry)`.
  - Coordinates for the floor map use `x`/`y` on a 0–100 scale.
- **Use lookup helpers** (`AV.agentById`, `AV.roomById`, `AV.demoByLead`,
  `AV.dealByLead`, etc.) rather than scanning arrays inline; add new helpers to the
  same `AV` namespace when needed.

---

## 7. Internationalization (i18n)

i18n is a small global dictionary in `i18n.jsx`. English (`en`) and Vietnamese
(`vi`) are supported.

- **Translate user-facing strings with `t('scope.key')`.** Never hard-code display
  copy in components when an equivalent key exists.
- **Keys are dot-scoped by feature/page**: `nav.*`, `hero.*`, `diff.*`, `how.*`,
  `show.*`, `inside.*`, `why.*`, `price.*`, `trust.*`, `final.*`, `foot.*`, `app.*`,
  `ov.*`, `m.*`, `cmd.*`, `rooms.*`, `agents.*`, `leads.*`, `demos.*`, `deals.*`,
  `act.*`, `req.*`, `set.*`, `auth.*`, `common.*`.
- **Add keys to both `en` and `vi` branches of `AV_DICT`.** The lookup is
  `t(key) → AV_DICT[lang][key] → AV_DICT.en[key] → key`, so a missing `vi` entry
  silently falls back to English; still add both to keep parity.
- **Read/change language through globals**, not props: `t()` reads `window.__lang`;
  the `LangToggle` component calls `window.__setLang(l)`. Language persists to
  `localStorage` under `av-lang`.
- There is no pluralization or interpolation helper — compose dynamic strings in JS
  around static translated fragments, matching current usage.

---

## 8. State & Persistence

- **Per-screen UI state** uses local `useState` (filters, selection, drawer
  open/closed, form fields). There is no global state library — do not add one.
- **Routing and session state** live in `app.jsx` and persist to `localStorage`.
  Keys in use: `av-route` (current page), `av-param` (detail id), `av-theme`,
  `av-auth`, `av-user`, `av-mode` (autonomy mode), `av-lang`, `av-requests`,
  `av-leads`. Reuse these keys; namespace any new persisted state with the `av-`
  prefix and JSON-encode it (the app reads with a guarded `JSON.parse`).
- Navigation goes through the `go(route, param)` helper, which sets state and syncs
  `localStorage`. Do not write `route`/`param` to `localStorage` directly from
  screens.

---

## 9. Adding a New Screen

To add a screen so it loads correctly and routes properly, do all of the following:

1. **Create the file.** Add `your-screen.jsx` (kebab-case) in the repo root.
   Write a function component that takes callback props (`onAction`, `go*`, etc.)
   and reads data from `AV`. End the file with
   `Object.assign(window, { YourScreen });`.

2. **Register it in `index.html`.** Add a
   `<script type="text/babel" src="your-screen.jsx"></script>` tag in the **App
   screens** block, placed **after** any primitive/global it depends on and
   **before** `app.jsx` (which loads last). Load order is dependency order.

3. **Wire routing in `app.jsx`.** Add a branch to the render switch:

   ```js
   else if (route === 'your-route') screen = <YourScreen onAction={pushToast} ... />;
   ```

   Pass the same callbacks the sibling screens use (`pushToast`/`onAction`, `go(...)`
   navigation handlers). Detail screens read their id from `param`.

4. **Add route metadata.** Add an entry to `ROUTE_META` in `app.jsx`
   (`label`, `icon`, `description`) so the shell can render breadcrumbs/labels.

5. **Add navigation entry (if it belongs in the sidebar).** Add an item to the `NAV`
   array in `app-shell.jsx` (with `id`, `label`, `icon`, optional `badge`/`live`).
   The `id` should match the route string used in step 3.

6. **Add translations.** Add the screen's copy keys to both `en` and `vi` in
   `AV_DICT` (`i18n.jsx`) and use `t()` in the component.

7. **Add any new data** to the `AV` namespace via `data*.js` (extending `AV` in
   place), not inline in the screen.

8. **Verify by serving and loading `index.html`.** Confirm the script loads without
   a console error, the route renders, navigation reaches it, and theme + language
   toggles still behave. There is no automated test to catch a missing or
   mis-ordered script tag.

Screens that are not yet built should render the existing `ComingSoon` placeholder
(the default branch of the routing switch already covers unknown routes).

---

## 10. Quick Do / Don't

| Do | Don't |
|----|-------|
| Share code via `Object.assign(window, {...})` | Add `import`/`export` statements |
| Use bare hook globals (`useState`) | Use `React.useState` |
| Reference CSS tokens (`var(--ink)`) | Hard-code hex colors |
| Read domain data from `AV` | Add fetch/API calls or a backend assumption |
| Extend `AV` additively in `data*.js` | Re-create `AV` or put JSX in `.js` files |
| Pin CDN versions + matching `integrity` | Swap a CDN URL without updating its hash |
| Add new screens to `index.html` load order | Introduce a bundler, `package.json`, or `src/` |
| Translate copy via `t()` (both `en`/`vi`) | Hard-code user-facing strings |
| Persist with `av-`-prefixed `localStorage` keys | Add a state-management library |

---

## Unresolved Questions

**Next.js (Sets 1 + 2, live):**
- Fonts are still loaded via CSS `@import` in `styles/globals.css` (parity with legacy). Migration to `next/font` is optional.
- `middleware.ts` will be renamed to `proxy.ts` in Next.js 17+. No action needed now; rename when convenient.

**Legacy buildless (retained for reference):**
- Legacy files in repo root (`*.jsx`, `*.js`, `index.html`, `styles.css`) remain for visual review before cleanup. Plan removal after stakeholder approval.
