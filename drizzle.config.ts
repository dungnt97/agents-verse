import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Source of DATABASE_URL: locally from .env.local (git-ignored); in the container from the
// compose env_file (.env.* is git/dockerignored, so .env.local won't exist in-image — dotenv
// then no-ops and the already-injected process.env value is used, since dotenv never overwrites).
config({ path: '.env.local' });
config();

// Migrations connect to the same self-hosted Postgres the app uses (db:5432, direct) — one
// DATABASE_URL for app + migrations + seed. No pooler/DIRECT_URL split (that existed only for
// Supabase's transaction pooler).
export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  // Generate readable snake_case column names from camelCase TS fields.
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
