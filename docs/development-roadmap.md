# Development Roadmap — Agents Verse

**Last updated:** June 14, 2026

## Project Status Overview

Agents Verse is **feature-complete for Subsystems 1 and 2**. All 17 routes are live, Postgres is wired, auth is real, and the audit engine (PageSpeed + Playwright + Gemini via Inngest) is production-ready. The next developer session will pick up at **Subsystem 3 (demo generation)** or **Subsystem 4 (outreach/email)**, both key-gated and optional in scope.

---

## Build-Out Status by Subsystem

| Subsystem | Area | Status | Notes |
|-----------|------|--------|-------|
| **Phase 0** | Foundation (DB schema, seed, auth, dual-mode) | ✅ Done | Drizzle + Postgres 17 + Better Auth. Migrations in `drizzle/migrations/`, idempotent seed. Single direct DB connection (postgres-js client-side pool, no pooler). |
| **Subsystem 1** | Lead Discovery (Google Places API, email scraping) | ✅ Code-complete | 2-phase: Pro search + optional Enterprise enrichment. Cheerio-based email extraction. Requires `GOOGLE_MAPS_API_KEY` to execute. Daily cap configurable. |
| **Subsystem 2** | Website Audit (PageSpeed + Playwright + Gemini, durable Inngest) | ✅ Code-complete | 8-dimensional scoring (visual, mobile, cta, trust, seo, speed, content, conversion). Screenshot + vision analysis. Self-hosted Inngest worker + Redis. Requires `GEMINI_API_KEY`, `GOOGLE_PAGESPEED_API_KEY`, `INNGEST_*` keys. |
| **Docker & Deploy** | Self-hosted on single VPS (web + db + redis + inngest + worker) | ✅ Done | Compose file: entrypoint runs migrate → seed → start. Reverse proxy (Caddy/Nginx) for TLS. Backup script (`scripts/backup.sh`) provided but off-site upload is user's responsibility. |
| **Subsystem 3** | Demo Generation (template + Claude + Imagen → rendered site) | ⬜ Not built | Depends on: Claude API (design), Imagen/Nano Banana (images), and a render service (e.g., Remotion or Puppeteer). Placeholder URLs in DB. Estimated effort: 2–3 sprints. **Key-gated** (requires external compute budget). |
| **Subsystem 4** | Outreach & Email (Resend API, CAN-SPAM, approval gates) | ⬜ Not built | Depends on: Resend API key, templates, SMTP or event integration. Toast-only today. Estimated effort: 1–2 sprints. **Key-gated** (Resend subscription). |
| **Subsystem 5** | Deal Automation (stage machine + approval gate + escalation) | 🟡 Core done | Enforced deal stage machine (`lib/data/deal-stage-machine.ts`) + autonomy/value approval gate: `quoted→won` auto-closes below the founder threshold, else routes to founder review (creates a deal-linked escalation; ReviewCenter approve/reject resolves it + advances the deal). ReviewCenter + Command Center both show open escalations only and resolve deal escalations through the deal-aware actions (advancing the deal). Remaining: production-timeline mutability. |

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
- Vitest suite covers pure/logic critical paths (i18n en/vi key parity, `lib/data/format`, discovery dedup + place→lead mapping, audit scoring-rubric + result mapping, `USE_DB` flag) — 119 tests, run via `npm run test`. Plus a DB-mode repository integration suite (`npm run test:db`, 14 tests) asserting the `USE_DB=true` path returns the same entities as the mock `AV` against a real seeded Postgres. Next testing phase: server-action / auth-gate paths and the audit job state machine.
- CI (`.github/workflows/ci.yml`, Node 22 / npm 10): `verify` job runs typecheck → lint → test → build (no secrets, mock mode); `test-db` job spins up `postgres:17` + db:migrate → db:seed → test:db.
- Lint (`npm run lint`), typecheck (`npm run typecheck`), test (`npm run test`), and build all pass; dev server works in both modes.

### Documentation
- Audit subsystem details (PageSpeed fields, Gemini prompt, scoring rubric) are in `lib/audit/` module comments and `docs/system-architecture.md` § 9.10.
- Lead discovery details (Places API fields, dedup strategy, email scraping) are in `lib/discovery/` and `docs/system-architecture.md` § 9.9.
- Dual-mode patterns (repository layer, server actions, provider switches) are in `docs/code-standards.md` and `docs/CLAUDE.md`.

---

## Next Steps for Future Sessions

### If Subsystem 3 (Demo Generation) is Scoped In
1. **Design phase:** Finalize demo renderer approach (Claude design API + Imagen/Nano Banana for images + Remotion or Puppeteer for final render).
2. **Integrate:** Wire `lib/actions/run-demo-generation.ts` (server action, may need async Inngest job) to `/demos/[id]` "Generate" button.
3. **Hosting:** Decide on demo URL persistence (S3 / Vercel Blob / self-hosted `nginx-static`). Update the `demos.demoUrl` field.
4. **Test:** Generate a demo, verify URL is reachable and renders correctly.
5. **Cost control:** Track spend on Claude + Imagen in `metrics.cost`; expose in Settings as usage gauge.

### If Subsystem 4 (Outreach & Email) is Scoped In
1. **Setup:** Provision Resend API key (or compatible SMTP provider).
2. **Templates:** Seed email templates in DB (4 tone variants: Friendly, Premium, Direct, Local).
3. **Action:** Wire `lib/actions/send-outreach.ts` to `/demos/[id]` or `/deals/[id]` "Send outreach" button.
4. **Compliance:** Implement CAN-SPAM headers (From, ReplyTo, unsubscribe link).
5. **Approval gate:** Tie to autonomy mode and outreach guardrails in Settings.
6. **Test:** Send a test email; verify delivery and audit trail in `activity` log.

### If Subsystem 5 (Deal Automation) is Scoped In
1. **State machine:** Define deal stage transitions (`pricing → created → quoted → approval → call → won/lost`).
2. **Escalation:** Tie deal approval to founder review if value > threshold.
3. **Production timeline:** Make `deals.production.stages` a mutable workflow (not just display).
4. **Notifications:** Wire escalation alerts to review center + chat widget.
5. **Test:** Move a deal through its lifecycle; verify stage transitions and escalations.

### Long-term Improvements (Not Required for Initial Ship)
- **Automated tests:** Vitest foundation (119 pure/logic tests) + DB-mode repository integration (14 tests vs real Postgres) + CI gate. Remaining: server-action/auth-gate paths and the audit job state machine.
- **Chat widget:** Replace rule-based `setTimeout` with streaming Claude API integration.
- **Per-agent real-time spend tracking:** Wire actual usage meters (cost per agent per day) instead of UI-only config.
- **Demo cleanup:** Mark completed or old demos for archival; avoid demo URL explosion.
- **Backup strategy:** Implement off-site encrypted backup via `scripts/backup.sh` + rclone or S3 (user's responsibility; script has commented examples).

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
