'use server';

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { inngest } from '@/lib/inngest/client';
import { getCurrentUser } from '@/lib/auth/session';
import { USE_DB } from '@/lib/repositories/config';
import { db } from '@/lib/db/client';
import { leads, settings, pipelineRuns } from '@/lib/db/schema';
import type { AutonomyMode } from '@/lib/data/deal-stage-machine';

export interface StartPipelineResult {
  ok: boolean;
  message: string;
  runId?: string;
}

// Kick off an autonomous pipeline run for a lead. Web-side only: it opens the run ticket and sends
// the first Inngest event; the worker runs the actual audit→demo chain via orchestrate-pipeline.
// Importing the inngest CLIENT (not the functions) keeps the worker engine out of the web bundle.
// Auth-guarded + degrades gracefully without a database.
export async function startPipeline(leadId: string): Promise<StartPipelineResult> {
  if (!USE_DB) return { ok: false, message: 'The pipeline requires the database (set USE_DB=true).' };
  if (!(await getCurrentUser())) throw new Error('Unauthorized');

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return { ok: false, message: 'Lead not found.' };

  // Snapshot the autonomy posture at start time (for the record); live hop decisions re-read settings.
  const [s] = await db.select().from(settings).limit(1);
  const autonomySnapshot = (s?.autonomyMode as AutonomyMode | undefined) ?? 'guarded';

  // The partial-unique active-lead index makes a concurrent/duplicate start a no-op: if a run is
  // already in flight for this lead, ON CONFLICT DO NOTHING inserts nothing and returning is empty.
  const runId = randomUUID();
  const inserted = await db
    .insert(pipelineRuns)
    .values({ id: runId, leadId, stage: 'audit', status: 'running', autonomySnapshot })
    .onConflictDoNothing()
    .returning({ id: pipelineRuns.id });

  if (inserted.length === 0) {
    return { ok: false, message: `A pipeline is already running for ${lead.company}.` };
  }

  // Event `id` dedupes a double-submit: re-sending the same run's first event is a no-op upstream.
  await inngest.send({ name: 'audit/requested', data: { leadId, runId }, id: `audit/requested:${runId}` });

  revalidatePath('/overview');
  revalidatePath('/audits');
  return { ok: true, message: `Pipeline started for ${lead.company}.`, runId };
}

// Founder kill switch: halt an actively-running run. The orchestrator's pure machine refuses to act
// on a paused run, so no further hop fires. Only a 'running' run is pausable: a run parked at a gate
// ('waiting_approval') is already stopped and is moved by approving/rejecting its escalation — pausing
// it would consume the escalation on approve and strand the run paused with no way to resume.
export async function pausePipelineRun(runId: string): Promise<{ ok: boolean; message?: string }> {
  if (!USE_DB) return { ok: false, message: 'This action needs the database (set USE_DB=true).' };
  if (!(await getCurrentUser())) throw new Error('Unauthorized');

  await db
    .update(pipelineRuns)
    .set({ status: 'paused', updatedAt: new Date() })
    .where(and(eq(pipelineRuns.id, runId), eq(pipelineRuns.status, 'running')));

  revalidatePath('/overview');
  return { ok: true };
}
