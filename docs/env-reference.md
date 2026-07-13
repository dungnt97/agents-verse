# Environment Reference

Single owner of every environment variable. `.env.example` is its twin (the copy-paste manifest); this
file is the contract — reader, default, unset behavior, and **which file the value must live in**. No
other doc may define an env var; link here instead. Rules env mistakes break:
[invariants.md](./invariants.md). Compose topology: [specs/ops-runtime.md](./specs/ops-runtime.md).
Never commit a real value — `.env.local` and `./.env` are git-ignored.

---

## 1. The two env files (read this before touching compose)

| file | git | who reads it | what belongs in it |
|---|---|---|---|
| `.env.local` | ignored | Next.js (`npm run dev` / `build`) **and** the compose `env_file:` on **db, web, inngest, worker** | every normal secret/config the app code reads via `process.env.X` |
| `./.env` | ignored | **Docker Compose interpolation only** — the source for every `${VAR}` in `docker-compose.yml` | only the vars compose interpolates (list below). App code never reads this file. |

### The trap (proven, costs a whole afternoon)

Compose resolves a service's `environment:` block **after** `env_file:`, so `environment:` wins; and
`${VAR}` interpolation reads `./.env` **or the shell — never `.env.local`**. A var that is both
(a) named in an `environment:` block as `${VAR}` and (b) only present in `.env.local` therefore resolves
to the **empty string**, silently. Reproduce: put the key in `.env.local` only, then
`docker compose --env-file <a-file-without-it> config` → the `inngest` service shows `""`. That is a
keyless Inngest server that accepts nothing.

**These MUST live in `./.env`** (putting them in `.env.local` does nothing):

`JWT_SECRET` · `INITIAL_PASSWORD` · `INNGEST_DATABASE_URL` · `ANTHROPIC_BASE_URL` · `AGENT_MODEL_SONNET`

**These must live in BOTH files:** `INNGEST_EVENT_KEY` · `INNGEST_SIGNING_KEY`. `.env.local` is what
feeds the SDK inside `web` + `worker` (`lib/inngest/client.ts` reads `INNGEST_EVENT_KEY`; the SDK reads
the signing key implicitly); `./.env` is the only thing the `inngest` **server** container sees, because
its `environment:` block re-declares both as `${VAR:-}`. Same value in both. Drop either and half the
handshake breaks silently.

The last two ./.env-only vars have compose defaults (`http://9router:20128`, `cc/claude-sonnet-4-6`), so they *work* unset
— but `.env.local` **cannot override them**. To point the `claude` CLI at a direct subscription, set
`ANTHROPIC_BASE_URL=` (explicitly empty) in `./.env`. Two more consequences:

- **A missing `./.env` breaks every compose command**, even `up db`: `JWT_SECRET` / `INITIAL_PASSWORD`
  carry a `${VAR:?…}` guard, and interpolation runs before any service is selected.
- **Secret blast radius:** `env_file: .env.local` is attached to `db`, `web`, `inngest` and `worker` —
  so the `db` and `inngest` containers receive `GEMINI_API_KEY`, `ANTHROPIC_AUTH_TOKEN`,
  `APIFY_API_TOKEN`, `BETTER_AUTH_SECRET`… Least privilege was applied to `9router` only (it has **no**
  `env_file`; it gets exactly its two admin vars via interpolation). Copy that pattern for new services.

---

## 2. Core + data layer

