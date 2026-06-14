'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { deals, dealStageEnum } from '@/lib/db/schema';
import { guardMutation, type MutationResult } from './guard';

type DealStage = (typeof dealStageEnum.enumValues)[number];

// Advance a deal through its stage machine (pricing → created → quoted → approval → call → won/lost).
export async function updateDealStage(dealId: string, stage: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  if (!dealStageEnum.enumValues.includes(stage as DealStage)) {
    return { ok: false, message: `invalid deal stage: ${stage}` };
  }
  await db.update(deals).set({ stage: stage as DealStage }).where(eq(deals.id, dealId));
  revalidatePath('/deals');
  revalidatePath('/overview');
  return { ok: true };
}
