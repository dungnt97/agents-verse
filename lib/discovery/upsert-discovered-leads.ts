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
        email: sql`excluded.email`,
        phone: sql`excluded.phone`,
        site: sql`excluded.site`,
        websiteScore: sql`excluded.website_score`,
        formattedAddress: sql`excluded.formatted_address`,
        businessStatus: sql`excluded.business_status`,
      },
    });
  return rows.length;
}
