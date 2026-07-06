'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { USE_DB } from '@/lib/repositories/config';
import { runDiscoveryCore, type DiscoveryResult } from '@/lib/discovery/run-discovery-core';

export type { DiscoveryResult };

// Web action for a founder-triggered discovery pass (the "Discover leads" button, and `{auto:true}` to
// test the Guided-auto planner from the UI). Auth-gate + USE_DB guard, then delegate the real work to the
// worker-safe core (shared with the Inngest auto-discovery cron), then revalidate the affected screens.
// DB-only; degrades gracefully with a clear message.
export async function runDiscovery(input: { industry?: string; city?: string; auto?: boolean }): Promise<DiscoveryResult> {
  if (!USE_DB) {
    return { found: 0, enriched: 0, upserted: 0, started: 0, message: 'Discovery requires the database (set USE_DB=true).' };
  }
  // Authenticated-only: this spends real (Enterprise-SKU) money, so it must verify the session, not rely
  // on the cookie-existence middleware check.
  if (!(await getCurrentUser())) throw new Error('Unauthorized');

  const result = await runDiscoveryCore(input);

  // Only invalidate the affected screens when the pass actually changed data — a no-op pass (missing
  // provider key, daily cap reached, empty market pool) leaves the caches untouched, as before the split.
  if (result.upserted > 0 || result.started > 0) {
    revalidatePath('/leads');
    revalidatePath('/overview');
  }
  return result;
}