| VAR | read by | default | when UNSET | file |
|---|---|---|---|---|
| `USE_DB` | `lib/repositories/config.ts` (`USE_DB`) | `false` | repositories return the mock `AV` singleton; app runs with no DB | `.env.local` — but compose hardcodes `"true"` on `web`+`worker`, so `.env.local` cannot flip Docker back to mock |
| `DATABASE_URL` | `lib/db/client.ts` (`connectionString`), `drizzle.config.ts`, `lib/db/seed.ts` (`main`), `scripts/docker-entrypoint.sh` | `''` | client constructs but never connects (lazy); `db:migrate`/`db:seed` throw; `tests/db/**` self-skip | `.env.local` |
| `BETTER_AUTH_SECRET` | `lib/auth/server.ts` (`auth`), `lib/db/seed.ts` (`main`) | none | Better Auth has no secret (sessions unusable); seed **throws** | `.env.local` |
| `BETTER_AUTH_URL` | `lib/auth/server.ts` (`auth`) | `http://localhost:3000` | localhost base URL; also the fallback origin for demo links (see `APP_URL`) | `.env.local` |
| `FOUNDER_EMAIL` | `lib/db/seed.ts` (`seedFounder`) | `founder@agentsverse.ai` | seeded founder uses the default address | `.env.local` |
| `FOUNDER_PASSWORD` | `lib/db/seed.ts` (`seedFounder`) | **none, deliberately** | seed **skips founder creation** and warns — you cannot log in. No literal fallback: the seed re-runs on every boot and `onConflictDoNothing` would make a default credential permanent. | `.env.local` |
| `SEED_DEMO_DATA` | `lib/db/seed.ts` (`main`) | `false` | org chart + founder only; no business fixtures | `.env.local` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | the `postgres` image on first boot; the `db` healthcheck and `scripts/backup.sh`'s `pg_dump` both expand them **inside** the `db` container, not on the host | none | first boot fails to initialize the cluster | `.env.local`. Must match the credentials embedded in `DATABASE_URL`. |

---

## 3. Inngest + worker concurrency

| VAR | read by | default | when UNSET | file |
|---|---|---|---|---|
| `INNGEST_DEV` | `lib/inngest/client.ts` (`inngest.isDev`) | `0` | production handshake (keys required) | `.env.local`. `docker-compose.override.yml` forces `1` on web+worker locally. |
| `INNGEST_BASE_URL` | `lib/inngest/client.ts` (`inngest.baseUrl`) | SDK default | events go nowhere useful in Docker | `.env.local`; compose sets `http://inngest:8288` on web+worker. **Port 8288, not 3000.** |
| `INNGEST_EVENT_KEY` | `lib/inngest/client.ts` (`inngest.eventKey`) + the `inngest` server container | none | `inngest start` rejects events | **BOTH** (`.env.local` for the SDK, `./.env` for the server) |
| `INNGEST_SIGNING_KEY` | the `inngest` server container; the SDK picks it up implicitly in the worker. **No `process.env` read in our code.** | none | worker `connect()` is rejected | **BOTH** (same reason) |
| `INNGEST_DATABASE_URL` | compose only → the container's `INNGEST_POSTGRES_URI` | none (empty ⇒ Inngest's own store) | Inngest state is not persisted in Postgres | **`./.env`**. May reuse `DATABASE_URL`. |
| `AUDIT_CONCURRENCY` | `lib/inngest/functions/run-audit.ts` (`runAudit` concurrency) | `2` | 2 parallel audits | `.env.local` |
| `CLAUDE_AGENT_CONCURRENCY` | `run-demo-gen`, `run-build`, `run-outreach`, `run-support`, `handle-reply` in `lib/inngest/functions/` | `2` | all five functions declare an identical account-scoped `claude-agent` key, so the value is one **shared** ceiling: 2 parallel `claude` CLI runs total across every claude function, not per function | `.env.local`. Raising it without raising the worker `mem_limit` OOM-kills the worker. |
| `PIPELINE_RUN_TIMEOUT_MIN` | `lib/inngest/functions/reap-stale-runs.ts` (`TIMEOUT_MIN`) | `120` | a `pipeline_runs` row stuck in `running` past 120 min is reaped to `failed`, freeing the lead | `.env.local` |
| `REAP_STALE_RUNS_CRON` | `lib/inngest/functions/reap-stale-runs.ts` (`CRON`) | `*/30 * * * *` | the stale-run sweep runs every 30 min. Prefix `TZ=` to localise. | `.env.local` |

`INNGEST_REDIS_URI` / `INNGEST_POSTGRES_URI` are container-internal names set by compose — never put them
in an env file.

---

## 4. Discovery

