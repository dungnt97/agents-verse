#!/bin/sh
# Boot order: apply migrations -> seed (idempotent) -> start the server. Fail fast if migrate
# fails so the app never serves against an un-migrated schema.
set -e

echo "[entrypoint] applying migrations (DIRECT_URL)..."
npm run db:migrate

echo "[entrypoint] seeding (idempotent)..."
npm run db:seed

echo "[entrypoint] starting Next.js on :3000..."
# exec so the server is PID 1 and receives SIGTERM directly (HTTP drain + pool close).
exec node_modules/.bin/next start -p 3000
