import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { leads } from '../db/schema';

// Upsert discovery-sourced leads keyed by the unique placeId — re-running discovery refreshes the
// enrichment fields instead of duplicating rows. Worker-safe (relative imports, no `server-only`) so the
// discovery cron's core calls it under tsx; also re-exported from lib/repositories/leads so it stays part
// of the documented leads data-access surface. Returns the number of rows processed.
export async function upsertDiscoveredLeads(
  rows: (typeof leads.$inferInsert)[],
): Promise<number> {
  if (rows.length === 0) return 0;
  await db
    .insert(leads)
    .values(rows)
    .onConflictDoUpdate({
      target: leads.placeId,
      set: {
        websiteUri: sql`excluded.website_uri`,
        // Keep `url` (the audit's greenfield-vs-real signal) in lockstep with a refreshed websiteUri, so a
        // lead that gained or lost a real site since first discovery is re-classified instead of frozen.
        url: sql`excluded.url`,
        email: sql`excluded.email`,
        phone: sql`excluded.phone`,
        // `site` and `score` are deliberately NOT refreshed: once the audit runs it becomes the source of
        // truth for both, and re-discovery would clobber the measured score with the crude bad-website
        // heuristic. Discovery still sets `site` when it INSERTs a brand-new lead — it just never overwrites.
        websiteScore: sql`excluded.website_score`,
        formattedAddress: sql`excluded.formatted_address`,
        businessStatus: sql`excluded.business_status`,
        // Refresh the rich Maps facts (rating/reviews/hours/photos) too, so a re-discovery of a not-yet-
        // pipelined lead picks up newly-captured photos/reviews instead of keeping the first stale blob.
        mapsData: sql`excluded.maps_data`,
      },
    });
  return rows.length;
}
