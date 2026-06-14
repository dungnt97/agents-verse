# Journal — Subsystem 2: Website Audit (PageSpeed + Playwright + Gemini + Inngest)

**Date:** 2026-06-14 · **Scope:** the next roadmap item after Lead Discovery · **Outcome:** 9/9 phases code-complete, all static gates green; runtime needs keys + the worker stack.

## What shipped
The first subsystem where an agent actually *does work*: a real website audit replacing the derived `buildAuditFor`. A lead's homepage is scored on 8 dimensions from real signals — PageSpeed/Lighthouse (`speed/seo/mobile`) + Gemini vision over Playwright screenshots (`visual/cta/trust/content/conversion`) — run durably on self-hosted Inngest. Un-deferred Inngest (it was punted in the foundation plan) and added `redis` + `inngest` + a Playwright-based `worker` to the compose stack.

## Decisions that mattered
- **Worker/web split is the whole architecture.** Playwright (Chromium) + Gemini only exist in a separate `worker` container; `web` just `inngest.send()`s an event and stays slim. The worker registers the function via outbound `connect()`, so it needs no inbound port. Verified the web bundle never pulls playwright/gemini (dynamic `import('playwright')` + web never imports the function/engine).
- **tsx-safety constraint, learned the hard way earlier:** the worker runs under `tsx`, where `import 'server-only'` *throws* and the `@/` alias isn't resolved. So every worker-chain module uses relative value-imports and avoids `server-only`; DB writes happen inline in the function (not via the `server-only` repos). The web side keeps a `server-only` repo for reading job state.
- **`audit_jobs` table, not nullable columns on `audits`.** The user wanted job-state UI; making the `audits` result columns nullable would have destabilized the screen that reads full results. A dedicated lifecycle table (queued/running/done/failed) gives the same UX cleanly.
- **Verify versions live, don't trust the research.** The research reports named the *deprecated* `@google/generative-ai` and guessed Inngest server `v1.12.1`. Actual: `@google/genai@2.8.0` (new SDK, different API), Inngest server `v1.27.0`, Playwright base `v1.60.0-noble`. And Inngest v4's `createFunction` is 2-arg with the trigger inside the config and no `EventSchemas` class — only discovered by running typecheck against the installed package + fetching the v4 docs.

## What the review caught (and we fixed)
- **High:** `concurrency: { limit, key }` does NOT serialize per-lead — Inngest applies the limit *within* each keyed queue, so it allowed 2 concurrent runs for the same lead and no global cap, directly contradicting the OOM-guard comment. Fixed with the array form `[{limit: GLOBAL}, {limit: 1, key}]`. A subtle semantics bug the compiler couldn't see.
- **Medium:** removed a double `sql.end()` on shutdown; added an SSRF guard (`assertSafeUrl`) before Playwright navigates to the external lead URL.
- **Left open (user's call):** after a real audit the report's headline number + rail sort still use the lead's stored `site`/`score`; only the 8-dim breakdown updates. Updating a user-facing number is a decision, not a silent patch.

## Deferred (needs keys — not runtime-executed)
Real runs need `GEMINI_API_KEY` + `GOOGLE_PAGESPEED_API_KEY` and the `inngest`/`redis`/`worker` stack up. Verify-at-deploy: exact `inngest start` flags for v1.27.0, `connect()` on self-hosted, and the current Gemini model id (`GEMINI_MODEL` is env-overridable).