| VAR | read by | default | when UNSET | file |
|---|---|---|---|---|
| `DISCOVERY_PROVIDER` | `lib/discovery/places-client.ts` (`useApify`), `lib/discovery/run-discovery-core.ts` (`runDiscoveryCore`) | `apify` | Apify Google Maps Scraper — it returns the venue photos + reviews demo-gen grounds the site in. Only the literal `google` selects the official Google Places API (New), which returns **no** photos/reviews, so demos lose real venue imagery. | `.env.local` |
| `GOOGLE_MAPS_API_KEY` | `lib/discovery/places-client.ts` (`apiKey`) | none | `runDiscoveryCore` returns a "not configured" message (no throw) | `.env.local` |
| `APIFY_API_TOKEN` | `lib/discovery/places-apify.ts` (`token`) | none | same graceful message when `DISCOVERY_PROVIDER=apify` | `.env.local` |
| `APIFY_MAX_REVIEWS` | `lib/discovery/places-apify.ts` (`MAX_REVIEWS`) | **`10`** | 10 review texts scraped per place | `.env.local`. **An empty value means `0`**, not the default — `Number('')` is `0`. `0` ⇒ no real testimonials for demo-gen. |
| `APIFY_MAX_IMAGES` | `lib/discovery/places-apify.ts` (`MAX_PHOTOS`) | `10` | 10 venue photos per place | `.env.local`. Same empty-string trap: `0` ⇒ the demo gets **no real venue photos**. |
| `APIFY_REVIEWS_SORT` | `lib/discovery/places-apify.ts` (`REVIEWS_SORT`) | `mostRelevant` | Google's surfaced reviews | `.env.local`. Also `newest` / `highestRanking` / `lowestRanking`. |
| `DISCOVERY_DEFAULT_INDUSTRY` | `lib/discovery/run-discovery-core.ts` (`runDiscoveryCore`) | `dentists` | used only when neither the caller nor the market planner supplies one | `.env.local` |
| `DISCOVERY_DEFAULT_CITY` | same | `Austin TX` | same | `.env.local` |
| `DISCOVERY_DAILY_CAP` | `lib/discovery/run-discovery-core.ts` (`resolveDailyCap`) | see next cell | unset / `0` / negative / NaN ⇒ **`0` (no app-side cap) for manual runs, `30` for autonomous runs**. Only a positive integer overrides. | `.env.local` |
| `PIPELINE_DAILY_CAP` | same (`resolveDailyCap`) | see next cell | same shape: `0` manual, `10` autonomous | `.env.local` |
| `AUTO_DISCOVERY_CRON` | `lib/inngest/functions/auto-discovery.ts` (`CRON`) | `0 9 * * *` | 09:00 UTC. Prefix `TZ=` to localise. | `.env.local` |

---

## 5. Audit

| VAR | read by | default | when UNSET | file |
|---|---|---|---|---|
| `AUDIT_PROVIDER` | `lib/audit/perf-audit.ts` (`runPerformanceAudit`) | auto | auto-picks `pagespeed` when a Google key exists, else `lighthouse` (local Chromium, no Google needed) | `.env.local`. **Only the literal `lighthouse` selects the local engine** — every other value (including `auto`) routes to PageSpeed and throws without a Google key. |
| `GOOGLE_PAGESPEED_API_KEY` | `lib/audit/pagespeed-client.ts` (`apiKey`) | falls back to `GOOGLE_MAPS_API_KEY` | PageSpeed throws when neither is set | `.env.local` |
| `GEMINI_API_KEY` | `lib/audit/vision-scoring.ts` (`scoreScreenshots`) | none | vision scoring **throws** | `.env.local` |
| `GEMINI_MODEL` | `lib/audit/vision-scoring.ts` (`scoreScreenshots`) | `gemini-2.5-flash` | that model | `.env.local` |

---

## 6. Agents + the LLM gateway

The `claude` CLI runs in the **worker** and inherits the worker's whole `process.env`
(`lib/agents/runner.ts`, `runClaude`) — that is how `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` reach it
without our code passing them.

| VAR | read by | default | when UNSET | file |
|---|---|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | the `claude` CLI; guarded in `lib/agents/pipelines/demo.ts` (`generateDemoHtml`) | none | demo-gen **throws** unless `ANTHROPIC_BASE_URL` is set instead. One of the two is required. | `.env.local`. A worker rebuild drops anything not in the env file. |
| `ANTHROPIC_BASE_URL` | the `claude` CLI; `lib/integrations/assistant.ts` (`assistantConfigured`, `base`) | compose: `http://9router:20128` | host-run: no gateway ⇒ direct subscription path; assistant chat degrades to rule-based replies | **`./.env`** (compose interpolates it; `.env.local` cannot override) |
| `ANTHROPIC_AUTH_TOKEN` | the `claude` CLI; `lib/integrations/assistant.ts` | none | gateway rejects the call; `assistantConfigured()` is false | `.env.local` |
| `AGENT_MODEL_SONNET` | `lib/agents/runner.ts` (`resolveModel`, dynamic) + `lib/integrations/assistant.ts` (explicit) | compose: `cc/claude-sonnet-4-6` | host-run: the literal string `"sonnet"` is sent as the model id | **`./.env`** |
| `AGENT_MODEL_OPUS` | `lib/agents/runner.ts` (`resolveModel`) — **dynamic, grep-invisible** | none, **and no compose default** | the literal string `"opus"` goes to the gateway ⇒ every demo pass fails after the CLI retries × the Inngest retries, surfacing only as `claude exited 1` | `.env.local` |
| `JWT_SECRET` | the `9router` container (compose `${JWT_SECRET:?}`) | none | **every `docker compose` command hard-fails** | **`./.env`** |
| `INITIAL_PASSWORD` | the `9router` container (compose `${INITIAL_PASSWORD:?}`) | none | same hard failure | **`./.env`** |

