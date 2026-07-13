# UI & i18n — Spec

> The App Router surface: how a page becomes a screen, the provider stack, the CSS-variable design system, and the `t('ns.key')` translation contract.
> Owner-of-truth for: the page→screen contract, the provider stack + auth gate, `app/globals.css` tokens/utilities, the i18n key modules, `route-meta.ts` / sidebar `NAV`, and the `?lead=` deep-link.

## Boundary

**In scope:** `app/**` (pages, layouts, `providers.tsx`, `globals.css`, `middleware.ts`), `components/**`, `lib/i18n/**`, `lib/providers/**`, `lib/data/format.ts`.

**Out of scope:** the route inventory and the web↔worker split (`../specs/architecture-map.md`); repositories, server actions, `USE_DB` (`./data-layer.md`); the `/demo/[leadId]` CSP (`./demo-gen.md`); env vars (`../env-reference.md`).

**Runtime:** `web` only. Everything here runs in the Next.js container. Nothing in this slice may be reachable from `lib/inngest/worker-entrypoint.ts`.

## Contracts

| Thing | Symbol / file | Depended on by |
|---|---|---|
| Page → screen | async Server Component in `app/(workspace)/<route>/page.tsx` → `'use client'` screen in `components/workspace/<route>/` | every workspace route |
| Client provider stack | `Providers` (`app/providers.tsx`) — seeded from server-read cookies + repositories in `app/layout.tsx` | all routes, marketing included |
| Directory context | `WorkspaceDataProvider` / `useWorkspaceData()` (`lib/providers/workspace-data-provider.tsx`) → `{ rooms, agents, roomById, agentById }` | `AgentAvatar`, `FloorMap`, breadcrumbs, `CommandPalette` |
| Mutable app state | `WorkspaceStateProvider` / `useWorkspaceState()` → `{ mode, leads, requests, badges, useDb, addLead, moveLead, … }` | pipeline, requests, palette, sidebar badges |
| Translation | `useI18n()` → `{ lang, t, setLang }` (`lib/i18n/i18n-provider.tsx`); key modules in `lib/i18n/keys/*.ts`, each exporting `en` + `vi` | every component with a visible string |
| Presentation helpers | `lib/data/format.ts` — `fmt`, `statusMap`, `stages`, `SCORE_LABELS`, `DEMO_STATUS`, `DEAL_STAGE`, `REQ_STATUS`, `hueFor`, `relativeTime`, `humanizeAuditError` | client-safe; the only data-shaped module a client file may import |
| Route labels (non-i18n) | `ROUTE_META` (`components/workspace/route-meta.ts`) | `top-bar.tsx` breadcrumbs, `coming-soon.tsx` |
| Nav tree | `NAV` (exported from `components/workspace/sidebar.tsx`) | the sidebar itself and `CommandPalette` |
| Auth gate | `getCurrentUser()` from `@/lib/auth/session`, called in `app/(workspace)/layout.tsx` | the whole workspace |
| Deep link | `searchParams.lead` on `/audits`, `/demos`, `/deals` | `lead-pipeline.tsx` pushes `/audits?lead=`+`/demos?lead=`; `audit-screen.tsx` pushes `/demos?lead=`. Nothing links `?lead=` into `/deals` today — the page accepts it anyway |
| Cookies | `av-theme`, `av-lang` (read server-side in `app/layout.tsx`, written client-side via `setCookie` in `theme-provider` / `i18n-provider`), `av-auth` (demo mode) | SSR/hydration parity |

## How it works

### Page → screen

Workspace pages are **async Server Components**. They `await` `lib/repositories/*`, reduce the result to **plain serializable props**, and render a `'use client'` screen. The exceptions are `agents/page.tsx` and `requests/page.tsx`, which are `'use client'` because they need **zero** server data (they read router / `useWorkspaceState()` only). Everything else is a server page.

