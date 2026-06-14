# Journal — Key-free completion: workspace state machine on Postgres

**Date:** 2026-06-14 · **Scope:** make every real workspace interaction persist to DB (no external keys) · **Outcome:** done + runtime-verified (migrations apply on seeded data, app boots; actions typecheck/build/lint green).

## What shipped
The demo-first screens had ~58 `onAction` toast stubs; the meaningful ones (stage/status/resolution transitions) only updated localStorage or fired a toast. Wired the real ones to Postgres via server actions so the product is fully functional on the DB **without any key** (the LLM/email/Places features remain key-gated and deferred):

- New auth-guarded actions (`guardMutation()` = USE_DB degrade + getCurrentUser): `updateLeadStage`, `updateDealStage`, `updateDemoStatus`, `updateRequestStatus`, `convertRequestToLead`, `resolveEscalation`, `updateGuardrails`/`updatePricing`.
- Provider `moveLead`/`setRequestStatus`/`convertRequest` (optimistic + action, dual-mode like addLead).
- Screens wired: lead kanban (drag + next-action), requests (triage + convert), deals/demos drawers, command-center escalations, settings save.
- Schema: `escalations.status`/`resolved_at` (migration 0002), `leads.company` UNIQUE (0003).
- M3: a real audit now updates `lead.site` (avg of the 8 dims) + `score`, so the headline + pipeline sort reflect the audit.

## What the review caught (and we fixed)
- **Critical — duplicate lead on convert.** `convert()` fired *both* `convertRequest` (→ `convertRequestToLead`) **and** the leftover `onConvertLead`→`addLead` (→ `createLead`). Two inserts, dedup-by-SELECT racing in the same tick, no unique on `company` → two rows. Fix: convert calls only `convertRequest`; added `UNIQUE(company)` so the `onConflictDoNothing` inserts truly can't duplicate. Lesson: when layering a new path onto an existing handler, delete the old write — don't stack them.
- **High — demo-mode regression.** The four directly-wired screens called actions unconditionally; with `USE_DB=false` `guardMutation` returns "needs DB", so the no-DB demo showed a warning instead of the prior cosmetic success (and deals/demos became no-ops). Fix: exposed `useDb` on the WorkspaceState context; those screens now fall back to a cosmetic toast in demo mode. The dual-mode invariant (app works with no DB) is the thing that keeps biting — every new mutation path has to honor it.

## Verified
`typecheck` + `lint` + `build` green. Brought the local `db`+`web` stack up on the existing seeded volume: migrations 0002/0003 applied cleanly (escalation status backfilled to `open`, company-unique constraint added, 8 leads intact), app healthy. No external key needed for any of this.

## Deferred (still key-gated)
Subsystems 3 (demo generation), 4 (outreach/email), 5 (deal reply-interpreter/CRM automation) — their cores need Anthropic/Imagen/Resend/LLM keys, so they stay roadmap. Their non-key shells would be non-functional stubs (YAGNI), so not built.
