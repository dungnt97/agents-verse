# Development Roadmap

**What this file owns:** done-vs-pending per subsystem, and what each one needs before it can actually run.
**What it does not own:** architecture (`specs/`), env vars (`env-reference.md`), rules (`invariants.md`).
Counts are never stated here — the code is the count; `npm run test` is the gate.

---

## Status by subsystem

| Subsystem | State | Runs only when… |
|---|---|---|
| **Foundation** — Postgres, Drizzle schema, migrations, seed, repositories, Better Auth, dual-mode | Shipped | `USE_DB=true` + a migrated, seeded database. Without it the whole app falls back to the mock `AV` singleton. |
| **1 — Lead Discovery** (`lib/discovery/`) | Shipped | `DISCOVERY_PROVIDER=google` needs `GOOGLE_MAPS_API_KEY` (+ GCP billing); `apify` needs `APIFY_API_TOKEN` and no Google account at all. Real venue photos + reviews (`mapsData`) exist on the Apify path only. |
| **1b — Autonomous market hunt** (`auto-discovery` cron, `market-planner.ts`) | Shipped, **not reachable from the UI** — see open items | A discovery provider **and** `settings.market_plan` enabled **and** an autonomy mode of `guarded`/`full`. |
| **2 — Website Audit** (`lib/audit/`, `run-audit`) | Shipped | Perf: keyless by default — with no Google key the worker runs self-hosted Lighthouse in its own Chromium. Vision: **`GEMINI_API_KEY` is mandatory for any lead with a website** (`scoreScreenshots` throws without it and the run fails). The greenfield path (lead with no `http(s)://` url) needs **no external key at all**. |
| **3 — Demo Generation** (`lib/demo-gen/`, `run-demo-gen`) | Shipped | A `claude` CLI backend in the **worker**: `ANTHROPIC_BASE_URL` (the 9router gateway) or `CLAUDE_CODE_OAUTH_TOKEN`, plus an `AGENT_MODEL_<TIER>` per tier the pipeline requests. Requires an `audits` row for the lead. |
| **4 — Outreach** (`run-outreach`, `lib/integrations/`) | Shipped | The **active** channel's credentials (`OUTREACH_CHANNEL`): Resend, WhatsApp Cloud, the Telegram userbot, or personal WhatsApp. Degrades to `{ok:false}` when the key is absent; never throws. Unattended sending happens **only** in autonomy `full` — every other mode parks an approval gate. |
| **4b — Inbound** (`/api/inbound`, `/api/telegram`, `/api/whatsapp`) | Shipped | The matching webhook secret — the route is disabled without it. Resend and WhatsApp verify an HMAC signature over the raw body (`verifyResendSignature`, `verifyWhatsAppSignature`); Telegram compares the `x-telegram-bot-api-secret-token` header against `TELEGRAM_WEBHOOK_SECRET`. Nothing is parsed before that check. |
| **5 — Deals / Closer** (`handle-reply`, `deal-stage-machine.ts`) | Shipped, **unreachable for discovered leads** — see open items | The gateway (the Closer shells `claude`) and an existing `deals` row. |
| **5b — Proposals / PDF** (`lib/proposals/`, `send-proposal`) | Shipped | `RESEND_API_KEY` + `OUTREACH_FROM` to email it; the print view works without a key. |
| **6 — Delivery + Ledger** (`run-build` Cipher, `run-support` Mira, cost meter) | Shipped | Gateway for the build/onboarding drafts (Cipher degrades to deterministic metadata without one); Resend to send Mira's onboarding email. The Ledger is deterministic — no key. |
| **Pipeline orchestrator** (`orchestrate-pipeline`, `pipeline_runs`) | Shipped | `USE_DB=true` + a reachable Inngest. Routes audit → demo → outreach under the live autonomy gate, with per-run pause/resume as the founder's stop button. **There is no global kill-switch** — the levers are the autonomy mode and per-run pause. |
| **Assistant chat** (`/api/chat`) | Shipped | Gateway env on **web**. Without it, the widget falls back to built-in rule-based replies. |
| **Docker / self-host** (`web, db, redis, inngest, 9router, worker`) | Shipped | See `deployment-guide.md`. |