`audits/page.tsx` is the canonical example: it `Promise.all`s `auditedLeads()`, `getDemos()`, `getAuditJobs()`, `getReadyGeneratedDemoLeadIds()` and the `searchParams` Promise, prefetches every `getAudit()` into an `auditMap`, flattens demo lead ids to a **plain array** (the client converts to a `Set` — a `Set` is not RSC-serializable), and reduces `audit_jobs` rows to a client-safe `AuditJobView` (`{ status, error }`). `leads/page.tsx` and `demos/page.tsx` follow the same shape.

Next 16 dynamic APIs are **Promises**: `params` (`rooms/[id]/page.tsx`, `agents/[id]/page.tsx`, `(marketing)/[slug]/page.tsx`), `searchParams` (`audits`/`demos`/`deals`), `cookies()` (`app/layout.tsx`). Always `await`.

When a server page's screen needs `useRouter` / `useToast`, the interactivity goes into a thin client wrapper next to the page: `rooms/[id]/room-detail-client.tsx`, `agents/[id]/agent-detail-client.tsx`, `(marketing)/[slug]/info-page-client-wrapper.tsx`.

### Provider stack + the auth gate

`app/layout.tsx` is a repository consumer on **every** request — `/` and `/login` included. It reads the `av-theme` / `av-lang` cookies and `Promise.all`s `getCurrentUser()`, `getLeads()`, `getDemoRequests()`, `getSettings()`, then seeds `<Providers>` so the first painted HTML already has the right theme, language, auth state and workspace state (no flash, no hydration mismatch).

Real nesting in `app/providers.tsx`:

```
ThemeProvider > I18nProvider > AuthProvider > WorkspaceStateProvider > ToastProvider > children
```

That stack is **global** — marketing and `/login` sit inside it too. **`WorkspaceDataProvider` is NOT in `providers.tsx`**; it is mounted only in `app/(workspace)/layout.tsx`, which also declares `export const dynamic = 'force-dynamic'`, runs the gate (`getCurrentUser()` → `redirect('/login')`), and fetches `getRooms()` / `getAgents()` / `getOpenEscalations()`.

Outside the workspace there is no provider, so `useWorkspaceData()` falls back to `FALLBACK_DIRECTORY` — a directory built from the mock `AV` singleton. This is deliberate (the marketing floor preview needs it) and is the **only** sanctioned `AV` import in a `'use client'` file.

The auth layers, in order of authority:
1. `app/(workspace)/layout.tsx` — **the real gate**. Validates the session/demo cookie server-side.
2. `middleware.ts` — a cheap Edge cookie-*existence* bounce (`av-auth`, or a Better Auth session cookie). Forgeable. Its `matcher` lists `/deals` but **not** `/deals/:path*`, so `/deals/[id]/proposal` gets no Edge bounce at all.
3. `workspace-shell.tsx` — a client `useEffect` that `router.replace('/login')` when `useAuth().authed` is false. Defense in depth.

### Design system

`app/globals.css`, hand-rolled, **no Tailwind, no CSS-in-JS, no other CSS file**. Tokens live under `:root` with a full `[data-theme="dark"]` override block. Families: surface (`--bg`, `--surface`, `--surface-elev`, `--surface-muted`, `--surface-sunk`), border, ink (`--ink`…`--ink-4`), brand (`--primary`, `--primary-soft`, `--on-primary`), semantic (`--success|warning|danger|info|violet` + `-soft`), chart (`--c1`…`--c6`), shadow (`--sh-*`, `--ring`), radius (`--r-*`), font (`--font-sans`, `--font-mono`), layout (`--maxw`, `--shell-side`, `--shell-top`).

