# Deployment Guide — Self-hosted on a single VPS

**A runbook, not a reference.** It restates nothing that another doc owns:

- Every env var (what reads it, its default, **which file it must live in**) → [`env-reference.md`](./env-reference.md).
- Compose topology, worker-only runtimes, boot order, CI, verification gates → [`specs/ops-runtime.md`](./specs/ops-runtime.md).
- The rules you must not break → [`invariants.md`](./invariants.md).

The Compose services are `web`, `worker`, `db`, `redis`, `inngest`, `9router`. Only `web` is published to the host.

```
   Internet ──TLS──▶ reverse proxy ──▶ web :3000 ──┬─→ db      (internal :5432)
                                                   ├─→ inngest (internal :8288)
                                                   └─→ 9router (internal :20128)
   worker (no inbound port; outbound connect())  ──┴─→ same three
   inngest ──→ redis (internal :6379) + db
   9router dashboard: 127.0.0.1:20129 → container :20128 (localhost only)
```

`worker` is the only container with Playwright/Chromium, Lighthouse, Gemini and the `claude` CLI, and the only one
that registers Inngest functions (`lib/inngest/worker-entrypoint.ts` — `run-audit`, `run-demo-gen`,
`orchestrate-pipeline`, `handle-reply`, `run-outreach`, `run-build`, `run-support`, `send-proposal`,
`auto-discovery`). `web` only calls `inngest.send()`. **There is no `app/api/inngest` route.**

## 1. Prerequisites

- A VPS (Ubuntu 22.04+). `worker` alone is capped at **4 GB** (`mem_limit: 4g`), so a 4 GB box cannot host it plus
  `db`/`web`/`inngest`/`redis`/`9router`. Size for **≥ 8 GB RAM / 4 vCPU**, or lower `mem_limit` and set
  `CLAUDE_AGENT_CONCURRENCY=1` / `AUDIT_CONCURRENCY=1`.
- Docker Engine + Compose v2.
- A domain pointed at the VPS + a reverse proxy for TLS (§5).
- Firewall: allow only `22`, `80`, `443`. **Never** open `5432`, and never add `ports:` to `db`.

## 2. The two env files (read `env-reference.md` first)

```bash
git clone <your-repo> /opt/agents-verse && cd /opt/agents-verse
cp .env.example .env.local && chmod 600 .env.local
touch .env && chmod 600 .env
```

- **`.env.local`** — app secrets, loaded via `env_file:` into `db`, `web`, `inngest`, `worker`.
- **`./.env`** — compose's *interpolation* file. `${VAR}` in `docker-compose.yml` reads **this file or the shell,
  never `.env.local`**, and a compose `environment:` entry always beats `env_file:`. These must live here or they
  are silently empty: `JWT_SECRET`, `INITIAL_PASSWORD`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`,
  `INNGEST_DATABASE_URL` — plus `ANTHROPIC_BASE_URL` / `AGENT_MODEL_SONNET` if you want to override the compose
  defaults.

`JWT_SECRET` and `INITIAL_PASSWORD` are guarded with `:?` — **without `./.env`, every compose command fails**, even
`docker compose up db`.

Generate values: `openssl rand -base64 32` (passwords), `openssl rand -hex 32` (auth secret, JWT), `openssl rand
-hex 16` (Inngest keys). `DATABASE_URL` must match `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` exactly, host `db`.

## 3. One-time: connect the `9router` LLM gateway

The worker shells the `claude` CLI against a Claude **subscription**, not a metered API key. `9router` holds and
auto-refreshes that provider auth in its own volume, so a worker rebuild never drops a raw OAuth token.

```bash
docker compose up -d 9router
# dashboard is localhost-only — tunnel in:  ssh -L 20129:127.0.0.1:20129 user@vps
```

1. Open `http://localhost:20129`, log in with `INITIAL_PASSWORD`.
2. **Providers → Connect Claude Code** (OAuth → your subscription; the opus tier).
3. Optional fallback: **Providers → Connect Kiro AI** → AWS Builder ID (free Claude provider).
4. **Create an API key** → `.env.local` as `ANTHROPIC_AUTH_TOKEN`. Set `AGENT_MODEL_OPUS` to a model id from
   `GET /v1/models` (`cc/…` = subscription, `kr/…` = Kiro free; a **combo** id gives automatic
   subscription→free fallback).

