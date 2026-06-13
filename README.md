# Agents Verse

A frontend prototype for an **autonomous, demo-first AI web agency** — an AI workforce of specialized agents that finds outdated business websites, audits them, generates live redesign demos, and prepares outreach, all under founder oversight.

Originally a buildless CDN-React prototype, now a **Next.js 16 + React 19 + TypeScript** app. Frontend-only: all data is mock/seed data in the browser — no backend, no network calls, no persistence beyond `localStorage`/cookies.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** (strict)
- **Cookie-SSR**: theme/language/auth are read from cookies on the server, so the first paint is correct (no flash). Routes are dynamic SSR.
- **No CSS framework** — a custom CSS-variable design system in `styles/globals.css` (light/dark via `[data-theme]`), fonts via Google Fonts (Hanken Grotesk + JetBrains Mono).
- **i18n**: English + Tiếng Việt, switchable live.
- State via React Context (Theme / i18n / Toast / Auth / Workspace).

## Getting started

```bash
npm install
npm run dev        # → http://localhost:3000
```

Open `http://localhost:3000`, click **Open workspace** / go to `/login`, and sign in with **any email + password** (it's a prototype — pre-filled demo credentials work). You land on `/overview`.

Toggle **EN / VI** and **light / dark** from the top-right of any screen.

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`app`, `lib`, `components`) |
| `npm run typecheck` | `tsc --noEmit` |

## Routes

- **Public:** `/` (landing), `/login`, and 9 info pages — `/about /careers /contact /cases /guarantees /status /privacy /terms /security`
- **Workspace** (auth-gated via middleware): `/overview`, `/command`, `/rooms` · `/rooms/[id]`, `/agents` · `/agents/[id]`, `/leads`, `/audits`, `/demos`, `/deals`, `/settings`, `/activity`, `/requests` (detail context via `?lead=`)

## Project structure

```
app/                 # App Router routes + root layout + providers
  (marketing)/[slug] # 9 info pages (SSG-style dynamic)
  (workspace)/       # authenticated shell + 14 screens
components/
  brand/ ui/         # icons, logo, shared primitives
  landing/ info/     # public marketing + info pages
  marketing/         # ChatWidget, DemoRequestModal, shared frame
  workspace/         # sidebar, top-bar, command palette + all workspace screens
  site-mock.tsx floor-map.tsx
lib/
  data/              # typed AV mock "database" (rooms, agents, leads, deals, …)
  i18n/              # provider + dictionary + keys/*.ts (en/vi)
  providers/         # theme, toast, auth, workspace-state
  cookies.ts
styles/globals.css   # design-system tokens + utilities
middleware.ts        # gates workspace routes by the av-auth cookie
```

## Internationalization

UI strings are localized with `useI18n()` → `t('namespace.key')`. Keys live in `lib/i18n/keys/*.ts` (each exports `en` + `vi`) and are merged in `lib/i18n/i18n-provider.tsx`. Proper nouns and mock data content are intentionally kept in English. To add UI text: wrap it in `t('ns.key')` and add the `en`/`vi` values to a keys module.

## Deployment

Because the app reads cookies on the server (no-FOUC theme/lang), routes are dynamic — deploy to a **Node/edge host** (Vercel, Netlify, …), not a pure static export.

## Notes

- The original **buildless prototype** files (`index.html`, root `*.jsx`, `data*.js`, `styles.css`) are retained in the repo root for reference. They are **not** part of the Next.js build (only `app/` defines routes).
- This is a UI prototype: mutations are local state / `localStorage` only; there is no backend.

Design + architecture docs live in [`docs/`](./docs); implementation plans in [`plans/`](./plans).
