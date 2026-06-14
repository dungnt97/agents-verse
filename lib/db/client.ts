import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Server-only Postgres client. NEVER import this from a `'use client'` module —
// repositories (lib/repositories/*) are the only consumers and they are server-only.
//
// Connection strategy: the app runtime talks to Supabase's Transaction pooler
// (port 6543), which assigns a fresh backend per statement. That makes server-side
// prepared statements unusable, so `prepare: false` is mandatory — without it the
// app works at first and then fails with "prepared statement does not exist" once the
// pooler rotates connections. Migrations use DIRECT_URL (port 5432) instead; see
// drizzle.config.ts.
//
// postgres-js connects lazily (on first query), so constructing this at import time is
// side-effect free — `npm run build` with USE_DB unset never opens a socket.
const connectionString = process.env.DATABASE_URL ?? '';

const sql = postgres(connectionString, { prepare: false, idle_timeout: 20 });

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
