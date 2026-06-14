'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { escalations, deals } from '@/lib/db/schema';
import { guardMutation, type MutationResult } from './guard';

// Resolve (approve) or dismiss an escalation from the command center / review panel.
export async function resolveEscalation(
  id: string,
  resolution: 'resolved' | 'dismissed',
): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  await db
    .update(escalations)
    .set({ status: resolution, resolvedAt: new Date() })
    .where(eq(escalations.id, id));
  revalidatePath('/command');
  revalidatePath('/overview');
  return { ok: true };
}

// Approve a deal-approval escalation: resolve it AND close the linked deal (→ won).
export async function approveDealEscalation(escalationId: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  const [esc] = await db.select().from(escalations).where(eq(escalations.id, escalationId)).limit(1);
  if (!esc) return { ok: false, message: `escalation not found: ${escalationId}` };
  await db.transaction(async (tx) => {
    await tx.update(escalations).set({ status: 'resolved', resolvedAt: new Date() }).where(eq(escalations.id, escalationId));
    if (esc.dealId) await tx.update(deals).set({ stage: 'won' }).where(eq(deals.id, esc.dealId));
  });
  if (esc.dealId) revalidatePath('/deals');
  revalidatePath('/command');
  revalidatePath('/overview');
  return { ok: true };
}

// Reject a deal-approval escalation: dismiss it AND mark the linked deal lost.
export async function rejectDealEscalation(escalationId: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  const [esc] = await db.select().from(escalations).where(eq(escalations.id, escalationId)).limit(1);
  if (!esc) return { ok: false, message: `escalation not found: ${escalationId}` };
  await db.transaction(async (tx) => {
    await tx.update(escalations).set({ status: 'dismissed', resolvedAt: new Date() }).where(eq(escalations.id, escalationId));
    if (esc.dealId) await tx.update(deals).set({ stage: 'lost' }).where(eq(deals.id, esc.dealId));
  });
  if (esc.dealId) revalidatePath('/deals');
  revalidatePath('/command');
  revalidatePath('/overview');
  return { ok: true };
}