Utility classes: `.mono .eyebrow .display .t-secondary .t-muted .tabular` · `.card .card-elev` · `.btn` + `.btn-primary|ghost|soft|sm|lg|icon` · `.badge` + `.badge-neutral|primary|success|warning|danger|info|violet` · `.pulse .hr .chip .focusable .track .skel .grain` · flex utils `.row .col .between .wrap .grow .center .scroll-x` · reveal `.reveal .reveal-in` · escape hatch `.hide-mobile`. (`hide-desktop` is applied on the backdrop in `workspace-shell.tsx` but **has no rule in `globals.css`** — it does nothing.) Everything else is inline `style={}` referencing `var(--…)`. Breakpoints: 1180 / 980 / 720px; at ≤720px `--shell-side` collapses to `0px` and the sidebar becomes an off-canvas drawer keyed on `.av-sidebar.open` + `.av-topbar-menu`.

`lib/data/format.ts` is the bridge between state and CSS: `statusMap`, `DEMO_STATUS`, `DEAL_STAGE`, `REQ_STATUS` each return a `cls` string like `badge-warning`. Those strings are pasted straight into `className` — the class must exist in `globals.css` (**U5**).

Fonts load via the explicit `<link rel="stylesheet">` in `app/layout.tsx` (Hanken Grotesk + JetBrains Mono). The `@import url('https://fonts.googleapis.com/…')` at the top of `globals.css` is **dead** — Turbopack does not honor it. Do not delete the `<link>` believing the `@import` covers it; the typography silently falls back to system-ui.

### i18n

`I18nProvider` builds one flat `MERGED` map per language: `AV_DICT` (the legacy `lib/i18n/dictionary.ts`) spread first, then each key module — `shell-dash`, `rooms-agents`, `pipeline-audit`, `demos-deals`, `system`, `landing-info`, `status`. Resolution in `t()` is: active-lang value → **English fallback** → **raw key**. A missing key therefore renders on screen as the literal `ns.key`. It never throws.

Because everything lands in one flat map, **keys must be globally unique across modules** — a duplicate silently overrides whichever module was spread earlier.

Namespace ownership: `shell.`/`dash.` → `shell-dash`; `rooms.`/`agents.` → `rooms-agents`; `leads.`/`audits.`/`discovery.` → `pipeline-audit`; `demos.`/`deals.` → `demos-deals`; `act.`/`req.`/`set.` → `system`; `land.`/`info.`/`demoModal.` → `landing-info`; `status.`/`dealStage.` → `status`. The `app.*` and `nav.*`/`hero.*` namespaces live in the **legacy `dictionary.ts`**, not in a key module.

Parity is enforced at two different strengths:

| Modules | `en`/`vi` typing | A missing VI key is caught by |
|---|---|---|
| `pipeline-audit`, `system` | `en` is inferred; `vi` is keyed to it — `Record<PipelineAuditKey, string>` (`PipelineAuditKey = keyof typeof en`) and `Record<keyof typeof en, string>` | **`npm run typecheck`** |
| `shell-dash`, `rooms-agents`, `demos-deals`, `landing-info`, `status` | both `Record<string, string>` | **vitest only** (`tests/i18n/key-parity.test.ts`) |

`StatusBadge` (`components/ui/status-badge.tsx`) shows the fallback in action: it calls `t('status.' + status)` and, when the result comes back equal to the key, renders `statusMap[status].label` instead.

### Labels have more than one source — keep them in sync

1. `NAV` in `sidebar.tsx` — the nav tree. Rendered labels resolve via `t('app.' + it.id)` against the **legacy `dictionary.ts`**. The code reads `t('app.' + it.id) || it.label`, but that `||` fallback is **dead**: `t()` returns the raw key (truthy) when a key is missing, so a missing `app.*` key renders the literal `app.foo`, never the English `label`.
2. `ROUTE_META` in `route-meta.ts` — breadcrumbs (`top-bar.tsx`) and the `ComingSoon` placeholder. `top-bar` also prefers `t('app.' + seg)` and falls back to `meta.label`.
3. `CommandPalette` imports `NAV` from `sidebar.tsx` and uses the **raw English `label`** — it does not read `ROUTE_META` and does not translate page names.

## Invariants

Governed by (rationale + what-enforces lives only in [`../invariants.md`](../invariants.md)):

