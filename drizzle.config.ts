import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load real values from .env.local (git-ignored). drizzle-kit only auto-loads `.env`.
config({ path: '.env.local' });

// Migrations connect via DIRECT_URL (port 5432, direct/session) — NOT the Transaction
// pooler the app uses. drizzle-kit needs prepared statements + session features that
// the transaction pooler (port 6543) does not provide.
export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL ?? '',
  },
  // Generate readable snake_case column names from camelCase TS fields.
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
