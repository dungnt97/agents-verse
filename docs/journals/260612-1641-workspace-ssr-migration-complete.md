# Set 2: Workspace Migration to Next.js Complete

**Date**: 2026-06-12 16:41
**Severity**: Medium (successful completion, lessons for future)
**Component**: Buildless Agents Verse → Next.js 16 App integration
**Status**: Resolved

## What Happened

Migrated authenticated workspace layer (Set 2) into existing Next.js 16 app after successful marketing layer (Set 1). Extended data tables (data2-4), WorkspaceStateProvider with request/lead tracking, app-shell (Sidebar/TopBar/⌘K/ReviewCenter/autonomy toggles), and 14 workspace screens as cookie-backed SSR routes. Total: 17 routes, all 200 status, tsc/lint/build green.

## The Brutal Truth

This migration felt efficient on paper—parallel subagents, write-only mode, zero concurrency. But the join was ugly. Discovered 3 actual regressions and 4 false-alarm lint findings at final adversarial review, which means we almost shipped hydration mismatches and type misalignments. The parallel speed won us nothing if centralized review catches what should have been caught upfront. The lesson hits because it repeats Set 1's pattern: speed paralysis masquerades as efficiency when character-level fidelity fails.

## Technical Details

**Parallel porting structure:**
- Phase 2 (shell): sequential, foundational
- Phases 3–6 (screens): 4 subagents writing simultaneously (overview+command, rooms+agents, pipeline+business, system)
- Strategy: write-only to avoid .next/.tsbuildinfo corruption; tsc/lint/build consolidated after all return

**Failures found at join:**
1. Command-center used curly quotes ("smart") in JS string delimiters → parse failure (`` `"text"` `` instead of `` `"text"` ``)
2. Four pipeline pages had `onAction` prop signatures mismatching useToast's narrow `ToastKind` enum (expected string union; legacy was any)
3. Agent-detail reused room's TimelineItem with required `agent` field—history data missing that field entirely

**Adversarial review findings:**
- 2 settings screens rendered apostrophes as `&apos;` (HTML entity) where legacy stored curly (U+2019)
- Overview greeting used `new Date()` at render → SSR hydration mismatch (client builds different time than server)
- Cleared 4 false-alarm lint warnings (onAgent/onAction/goLead) as vestigial in legacy—review proved lint was wrong, not code

## What We Tried

1. **Parallel write + central verify:** Fast. Caught structural errors. Did NOT catch character/type fidelity or hydration bugs until review.
2. **Cross-cutting type contracts checked at join:** Worked for useToast; missed for TimelineItem shape and apostrophe encoding.
3. **Lint-first gate:** Failed silently; lint output conflicted with legacy reality. Needed adversarial read of actual source.

## Root Cause Analysis

**Char-fidelity is a recurring subagent failure mode:** Set 1 had curly→straight; Set 2 had straight→curly (delimiters!) AND entity-encoded apostrophes. Subagents drift on punctuation encoding without explicit schema audit. This is a 2-set pattern now.

**Parallelism without shared verification breed false confidence:** Subagents return "done" without touching the integration surface (cross-module types, SSR hydration). Centralizing verify() reveals the gaps. We need types validated at the join, not after.

**Lint as ground truth is dangerous:** Lint warned on undefined props that legacy actually used. Adversarial review of *source*, not lint, catches the real contract.

## Lessons Learned

- **Standing character-fidelity gate:** All ports now require byte-level comparison of punctuation encoding (apostrophes, quotes, entities). Subagents must match legacy encoding exactly. Add this to port checklists.
- **Adversarial review is non-negotiable:** Not style review. Real adversarial read of both source and lint output to catch contradictions. Lint is input, not law. This review caught 3 real bugs + cleared 4 false alarms + found Set 1 miss.
- **Write-only parallel + central verify is valid shape** IF: (a) every cross-cutting type is verified at the join (useToast signature, shared shapes), (b) SSR hydration is explicitly checked (no dynamic dates at render), (c) adversarial pass follows before merge. Speed without rigor is waste.

## Next Steps

1. **Before deleting legacy:** Visual review of remaining buildless files to confirm all UI covered in Next.js (pending user sign-off)
2. **Add port validation checklist:** Character encoding audit, cross-type contracts at join, SSR hydration scan
3. **Update Set 1:** Adversarial review found 2 apostrophes Set 1 missed (settings modal "We'll", We already→We're)—backport fix

Both migration sets complete. All routes green. Lessons extracted for next parallel porting effort.

---

**File**: /Users/dungngo97/Documents/agent-company/docs/journals/260612-1641-workspace-ssr-migration-complete.md