- **B3** — a `'use client'` file must never *value*-import `lib/repositories/*`, `lib/db/*`, `lib/auth/session.ts`, `lib/actions/guard.ts`, or `next/headers`. `import type` is the sanctioned exception.
- **B4** — components never import the mock `AV`; the sole exception is `FALLBACK_DIRECTORY` in `workspace-data-provider.tsx`.
- **O1** — every screen must still render with `USE_DB` off.
- **U1** — every visible string goes through `t('ns.key')`, EN + VI in the same commit; keys globally unique.
- **U2** — a NEW key module must be registered in **both** `i18n-provider.tsx` spreads **and** both parity tests.
- **U3** — preserve typographic apostrophes `’` and curly quotes byte-exact; proper nouns and mock content stay English.
- **U4** — no Tailwind, no CSS-in-JS, no new CSS files; a new token goes in **both** `:root` and `[data-theme="dark"]`.
- **U5** — any new badge class returned from `lib/data/format.ts` must exist in `globals.css`.
- **U6** — server→client props must be serializable; `params`/`searchParams`/`cookies()` are Promises — `await` them; every route stays dynamic SSR (never `force-static`).
- **U7** — a new route means an entry in `ROUTE_META` **and** in `NAV`.
- **U8** — `app/(workspace)/layout.tsx` is the real auth gate; never rely on `middleware.ts` alone.

## Extension recipes

### Add a workspace screen `/foo`

1. `components/workspace/foo/foo-screen.tsx` — `'use client'`, props-only, `useI18n()` for strings, tokens + utility classes for styling.
2. `app/(workspace)/foo/page.tsx` — async Server Component: `await` the repositories it needs (one `Promise.all`), reduce to serializable props, render `<FooScreen … />`. Make the page `'use client'` **only** if it needs zero server data (see `agents/page.tsx`).
3. If the screen needs router/toast *around* server data, add `foo-client.tsx` (pattern: `rooms/[id]/room-detail-client.tsx`).
4. `NAV` in `components/workspace/sidebar.tsx` — add `{ id: 'foo', label: 'Foo', icon: '…' }`. The icon name must already exist in `components/brand/icon.tsx`.
5. `ROUTE_META` in `components/workspace/route-meta.ts` — add a `foo:` entry (breadcrumbs + `ComingSoon`).
6. `lib/i18n/dictionary.ts` — add `app.foo` (EN + VI); the sidebar and breadcrumbs both read `t('app.foo')`.
7. `middleware.ts` — add `'/foo'` (or `'/foo/:path*'` if it has detail routes) to the `matcher`. The layout gate already covers it; this is the cheap Edge bounce.
8. i18n for the screen's own strings — a `foo.*` block in an existing key module (see below).
9. If it needs a `?lead=` deep link, copy the `searchParams: Promise<{ lead?: string }>` shape from `demos/page.tsx`.
10. Tests: add the route to `WORKSPACE_ROUTES` in `tests/e2e/workspace.spec.ts`. Then `npm run typecheck && npm run test && npm run lint`.

### Add a UI string

1. Pick the owning key module by namespace (see the table above).
2. Add the key to **`en` and `vi`**, identical key, no blank value, curly quotes preserved.
3. Consume with `const { t } = useI18n()` → `{t('ns.key')}`.
4. **If you created a new module:** import it in `lib/i18n/i18n-provider.tsx` and add it to **both** the `en` and `vi` spreads of `MERGED`; then register it in `tests/i18n/key-parity.test.ts` (the `modules` map) **and** `tests/i18n/parity.test.ts` (the `MODULES` array). Skip any of the four and the module is invisible with a green build.
5. `npm run test -- tests/i18n && npm run typecheck`.

### Add a design token or utility class

1. Add the token to `:root` **and** to the `[data-theme="dark"]` block in `app/globals.css`. A token missing from the dark block silently inherits the light value.
2. Put a utility class in its existing section (buttons / badges / layout). Reference `var(--token)` only — never a colour literal.
3. If it is a `badge-*` class, add the matching entry to the map in `lib/data/format.ts` in the same commit (and vice-versa).

