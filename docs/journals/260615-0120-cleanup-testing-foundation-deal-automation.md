# Cleanup, Testing Foundation, Deal Automation — 8 PRs, 1 Real War Story

**Date**: 2026-06-15 01:20
**Severity**: High (foundational)
**Component**: Repo structure, CI/CD, Vitest, Subsystem 5 (deal automation), DB integration
**Status**: Resolved

## What Happened

In a single session, executed 8 merged PRs to main that eliminated legacy debt, built the test foundation from zero (119 pure + 44 DB tests), hardened CI, and shipped Subsystem 5 (deal automation with founder escalation + approval gates). The work cascaded: legacy cleanup unblocked docs sync, test foundation enabled validation of DB migrations, and the CI toolchain *caught a real production bug* before it hit Docker.

## The Brutal Truth

This session was exhausting and exhilarating in equal measure. The frustration landed early: the user asked for "monorepo restructuring," and instinct screamed "build something elaborate." Instead, we spent 30 minutes in brutal-honest brainstorm and realized the actual pain was simpler — a cluttered repo root with 30 orphaned legacy files that served nobody. That reframing saved us from months of "monorepo" refactoring complexity that would have yielded zero product value. The relief of saying "no" loudly enough to avoid that trap was real.

The CI lockfile saga was the gut punch. We merged tests + CI, and the GitHub Actions workflow immediately failed with a cryptic `Missing @esbuild/* from lock file`. The root cause: my dev laptop runs **npm 11 / Node 26**, which generated a lockfile that **npm 10 / Node 20 (CI's image)** refused. But here's the actual scare — the same lockfile would have **silently broken the Docker production build** (`npm ci` in the Dockerfile with `node:22`). We would have discovered this *in production* if CI hadn't caught it. That realization sent a chill: we dodged a deployment disaster by accident, not design. It galvanized the rule: CI toolchain MUST match deployment image exactly, and you MUST validate the first CI run before merging.

The deal automation feature was deeply satisfying — one clean stage machine module (`lib/data/deal-stage-machine.ts`) became the single source of truth for legal transitions, gating logic, and approval workflows. But then a test agent caught a seed data bug that would have shipped silently: the guardrails setting had a name mismatch (`dealAutoApproveLimit` vs `autoApproveLimit`) that was masked because the seeded value equalled the fallback. That's the kind of bug that costs customer trust, and it lived in plain sight until a test with a *non-default fixture* surfaced it.

## Technical Details

**Legacy removal (PR#4):**
- Deleted 24 `*.jsx` files, 6 `data*.js`, `index.html`, `styles.css`, orphaned `uploads/`/`screens/` dirs
- Renamed `styles/globals.css` → `app/globals.css` (git rename tracked correctly)
- Grep-verified no imports from deleted files before deletion
- Scrubbed 44 provenance comments (`// ported from X.jsx`) across 33 files — audited each to confirm the comment added no value
- Docs: removed ~550 lines of legacy sections referencing the prototype

**Test foundation (PR#5-#7, PR#10):**
- Vitest config (`.config.ts`): shared mocks for `next/cache`, `@/lib/auth/session`, `@/lib/db/client`
- 119 pure tests: i18n parity (EN/VI key sync), `fmt/*` helpers, `discovery/*` scoring, `workspace-data-provider` context, audit scoring
- 44 DB tests: separate project (`npm run test:db`), auto-skip without `DATABASE_URL`, CI runs with `postgres:17` service container
- Key DB test patterns: snapshot/restore rows, mock server action guards via `getCurrentUser()→founder`, validate migrations idempotence
- Total coverage: core logic paths, edge cases (empty datasets, threshold boundaries), error scenarios (duplicate keys, FK violations)

**CI toolchain (PR#8, PR#9):**
- GHA workflow: `test` (lint + typecheck + unit tests) + `test-db` (migrations + seed + integration tests)
- **The lockfile bug:** npm 11 generated lockfile incompatible with npm 10; `npm ci` on CI failed. Fix: regenerated lockfile with `npx npm@10`, bumped CI Node 22 (matching Dockerfile), pinned `package.json` `engines.node>=22`
- Validation: ran `npm ci` locally with `node:22` Docker image to confirm before final push
- Lesson: never assume dev laptop npm matches production; always validate `npm ci` install path against the exact deployment image

**Deal automation (Subsystem 5, PR#11):**
- `lib/data/deal-stage-machine.ts`: pure module, legal transitions (stage → stages), the founder approval gate
- Gate logic: `quoted→won` auto-approves if deal value ≤ `guardrails.dealAutoApproveLimit`, else escalates to founder
- Migration: added `escalations.dealId` FK, indexed
- Server action: multi-write in `db.transaction()` (deal stage + optional escalation)
- ReviewCenter/Command Center: founder can approve (stage→won) or reject (stage→lost)
- **The seed bug:** guardrails setting read from `guardrails.dealAutoApproveLimit` in server actions, but seed + settings UI used `autoApproveLimit`. The seeded value (4000) equalled the fallback, so the bug was silent. Regression test added: sets threshold to 2500, validates gate enforcement. Lesson: test fixtures MUST differ from defaults or they mask configuration reads.

## What We Tried

1. **"Monorepo" reframe**: User's opening request → sketched elaborate multi-package structure → stopped and asked "what's the actual pain?" Answer: legacy clutter. Ditched the proposal, focused the real problem.
2. **CI lockfile debugging (first attempt):** Assumed it was a missing dependency → tried `npm install` → didn't help. Second attempt: listed lockfile contents vs CI environment → saw npm version mismatch → regenerated lockfile with correct npm version → success.
3. **DB test isolation:** First idea: Vitest with real database mutations per test. Problem: tests stepping on each other's data. Solution: snapshot/restore row state before/after each test + transaction rollback on teardown.
4. **Deal gate naming bug:** Discovered via test with `autoApproveLimit=2500` in fixture. First thought: typo in one place. Audited all usages: both names existed in different parts of codebase. Applied single source of truth: renamed all to `dealAutoApproveLimit`, updated seed + UI.

## Root Cause Analysis

**Monorepo request** → User proposed a solution without saying the problem. This is common and dangerous. We spent time in clarification instead of jumping to architecture. Cost: 30 minutes of conversation. Value: avoided 2–3 weeks of misdirected refactoring.

**Lockfile incompatibility** → Assumed dev environment would match CI and production. It didn't. The real root cause: no explicit alignment rule between `package.json` `engines`, CI Node version, and Dockerfile Node version. Each was set independently, so drift was inevitable. The fix surfaces a design gap: production deployment spec MUST be the source of truth, and everything else (dev, CI) must pin to it.

**Seed data mismatch** → Two different config keys in two different layers (seed, UI settings) for the same logical concept. This happens when code grows incrementally and naming isn't centralized. The test caught it only because the fixture used a non-default value. Lesson: **test defaults hide bugs; test boundaries and anomalies**.

**Scope creep resistance** → Subsystems 3 (demo generation), 4 (outreach/email), and spend tracking all depend on key-gated producers that don't exist yet. Temptation: build the scaffolding now. Reality: YAGNI. We documented the dependency, flagged it for the roadmap, and moved on. Discipline.

## Lessons Learned

1. **Clarify before architecting.** "Monorepo" was the user's proposed solution. The problem was legacy clutter. Asking "what's the actual pain?" saved weeks. Always fish for the real goal before drafting blueprints.

2. **CI must match production exactly.** The lockfile bug would have silently broken the Docker build. Establish a rule: production Dockerfile is the source of truth for Node/npm versions. Everything else (local dev, CI image) pins to it. Validate `npm ci` against the production image before merging CI changes.

3. **Tests with default fixtures hide bugs.** A test that uses the same values as the code's fallback can't distinguish "config read" from "fallback behavior." Always test with values that differ from defaults. The `autoApproveLimit` mismatch lived silently because the seed value equalled the threshold.

4. **One source of truth for logical concepts.** `dealAutoApproveLimit` should live in one place (config key name) and be referenced everywhere. Aliasing kills clarity. Enforce this in code review: if two parts of the codebase call the same thing by different names, unify immediately.

5. **Scope discipline is a muscle.** Saying no to spend tracking and demo cleanup because their dependencies don't exist yet *is work*. It's harder than saying yes and building scaffolding. But it prevents buildout of dead infrastructure. Document the dependency, surface it in the roadmap, and ship the stuff that delivers value *now*.

6. **Parallel subagents with strict ownership eliminates merge conflicts.** The 8 PRs cascaded with zero conflicts because each agent owned distinct files (legacy removal, comment scrub, test setup, DB migration, CI workflow, deal feature). Large coordinated sessions need this discipline.

## Next Steps

1. **Subsystems 3 & 4 depend on key-gated producers** (real agent runs, Subsystem-3 demo generation). Document this clearly in the roadmap. Don't scaffold the consumers until the producers exist.

2. **Spend tracking & demo cleanup are PREMATURE.** They would read from key-gated data that doesn't exist yet. Park them on the roadmap. Revisit after Subsystem 3.

3. **CI validation on first merge.** Added a checklist: when CI is new or modified, WAIT for the first full run on main, validate that it catches what you expect, validate that it passes with your expected state. Never assume CI is correct until it's proven.

4. **Lockfile regeneration process.** Document in deployment guide: if you touch `package.json`, regenerate lockfile with the production npm version (`npx npm@{production-version}`), validate `npm ci` locally against the production Docker image.

5. **Test fixtures checklist.** New test = ask "does this fixture differ from the code's fallback/default?" If not, add a boundary case. This rule prevents the `autoApproveLimit` class of bugs.

**Status: All 8 PRs merged. Repo clean. Tests green. CI working. Subsystems 1, 2, 5 + foundation + auth + Docker shipped. Ready for key-gated work (Subsystem 3/4) or deployment validation.**