Everything above is green under `npm run typecheck`, `npm run test`, and `npm run build` with **no database and no keys** — that is the standard gate, and it must stay true.

---

## Open items (honest list — each verified against the code)

### Blocks a real end-to-end run

- **`settings.market_plan` has no writer.** No UI, no server action, no seed value writes it, and the default plan is disabled. Autonomous hunting can currently be turned on **only** by a manual `UPDATE settings SET market_plan = …::jsonb`. Until a writer exists, the cron is a no-op in practice. (Recipe + exact SQL: `specs/discovery.md`.)
- **No code path creates a `deals` row.** The table is written only by the demo-fixture seed (`SEED_DEMO_DATA=true`); every other site *updates* an existing deal. Consequently `ingestReply` returns "Deal not found", the inbound webhook finds no deal to attach the reply to, and `deal/won` never fires — so the whole reply → deal → delivery half of the funnel is **unreachable for a lead that discovery actually found**. Closing this needs a deal-creation step (most naturally on an outreach reply, or a founder action on the lead).

### Reliability holes

- **No sweeper for stranded runs.** A `pipeline_runs` row left in `running` (worker OOM, a step that dies before emitting its fact) is never reaped, and the active-lead partial-unique index then blocks that lead from **ever** starting a new run. The only cron in the system is `auto-discovery`.
- **The worker-safety test guards almost nothing.** `tests/discovery/run-discovery-core-worker-safety.test.ts` walks the runtime import closure of its `ENTRY_FILES` — only `run-discovery-core.ts`, `auto-discovery.ts` and `start-pipeline-run.ts`. Of everything registered in `worker-entrypoint.ts`, just `auto-discovery` sits inside that closure: a `server-only` or `@/`-alias regression in `run-audit`, `run-demo-gen`, `run-outreach`, `run-build`, `run-support`, `handle-reply`, `orchestrate-pipeline` or `send-proposal` stays invisible until the worker boots. Widening `ENTRY_FILES` is the cheapest durability win in the repo.
- **`sharp` is used but undeclared.** `lib/demo-gen/layout-audit.ts` dynamic-imports it inside a `try`/`catch`; it resolves only transitively, so a lockfile change can silently disable header-contrast detection with no error.
- **The performance-audit path skips the SSRF guard.** `assertSafeUrl` lives in `lib/audit/screenshot.ts` and protects the capture step only; `runPerformanceAudit` hands the lead-supplied URL straight to PageSpeed / local Lighthouse.

### Coverage gaps worth naming

- No test exercises the audit worker chain (`run-audit`, `greenfield-audit`, `screenshot`, `vision-scoring`, `pagespeed-client`) or the in-worker send step.
- `run-discovery-core` has no behavioral coverage — the caps, the eligibility gates, the auto-chain and the upsert are all untested; only the static worker-safety walker touches the file.
- The auth gate, middleware and `guardMutation` paths remain thin.
- `npm run coverage` exists but is **not** a CI gate.

---

## Deliberate non-goals

- **Demo archival** — `generated_demos` is keyed by `leadId` (one row per lead, overwritten on re-gen), so there is no demo-URL explosion to archive.
- **Per-agent mini-chat** — stays rule-based; only the global assistant bubble talks to the gateway.
- **Per-agent real-time spend** — the dashboard overlays an *estimated* daily cost from `lib/data/agent-rates.ts` for agents with a countable unit; the rest keep their seeded value. A real per-agent counter is not planned.
- **Hand-written changelog** — `git log` is the changelog.

---

## Open questions for the founder

- Where should a `deals` row be born — automatically on a positive reply, or as an explicit founder action on the lead?
- Should `settings.market_plan` get a settings-screen editor, or stay an operator-only SQL knob?
- Autonomy defaults, the cost cap, and the confidence floor ship as defaults in settings — are those the numbers the business commits to?

---

## Where to look next

`invariants.md` (the rules) · `env-reference.md` (every key) · `specs/architecture-map.md` (orientation) · `specs/` (one contract per subsystem) · `deployment-guide.md` (how to stand it up) · `product-vision.md` (why any of it exists).