## Traps

- **A forgotten key module is invisible.** `t()` falls back to the raw key, typecheck passes, both parity tests pass (they only test what they import). This is the sharpest trap in the slice. (**U2**)
- **The `@import` for Google Fonts in `globals.css` does nothing.** Turbopack ignores it. The `<link>` in `app/layout.tsx` is the working load.
- **`middleware.ts`'s matcher omits `/deals/:path*`.** `/deals/[id]/proposal` is protected by the layout gate alone. Adding a detail route under an existing list route does **not** inherit the Edge bounce.
- **`app/layout.tsx` runs repository queries on `/` and `/login`.** Anything you add there costs a query on the public landing page.
- **A `Set` or `Map` in props is a runtime RSC error, not a type error.** Pass arrays; convert client-side.
- **`CommandPalette` does not translate page labels** — it uses `NAV`'s hardcoded English `label`. Adding `app.foo` to the dictionary fixes the sidebar and the breadcrumb, not the palette.
- **`proposal-document.tsx` is deliberately English-only** — zero `t()` calls. It is a client-facing document, not workspace chrome. Do not "fix" it by wrapping its strings.
- **`globals.css` has a live typo**: `--ink-4: #b3ae a2;` (invalid, ignored) immediately followed by the valid `--ink-4: #b3aea2;`. Harmless today; do not delete the second line.
- **`t()` is not the only resolver.** `keys/landing-info.ts` and `keys/pipeline-audit.ts` are `'use client'` modules that also export overlay hooks — `useLandingInfoT`, `usePipelineAuditT` — which check that module's **local** `en`/`vi` map *first* and only then delegate to `useI18n().t`. They are live: `components/landing/landing.tsx`, `components/landing/sections-2.tsx`, `components/info/info-sections.tsx`, `components/workspace/pipeline/lead-pipeline.tsx`, `components/workspace/pipeline/discovery-trigger.tsx`, `components/workspace/audit/audit-screen.tsx`. Do not delete them, and remember the local overlay beats whatever `MERGED` resolved for those namespaces.

## Tests

**Guards this today**

| Guard | Covers |
|---|---|
| `npm run typecheck` | EN/VI parity for `pipeline-audit` + `system`; `await`ed Promise params; prop types |
| `tests/i18n/key-parity.test.ts` | EN↔VI key-set parity + no-blank-values for **all** key modules, and global key uniqueness across them |
| `tests/i18n/parity.test.ts` | the same parity + blank check, but only for `landing-info`, `pipeline-audit`, `system`, `shell-dash` |
| `tests/data/format.test.ts` | every `cls` in `statusMap` / `DEMO_STATUS` / `DEAL_STAGE` / `REQ_STATUS` matches `/^badge-[a-z]+$/`, plus `fmt`, `stages` order, `hueFor` determinism |
| `tests/e2e/workspace.spec.ts` (Playwright) | each listed workspace route returns <400, does not bounce to `/login`, and renders non-trivial DOM |
| `tests/e2e/public.spec.ts` | the public/marketing surface |

**Guarded by NOTHING**

- That a `badge-*` class returned by `format.ts` actually **exists** in `globals.css` — the test only checks the string *shape*.
- That a new token was added to the `[data-theme="dark"]` block.
- That a new key module was registered in the provider or in the parity tests.
- That `AV_DICT` (`dictionary.ts`) has EN/VI parity — the parity tests cover the `keys/*` modules only, not the legacy dictionary.
- That `NAV` and `ROUTE_META` stay in sync with the routes on disk.
- Serializability of server→client props (a runtime RSC error).
- No lint rule forbids a `'use client'` file value-importing `lib/repositories/*` — the `server-only` package throws at **build**, and vitest **stubs** `server-only`, so the unit suite would stay green.
- `npm run test:e2e` and `npm run coverage` are **not** wired into CI; their thresholds are not gates.
