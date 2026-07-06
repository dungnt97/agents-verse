import { randomUUID } from 'node:crypto';
import { inngest } from './client';
import { db } from '../db/client';
import { pipelineRuns } from '../db/schema';
import type { AutonomyMode } from '../data/deal-stage-machine';

// Open a pipeline run ticket for a lead and fire its first audit event — the worker-safe kickoff shared
// by the web action (lib/actions/start-pipeline.ts, which layers on the auth gate + revalidate) and the
// discovery core's auto-chain (which runs inside the Inngest worker under tsx). Relative imports and no
// `server-only`, so it loads in either runtime. Idempotent: the partial-unique active-lead index turns a
// concurrent/duplicate start into a no-op (ON CONFLICT DO NOTHING → empty returning → ok:false), so the
// auto-chain can call it per freshly discovered lead without double-starting an in-flight run.
export async function startPipelineRun(
  leadId: string,
  autonomySnapshot: AutonomyMode,
): Promise<{ ok: boolean; runId?: string }> {
  const runId = randomUUID();
  const inserted = await db
    .insert(pipelineRuns)
    .values({ id: runId, leadId, stage: 'audit', status: 'running', autonomySnapshot })
    .onConflictDoNothing()
    .returning({ id: pipelineRuns.id });
  if (inserted.length === 0) return { ok: false };

  // Event `id` dedupes a double-submit: re-sending the same run's first event is a no-op upstream.
  await inngest.send({ name: 'audit/requested', data: { leadId, runId }, id: `audit/requested:${runId}` });
  return { ok: true, runId };
}
