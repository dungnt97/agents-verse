import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

// start-pipeline reaches into Next + Better Auth + the Inngest client, none of which exist under
// vitest. Stub them so the action exercises only its DB logic (the partial-unique active-run guard):
//   - next/cache revalidatePath is a no-op here.
//   - getCurrentUser() returns a signed-in founder so the auth check passes when USE_DB=true.
//   - the inngest client `send` is a no-op (no live Inngest server in the test env).
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: async () => ({ id: 'founder', email: 'founder@agentsverse.ai' }),
}));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: async () => {} } }));

import { db } from '@/lib/db/client';
import { leads, pipelineRuns } from '@/lib/db/schema';
import { startPipeline, pausePipelineRun } from '@/lib/actions/start-pipeline';

// Integration tests for the pipeline-start action against the real USE_DB=true path on a migrated +
// seeded Postgres. Same skip contract as the other db suites: only run when DATABASE_URL is set AND
// USE_DB=true, so the default suite and Postgres-less envs are unaffected.
const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true';

describe.skipIf(!hasDb)('startPipeline — USE_DB=true integration (seeded Postgres)', () => {
  let leadId = '';

  async function cleanRuns() {
    if (leadId) await db.delete(pipelineRuns).where(eq(pipelineRuns.leadId, leadId));
  }

  beforeAll(async () => {
    const [row] = await db.select().from(leads).orderBy(leads.id).limit(1);
    expect(row).toBeTruthy(); // seed must have run; fail loudly rather than silently no-op
    leadId = row.id;
    await cleanRuns(); // clear residue from a crashed prior run on a persistent local DB
  });

  afterAll(cleanRuns);

  it('1. opens an active run at stage audit and queues the first event', async () => {
    await cleanRuns();
    const res = await startPipeline(leadId);
    expect(res.ok).toBe(true);
    expect(res.runId).toBeTruthy();

    const [run] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, res.runId!)).limit(1);
    expect(run.stage).toBe('audit');
    expect(run.status).toBe('running');
    expect(run.leadId).toBe(leadId);
  });

  it('2. a second start while one is active is a no-op (partial-unique active-run index)', async () => {
    await cleanRuns();
    const first = await startPipeline(leadId);
    expect(first.ok).toBe(true);

    const second = await startPipeline(leadId);
    expect(second.ok).toBe(false);
    expect(second.message).toContain('already running');

    // Exactly one run row exists for the lead — the duplicate inserted nothing.
    const rows = await db.select().from(pipelineRuns).where(eq(pipelineRuns.leadId, leadId));
    expect(rows).toHaveLength(1);
  });

  it('3. after a run finishes, a fresh start is allowed again', async () => {
    await cleanRuns();
    const first = await startPipeline(leadId);
    expect(first.ok).toBe(true);
    // Drive the first run terminal so it leaves the active set.
    await db.update(pipelineRuns).set({ status: 'done' }).where(eq(pipelineRuns.id, first.runId!));

    const second = await startPipeline(leadId);
    expect(second.ok).toBe(true);
    expect(second.runId).not.toBe(first.runId);

    const rows = await db.select().from(pipelineRuns).where(eq(pipelineRuns.leadId, leadId));
    expect(rows).toHaveLength(2); // the done run + the new active one
  });

  it('4. pausePipelineRun halts an active run (kill switch)', async () => {
    await cleanRuns();
    const res = await startPipeline(leadId);
    expect(res.ok).toBe(true);

    const paused = await pausePipelineRun(res.runId!);
    expect(paused.ok).toBe(true);
    const [run] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, res.runId!)).limit(1);
    expect(run.status).toBe('paused');
  });

  it('5. pausePipelineRun does NOT pause a run parked at a gate (avoids stranding it)', async () => {
    // A waiting_approval run is moved by approving/rejecting its escalation, not by the kill switch —
    // pausing it would let an approve consume the escalation while the run stays paused with no resume.
    await cleanRuns();
    const res = await startPipeline(leadId);
    expect(res.ok).toBe(true);
    await db.update(pipelineRuns).set({ status: 'waiting_approval' }).where(eq(pipelineRuns.id, res.runId!));

    const paused = await pausePipelineRun(res.runId!);
    expect(paused.ok).toBe(true); // action succeeds, but the conditional write matches nothing
    const [run] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, res.runId!)).limit(1);
    expect(run.status).toBe('waiting_approval'); // unchanged — not paused
  });
});
