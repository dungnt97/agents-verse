# Repository Structure Cleanup — Legacy Prototype Removal

**Date**: 2026-06-14 20:55
**Severity**: Low (refactor, zero functional impact)
**Component**: Repository root structure; documentation sync
**Status**: Resolved

## What Happened

Swept the Agents Verse repo to remove orphaned buildless CDN-React prototype (`index.html`, 24 root `.jsx` files, legacy data files, dev artifacts) left over from pre-Next.js work. Result: single-app structure, conventional layout, zero code regression. Went single-file-cleanup, not monorepo (rejected as over-engineering for one Next.js app + one worker sharing `lib/`).

## The Brutal Truth

Root was cluttered with dead code that confused the story ("is this a buildless prototype or a Next.js app?"). Initially the ask was vague ("toward monorepo") but the real pain point was visual clutter + doc rot. Cleanup felt trivial, but the parallel subagent coordination for doc sync + comment scrub was surprisingly fiddly — strict one-file-per-agent ownership forced us to think hard about what was live vs legacy *before* delegating. That friction was actually good; it caught that we had comments scattered across 33 files still pointing to deleted prototypes.

## Technical Details

**Phase 1 — Deleted orphaned prototype:**
- Removed 24 root `.jsx` files: `app.jsx`, `app-shell.jsx`, `i18n.jsx`, `agents.jsx`, `deals.jsx`, `demos.jsx`, `rooms.jsx`, `landing.jsx`, `pages.jsx`, etc.
- Removed `data.js`, `data2.js`, `data3.js`, `data4.js`, `index.html`, `styles.css`, `.thumbnail`.
- Verified zero live imports (two `'../data'` imports in live code resolve to `lib/data/` the *real* mock directory, not the deleted root `data.js`).

**Phase 2 — Purged dev artifacts:**
- Deleted `uploads/` (9 pasted PNGs) and `screens/` (2 PNGs).
- Added `/uploads/`, `/screens/`, `.thumbnail` to `.gitignore`.

**Phase 3 — Styles migration (App Router convention):**
- Moved `styles/globals.css` → `app/globals.css` via git rename (history preserved, git shows R100).
- Updated import in `app/layout.tsx`.
- Fixed stale webfont comment.

**Phase 4 — Documentation sync:**
- Removed ~270 lines of legacy section from `docs/system-architecture.md`.
- Removed ~285 lines of legacy section from `docs/code-standards.md`.
- Updated `README.md`, `CLAUDE.md`, `docs/codebase-summary.md`, `docs/project-overview-pdr.md`.
- Added changelog entry with date.
- Fixed `next.config.mjs` comment.
- Intentionally left `docs/journals/*` untouched (point-in-time history).

**Phase 5 — Comment scrub (44 comments across 33 live files):**
- Reworded provenance comments like `"Ports auth.jsx: LoginScreen"` → `"LoginScreen component."`.
- Preserved functional descriptions, dropped deleted-file references.
- Kept curly/typographic characters exactly as-is (critical lesson from prior port work).

**Verification:**
- `npm run typecheck` → exit 0.
- `npm run lint` → exit 0.
- `npm run build` → exit 0 (all routes compiled in mock mode, no DB/keys).
- Code review: PASS 10/10, zero real regression risk.

**Change set:** 43 files modified, 40 deleted, 1 renamed.

## What We Tried

1. **Orphan verification (grep)** → confirmed `data.js` deletions were safe (no live references).
2. **Parallel subagent doc/comment coordination** → split large doc rewrites across agents (one file per owner, no collision).
3. **git mv for styles/globals.css** → preserved rename history.
4. **Full build + typecheck** → verified zero syntax/type breakage.

## Root Cause Analysis

Initial confusion: user said "monorepo" but the pain point was *repository visual clutter*, not scalability. A true workspace monorepo (multiple root package.json dirs) was over-engineering for one Next.js app + one worker that already share `lib/`. The real fix was delete dead code + sync docs + clean up comments. Once we clarified scope with the user, execution was straightforward.

The tricky part wasn't the deletion — it was discovering 44 scattered "Ports X.jsx" comments across 33 files that would become noise after cleanup. Required careful grep + ownership tracking to reword without creating doc debt.

## Lessons Learned

- **Reject over-engineering in the name of clean structure.** Monorepo solves problems we don't have (multiple independent apps). Single-app cleanup does solve actual problem (clutter). YAGNI wins.
- **Parallel subagent work needs strict ownership boundaries.** When splitting doc rewrites, define one file per agent *before* dispatch. Avoids merge conflicts and forces clarity upfront about what's legacy.
- **Comment debt accumulates silently.** 44 comments pointing to deleted files isn't caught by linters; only grep + human review catches it. Worth including in cleanup scope once identified.
- **Preserve git history with git rm/mv.** Makes blame/bisect cleaner downstream.

## Next Steps

- **Merge to main** (already approved by user; awaiting final verification).
- **Post-cleanup:** docs/journals/ now has clear separation (legacy references removed, new work documented in new entries).
- **Zero blocking issues:** workspace feature work proceeds unaffected.

