'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { escalations, deals } from '@/lib/db/schema';
import { inngest } from '@/lib/inngest/client';
import { canTransition, type DealStage } from '@/lib/data/deal-stage-machine';
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

// Approve a deal-approval escalation: resolve it AND close the linked deal (→ won). Guarded so a stray
// call can't force-close: only a `deal`-kind escalation acts on the deal, and only when `won` is a LEGAL
// next stage (won't resurrect a deal already moved to lost/won by another route — just resolves the row).
export async function approveDealEscalation(escalationId: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  const [esc] = await db.select().from(escalations).where(eq(escalations.id, escalationId)).limit(1);
  if (!esc) return { ok: false, message: `escalation not found: ${escalationId}` };
  if (esc.kind !== 'deal') return { ok: false, message: `not a deal escalation: ${escalationId}` };
  const [deal] = esc.dealId
    ? await db.select({ leadId: deals.leadId, stage: deals.stage }).from(deals).where(eq(deals.id, esc.dealId)).limit(1)
    : [undefined];
  const close = !!deal && canTransition(deal.stage as DealStage, 'won');
  await db.transaction(async (tx) => {
    await tx.update(escalations).set({ status: 'resolved', resolvedAt: new Date() }).where(eq(escalations.id, escalationId));
    if (esc.dealId && close) await tx.update(deals).set({ stage: 'won' }).where(eq(deals.id, esc.dealId));
  });
  // Closing the deal kicks off post-sale delivery (Cipher build-prep + Mira onboarding), id-deduped per
  // deal. Best-effort: the deal is already committed as won — a missing event bus must not fail the close.
  if (esc.dealId && deal && close) {
    try {
      await inngest.send({ name: 'deal/won', data: { dealId: esc.dealId, leadId: deal.leadId }, id: `deal/won:${esc.dealId}` });
    } catch (e) {
      console.error('[deal/won] event send failed; deal still closed:', e);
    }
    revalidatePath('/deals');
  }
  revalidatePath('/command');
  revalidatePath('/overview');
  return { ok: true };
}

