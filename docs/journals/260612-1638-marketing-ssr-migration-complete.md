# Marketing Surface Migration to Next.js 16 — Complete

**Date**: 2026-06-12 16:38
**Severity**: Medium (dependency/architecture choice, not a bug)
**Component**: Marketing surface (landing + 9 info routes + auth chrome)
**Status**: Resolved

## What Happened

Migrated the marketing surface of Agents Verse (a buildless CDN-React prototype) from `.jsx` into a **Next.js 16.2.9 + React 19.2.7 + TypeScript** foundation. UI fidelity held at 100%. Brainstorm → plan (5 phases) → implementation produced ~30 new TS modules (`pages/`, `components/`, `utils/`). Legacy `.jsx` left intact alongside to avoid breaking workspace screens (Set 2).

Routes: `/` (landing) + `/[slug]` (9 info pages) + `/login` + shared chrome (ChatWidget, DemoRequestModal, ToastHost, theme/i18n/auth context).

## The Brutal Truth

This was a non-trivial port where subagents made silent **character-level regressions** that would have shipped as undetectable text corruption if not caught. Two distinct review passes (adversarial + parity audit) were the only reason we didn't break the UI. That's exhausting — we shouldn't have to character-count source vs compiled output to catch porting fidelity. But we did, and it worked.

## Technical Details

**Subagent fidelity drift:**
- Converted 16 typographic apostrophes (U+2019) → ASCII `'`
- Converted 2 curly double-quotes (U+201C/D) → straight `"`
- Converted 4 in-chat quote chars to ASCII variants
- Silent string-quote delimiter swaps in unrelated code (cosmetic but wrong)

These appear as identical on screen in most browsers but break character-level parity and signal lazy porting.

**Adversarial review findings (3 real bugs):**
1. **Critical:** Footer `onNav('landing')` routed to 404 — original never used 'landing', only 'home' (dead code path now exposed).
2. **High:** Phantom success toast fired on landing mount (not in original).
3. **High:** Footer Case Studies card acquired `card-elev` class dropped elsewhere via duplicate-className collision (silent style loss).

All verified against source before fix.

## What We Tried

1. **Subagent port** → built + linted green but UX text corrupted.
2. **Character-level audit** (grep source vs compiled) → caught apostrophe/quote delimiters.
3. **Adversarial code review** + **render smoke test** + **dictionary key parity** (420/420 matched) → caught routing/toast/style bugs.
4. **Middleware gate test** (curl auth skeleton) → confirmed auth plumbing ready.

## Root Cause Analysis

Two layers of failure:

1. **Subagent prompt fidelity:** port request said "UI 100%" but didn't specify "character-exact" — agent assumed cosmetic normalization was acceptable. It wasn't. Lesson: specify character fidelity explicitly for UI-text work.

2. **Trust-but-verify gap:** initial subagent output labeled "build passes = good" when really build+lint only covers syntax, not character-level parity or subtle routing/state bugs. Caught because we ran 4 independent verification passes (char audit, adversarial review, smoke, parity). Without all 4, at least one bug shipped.

## Lessons Learned

- **Character-level parity audits are not optional for typography-heavy porting.** Typographic apostrophes are UI data; normalize them and you've changed the product. Grep source vs compiled output before final review.
- **"Build passes" is a floor, not a ceiling.** tsc + lint = syntax valid. Doesn't catch routing dead-ends, phantom toasts, or cascading style loss. Need independent adversarial review + smoke test + dict parity.
- **Subagent fidelity prompt:** explicitly state "preserve every whitespace, quote, apostrophe, casing" for sensitive work. "UI 100%" alone is too vague.
- **Cookie-SSR trade-off was right call:** using server-side cookie read in root layout to prevent FOUC on theme/lang. Confirmed with user. Locks deployment to Node/edge (not static export), but worth it for UX.

## Next Steps

- **Set 2 (workspace screens):** 14 new TS modules, same porting rigor (char audit + adversarial review + smoke before ship).
- **Handoff doc written** with porting checklist for Set 2.
- **Middleware auth skeleton ready** for integration with backend (Phase-05 work).
- **Dictionary sync:** all 420 i18n keys locked; add new keys post-Set-2 in bulk.

**Blocking nothing.** Set 2 can start immediately.