### Grep-invisible: `AGENT_MODEL_<TIER>`

`lib/agents/runner.ts` (`resolveModel`) reads `` process.env[`AGENT_MODEL_${model.toUpperCase()}`] ``.
A `process.env.X` grep will never find these. Any future model tier is auto-wired by that one line —
add the matching `AGENT_MODEL_<TIER>` here and to `.env.example` when you add a tier. Unset ⇒ the tier
name itself (`opus`, `sonnet`) is passed to `--model`.

---

## 7. Outreach + inbound

`OUTREACH_CHANNEL` picks the medium; every channel degrades (never throws) when its credentials are
missing — `lib/integrations/outreach-channel.ts` (`outreachChannel`, `outreachChannelConfigured`).
All of these live in `.env.local`.

| VAR | read by | default | when UNSET |
|---|---|---|---|
| `OUTREACH_CHANNEL` | `lib/integrations/outreach-channel.ts` (`outreachChannel`) | `email` | email. An unrecognized value also falls back to `email`. |
| `RESEND_API_KEY` | `lib/integrations/resend.ts` (`resendConfigured`, `sendEmail`), `lib/actions/send-outreach.ts`, `lib/actions/email-proposal.ts` | none | nothing is sent; the pipeline still runs to demo | 
| `OUTREACH_FROM` | same | none | required **together with** the key — either missing ⇒ not configured |
| `OUTREACH_REPLY_TO` | `lib/integrations/resend.ts` (`sendEmail`); `run-outreach.ts` (`unsubscribeFor`) | `OUTREACH_FROM` | reply-to and the unsubscribe mailbox default to the From address |
| `APP_URL` | `lib/inngest/functions/run-outreach.ts` + `run-build.ts` (`appUrl`) | `BETTER_AUTH_URL`, then `''` | with neither set the origin is empty and `run-outreach`'s `loadSendable` **refuses to send** rather than mail a relative `/demo/<id>` dead link — so one of `APP_URL` / `BETTER_AUTH_URL` is **required for outreach to actually send** |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` | `lib/integrations/whatsapp.ts` (`whatsappConfigured`) | none | the `whatsapp` channel reports unconfigured |
| `WHATSAPP_TEMPLATE_NAME` | `lib/integrations/outreach-channel.ts`; `run-outreach.ts` (`whatsappPreview`) | `agentsverse_demo` on send; the preview prints `(WHATSAPP_TEMPLATE_NAME unset)` | a cold WhatsApp first touch **must** be an approved template |
| `WHATSAPP_TEMPLATE_LANG` | `lib/integrations/outreach-channel.ts` | `en` | English template |
| `WHATSAPP_VERIFY_TOKEN` | `app/api/whatsapp/route.ts` (`GET`) | none | Meta's webhook handshake returns **403** |
| `WHATSAPP_APP_SECRET` | `app/api/whatsapp/route.ts` (`POST`) | none | inbound WhatsApp route returns **404** (disabled) |
| `TELEGRAM_BOT_TOKEN` | `lib/integrations/telegram.ts` (`telegramConfigured`) | none | ops notifications no-op. **Not** an outreach channel (a bot cannot cold-message a stranger). |
| `TELEGRAM_CHAT_ID` | `lib/integrations/telegram.ts` (`notifyTelegram`) | none | notifications no-op even with a token |
| `TELEGRAM_WEBHOOK_SECRET` | `app/api/telegram/route.ts` (`POST`) | none | inbound Telegram route returns **404** (disabled) |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` / `TELEGRAM_USER_SESSION` | `lib/integrations/telegram-user.ts` (`telegramUserConfigured`); the session is produced by `scripts/telegram-user-login.ts` | none | the `telegram-user` channel reports unconfigured |
| `WHATSAPP_PERSONAL_AUTH_DIR` | `lib/integrations/whatsapp-personal.ts` (`whatsappPersonalConfigured`); `scripts/whatsapp-personal-login.ts` | none (login script: `./.wa-personal`) | the `whatsapp-personal` channel reports unconfigured. Configured means the dir exists **and** contains `creds.json`. |
| `RESEND_INBOUND_SECRET` | `app/api/inbound/route.ts` (`POST`) | none | inbound email route returns **503** (disabled); replies stay founder-paste |
| `INBOUND_PER_LEAD_MAX` | `lib/integrations/inbound-rate-limit.ts` (`perLead`); enforced by **both** webhooks (`app/api/inbound`, `app/api/whatsapp`) | `5` | at most 5 inbound replies **per lead** per 10-min window reach the Closer / STOP path; over-cap the webhook returns **200** with no emit (a 200, not 5xx, so the provider does not retry). In-memory, single VPS (resets on restart). Because the read is `Number(x) \|\| 5`, an empty value or `0` also yields 5 — the cap can't be disabled. |
| `INBOUND_GLOBAL_MAX` | `lib/integrations/inbound-rate-limit.ts` (`globalCap`); same two webhooks | `60` | same, but the account-wide ceiling across all leads per 10-min window; empty/`0` ⇒ 60 (`Number(x) \|\| 60`). |

**Nothing blocks a real send locally.** `docker-compose.override.yml` only flips Inngest to dev mode; a
live `RESEND_API_KEY` + `OUTREACH_FROM` in `.env.local` will mail real leads from your laptop.

---

## 8. Tests, CI, and ops scripts

Not in `.env.example` today. Nothing in the app reads these.

| VAR | read by | default |
|---|---|---|
| `E2E_BASE_URL` | `playwright.config.ts` | `http://localhost:3000` |
| `E2E_EMAIL` / `E2E_PASSWORD` | `tests/e2e/auth.setup.ts` | the seeded founder's address / a literal demo password. The e2e run needs a **running app + a real seeded founder**. |
| `CI` | `playwright.config.ts` | unset locally; set by GitHub Actions ⇒ `forbidOnly` + 1 retry |
| `BACKUP_DIR` | `scripts/backup.sh` | `./backups` |
| `RETENTION_DAYS` | `scripts/backup.sh` | `14` |
| `BACKUP_GPG_PASSPHRASE` | `scripts/backup.sh` | none ⇒ the dump is written **unencrypted** (it contains lead PII + the founder password hash) |
| `RCLONE_REMOTE` | `scripts/backup.sh` | none ⇒ local-only backup, i.e. no real off-site protection |

