# Code Standards — Agents Verse

**Status (June 2026):** Agents Verse is a **production-ready full-stack Next.js SaaS** with self-hosted PostgreSQL + Drizzle + Better Auth + Inngest. Dual-mode runtime (demo with zero credentials, or production with Postgres + keys). Code-complete and deployable via Docker Compose. This document covers:

- **Sections 1–9:** **Next.js code standards (active, production)** — App Router, TypeScript strict, RSC, Drizzle, Better Auth, server actions, lead discovery, audit subsystem.

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

### Styling

- **Design tokens:** Use CSS custom properties from `app/globals.css`.
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

> The buildless prototype's code standards were removed in the June 2026 cleanup (the prototype no longer exists; see git history and docs/project-changelog.md). The Next.js standards above are the only ones in use.

---

## Unresolved Questions

**Next.js (Sets 1 + 2, live):**
- Fonts are still loaded via CSS `@import` in `app/globals.css`. Migration to `next/font` is optional.
- `middleware.ts` will be renamed to `proxy.ts` in Next.js 17+. No action needed now; rename when convenient.
