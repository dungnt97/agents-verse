import { and, eq, inArray } from 'drizzle-orm';
import { inngest, type PipelineFactData } from '../client';
import { db } from '../../db/client';
import { pipelineRuns, settings } from '../../db/schema';
import {
  decideNextHop,
  ACTIVE_RUN_STATUSES,
  type NextHop,
  type PipelineFact,
  type PipelineStage,
  type PipelineRunStatus,
} from '../pipeline-machine';
import type { AutonomyMode } from '../../data/deal-stage-machine';

// Central pipeline router (WORKER only — relative imports + no `server-only` so it runs under tsx).
// Listens to every worker fact event, reads the run ticket + LIVE founder settings, asks the pure
// machine for the next hop, then applies it: fire the next agent, park at a gate, close, or fail.
// Worker functions stay "dumb" (do work → emit one fact); all routing + gating + run-state writes
// live here so pause/kill-switch + resume + autonomy have a single decision point. Serialized per
// run (concurrency key) so two deliveries of the same fact can't interleave.
export const orchestratePipeline = inngest.createFunction(
  {
    id: 'orchestrate-pipeline',
    retries: 2,
    concurrency: [{ limit: 1, key: 'event.data.runId' }],
    triggers: [{ event: 'audit/completed' }, { event: 'demo/completed' }],
    // If the router itself exhausts retries (e.g. the next-hop send fails through an Inngest outage
    // after the stage write already committed), fail the run so it leaves the active set — otherwise
    // it would sit 'running' forever with no fact left to move it, and the partial-unique index would
    // block any fresh start for the lead. Failing it frees the lead to be restarted.
    onFailure: async ({ event, step }) => {
      const { runId } = event.data.event.data as PipelineFactData;
      await step.run('orchestrator-mark-failed', async () => {
        await db
          .update(pipelineRuns)
          .set({ status: 'failed', error: 'orchestrator failed', updatedAt: new Date() })
          .where(and(eq(pipelineRuns.id, runId), inArray(pipelineRuns.status, ACTIVE_RUN_STATUSES)));
      });
    },
  },
  async ({ event, step }) => {
    const fact = event.name as PipelineFact;
    const { runId, leadId, outcome } = event.data as PipelineFactData;

    // Decide INSIDE a memoized step: the run row is mutable and our own writes below advance it, so
    // re-reading it on an Inngest replay would re-derive a DIFFERENT hop (e.g. a now-"stale" stop)
    // and skip the send-event step — stalling the pipeline. Memoizing the read+decision freezes the
    // branch across replays. Live settings are read here so a founder toggle takes effect per-step.
    const hop = await step.run('decide', async (): Promise<NextHop> => {
      const [run] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, runId)).limit(1);
      if (!run) return { kind: 'stop', reason: 'run not found' };
      const [s] = await db.select().from(settings).limit(1);
      const autonomyMode = (s?.autonomyMode as AutonomyMode | undefined) ?? 'guarded';
      return decideNextHop({
        fact,
        outcome,
        run: { stage: run.stage as PipelineStage, status: run.status as PipelineRunStatus },
        settings: { autonomyMode },
      });
    });

    switch (hop.kind) {
      case 'emit': {
        // Conditional advance: idempotent on the rare step-body double-exec (WHERE stage=from → 0
        // rows the second time, harmless). The decision to emit comes from the memoized `hop`, NOT
        // from this write's row count, so a re-exec can't lose the send.
        await step.run('advance-stage', async () => {
          // Guard on status='running' specifically (not the whole active set): the machine only
          // emits from a running run, so a parked/paused row must never be advanced by a write here.
          await db
            .update(pipelineRuns)
            .set({ stage: hop.to, status: 'running', error: null, updatedAt: new Date() })
            .where(
              and(
                eq(pipelineRuns.id, runId),
                eq(pipelineRuns.stage, hop.from),
                eq(pipelineRuns.status, 'running'),
              ),
            );
        });
        // Event `id` makes the next hop exactly-once across the chain even if this step re-executes.
        await step.sendEvent('emit-next', {
          name: hop.event,
          data: { leadId, runId },
          id: `${hop.event}:${runId}`,
        });
        return { runId, hop: hop.kind, to: hop.to };
      }
      case 'done': {
        await step.run('mark-done', async () => {
          await db
            .update(pipelineRuns)
            .set({ status: 'done', updatedAt: new Date() })
            .where(
              and(
                eq(pipelineRuns.id, runId),
                eq(pipelineRuns.stage, hop.from),
                eq(pipelineRuns.status, 'running'),
              ),
            );
        });
        return { runId, hop: hop.kind };
      }
      case 'gate': {
        // Park the run for founder review. The escalation row + resume button arrive in the next
        // phase; here the run simply waits so nothing auto-advances past the gate.
        await step.run('park-waiting', async () => {
          await db
            .update(pipelineRuns)
            .set({ status: 'waiting_approval', updatedAt: new Date() })
            .where(
              and(
                eq(pipelineRuns.id, runId),
                eq(pipelineRuns.stage, hop.from),
                eq(pipelineRuns.status, 'running'),
              ),
            );
        });
        return { runId, hop: hop.kind, reason: hop.reason };
      }
      case 'fail': {
        await step.run('mark-failed', async () => {
          await db
            .update(pipelineRuns)
            .set({ status: 'failed', error: hop.reason, updatedAt: new Date() })
            .where(and(eq(pipelineRuns.id, runId), inArray(pipelineRuns.status, ACTIVE_RUN_STATUSES)));
        });
        return { runId, hop: hop.kind, reason: hop.reason };
      }
      case 'stop':
        return { runId, hop: hop.kind, reason: hop.reason };
    }
  },
);