CI (`.github/workflows/ci.yml`) supplies its own `DATABASE_URL`, `USE_DB`, `SEED_DEMO_DATA` and a
throwaway `BETTER_AUTH_SECRET` for the DB job. `npm run typecheck` / `lint` / `test` / `build` need
**no** env at all.

---

## 9. Dead vars — do not add, do not document

- **`REDIS_URL`** — older docs listed it as required. **No code reads it.** Inngest gets Redis via the
  container's `INNGEST_REDIS_URI`, which compose hardcodes.
- **`DISCOVERY_ENABLE_ENTERPRISE_ENRICHMENT`** — invented by an old architecture doc; exists nowhere in
  the repo. Enrichment is capped by a constant (`ENRICH_TOP_N` in `lib/discovery/run-discovery-core.ts`).

---

## 10. `.env.example` is a doc surface — keep it in sync

State on this branch: `AUDIT_PROVIDER` ships **commented out** (so the keyless auto-pick stands),
`APIFY_MAX_REVIEWS` / `APIFY_MAX_IMAGES` / `APIFY_REVIEWS_SORT` match the code defaults, and the `./.env`
block already carries the §1 trap. Its one gap: it omits every var in §8 (tests / CI / ops scripts) —
deliberate, none of them is app config.

**When you add an env var:** read it with an explicit default + graceful degrade → add it to
`.env.example` with a one-line comment → add a row here → decide the file (`./.env` if any compose
`environment:` interpolates it) → confirm the container that needs it actually has `env_file: .env.local`
(`9router` does **not**) → rebuild that service.
