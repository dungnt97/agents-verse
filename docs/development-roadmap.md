# Development Roadmap — Agents Verse

**Last updated:** June 24, 2026

## Project Status Overview

Agents Verse now runs the **full autonomous agency funnel**: discover → audit → demo → outreach → reply → deal → delivery, with a central pipeline orchestrator, human-in-the-loop gates, and a cost ledger. All six phases of the `agent-company-flow` plan have landed (the runtime/registry, the orchestrator + `pipeline_runs` ledger, approval gates + kill-switch, the Closer sales-brain, Echo outreach + Resend, and Phase 6 delivery — Cipher build-prep, Mira onboarding, the Resend inbound webhook, and the Ledger cost meter). Email send/receive is **key-gated** on Resend; everything else runs on the existing Claude CLI/gateway token. `typecheck`, `lint`, `test`, and `build` are green with no DB or keys.

---

## Build-Out Status by Subsystem

| Subsystem | Area | Status | Notes |
|-----------|------|--------|-------|
| **Phase 0** | Foundation (DB schema, seed, auth, dual-mode) | ✅ Done | Drizzle + Postgres 17 + Better Auth. Migrations in `drizzle/migrations/`, idempotent seed. Single direct DB connection (postgres-js client-side pool, no pooler). |
| **Subsystem 1** | Lead Discovery (Google Places API, email scraping) | ✅ Code-complete | 2-phase: Pro search + optional Enterprise enrichment. Cheerio-based email extraction. Requires `GOOGLE_MAPS_API_KEY` to execute. Daily cap configurable. |
| **Subsystem 2** | Website Audit (PageSpeed + Playwright + Gemini, durable Inngest) | ✅ Code-complete | 8-dimensional scoring (visual, mobile, cta, trust, seo, speed, content, conversion). Screenshot + vision analysis. Self-hosted Inngest worker + Redis. Requires `GEMINI_API_KEY`, `GOOGLE_PAGESPEED_API_KEY`, `INNGEST_*` keys. |
| **Docker & Deploy** | Self-hosted on single VPS (web + db + redis + inngest + worker) | ✅ Done | Compose file: entrypoint runs migrate → seed → start. Reverse proxy (Caddy/Nginx) for TLS. Backup script (`scripts/backup.sh`) provided but off-site upload is user's responsibility. |
| **Subsystem 3** | Demo Generation (multi-pass Claude pipeline → rendered redesign page) | ✅ Code-complete | The audit worker shells the **Claude Code CLI** (runs on the user's subscription via `CLAUDE_CODE_OAUTH_TOKEN` — no metered API key). 5-pass pipeline per industry DNA: creative-director spec → build → niche-aware **expert review board** (UI/UX designer, conversion copywriter, domain expert, art director) reads desktop+mobile screenshots → synthesise fixes → revise. Output stored in `generated_demos`, served standalone at `/demo/[leadId]`; the audit screen's "Generate demo" / "View demo" buttons drive it. Requires `claude setup-token` + the worker image (it bundles the CLI + Playwright). |
| **Subsystem 4** | Outreach & Email (Echo, Resend API, CAN-SPAM, approval gates) | ✅ Code-complete (key-gated) | `lib/agents/defs/echo-outreach.ts` drafts a VN demo-offer email; `run-outreach.ts` sends via `lib/integrations/resend.ts` with CAN-SPAM (real From/Reply-To, one-click List-Unsubscribe). Gated by autonomy (`full` sends, else founder approves an `outreach` escalation). Degrades `{ok:false}` without `RESEND_API_KEY`. |
| **Subsystem 5** | Deal Automation (stage machine + Closer brain + approval gate) | ✅ Done | Enforced deal stage machine (`lib/data/deal-stage-machine.ts`) + autonomy/value gate. The **Closer** (`lib/agents/defs/closer-sales.ts` + `handle-reply.ts`) interprets a client reply (zod-validated `recommendedStage`, `DEAL_CONF_FLOOR` never bypassed) and auto-advances or escalates. ReviewCenter + Command Center show open escalations only. Production timeline is interactive. |
| **Pipeline orchestrator** | Central `pipeline_runs` ledger + `decideNextHop` + gates + kill-switch | ✅ Done | One durable orchestrator routes audit→demo→outreach under the live autonomy gate; idempotent conditional stage writes; per-run pause + global kill-switch (live autonomy re-read per hop); founder approve/reject = resume/halt. Discovery auto-starts a run per fresh lead (guarded/full, capped by `PIPELINE_DAILY_CAP`). |
| **Subsystem 6** | Delivery + inbound + finance (Cipher, Mira, inbound webhook, Ledger) | ✅ Code-complete (inbound key-gated) | On `deal/won`: **Cipher** (`run-build.ts`) optimizes the demo into a delivery build (SEO/OG/JSON-LD/sitemap in `builds`; degrades to deterministic metadata without a key) and **Mira** (`run-support.ts`) drafts the onboarding/asset-request email (gated like Echo). **Resend inbound webhook** (`app/api/inbound/route.ts`, Svix-verified, `RESEND_INBOUND_SECRET`) feeds client replies to the Closer. **Ledger** estimates daily AI spend from `pipeline_runs` and raises a `cost` escalation near the cap. |

---

## What's Ready to Ship (Right Now)

- Landing page + 9 info pages (marketing).
- Login gate (founder auth via Better Auth, demo cookie fallback).
- Workspace shell (sidebar, top bar, command palette, review center).
- All 14 workspace screens: overview, command, rooms, agents, leads, audits, demos, deals, settings, activity, requests.
- Real lead discovery (Google Places API) — executed by "Run discovery" button on `/leads`.
- Real website audits (PageSpeed + Playwright + Gemini) — queued via `/audits/[id]` "Run real audit" button; job state tracked in `audit_jobs` table.
- Mutable state machine: lead stage, demo approval, deal status, autonomy mode, settings — all persist to Postgres via server actions.
- Docker Compose deployment with zero-downtime migrations (idempotent) and seeded founder account.

**Demo mode (zero credentials):** Drop `npm run dev`, land on `/` with mock data in localStorage. Routes, screens, and all UI fully functional. Perfect for showcase or testing.

**Production mode (requires keys):** `USE_DB=true` + `.env.local` + `docker compose up` → full-stack SaaS on a VPS with real Postgres, real auth, durable jobs.

---

## Known Limitations & Open Items

### Must-Fix Before Production Run
- **Playwright base image:** Confirm `mcr.microsoft.com/playwright:v1.60.0-noble` does **not** pin `NODE_ENV=production` (would skip `tsx` and break the worker).
- **Inngest self-hosted flags:** Verify exact `inngest start` command-line flags and that `worker.connect()` is supported for pinned Inngest version (v1.27.0).
- **Gemini model:** Default `gemini-2.5-flash` is overridable via `GEMINI_MODEL` env var; confirm current vision model at deploy time.
- **PageSpeed key fallback:** `GOOGLE_PAGESPEED_API_KEY` is optional; falls back to `GOOGLE_MAPS_API_KEY` if unset. Verify this in tests if both are needed.

### Design / UX
- **Audit headline numbers:** After a real audit, the report header (`site`, `score`, delta) still reflects the lead's **stored** values; only the 8-dim breakdown updates. Updating the lead's headline score from the audit result is a **deliberate open decision** (touches user-facing number, risky).
- **Lead conversion:** `convertToLead()` in demo mode mutates localStorage; in DB mode, it creates a real `leads` row from a `demoRequests` row. Verify both paths in staging.
- **Escalation gates:** Exact thresholds (deal value, cost budget, confidence floor for auto-approval) are in `settings.ts` as defaults; confirm these match business logic with product/growth.

### Testing & Coverage
- Vitest suite (`npm run test`, **150 tests**) covers pure/logic critical paths (i18n parity, `format`, discovery dedup + mapping, audit scoring/result mapping, deal stage-machine + approval gate, `USE_DB` flag). Plus a DB-mode integration suite (`npm run test:db`, **44 tests / 4 files**): repository dual-mode, deal automation, mutation server actions (leads/requests/settings/demos), production actions, and audit-job reads — all against a real seeded Postgres. Next: the audit worker chain (Playwright/Gemini — key-gated) + auth-gate/middleware path tests.
- CI (`.github/workflows/ci.yml`, Node 22 / npm 10): `verify` job runs typecheck → lint → test → build (no secrets, mock mode); `test-db` job spins up `postgres:17` + db:migrate → db:seed → test:db.
- Lint (`npm run lint`), typecheck (`npm run typecheck`), test (`npm run test`), and build all pass; dev server works in both modes.

### Documentation
- Audit subsystem details (PageSpeed fields, Gemini prompt, scoring rubric) are in `lib/audit/` module comments and `docs/system-architecture.md` § 9.10.
- Lead discovery details (Places API fields, dedup strategy, email scraping) are in `lib/discovery/` and `docs/system-architecture.md` § 9.9.
- Dual-mode patterns (repository layer, server actions, provider switches) are in `docs/code-standards.md` and `docs/CLAUDE.md`.

---

## Remaining / Deferred

The agency funnel is feature-complete. What's left is operational config, deliberate deferrals, and polish.

### Operational (config, not code)
- **Resend keys** to actually send/receive email: `RESEND_API_KEY` + `OUTREACH_FROM` (outbound), `RESEND_INBOUND_SECRET` (inbound webhook). Without them, outreach/Mira degrade and `/api/inbound` returns 503 (replies stay founder-paste).
- **`PIPELINE_DAILY_CAP`** bounds how many runs discovery auto-starts per day (Claude-CLI burst guard).
- **Off-site backup**: `scripts/backup.sh` now does env-driven encrypt (`BACKUP_GPG_PASSPHRASE`) + upload (`RCLONE_REMOTE`); the founder supplies the passphrase + an `rclone config` remote.

### Deferred (deliberate, with reasons)
- **Orion LLM re-rank** — NOT built. The agent runtime shells the `claude` CLI in the worker only; discovery runs as a synchronous server action. A real LLM re-rank would require promoting all of `lib/discovery/*` into the worker chain (dropping their `server-only` guards) for marginal value on thin pre-enrichment data. Orion remains a deterministic Places pass and is live on the dashboard overlay. Revisit if a stronger pre-enrichment signal exists.
- **Demo archival** — NOT needed. `generated_demos` is keyed by `leadId` (one row per lead, overwritten on re-gen), so the "demo URL explosion" concern can't occur; no archival mechanism required.
- **Chat widget streaming Claude** — kept rule-based by founder decision (faithful port; live AI on a public page adds cost/abuse surface + a key).

### Polish (open)
- **Per-agent real-time spend**: the dashboard now overlays an ESTIMATED per-agent daily cost (`lib/data/agent-rates.ts`) for agents with a countable unit (orion/vega/kira/atlas/nova/iris/echo); closer/mira/ledger keep seeded cost (no clean per-agent counter yet).
- **Tests still open**: the audit worker chain (Playwright/Gemini, key-gated) and the in-worker Resend send step. Auth-gate/middleware/guard remain thin.

---

## Related Documentation

- **Deployment:** `docs/deployment-guide.md` — full VPS setup, Docker Compose, Caddy/Nginx, backup strategy.
- **System Architecture:** `docs/system-architecture.md` — detailed Sections 9.9 (Lead Discovery) and 9.10 (Audit).
- **Code Standards:** `docs/code-standards.md` — dual-mode patterns, server actions, repositories.
- **CLAUDE.md:** Root project file — quick reference for architecture, conventions, and where things live.

---

## Unresolved Questions

- **Business logic:** Exact autonomy mode defaults, cost budget thresholds, confidence minimums for escalation — verify with product/growth.
- **Demo URLs:** Should demo sites be stateless previews (ephemeral, no database) or persistent (stored in S3/blob, durable)? Affects Subsystem 3 design.
- **Outreach volume:** Expected daily/weekly outreach volume? Impacts rate limiting and Resend plan tier.
- **Backup retention:** How many backups to retain on-disk? How often to test-restore? Document in `scripts/backup.sh`.
