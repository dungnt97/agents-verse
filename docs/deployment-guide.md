# Deployment Guide — Self-hosted on a single VPS

Agents Verse runs as **two Docker Compose services on one VPS**: `web` (the Next.js app) and
`db` (self-hosted PostgreSQL 17). No managed database, no external dependencies beyond the
optional Google Places API. Postgres is **not** exposed to the internet — only `web` reaches it
over the internal compose network (`db:5432`).

```
            Internet ──TLS──▶ reverse proxy (Caddy/Nginx) ──:3000──▶ web ──:5432──▶ db
                                                                              (internal only)
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

# Lead discovery (optional — only needed to run Phase 8)
GOOGLE_MAPS_API_KEY=<key>
DISCOVERY_DEFAULT_INDUSTRY=dentists
DISCOVERY_DEFAULT_CITY=Austin TX
DISCOVERY_DAILY_CAP=450
```

> Generate strong values: `openssl rand -base64 32` (password), `openssl rand -hex 32` (auth secret).

---

## 3. Deploy

```bash
docker compose up -d --build
```

What happens on boot (per `scripts/docker-entrypoint.sh`):
1. `web` waits until `db` passes its `pg_isready` healthcheck (`depends_on: service_healthy`), then a
   second in-app `SELECT 1` retry loop confirms the role/db are actually reachable.
2. `npm run db:migrate` applies `drizzle/migrations/` (**fail-fast** — a migration error stops boot).
3. `npm run db:seed` loads demo data + the founder account (**idempotent + non-fatal** — a transient
   seed error logs and continues so the container doesn't crash-loop).
4. `next start -p 3000`.

First boot is slower (initdb + migrate + seed + scrypt); the `web` healthcheck `start_period` is 120s.

Watch it:
```bash
docker compose logs -f web
docker compose ps               # both services should become healthy
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

---

## 10. Local development (no Docker)

Run Postgres on the host (or `docker run` a single Postgres), then point `DATABASE_URL` at
`localhost:5432`:
```bash
cp .env.example .env.local      # set DATABASE_URL=postgresql://...@localhost:5432/agentsverse, USE_DB=true
npm run db:migrate && npm run db:seed
npm run dev                     # http://localhost:3000
```
Or skip the DB entirely: leave `USE_DB=false` and `npm run dev` runs on mock data.
