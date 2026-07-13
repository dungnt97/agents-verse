import { and, eq, lt } from 'drizzle-orm';
import { inngest } from '../client';
import { db } from '../../db/client';
import { pipelineRuns } from '../../db/schema';

// A pipeline run only advances when a worker step emits its completion fact. If a worker dies mid-step (an
// OOM kill, a crash, a lost gateway that outlasts the retries) the run is stranded in 'running' forever —
// and the active-lead partial-unique index then blocks that lead from EVER starting a fresh run. This cron
// is the backstop that closes such runs. Worker-only (relative imports, no `server-only`), runs under tsx.
//
// It fails ONLY runs stuck in 'running' past a generous timeout. It never touches 'waiting_approval' (a
// founder gate) or 'paused' (the kill switch) — those are intentional holds, and aging them out would
// silently discard the founder's decision.
const CRON = process.env.REAP_STALE_RUNS_CRON || '*/30 * * * *';
// Comfortably longer than the worst-case single stage — a demo-gen build runs ~20-32 min and may
// retry-and-resume — so a legitimately slow run is never reaped. Override via PIPELINE_RUN_TIMEOUT_MIN.
const TIMEOUT_MIN = Number(process.env.PIPELINE_RUN_TIMEOUT_MIN) || 120;

// Minimal shape of the Inngest step tool used by this function — lets the handler be unit-tested with a
// trivial `{ run: (id, fn) => fn() }` mock against a real Postgres, without the Inngest runtime.
type StepLike = { run<T>(id: string, fn: () => Promise<T>): Promise<T> };

// The reap pass, extracted so it is testable in isolation. Fails every run stuck in 'running' past the
// timeout; the WHERE clause is the whole guarantee (only 'running', never a founder gate or the kill switch).
export async function reapStaleRunsRun(step: StepLike): Promise<{ reaped: number }> {
  return step.run('reap', async () => {
    const cutoff = new Date(Date.now() - TIMEOUT_MIN * 60_000);
    const reaped = await db
      .update(pipelineRuns)
      .set({ status: 'failed', error: `reaped: no progress for over ${TIMEOUT_MIN} min`, updatedAt: new Date() })
      .where(and(eq(pipelineRuns.status, 'running'), lt(pipelineRuns.updatedAt, cutoff)))
      .returning({ id: pipelineRuns.id });
    return { reaped: reaped.length };
  });
}

export const reapStaleRuns = inngest.createFunction(
  {
    id: 'reap-stale-runs',
    concurrency: [{ limit: 1 }],
    retries: 0,
    triggers: [{ cron: CRON }],
  },
  // The cast bridges Inngest's Jsonify-wrapped step type to the simplified StepLike the extracted handler
  // uses; safe because the step results here carry no Date fields to round-trip.
  ({ step }) => reapStaleRunsRun(step as unknown as StepLike),
);
