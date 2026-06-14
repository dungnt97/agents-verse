#!/bin/sh
# Boot order: wait for Postgres -> apply migrations -> seed (idempotent, non-fatal) -> start.
# migrate stays fail-fast (set -e) so the app never serves an un-migrated schema; seed is
# non-fatal so a transient seed error can't crash-loop the container under restart:unless-stopped.
set -e

echo "[entrypoint] waiting for Postgres to accept connections..."
# depends_on:service_healthy gates START, but on first boot initdb can briefly flip the TCP
# healthcheck healthy before the role/db are network-reachable, and the slim runner has no
# pg_isready/psql. Confirm a real query succeeds (node + the installed postgres driver) before migrate.
node -e '
  const postgres = require("postgres");
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  (async () => {
    for (let i = 1; i <= 30; i++) {
      const sql = postgres(url, { max: 1, idle_timeout: 1, connect_timeout: 5 });
      try { await sql`select 1`; await sql.end(); console.log("[entrypoint] Postgres ready."); process.exit(0); }
      catch (e) { await sql.end().catch(() => {}); console.log(`[entrypoint] db not ready (${i}/30): ${e.code || e.message}`); await new Promise(r => setTimeout(r, 1000)); }
    }
    console.error("[entrypoint] timed out waiting for Postgres"); process.exit(1);
  })();
'

echo "[entrypoint] applying migrations (DATABASE_URL)..."
npm run db:migrate

echo "[entrypoint] seeding (idempotent, non-fatal)..."
npm run db:seed || echo "[entrypoint] seed failed, continuing"

echo "[entrypoint] starting Next.js on :3000..."
# exec so the server is PID 1 and receives SIGTERM directly (HTTP drain + pool close).
exec node_modules/.bin/next start -p 3000
