import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

// These server actions reach into Next runtime APIs that don't exist under vitest:
//   - next/cache revalidatePath/revalidateTag are no-ops here.
//   - guard.ts calls getCurrentUser() (Better Auth + next/headers); stub a signed-in founder
//     so guardMutation() passes the auth check when USE_DB=true.
// Mocks are hoisted by vitest so they apply before the action modules import these deps.
// Capture pipeline events so we can assert the post-close `deal/won` trigger (Cipher/Mira delivery)
// without a live Inngest server. The mock also means send never throws here.
const sendMock = vi.hoisted(() => vi.fn(async (_e: { name?: string }) => {}));
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: async () => ({ id: 'founder', email: 'founder@agentsverse.ai' }),
}));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: sendMock } }));

import { db } from '@/lib/db/client';
import { deals, escalations, settings } from '@/lib/db/schema';
import { updateDealStage } from '@/lib/actions/deals';
import { approveDealEscalation, rejectDealEscalation } from '@/lib/actions/escalations';

// Integration tests for the deal-automation server actions against the real USE_DB=true path on a
// migrated + seeded Postgres. Same skip contract as repositories.test.ts: only run when
// DATABASE_URL is set AND USE_DB=true, so the default suite and Postgres-less envs are unaffected.
const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true';

describe.skipIf(!hasDb)('deal automation actions — USE_DB=true integration (seeded Postgres)', () => {
  // Reuse one seeded deal rather than constructing a full insert (deals have many NOT NULL columns
  // + a leadId FK). Pick deterministically by id so the same deal is exercised every run, then
  // snapshot its mutable columns and restore them after — keeps the shared DB idempotent.
  let dealId = '';
  let leadId = '';
  let escId = '';
  let snapshot: { stage: string; value: number; conf: number; escReason: string | null };
  let settingsId = '';
  let guardrailsSnapshot: Record<string, unknown> | null = null;

  // Drive the deal into the precondition for a scenario.
  async function setDeal(state: { stage: string; value?: number; conf?: number }) {
    await db
      .update(deals)
      .set({
        stage: state.stage as typeof deals.$inferInsert.stage,
        ...(state.value !== undefined ? { value: state.value } : {}),
        ...(state.conf !== undefined ? { conf: state.conf } : {}),
      })
      .where(eq(deals.id, dealId));
  }

  async function getDeal() {
    const [row] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
    return row;
  }

  async function getEsc() {
    const [row] = await db.select().from(escalations).where(eq(escalations.id, escId)).limit(1);
    return row ?? null;
  }

  async function cleanEsc() {
    await db.delete(escalations).where(eq(escalations.id, escId));
  }

  beforeAll(async () => {
    const [row] = await db.select().from(deals).orderBy(deals.id).limit(1);
    expect(row).toBeTruthy(); // seed must have run; fail loudly rather than silently no-op
    dealId = row.id;
    leadId = row.leadId;
    escId = `esc-deal-${dealId}`;
    snapshot = { stage: row.stage, value: row.value, conf: row.conf, escReason: row.escReason };
    const [s] = await db.select().from(settings).limit(1);
    settingsId = s?.id ?? 'default';
    guardrailsSnapshot = (s?.guardrails as Record<string, unknown> | null) ?? null;
    // Clear any residue from a crashed prior run on a persistent local DB.
    await cleanEsc();
  });

  afterAll(async () => {
    // Restore the deal to its seeded state and remove the escalation this suite may have created.
    if (dealId) {
      await db
        .update(deals)
        .set({
          stage: snapshot.stage as typeof deals.$inferInsert.stage,
          value: snapshot.value,
          conf: snapshot.conf,
          escReason: snapshot.escReason,
        })
        .where(eq(deals.id, dealId));
      await cleanEsc();
    }
    if (settingsId) {
      await db.update(settings).set({ guardrails: guardrailsSnapshot }).where(eq(settings.id, settingsId));
    }
  });

  it('1. legal transition pricing → quoted persists', async () => {
    await setDeal({ stage: 'pricing' });
    const res = await updateDealStage(dealId, 'quoted');
    expect(res).toEqual({ ok: true });
    expect((await getDeal()).stage).toBe('quoted');
  });

  it('2. illegal transition pricing → won is rejected and leaves the row unchanged', async () => {
    await setDeal({ stage: 'pricing' });
    const res = await updateDealStage(dealId, 'won');
    expect(res.ok).toBe(false);
    expect(res.message).toContain('illegal');
    // No partial mutation: stage stays 'pricing' and no escalation is created.
    expect((await getDeal()).stage).toBe('pricing');
    expect(await getEsc()).toBeNull();
  });

  it('3. approval gate trips → parks deal in approval + opens a deal escalation', async () => {
    // value ≥ 4000 under seeded autonomy 'guarded' forces founder review even at high confidence.
    await cleanEsc();
    await setDeal({ stage: 'quoted', value: 9999, conf: 90 });
    const res = await updateDealStage(dealId, 'won');
    expect(res.ok).toBe(true);
    expect(res.escalated).toBe(true);

    expect((await getDeal()).stage).toBe('approval');
    const esc = await getEsc();
    expect(esc).not.toBeNull();
    expect(esc!.status).toBe('open');
    expect(esc!.kind).toBe('deal');
    expect(esc!.dealId).toBe(dealId);
    expect(esc!.value).toBe(9999);
    expect(esc!.conf).toBe(90);
  });

  it('4. below threshold + confident → auto-closes to won, no escalation', async () => {
    await cleanEsc();
    sendMock.mockClear();
    await setDeal({ stage: 'quoted', value: 1000, conf: 90 });
    const res = await updateDealStage(dealId, 'won');
    expect(res.ok).toBe(true);
    expect(res.escalated).toBeUndefined();

    expect((await getDeal()).stage).toBe('won');
    expect(await getEsc()).toBeNull();
    // The close fires the post-sale delivery trigger exactly once with the deal's lead.
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'deal/won', data: { dealId, leadId } }),
    );
  });

  it('5. approveDealEscalation resolves the escalation and closes the deal as won', async () => {
    // Re-create the escalation by re-running the gate (scenario-3 preconditions).
    await cleanEsc();
    await setDeal({ stage: 'quoted', value: 9999, conf: 90 });
    const gate = await updateDealStage(dealId, 'won');
    expect(gate.escalated).toBe(true);
    expect((await getDeal()).stage).toBe('approval');

    sendMock.mockClear();
    const res = await approveDealEscalation(escId);
    expect(res.ok).toBe(true);
    expect((await getEsc())!.status).toBe('resolved');
    expect((await getDeal()).stage).toBe('won');
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'deal/won', data: { dealId, leadId } }),
    );
  });

  it('6. rejectDealEscalation dismisses the escalation and marks the deal lost', async () => {
    await cleanEsc();
    await setDeal({ stage: 'quoted', value: 9999, conf: 90 });
    const gate = await updateDealStage(dealId, 'won');
    expect(gate.escalated).toBe(true);
    expect((await getDeal()).stage).toBe('approval');

    const res = await rejectDealEscalation(escId);
    expect(res.ok).toBe(true);
    expect((await getEsc())!.status).toBe('dismissed');
    expect((await getDeal()).stage).toBe('lost');
  });

  it('7. honors the configured auto-approve threshold from settings.guardrails', async () => {
    // Lower the configured limit below the deal value but above the default. If the action read the
    // wrong guardrails key it would fall back to the 4000 default and NOT escalate at value 3000.
    await cleanEsc();
    await db
      .update(settings)
      .set({ guardrails: { ...(guardrailsSnapshot ?? {}), autoApproveLimit: 2000 } })
      .where(eq(settings.id, settingsId));
    await setDeal({ stage: 'quoted', value: 3000, conf: 90 });
    const res = await updateDealStage(dealId, 'won');
    expect(res.escalated).toBe(true); // 3000 ≥ configured 2000 → gated (would be false at default 4000)
    expect((await getDeal()).stage).toBe('approval');
  });
});
