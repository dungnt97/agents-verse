import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Server-only Postgres client. NEVER import this from a `'use client'` module —
// repositories (lib/repositories/*) are the only consumers and they are server-only.
//
// Connection strategy: a single direct connection to the self-hosted Postgres (the
// docker-compose `db` service, host `db:5432`). The app, migrations, and seed all share
// one DATABASE_URL — there is no transaction pooler in front of Postgres here, so
// server-side prepared statements are safe and faster (postgres-js's default). The
// `prepared statement does not exist` failure class only happens behind a pooler, which
// we deliberately don't use.
//
// postgres-js connects lazily (on first query), so constructing this at import time is
// side-effect free — `npm run build` with USE_DB unset never opens a socket.
const connectionString = process.env.DATABASE_URL ?? '';

const sql = postgres(connectionString, { idle_timeout: 20 });

export const db = drizzle(sql, { schema });

// Drain the pool on shutdown so in-flight queries finish and sockets close cleanly
// (matters for the Docker/VPS deploy where the container receives SIGTERM). Guard against
// duplicate registration when this module is re-evaluated (dev HMR) to avoid listener leaks.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  if (process.listenerCount(signal) === 0) {
    process.on(signal, () => {
      void sql.end({ timeout: 5 });
    });
  }
}

export { sql };
