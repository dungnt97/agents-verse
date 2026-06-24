'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { escalations, deals } from '@/lib/db/schema';
import { inngest } from '@/lib/inngest/client';
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

// Approve a pipeline-gate escalation: resolve it AND emit `pipeline/resumed` so the orchestrator
// (the single decision point) releases the held hop and advances the run. The event id is keyed by
// the escalation so a double-click is deduped and a future second gate on the same run is distinct.
export async function approvePipelineEscalation(escalationId: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  const [esc] = await db.select().from(escalations).where(eq(escalations.id, escalationId)).limit(1);
  if (!esc) return { ok: false, message: `escalation not found: ${escalationId}` };
  if (!esc.runId) return { ok: false, message: `escalation has no linked run: ${escalationId}` };
  // Emit BEFORE marking the row resolved: the event id dedupes redelivery, so if the update fails the
  // escalation stays OPEN + re-actionable (a re-approve re-sends harmlessly) instead of vanishing from
  // the queue while the run never advances.
  await inngest.send({ name: 'pipeline/resumed', data: { runId: esc.runId }, id: `pipeline/resumed:${esc.id}` });
  await db.update(escalations).set({ status: 'resolved', resolvedAt: new Date() }).where(eq(escalations.id, escalationId));
  revalidatePath('/command');
  revalidatePath('/overview');
  return { ok: true };
}

// Reject a pipeline-gate escalation: dismiss it AND emit `pipeline/halted` so the orchestrator
// terminates the run (the founder declined to advance it).
export async function rejectPipelineEscalation(escalationId: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  const [esc] = await db.select().from(escalations).where(eq(escalations.id, escalationId)).limit(1);
  if (!esc) return { ok: false, message: `escalation not found: ${escalationId}` };
  if (!esc.runId) return { ok: false, message: `escalation has no linked run: ${escalationId}` };
  // Emit BEFORE marking dismissed (same rationale as approve): a send failure leaves it re-actionable.
  await inngest.send({ name: 'pipeline/halted', data: { runId: esc.runId }, id: `pipeline/halted:${esc.id}` });
  await db.update(escalations).set({ status: 'dismissed', resolvedAt: new Date() }).where(eq(escalations.id, escalationId));
  revalidatePath('/command');
  revalidatePath('/overview');
  return { ok: true };
}
