import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

// handleReplyRun calls the Closer (runAgent → shells `claude`), which isn't available under vitest — mock it
// with a fixed interpretation so the DB-side behaviour (STOP opt-out, reply→deal materialization) is what's
// under test. No next/* runtime APIs are used by the handler.
vi.mock('@/lib/agents/runner', () => ({
  runAgent: vi.fn(async () => ({ kind: 'question', interpretation: 'seems interested', suggested: 'Great — happy to help.', recommendedStage: 'hold', conf: 60 })),
}));

import { db } from '@/lib/db/client';
import { leads, deals, escalations } from '@/lib/db/schema';
import { handleReplyRun, type HandleReplyStep } from '@/lib/inngest/functions/handle-reply';
import { runAgent } from '@/lib/agents/runner';

const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true';
// Passthrough step: run the memoized fn immediately; record any events sent.
const makeStep = () => {
  const sent: unknown[] = [];
  const step: HandleReplyStep = {
    run: async <T>(_id: string, fn: () => Promise<T>) => fn(),
    sendEvent: async (_id: string, e: unknown) => { sent.push(e); return undefined; },
  };
  return { step, sent };
};

describe.skipIf(!hasDb)('handleReplyRun', () => {
  let leadId = '';
  beforeAll(async () => {
    const [l] = await db.select().from(leads).orderBy(leads.id).limit(1);
    leadId = l.id;
  });
  afterAll(async () => {
    await db.delete(escalations).where(eq(escalations.id, `esc-reply-deal-${leadId}`));
    await db.delete(deals).where(eq(deals.id, `deal-${leadId}`));
    await db.update(leads).set({ doNotContact: false }).where(eq(leads.id, leadId));
  });

  it('honors a STOP opt-out: marks the lead do-not-contact, creates no deal, never calls the Closer', async () => {
    await db.update(leads).set({ doNotContact: false }).where(eq(leads.id, leadId));
    vi.mocked(runAgent).mockClear();
    const { step } = makeStep();

    const res = await handleReplyRun({ event: { data: { dealId: `deal-${leadId}`, text: 'STOP', leadId } }, step });

    expect(res).toMatchObject({ optedOut: true });
    const [l] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    expect(l.doNotContact).toBe(true);
    expect(runAgent).not.toHaveBeenCalled(); // short-circuit BEFORE the paid interpret step
    const created = await db.select().from(deals).where(eq(deals.id, `deal-${leadId}`));
    expect(created).toHaveLength(0);
  });

  it('materializes a deal from the FIRST reply — real value, no fabricated number', async () => {
    await db.delete(deals).where(eq(deals.id, `deal-${leadId}`));
    await db.update(leads).set({ doNotContact: false }).where(eq(leads.id, leadId));
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    const { step } = makeStep();

    const res = await handleReplyRun({
      event: { data: { dealId: `deal-${leadId}`, text: 'Love it! Can we add online booking?', leadId } },
      step,
    });

    expect(res).toMatchObject({ applied: 'created' });
    const [deal] = await db.select().from(deals).where(eq(deals.id, `deal-${leadId}`)).limit(1);
    expect(deal).toBeTruthy();
    expect(deal.stage).toBe('created');
    expect(deal.leadId).toBe(leadId);
    expect(deal.value).toBe(lead.value); // Orion's real estimate — never invented
    expect(deal.price).toBeGreaterThan(0); // from the settings pricing ladder (or lead.value fallback)
    // The reply surfaces for founder review, not an auto-advance.
    const [esc] = await db.select().from(escalations).where(eq(escalations.id, `esc-reply-deal-${leadId}`)).limit(1);
    expect(esc?.status).toBe('open');
  });
});
