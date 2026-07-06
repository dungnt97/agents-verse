import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

// Rotation state for the autonomous market hunter: one row per (country, metro, niche) combo that has been
// hunted, so the planner can pick the least-recently-hunted next. Id is the deterministic combo key so a
// re-hunt upserts the same row.
export const huntedMarkets = pgTable('hunted_markets', {
  id: text('id').primaryKey(), // `${country}|${region}|${niche}`
  country: text('country').notNull(),
  region: text('region').notNull(),
  niche: text('niche').notNull(),
  lastRunAt: timestamp('last_run_at'),
  leadsFound: integer('leads_found').notNull().default(0),
});
