import 'server-only';

// Data-source switch. When false (default), repositories return the mock AV singleton so
// the app renders with no database — this is what keeps `npm run build` and the demo
// working before Supabase is provisioned. Flip USE_DB=true (with a migrated + seeded DB)
// to read Postgres. Read once at module load; the value is fixed for the process.
export const USE_DB = process.env.USE_DB === 'true';
