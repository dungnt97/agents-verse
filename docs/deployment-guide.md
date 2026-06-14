# Deployment Guide — Self-hosted on a single VPS

Agents Verse runs as **five Docker Compose services on one VPS**: `web` (Next.js app), `db` (PostgreSQL 17), `redis` (event store), `inngest` (job orchestrator), and `worker` (audit engine). Postgres, Redis, and Inngest are **not** exposed to the internet — only `web` reaches them over the internal compose network. The `worker` runs Playwright + Gemini vision analysis, keeping those heavy dependencies out of the main app container.

```
            Internet ──TLS──▶ reverse proxy ──:3000──▶ web ──┐
                                                              ├─→ db (internal, :5432)
                                                              ├─→ redis (internal, :6379)
                                                              └─→ inngest (internal, :3000)
                                                    worker (no external ingress) ──┐
                                                                                   ├─→ db
                                                                                   ├─→ redis
                                                                                   └─→ inngest
```

---

## 1. Prerequisites

- A VPS (Ubuntu 22.04+ recommended). Sane floor: **2 vCPU / 4 GB RAM** (web + Postgres share the box).
- **Docker Engine + Compose v2** installed.
- A domain pointed at the VPS, and a reverse proxy for TLS (Caddy example below).
- Firewall: allow only `22`, `80`, `443`. **Never** open `5432`.

---

## 2. Configure secrets (`.env.local`)

```bash
git clone <your-repo> /opt/agents-verse && cd /opt/agents-verse
cp .env.example .env.local
chmod 600 .env.local            # secrets — keep it locked down
```

Fill `.env.local`. The Postgres credentials and the `DATABASE_URL` **must match exactly**:

```dotenv
# Postgres (read by the `db` service on first boot)
POSTGRES_USER=agentsverse
POSTGRES_PASSWORD=<openssl rand -base64 32>
POSTGRES_DB=agentsverse

# Single direct connection — app + migrations + seed. Host is the compose service name `db`.
DATABASE_URL=postgresql://agentsverse:<same-password>@db:5432/agentsverse

USE_DB=true                     # read Postgres (not the mock)

# Better Auth
BETTER_AUTH_SECRET=<openssl rand -hex 32>
BETTER_AUTH_URL=https://your-domain.com

# Founder login (seeded once)
FOUNDER_EMAIL=founder@agentsverse.ai
FOUNDER_PASSWORD=<a strong password>

# Lead discovery (optional)
GOOGLE_MAPS_API_KEY=<key>
DISCOVERY_DEFAULT_INDUSTRY=dentists
DISCOVERY_DEFAULT_CITY=Austin TX
DISCOVERY_DAILY_CAP=450

# Real website audits (optional — requires Inngest + worker)
GEMINI_API_KEY=<key>                           # Google Gemini API key for vision analysis
GEMINI_MODEL=gemini-2.5-flash                  # Override Gemini model (optional)
GOOGLE_PAGESPEED_API_KEY=<key>                 # PageSpeed Insights API (optional; falls back to GOOGLE_MAPS_API_KEY)
INNGEST_EVENT_KEY=<key>                        # Inngest authentication (web ↔ server)
INNGEST_SIGNING_KEY=<key>                      # Inngest job signing (server ↔ worker)
INNGEST_BASE_URL=http://inngest:3000           # Inngest server URL (docker-compose internal)
INNGEST_DEV=0                                  # 0 = production (self-hosted); 1 = local dev
REDIS_URL=redis://redis:6379                   # Redis URL (docker-compose internal)
AUDIT_CONCURRENCY=2                            # Global concurrency limit (Chromium OOM guard on 2GB worker)
```

> Generate strong values: `openssl rand -base64 32` (password), `openssl rand -hex 32` (auth secret), `openssl rand -hex 16` (Inngest keys).

### Estimated monthly cost

Self-generated secrets (`*_PASSWORD`, `BETTER_AUTH_SECRET`, `INNGEST_*`) are free. Paid items below — **prices verified June 2026**; re-check before committing budget. Google Maps is SKU-based (cost varies with the field mask requested) and the universal $200/month Maps credit was removed in 2025.

