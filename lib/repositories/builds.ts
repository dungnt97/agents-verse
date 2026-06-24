import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { builds } from '@/lib/db/schema';
import { USE_DB } from './config';

export type Build = typeof builds.$inferSelect;

// The current delivery build for a lead (SEO-optimized HTML for a won deal), or null in mock mode / before
// the first build. The public demo route prefers this over the raw generated demo when it's ready.
export async function getBuild(leadId: string): Promise<Build | null> {
  if (!USE_DB) return null;
  const [row] = await db.select().from(builds).where(eq(builds.leadId, leadId)).limit(1);
  return row ?? null;
}
