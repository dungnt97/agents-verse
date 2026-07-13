import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { leads, pipelineRuns } from '@/lib/db/schema';
import { reapStaleRunsRun } from '@/lib/inngest/functions/reap-stale-runs';

const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true';
const step = { run: async <T>(_id: string, fn: () => Promise<T>) => fn() }; // trivial passthrough step

const OLD = new Date(Date.now() - 200 * 60_000); // older than the 120-min default timeout
const FRESH = new Date();

describe.skipIf(!hasDb)('reapStaleRunsRun (the stranded-run reaper)', () => {
  const ids = ['run-reap-a', 'run-reap-b', 'run-reap-c', 'run-reap-d'];
  let leadIds: string[] = [];

  beforeAll(async () => {
    // Four distinct leads — the active-lead partial-unique index forbids >1 active run per lead.
    const rows = await db.select({ id: leads.id }).from(leads).orderBy(leads.id).limit(4);
    leadIds = rows.map((r) => r.id);
    expect(leadIds.length).toBe(4);
    await db.delete(pipelineRuns).where(inArray(pipelineRuns.id, ids));
    await db.insert(pipelineRuns).values([
      { id: ids[0], leadId: leadIds[0], stage: 'audit', status: 'running', autonomySnapshot: 'guarded', updatedAt: OLD },        // stale → reap
      { id: ids[1], leadId: leadIds[1], stage: 'audit', status: 'running', autonomySnapshot: 'guarded', updatedAt: FRESH },      // fresh → keep
      { id: ids[2], leadId: leadIds[2], stage: 'demo', status: 'waiting_approval', autonomySnapshot: 'guarded', updatedAt: OLD }, // founder gate → keep
      { id: ids[3], leadId: leadIds[3], stage: 'demo', status: 'paused', autonomySnapshot: 'guarded', updatedAt: OLD },          // kill switch → keep
    ]);
  });
  afterAll(async () => {
    await db.delete(pipelineRuns).where(inArray(pipelineRuns.id, ids));
  });

  it('fails ONLY a stale running run — never a fresh one, a gate, or a paused run', async () => {
    const res = await reapStaleRunsRun(step);
    expect(res.reaped).toBe(1);

    const after = Object.fromEntries(
      (await db.select().from(pipelineRuns).where(inArray(pipelineRuns.id, ids))).map((r) => [r.id, r.status]),
    );
    expect(after[ids[0]]).toBe('failed'); // stale running → reaped
    expect(after[ids[1]]).toBe('running'); // fresh → untouched
    expect(after[ids[2]]).toBe('waiting_approval'); // gate → untouched
    expect(after[ids[3]]).toBe('paused'); // kill switch → untouched
  });
});
