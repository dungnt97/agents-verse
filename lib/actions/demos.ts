'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { leads, demoStatusEnum } from '@/lib/db/schema';
import { guardMutation, type MutationResult } from './guard';

type DemoStatus = (typeof demoStatusEnum.enumValues)[number];

// Lifecycle order (the enum's declaration order is not chronological). A demo only moves FORWARD; the write
// below is conditioned on the current status being at or below the target, so a stale browser tab can't
// downgrade a lead the pipeline has already advanced (e.g. flip a 'sent' demo back to 'review').
const DEMO_RANK: Record<DemoStatus, number> = { none: 0, draft: 1, review: 2, approved: 3, sent: 4, replied: 5, won: 6 };

// Move a demo through its review/send lifecycle. The Demos screen derives each card's status from
// `leads.demo` (joined with generated_demos), so the write MUST target `leads.demo` by leadId — writing
// the legacy `demos` table (empty under the production default SEED_DEMO_DATA=false) updated zero rows and
// the founder's click did nothing. Keyed by leadId, not a demos-row id, for that reason.
export async function updateDemoStatus(leadId: string, status: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  if (!demoStatusEnum.enumValues.includes(status as DemoStatus)) {
    return { ok: false, message: `invalid demo status: ${status}` };
  }
  const target = status as DemoStatus;
  // Only apply from a status at or below the target — an atomic forward-only guard against a stale-tab downgrade.
  const from = demoStatusEnum.enumValues.filter((s) => DEMO_RANK[s] <= DEMO_RANK[target]);
  const moved = await db
    .update(leads)
    .set({ demo: target })
    .where(and(eq(leads.id, leadId), inArray(leads.demo, from)))
    .returning({ id: leads.id });
  if (moved.length === 0) return { ok: false, message: 'Demo is already further along — not moved backward.' };
  revalidatePath('/demos');
  revalidatePath('/overview');
  return { ok: true };
}
