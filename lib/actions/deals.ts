'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { deals, escalations, settings } from '@/lib/db/schema';
import {
  canTransition,
  requiresApproval,
  isDealStage,
  DEAL_AUTO_APPROVE_LIMIT,
  type DealStage,
  type AutonomyMode,
} from '@/lib/data/deal-stage-machine';
import { guardMutation, type MutationResult } from './guard';

type DealMutationResult = MutationResult & { escalated?: boolean };

function dealsTouched() {
  revalidatePath('/deals');
  revalidatePath('/overview');
  revalidatePath('/command');
}

// Advance a deal through its stage machine with legal-transition enforcement and the founder
// approval gate. The `quoted → won` auto-close shortcut routes to founder review (creates a deal
// escalation + parks the deal in `approval`) when the value/confidence/autonomy gate trips.
export async function updateDealStage(dealId: string, stage: string): Promise<DealMutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  if (!isDealStage(stage)) return { ok: false, message: `invalid deal stage: ${stage}` };
  const target = stage as DealStage;

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) return { ok: false, message: `deal not found: ${dealId}` };

  const current = deal.stage as DealStage;
  if (current === target) return { ok: true };
  if (!canTransition(current, target)) {
    return { ok: false, message: `illegal deal transition: ${current} → ${target}` };
  }

  // Gate only the direct quoted → won auto-close. From `approval`/`call`, a `won` is the result
  // of founder action and is allowed straight through.
  if (target === 'won' && current === 'quoted') {
    const [s] = await db.select().from(settings).limit(1);
    const mode = (s?.autonomyMode as AutonomyMode | undefined) ?? 'guarded';
    const limit = (s?.guardrails as Record<string, unknown> | null | undefined)?.autoApproveLimit;
    const threshold = typeof limit === 'number' ? limit : DEAL_AUTO_APPROVE_LIMIT;

    if (requiresApproval({ value: deal.value, conf: deal.conf, autonomyMode: mode, threshold })) {
      // Park the deal + open the escalation atomically, so a crash between the two writes can't
      // leave a deal stuck in `approval` with no escalation to resolve it.
      await db.transaction(async (tx) => {
        await tx.update(deals).set({ stage: 'approval' }).where(eq(deals.id, dealId));
        await tx
          .insert(escalations)
          .values({
            id: `esc-deal-${dealId}`,
            kind: 'deal',
            sev: deal.value >= threshold ? 'high' : 'medium',
            title: 'Deal value above approval threshold',
            who: deal.client,
            value: deal.value,
            agent: 'closer',
            reason: `Quoted ${deal.pkg} at $${deal.value.toLocaleString('en-US')}. Auto-approve limit is $${threshold.toLocaleString('en-US')}.`,
            rec: deal.aiRec,
            conf: deal.conf,
            time: 'just now',
            status: 'open',
            dealId,
          })
          .onConflictDoUpdate({
            target: escalations.id,
            set: { status: 'open', resolvedAt: null, value: deal.value, conf: deal.conf },
          });
      });
      dealsTouched();
      return { ok: true, escalated: true, message: 'Routed to founder approval' };
    }
  }

  await db.update(deals).set({ stage: target }).where(eq(deals.id, dealId));
  dealsTouched();
  return { ok: true };
}
