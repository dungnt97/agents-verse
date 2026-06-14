# CLAUDE.md

Guidance for Claude Code working in this repository. Read `./README.md` first for the project overview.

## What this is

**Agents Verse** — a frontend prototype (demo-first autonomous AI web agency) built with **Next.js 16 (App Router) + React 19 + TypeScript (strict)**. Frontend-only: all data is mock/seed data in `lib/data` (the `AV` singleton). No backend, no network calls.

It was migrated from a buildless CDN-React prototype; the original files are retained (see "Legacy" below).

## Commands

```bash
npm run dev         # dev server (Turbopack) → http://localhost:3000
npm run build       # production build
npm run typecheck   # tsc --noEmit  (primary type gate)
npm run lint        # eslint app lib components
```

Always run `npm run typecheck` (and ideally `npm run build`) after changing `.ts`/`.tsx` files.

## Architecture

- **App Router** under `app/`. Route groups: `app/(marketing)/[slug]` (9 info pages), `app/(workspace)/*` (auth-gated shell + 14 screens). `app/layout.tsx` reads theme/lang/auth **cookies** server-side and seeds the client providers — this is why routes are **dynamic SSR** (no static export; deploy on Node/edge).
- **State = React Context** (`lib/providers/` + `lib/i18n/`): Theme, I18n, Toast, Auth, WorkspaceState. Persistence: **cookies** for `av-theme`/`av-lang`/`av-auth`; **localStorage** for `av-mode`/`av-requests`/`av-leads`. (Plain-string localStorage values are stored raw — do NOT `JSON.stringify` a bare string, it re-escapes on every reload.)
- **Data** (`lib/data/`): one typed `AV` object (rooms, agents, leads, demos, deals, audits, activity, statusMap, fmt, lookups). Read-mostly; screens read `AV.*` directly.
- **Styling**: a CSS-variable design system in `styles/globals.css` (light + `[data-theme="dark"]`). **No Tailwind.** Use the existing tokens (`var(--…)`) and utility classes (`.btn`, `.card`, `.badge`, `.row/.col`, …); components also use inline `style={}` heavily.
- **Auth gate**: `middleware.ts` redirects unauthenticated `/(workspace)` requests to `/login`.

## Conventions (follow these)

- **kebab-case** file names; **no `window` globals** (use ES imports/exports + context).
- Add `'use client'` to any component using hooks/effects/handlers (all workspace screens are client).
- **i18n**: UI strings go through `t('ns.key')` from `useI18n()`. Keys live in `lib/i18n/keys/*.ts` (each exports `en` + `vi`, same keys) and are merged in `lib/i18n/i18n-provider.tsx`. To add UI text: wrap it in `t('ns.key')` and add EN+VI to a keys module. **Keep proper nouns + mock data content in English.** Preserve typographic apostrophes `’` / curly quotes `“ ”` exactly (don't let an editor flip them to straight ASCII — it has broken builds before).
- **UI fidelity**: this is a faithful port — match existing markup/inline styles; don't introduce new visual frameworks or restyle.
- Code comments explain the *why* and must **not** reference plan phases/finding codes; keep them self-contained.
- File size: prefer < ~200 LOC; split large files into focused modules.

## Legacy (do not touch)

Root `index.html`, `*.jsx`, `data*.js`, `styles.css` are the **original buildless prototype**, retained for reference. They are **not** part of the Next.js build (only `app/` defines routes). Don't edit or delete them unless explicitly asked.

## Plan language (MANDATORY)

- **All plan files MUST be written in Vietnamese** — everything under `./plans/` (`plan.md`, `phase-XX-*.md`, research/reports `*.md`). Prose, headings, descriptions, todo items, success criteria → Tiếng Việt.
- **Keep in English** (do NOT translate): code, identifiers, file/dir paths, commands, type/field names, API/library names, proper nouns, and code-block contents. Only the surrounding narrative prose is Vietnamese.
- This applies to plans authored directly and by any delegated `planner`/`researcher` subagent — pass this instruction along when spawning them.

## Where things live

- Docs: `./docs/` (codebase-summary, system-architecture, code-standards, journals)
- Plans: `./plans/` (**written in Vietnamese** — see "Plan language" above)
- ClaudeKit workflow rules: `./.claude/rules/`
