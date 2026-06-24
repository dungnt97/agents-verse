import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { builds, pipelineRuns, leads } from '@/lib/db/schema';
import { getBuild } from '@/lib/repositories/builds';
import { getActivePipelineRuns } from '@/lib/repositories/pipeline-runs';
import { getSettings } from '@/lib/repositories/ops';

// Integration tests for the delivery/observability reads + the cost-policy seed against a migrated +
// seeded Postgres. Same skip contract as the other db suites: only run with DATABASE_URL + USE_DB=true.
// These insert + clean up their own rows (builds / pipeline_runs) so the shared DB stays idempotent.
const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true';

describe.skipIf(!hasDb)('delivery + observability reads — USE_DB=true integration (seeded Postgres)', () => {
  let leadId = '';
  let company = '';
  const runId = 'test-run-delivery-flow';

  beforeAll(async () => {
    const [lead] = await db.select().from(leads).orderBy(leads.id).limit(1);
    expect(lead).toBeTruthy(); // seed must have run
    leadId = lead.id;
    company = lead.company;
    // Clear any residue from a crashed prior run on a persistent local DB.
    await db.delete(builds).where(eq(builds.leadId, leadId));
    await db.delete(pipelineRuns).where(eq(pipelineRuns.leadId, leadId));
  });

  afterAll(async () => {
    if (leadId) {
      await db.delete(builds).where(eq(builds.leadId, leadId));
      await db.delete(pipelineRuns).where(eq(pipelineRuns.leadId, leadId));
    }
  });

  it('getBuild returns null before a build, then the row once Cipher stores one', async () => {
    expect(await getBuild(leadId)).toBeNull();
    await db.insert(builds).values({ leadId, status: 'ready', html: '<html><head></head><body>ok</body></html>' });
    const build = await getBuild(leadId);
    expect(build).not.toBeNull();
    expect(build!.status).toBe('ready');
    expect(build!.html).toContain('<body>ok</body>');
  });

  it('getActivePipelineRuns surfaces an in-flight run with the lead company', async () => {
    await db.insert(pipelineRuns).values({ id: runId, leadId, stage: 'audit', status: 'running', autonomySnapshot: 'guarded' });
    const active = await getActivePipelineRuns();
    const mine = active.find((r) => r.id === runId);
    expect(mine).toBeTruthy();
    expect(mine!.leadId).toBe(leadId);
    expect(mine!.company).toBe(company);
    expect(mine!.stage).toBe('audit');

    // A done run drops out of the active set.
    await db.update(pipelineRuns).set({ status: 'done' }).where(eq(pipelineRuns.id, runId));
    expect((await getActivePipelineRuns()).find((r) => r.id === runId)).toBeUndefined();
  });

  it('seeded guardrails carry the founder cost policy the Ledger reads (dailyCostLimit + costPerRun)', async () => {
    const s = await getSettings();
    expect(s).not.toBeNull();
    const g = (s!.guardrails ?? {}) as Record<string, unknown>;
    expect(typeof g.dailyCostLimit).toBe('number');
    expect(typeof g.costPerRun).toBe('number');
  });
});