Assumes a small operation (~1,000 leads discovered + ~500 audits / month):

| Item | When | ~USD/month | Notes |
|------|------|-----------|-------|
| VPS (web + db + redis + inngest + worker) | now | $25–45 | needs ≥ 4GB RAM for Playwright/Chromium |
| Google Places API (lead discovery) | now | $0–40 | new free tier: 5k Pro + 10k Essentials per SKU/month; overage ~$17–32/1k |
| Gemini 2.5 Flash (audit vision) | now | ~$1 | ~$0.002/audit ($0.30 / $2.50 per 1M tokens) |
| PageSpeed Insights | now | $0 | free |
| **Subtotal — Subsystems 1+2 (built)** | | **~$30–90** | mostly VPS + Places |
| Claude API (S3 demo design) | future | ~$0.04–0.10/demo | Sonnet 4.6 $3/$15; Haiku $1/$5 per 1M |
| Imagen 4 Fast (S3 images) | future | ~$0.02/image | ~3–5 images/demo; render self-hosted (free) |
| Resend (S4 outreach email) | future | $0–20 | free 3,000 emails/month; Pro $20 |

- **To start (S1+S2): ~$30–90/month** — much of it is the VPS; Gemini + PageSpeed stay within free tiers at low volume.
- **Full (S3+S4 at small volume): ~$60–170/month.** All API costs scale with volume.
- Cap spend in the Google Cloud Console (the app also guards via `DISCOVERY_DAILY_CAP`).

---

## 3. Deploy

```bash
docker compose up -d --build
```

What happens on boot:

1. **`redis`** starts (Inngest event store).
2. **`inngest`** (v1.27.0) starts with `--event-key`, `--signing-key`, `--postgres-uri`, `--redis-uri` flags (verify exact syntax for your Inngest version).
3. **`db`** starts; `web` waits until it passes `pg_isready` healthcheck (`depends_on: service_healthy`), then confirms role/db are reachable via in-app `SELECT 1` retry loop.
4. **`web` entrypoint** (`scripts/docker-entrypoint.sh`):
   - `npm run db:migrate` applies `drizzle/migrations/` (**fail-fast**).
   - `npm run db:seed` loads demo data + founder account (**idempotent + non-fatal**).
   - `next start -p 3000`.
5. **`worker`** starts and registers the `run-audit` function via `inngest.connect()` (outbound to Inngest server). Polls for audit events and runs Playwright + Gemini on each job.

First boot is slower (initdb + migrate + seed + scrypt); the `web` healthcheck `start_period` is 120s.

Watch it:
```bash
docker compose logs -f web
docker compose logs -f worker                  # audit job progress
docker compose ps                              # all services should become healthy
```

**Verify Inngest is wired correctly:**
```bash
docker compose logs inngest                    # should show event-key/signing-key accepted
docker compose logs worker | grep "Registered"  # should show run-audit function registered
```

---

## 4. Reverse proxy + TLS (Caddy example)

`/etc/caddy/Caddyfile`:
```
your-domain.com {
    reverse_proxy 127.0.0.1:3000
}
```
Caddy auto-provisions Let's Encrypt TLS. (If the proxy runs on the host, bind the app to localhost
only: change the `web` port mapping to `"127.0.0.1:3000:3000"` in `docker-compose.yml`.)

---

## 5. Verify

- Open `https://your-domain.com` → marketing site renders.
- `https://your-domain.com/login` → sign in with `FOUNDER_EMAIL` / `FOUNDER_PASSWORD`.
- Workspace screens render from Postgres; `/leads` "Run discovery" works if `GOOGLE_MAPS_API_KEY` is set.
- Navigate to `/audits/[any-lead-id]` and click "Run real audit" (button visible only if `USE_DB=true` and Inngest/Gemini keys are set). The audit should queue; monitor progress via `docker compose logs worker`. Results appear in the 8-dimension breakdown once the job completes.

---

## 6. Backups (now YOUR responsibility)

A self-hosted DB has **no backups** until you create them — and a backup on the same VPS is not a
backup. Use `scripts/backup.sh` (dumps the `db` service with `pg_dump -Fc` + local rotation):