`AGENT_MODEL_OPUS` has **no compose default**: `resolveModel` in `lib/agents/runner.ts` then passes the bare tier
name `opus` to `--model`, which a 9router gateway does not resolve — so every opus-tier `claude` call fails.
Alternative to 9router: set `CLAUDE_CODE_OAUTH_TOKEN` and set `ANTHROPIC_BASE_URL=` (explicitly empty) **in
`./.env`** — blanking it in `.env.local` has no effect.

## 4. Deploy

```bash
ls docker-compose.override.yml      # MUST NOT EXIST on the VPS
docker compose up -d --build
```

> **`docker-compose.override.yml` is auto-merged by every `docker compose` command run in the repo directory.** It
> forces keyless `inngest dev` and `INNGEST_DEV=1`. It is gitignored, so a fresh `git clone` will not have it — but
> an `rsync`/`scp` of your dev tree will. Delete it, or deploy with `docker compose -f docker-compose.yml …`.

Boot order:

1. `db` + `redis` start. `inngest` (v1.27.0) starts via `["inngest","start"]`, configured **entirely by env vars**
   (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_POSTGRES_URI`, `INNGEST_REDIS_URI`) — there are no CLI
   flags to get right.
2. `web` waits for the `db` healthcheck, then `scripts/docker-entrypoint.sh` runs: `SELECT 1` retry loop →
   `npm run db:migrate` (**fail-fast**) → `npm run db:seed` (**non-fatal**) → `next start -p 3000`.
3. `worker` connects outbound to `inngest` and registers every function in `lib/inngest/worker-entrypoint.ts`.

First boot is slow (initdb + migrate + seed/scrypt); the `web` healthcheck `start_period` is 120s.

```bash
docker compose ps                  # all services should become healthy
docker compose logs -f web
docker compose logs -f worker      # expect "connected to Inngest; … functions registered"
docker compose logs inngest
```

## 5. Reverse proxy + TLS (Caddy)

```
your-domain.com {
    reverse_proxy 127.0.0.1:3000
}
```
Caddy auto-provisions Let's Encrypt. If the proxy runs on the host, bind the app to localhost: change the `web`
port mapping to `"127.0.0.1:3000:3000"`.

## 6. Smoke test

- `https://your-domain.com` → marketing site renders; `/login` → sign in with `FOUNDER_EMAIL` / `FOUNDER_PASSWORD`.
  If login fails, the seed skipped the founder — set `FOUNDER_PASSWORD` and restart `web`.
- `/leads` → "Run discovery" works once the provider named by `DISCOVERY_PROVIDER` is keyed.
- `/audits?lead=<leadId>` → run a real audit. The list screens deep-link by `?lead=`; **there is no `/audits/[id]`
  route** — it 404s. Watch `docker compose logs -f worker`; the score breakdown (speed/seo/mobile from the
  performance pass + visual/cta/trust/content/conversion from vision) appears when the job finishes.

## 7. Estimated monthly cost

Self-generated secrets are free. Everything below is an **estimate — re-verify before committing budget** (Google
Maps is SKU-based; the universal $200/month Maps credit was removed in 2025). Assumes ~1,000 leads + ~500 audits/mo.

| Item | ~USD/month | Notes |
|---|---|---|
| VPS (whole stack) | $40–80 | 8 GB tier; `worker` alone may take 4 GB |
| Google Places (`DISCOVERY_PROVIDER=google`) | $0–40 | search bills at the cheap Pro SKU; only the enriched top-N hits Enterprise (~$7/1k). **Never add an Enterprise field to `DISCOVERY_FIELD_MASK`** |
| Apify (`DISCOVERY_PROVIDER=apify`) | ~$1.5–3 / 1k results | pay-as-you-go, plus per-place cost for `APIFY_MAX_REVIEWS` + `APIFY_MAX_IMAGES` (both default 10). **Apify spend is not capped by any Google Cloud Console** — cap it in the Apify console |
| Gemini (audit vision) | ~$1 | ~$0.002/audit. Mandatory for any lead with a website — the audit **fails** without `GEMINI_API_KEY` |
| Performance audit | $0 | PageSpeed is free; `AUDIT_PROVIDER=lighthouse` runs it in the worker with no Google account at all |
| Claude (demo-gen, outreach, build, support) | subscription only | the worker shells the `claude` CLI through 9router — no metered API spend |
| Resend (outreach + inbound) | $0–20 | free tier 3,000 emails/month |

Cap Google spend in the Cloud Console; cap app-side volume with `DISCOVERY_DAILY_CAP` / `PIPELINE_DAILY_CAP`.

## 8. Backups (your responsibility)

A self-hosted DB has no backups until you make them, and a backup on the same VPS is not a backup.
`scripts/backup.sh` dumps `db` with `pg_dump -Fc` and rotates locally; when `BACKUP_GPG_PASSPHRASE` +
`RCLONE_REMOTE` are set it also encrypts (AES256) and uploads off-site. **Set both** — the dump contains the founder
password hash and lead PII.

```bash
# nightly (crontab -e)
0 3 * * *  cd /opt/agents-verse && BACKUP_GPG_PASSPHRASE=… RCLONE_REMOTE=r2:av-backups ./scripts/backup.sh >> /var/log/av-backup.log 2>&1

# restore
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < backups/agentsverse-YYYYMMDD-HHMMSS.dump
```

Test-restore into a throwaway DB quarterly.

## 9. Security checklist

- [ ] `db` has no `ports:`; the firewall blocks `5432`.
- [ ] `docker-compose.override.yml` is absent on the VPS.
- [ ] `.env.local` **and** `./.env` are `chmod 600`, owned by the deploy user, never committed.
- [ ] TLS terminates at the proxy; `BETTER_AUTH_URL` uses `https://`.
- [ ] The 9router dashboard stays bound to `127.0.0.1`.
- [ ] Backups are encrypted and stored off the VPS.

## 10. Update & rollback

```bash
git pull && docker compose up -d --build                       # migrate + seed re-run, idempotent
git checkout <previous-tag> && docker compose up -d --build    # rollback; data stays in the volumes
```

Data lives in the named volumes `pgdata`, `redisdata`, `ninerouter_data`. **`docker compose down` keeps them;
`docker compose down -v` DELETES them** — wiping the database *and* the 9router provider auth. Never `-v` in production.

## 11. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Any compose command errors `required variable JWT_SECRET is missing` | `./.env` is missing (§2). |
| `web` loops "waiting for Postgres" then exits | `DATABASE_URL` doesn't match `POSTGRES_*`, or `db` is unhealthy (`docker compose logs db`). |
| Migration error on boot | Boot is fail-fast by design. Fix `drizzle/migrations/`, redeploy. |
| Founder can't log in | Seed skipped the founder because `FOUNDER_PASSWORD` was unset. Set it, restart `web`. |
| Events never reach the worker | Inngest keys are empty because they went in `.env.local` instead of `./.env` (§2), or `INNGEST_BASE_URL` is wrong — it is **`http://inngest:8288`**. |
| Worker registers nothing | `docker compose logs worker` for the connect() error. `web` cannot register functions; only `worker` can. |
| Audit stuck "running", or fails instantly | `GEMINI_API_KEY` missing (vision throws → `audit_jobs.error`), or the worker crashed. `docker compose logs worker`. |
| Demo-gen fails with `claude exited 1` | `AGENT_MODEL_OPUS` unset, or the 9router provider auth expired (§3). The gateway also returns transient 503s, which the runner retries. |
| `worker` OOM-killed | Lower `AUDIT_CONCURRENCY` (Chromium) **and** `CLAUDE_AGENT_CONCURRENCY` (the `claude` CLI holding critique screenshots) — they peak together. Raising either needs more than the 4g `mem_limit`. |
| `npm ci` fails in the image build | `package-lock.json` must stay committed. |

## 12. Local development

**Mock mode (default, zero credentials):** `npm run dev` — `USE_DB` unset ⇒ the whole app runs on the mock singleton.

**DB mode on the host:** set `DATABASE_URL` (host `localhost`) + `USE_DB=true` in `.env.local`, then
`npm run db:migrate && npm run db:seed && npm run dev`.

**Running the durable functions locally:** you **need the worker process**. Inngest functions are registered only in
`lib/inngest/worker-entrypoint.ts` and there is no `app/api/inngest` serve route, so `npx inngest dev` on its own
runs nothing. Either:

- `docker compose up -d` — the gitignored `docker-compose.override.yml` gives you keyless `inngest dev`; or
- run `npx inngest dev` and `npx tsx lib/inngest/worker-entrypoint.ts` side by side with `INNGEST_DEV=1`. This needs
  the worker's native deps on your host (Playwright browsers, the `claude` CLI on `PATH`).

`USE_DB` is hardcoded `"true"` in the compose `web`/`worker` `environment:` — `.env.local` cannot flip Docker back
to mock mode.