// Reject a deal-approval escalation: dismiss it AND mark the linked deal lost. Same guards as approve:
// only a `deal`-kind escalation acts, and only when `lost` is legal (never flips an already-won/lost deal).
export async function rejectDealEscalation(escalationId: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  const [esc] = await db.select().from(escalations).where(eq(escalations.id, escalationId)).limit(1);
  if (!esc) return { ok: false, message: `escalation not found: ${escalationId}` };
  if (esc.kind !== 'deal') return { ok: false, message: `not a deal escalation: ${escalationId}` };
  const [deal] = esc.dealId
    ? await db.select({ stage: deals.stage }).from(deals).where(eq(deals.id, esc.dealId)).limit(1)
    : [undefined];
  const lose = !!deal && canTransition(deal.stage as DealStage, 'lost');
  await db.transaction(async (tx) => {
    await tx.update(escalations).set({ status: 'dismissed', resolvedAt: new Date() }).where(eq(escalations.id, escalationId));
    if (esc.dealId && lose) await tx.update(deals).set({ stage: 'lost' }).where(eq(deals.id, esc.dealId));
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

// Approve a parked outreach draft → emit `outreach/approved` so the worker sends the email the founder
// reviewed. The draft (subject/body) lives on the escalation (title/rec); the lead is recovered from the
// deterministic id `esc-outreach-<leadId>`. Emit BEFORE resolving so a send failure leaves it re-actionable.
export async function approveOutreachEscalation(escalationId: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  const [esc] = await db.select().from(escalations).where(eq(escalations.id, escalationId)).limit(1);
  if (!esc) return { ok: false, message: `escalation not found: ${escalationId}` };
  if (esc.kind !== 'outreach') return { ok: false, message: `not an outreach escalation: ${escalationId}` };
  const leadId = esc.id.replace(/^esc-outreach-/, '');
  await inngest.send({
    name: 'outreach/approved',
    // runId (nullable) flows through so the resulting outreach/sent advances the originating pipeline run.
    data: { leadId, subject: esc.title, body: esc.rec, runId: esc.runId ?? undefined },
    id: `outreach/approved:${esc.id}`,
  });
  await db.update(escalations).set({ status: 'resolved', resolvedAt: new Date() }).where(eq(escalations.id, escalationId));
  revalidatePath('/command');
  revalidatePath('/overview');
  return { ok: true };
}

// Reject a parked outreach draft → dismiss it; the email is never sent. If the draft belongs to a
// pipeline run, also close that run (outcome:'failed') so it doesn't strand 'running' at the outreach
// stage and block a fresh start for the lead — the founder declined to send, so the funnel ends here.
export async function rejectOutreachEscalation(escalationId: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  const [esc] = await db.select().from(escalations).where(eq(escalations.id, escalationId)).limit(1);
  if (!esc) return { ok: false, message: `escalation not found: ${escalationId}` };
  if (esc.kind !== 'outreach') return { ok: false, message: `not an outreach escalation: ${escalationId}` };
  if (esc.runId) {
    const leadId = esc.id.replace(/^esc-outreach-/, '');
    try {
      await inngest.send({
        name: 'outreach/sent',
        // Run-scoped id: Inngest dedups event ids for ~24h, so a lead-scoped id here would swallow
        // the closing fact of the lead's NEXT run and strand it.
        data: { leadId, runId: esc.runId, outcome: 'failed' },
        id: `outreach/sent:${esc.runId}`,
      });
    } catch (e) {
      // Best-effort run-close; the dismiss below must succeed regardless of the event bus.
      console.error('[outreach dismiss] run-close event send failed:', e);
    }
  }
  await db.update(escalations).set({ status: 'dismissed', resolvedAt: new Date() }).where(eq(escalations.id, escalationId));
  revalidatePath('/command');
  revalidatePath('/overview');
  return { ok: true };
}

// "Take over": the founder handles the escalated work personally. Kind-aware — for run-linked
// escalations, resolving the row is NOT enough: the row is the run's only release mechanism, so a
// blind resolve would leave the run parked ('waiting_approval') or 'running' at outreach forever,
// and the active-run index would block any fresh run for that lead. Taking over means the agent's
// automated path ends here: close the run, keep the row as the audit trail.
export async function takeOverEscalation(escalationId: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  const [esc] = await db.select().from(escalations).where(eq(escalations.id, escalationId)).limit(1);
  if (!esc) return { ok: false, message: `escalation not found: ${escalationId}` };
  if (esc.runId) {
    try {
      if (esc.kind === 'pipeline') {
        // Halt the parked run (the founder is driving this lead manually now). Emit BEFORE resolving
        // so a send failure leaves the row re-actionable. Same id namespace as reject — one halt per
        // escalation is all a run ever needs.
        await inngest.send({ name: 'pipeline/halted', data: { runId: esc.runId }, id: `pipeline/halted:${esc.id}` });
      } else if (esc.kind === 'outreach') {
        // The founder sends (or skips) the email personally → the automated run ends without a send.
        const leadId = esc.id.replace(/^esc-outreach-/, '');
        await inngest.send({
          name: 'outreach/sent',
          data: { leadId, runId: esc.runId, outcome: 'failed' },
          id: `outreach/sent:${esc.runId}`,
        });
      }
    } catch (e) {
      console.error('[take over] run-close event send failed:', e);
      return { ok: false, message: 'Could not close the linked pipeline run — try again.' };
    }
  }
  await db.update(escalations).set({ status: 'resolved', resolvedAt: new Date() }).where(eq(escalations.id, escalationId));
  revalidatePath('/command');
  revalidatePath('/overview');
  return { ok: true };
}

// Approve a parked onboarding draft (Mira) → emit `support/approved` so the worker sends the asset-request
// email the founder reviewed. Subject/body live on the escalation; the lead is recovered from the
// deterministic id `esc-support-<leadId>`. Emit BEFORE resolving so a send failure leaves it re-actionable.
export async function approveSupportEscalation(escalationId: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  const [esc] = await db.select().from(escalations).where(eq(escalations.id, escalationId)).limit(1);
  if (!esc) return { ok: false, message: `escalation not found: ${escalationId}` };
  if (esc.kind !== 'support') return { ok: false, message: `not a support escalation: ${escalationId}` };
  const leadId = esc.id.replace(/^esc-support-/, '');
  await inngest.send({
    name: 'support/approved',
    data: { leadId, subject: esc.title, body: esc.rec },
    id: `support/approved:${esc.id}`,
  });
  await db.update(escalations).set({ status: 'resolved', resolvedAt: new Date() }).where(eq(escalations.id, escalationId));
  revalidatePath('/command');
  revalidatePath('/overview');
  return { ok: true };
}

// Reject a parked onboarding draft → just dismiss it; the email is never sent.
export async function rejectSupportEscalation(escalationId: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  await db.update(escalations).set({ status: 'dismissed', resolvedAt: new Date() }).where(eq(escalations.id, escalationId));
  revalidatePath('/command');
  revalidatePath('/overview');
  return { ok: true };
}