```bash
# nightly via cron (crontab -e)
0 3 * * *  cd /opt/agents-verse && ./scripts/backup.sh >> /var/log/av-backup.log 2>&1
```

Then wire the **off-site upload** (and encrypt — dumps contain the founder password hash + lead PII).
The script has a commented `gpg` + `rclone` example. Restore:
```bash
# copy a .dump into the db container and restore
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < backups/agentsverse-YYYYMMDD-HHMMSS.dump
```
Test-restore quarterly into a throwaway DB so you know the backups actually work.

---

## 7. Security checklist

- [ ] `5432` is **not** published (no `ports:` on `db`) and firewall blocks it.
- [ ] `POSTGRES_PASSWORD` is 32+ random chars; `BETTER_AUTH_SECRET` is 32-byte hex.
- [ ] `.env.local` is `chmod 600`, owned by the deploy user, never committed.
- [ ] TLS terminates at the reverse proxy; `BETTER_AUTH_URL` uses `https://`.
- [ ] Backups are encrypted and stored off the VPS.

---

## 8. Update & rollback

```bash
# update
git pull && docker compose up -d --build      # migrations re-apply (idempotent); seed is idempotent

# rollback app (data stays in the pgdata volume)
git checkout <previous-tag> && docker compose up -d --build
```
Data lives in the named volume `pgdata`. **`docker compose down` keeps it; `docker compose down -v`
DELETES it** — never use `-v` in production unless you mean to wipe the database.

---

## 9. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `web` stuck "waiting for Postgres" then exits | `DATABASE_URL` host/creds don't match `POSTGRES_*`, or `db` unhealthy — `docker compose logs db`. |
| Migration error on boot | Schema/migration mismatch — boot is fail-fast by design. Inspect `drizzle/migrations/`, fix, redeploy. |
| Founder can't log in | Seed didn't run or password mismatch — `docker compose logs web` for `seed`, confirm `FOUNDER_PASSWORD`. |
| `npm ci` fails in build | `package-lock.json` must be present (it's committed); don't delete it. |
| Discovery returns "requires the database" / "API key not configured" | Set `USE_DB=true` and `GOOGLE_MAPS_API_KEY`. |
| "Run real audit" button not visible / audit queues but never runs | `GEMINI_API_KEY` or `INNGEST_*` keys not set. Also check `docker compose logs worker` for function registration errors. Worker must call `inngest.connect()` and register `run-audit`. |
| Audit job stuck in "running" state | Worker crashed or lost connection to Inngest. Check `docker compose logs worker` for errors (e.g., Playwright timeout, Gemini API error, Postgres connection drop). Logs show the root cause in the `audit_jobs.error` field. |
| `worker` container OOM-killed | Global concurrency cap too high for available RAM. Lower `AUDIT_CONCURRENCY` (default 2) or increase worker `mem_limit` in compose. Each Chromium instance ~500MB. |

---

## 10. Local development (no Docker)

**Option A: Mock data (default, no setup):**
```bash
cp .env.example .env.local      # defaults: USE_DB=false, INNGEST_DEV=0
npm run dev                     # http://localhost:3000
```
All data comes from localStorage. Audits show mock results from the static fallback.

**Option B: With Postgres (to test discovery + DB persistence):**
```bash
cp .env.example .env.local      # DATABASE_URL=postgresql://...@localhost:5432/agentsverse, USE_DB=true
npm run db:migrate && npm run db:seed
npm run dev                     # http://localhost:3000
```

**Option C: With Inngest local dev (to test real audits):**
Requires Gemini + PageSpeed keys in `.env.local`. Also start Inngest local server in a separate terminal:
```bash
# Terminal 1: Inngest local dev server (watches for code changes, re-registers functions)
npx inngest dev

# Terminal 2: Next.js app
cp .env.local               # set INNGEST_DEV=1, GEMINI_API_KEY, GOOGLE_PAGESPEED_API_KEY, etc.
npm run dev                 # http://localhost:3000
```
The app sends audit events to the local Inngest server; functions register automatically. No separate worker container needed for local dev (the Inngest CLI runs everything in-process).
