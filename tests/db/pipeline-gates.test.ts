import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

// The pipeline-gate actions reach Next + Better Auth + the Inngest client, none of which exist under
// vitest. Stub them; capture inngest.send with a spy so we can assert the control event emitted.
const sendMock = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: async () => ({ id: 'founder', email: 'founder@agentsverse.ai' }),
}));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: sendMock } }));

import { db } from '@/lib/db/client';
import { leads, pipelineRuns, escalations } from '@/lib/db/schema';
import { approvePipelineEscalation, rejectPipelineEscalation } from '@/lib/actions/escalations';

// Integration tests for the founder approve/reject of a pipeline-gate escalation, on a migrated +
// seeded Postgres. Same skip contract as the other db suites (DATABASE_URL + USE_DB=true).
const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true';

describe.skipIf(!hasDb)('pipeline gate actions — USE_DB=true integration (seeded Postgres)', () => {
  let leadId = '';
  let runId = '';
  let escId = '';

  async function cleanup() {
    if (escId) await db.delete(escalations).where(eq(escalations.id, escId));
    if (leadId) await db.delete(pipelineRuns).where(eq(pipelineRuns.leadId, leadId));
  }

  // Recreate a run parked at the audit gate with an open pipeline escalation linked to it.
  async function seedGatedRun() {
    await cleanup();
    sendMock.mockClear();
    await db
      .insert(pipelineRuns)
      .values({ id: runId, leadId, stage: 'audit', status: 'waiting_approval', autonomySnapshot: 'manual' });
    await db.insert(escalations).values({
      id: escId,
      kind: 'pipeline',
      sev: 'medium',
      title: 'Approve next step',
      who: 'Test Co',
      value: 0,
      agent: 'nova',
      reason: 'gate',
      rec: 'approve or reject',
      conf: 80,
      time: 'just now',
      status: 'open',
      runId,
    });
  }

  beforeAll(async () => {
    const [lead] = await db.select().from(leads).orderBy(leads.id).limit(1);
    expect(lead).toBeTruthy(); // seed must have run
    leadId = lead.id;
    runId = `test-run-gate-${leadId}`;
    escId = `esc-pipeline-${runId}-audit`;
    await cleanup();
  });

  afterAll(cleanup);

  it('approve resolves the escalation and emits pipeline/resumed for the run', async () => {
    await seedGatedRun();
    const res = await approvePipelineEscalation(escId);
    expect(res.ok).toBe(true);

    const [esc] = await db.select().from(escalations).where(eq(escalations.id, escId)).limit(1);
    expect(esc.status).toBe('resolved');
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'pipeline/resumed', data: { runId } }),
    );
  });

  it('reject dismisses the escalation and emits pipeline/halted for the run', async () => {
    await seedGatedRun();
    const res = await rejectPipelineEscalation(escId);
    expect(res.ok).toBe(true);

    const [esc] = await db.select().from(escalations).where(eq(escalations.id, escId)).limit(1);
    expect(esc.status).toBe('dismissed');
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'pipeline/halted', data: { runId } }),
    );
  });

  it('rejects an escalation with no linked run (defensive) and emits nothing', async () => {
    const orphanId = `esc-pipeline-orphan-${leadId}`;
    await db.delete(escalations).where(eq(escalations.id, orphanId));
    await db.insert(escalations).values({
      id: orphanId,
      kind: 'pipeline',
      sev: 'medium',
      title: 'orphan',
      who: 'Test Co',
      value: 0,
      agent: 'nova',
      reason: 'gate',
      rec: 'x',
      conf: 80,
      time: 'just now',
      status: 'open',
    });
    sendMock.mockClear();
    const res = await approvePipelineEscalation(orphanId);
    expect(res.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
    await db.delete(escalations).where(eq(escalations.id, orphanId));
  });

  it('a failed send leaves the escalation OPEN + re-actionable (emit-before-update atomicity)', async () => {
    await seedGatedRun();
    sendMock.mockRejectedValueOnce(new Error('inngest send failed'));
    // The action emits before marking resolved, so a send failure propagates and the row is untouched.
    await expect(approvePipelineEscalation(escId)).rejects.toThrow();

    const [esc] = await db.select().from(escalations).where(eq(escalations.id, escId)).limit(1);
    expect(esc.status).toBe('open'); // still actionable — not stranded as resolved-with-no-resume
  });
});
