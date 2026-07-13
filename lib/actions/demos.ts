'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { leads, demoStatusEnum } from '@/lib/db/schema';
import { guardMutation, type MutationResult } from './guard';

type DemoStatus = (typeof demoStatusEnum.enumValues)[number];

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
  await db.update(leads).set({ demo: status as DemoStatus }).where(eq(leads.id, leadId));
  revalidatePath('/demos');
  revalidatePath('/overview');
  return { ok: true };
}
