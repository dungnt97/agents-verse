# Journal — Backend Foundation + Lead Discovery

**Date:** 2026-06-13 · **Scope:** Phase 0 (Foundation) + Subsystem 1 (Discovery) · **Outcome:** 8/8 phases code-complete, all gates green.

## What shipped
Turned the frontend-only prototype (mock `AV` singleton) into a real all-TypeScript backend behind a `USE_DB` feature flag: Drizzle + postgres-js → Supabase Postgres, Better Auth, server actions, and Google Places lead discovery — packaged for Docker/VPS. The app still builds and runs with **no database** (mock fallback), which was the hard constraint that shaped every phase.

## Decisions that mattered
- **Dual-mode everywhere, not just data.** Phase 4's `USE_DB` flag was extended to auth (Phase 5) and mutable state (Phase 6). Without this, enabling real auth/DB would have broken the credential-less demo. Demo paths (cookie auth, localStorage) are explicitly *not* a security boundary.
- **Repository layer + Server-Component props over a client fetch layer.** ~19 client screens read `AV.*` synchronously; rather than convert each to async hooks (React Query etc.), pages became async Server Components passing props, with a small server-seeded `WorkspaceDataProvider` context for pervasive `agentById`/`roomById` leaf lookups (avatars, floor map, breadcrumbs). Lower churn, no new data-fetching framework.
- **Layout split.** `(workspace)/layout.tsx` → async Server Component (directory fetch + RSC `getCurrentUser()` auth gate) wrapping a client `workspace-shell`. The Edge middleware only does a cheap cookie-existence check (no TCP to Postgres on the edge); the real gate is the RSC.
- **Seed hashes via Better Auth's own `auth.$context.password.hash`** — eliminated the scrypt-param drift risk the plan flagged (verified offline that hash+verify round-trips without a DB).
- **Places via REST `fetch` with explicit `X-Goog-FieldMask`** instead of `@googlemaps/places` — exact control over the 2-phase mask (Pro discovery → Enterprise enrich) is the cost-blowout guard; `websiteUri` must never enter the discovery mask.

## What the review caught (and we fixed)
The mandatory adversarial review found a real **Critical**: server actions (`createLead`/`setAutonomyMode`/`runDiscovery`) had no auth guard in DB mode — middleware only checks cookie *existence*, and the RSC guard runs on page renders, not action POSTs. So a forged session cookie could trigger paid Google calls. Fixed with `getCurrentUser()` guards. Also fixed a crash-prone non-null assert in `roomProjects`, non-deterministic DB ordering, an app-side daily discovery cap, and a `getAudit` fallback that showed the wrong company's data for discovery leads.

Lesson reinforced: **typecheck + build green ≠ correct.** The Critical was invisible to the compiler; only adversarial review surfaced it.

## Deferred (needs credentials — not runtime-executed this session)
Apply migration + seed (Supabase), real founder login, Places discovery (`GOOGLE_MAPS_API_KEY`), and `docker compose up` on a VPS. Inngest deliberately deferred to a later plan (Foundation + Discovery don't need durable workflows yet).

## Open questions
- Canonical sort order for demos/deals (currently by `id`).
- `runDiscovery` scope: any authenticated user vs founder-only (only the founder exists today).
