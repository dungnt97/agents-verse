import 'server-only';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { pipelineRuns, leads } from '@/lib/db/schema';
import { ACTIVE_RUN_STATUSES, type PipelineStage, type PipelineRunStatus } from '@/lib/inngest/pipeline-machine';
import { USE_DB } from './config';

// Read/observability surface for the central pipeline ledger (`pipeline_runs`). Writes happen in the
// worker orchestrator; this is the web-side reader the dashboard uses to show which leads are mid-flight
// and which agent currently drives each. Returns [] in mock mode (no orchestrator without a DB).
export interface ActivePipelineRun {
  id: string;
  leadId: string;
  company: string;
  stage: PipelineStage;
  status: PipelineRunStatus;
  updatedAt: Date;
}

// Runs still "in flight" (running / waiting_approval / paused), newest first, with the lead's company
// for display. The agent-activity overlay maps each run's stage → the agent that owns that stage.
export async function getActivePipelineRuns(): Promise<ActivePipelineRun[]> {
  if (!USE_DB) return [];
  const rows = await db
    .select({
      id: pipelineRuns.id,
      leadId: pipelineRuns.leadId,
      company: leads.company,
      stage: pipelineRuns.stage,
      status: pipelineRuns.status,
      updatedAt: pipelineRuns.updatedAt,
    })
    .from(pipelineRuns)
    .leftJoin(leads, eq(leads.id, pipelineRuns.leadId))
    .where(inArray(pipelineRuns.status, [...ACTIVE_RUN_STATUSES]))
    .orderBy(desc(pipelineRuns.updatedAt));
  return rows.map((r) => ({
    id: r.id,
    leadId: r.leadId,
    company: r.company ?? r.leadId,
    stage: r.stage as PipelineStage,
    status: r.status as PipelineRunStatus,
    updatedAt: r.updatedAt,
  }));
}
