import { and, count, eq, gte, inArray, sql } from 'drizzle-orm';
import { inngest, type PipelineFactData } from '../client';
import { db } from '../../db/client';
import { pipelineRuns, settings, leads, audits, escalations } from '../../db/schema';
import {
  decideNextHop,
  decideResume,
  decideHalt,
  ACTIVE_RUN_STATUSES,
  type NextHop,
  type PipelineFact,
  type PipelineStage,
  type PipelineRunStatus,
} from '../pipeline-machine';
import { computeCostMeter } from '../../data/cost-meter';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
import type { AutonomyMode } from '../../data/deal-stage-machine';

// Central pipeline router (WORKER only — relative imports + no `server-only` so it runs under tsx).
// Listens to worker fact events AND founder control events, reads the run ticket + LIVE settings,
// asks the pure machine for the next hop, then applies it: fire the next agent, open a gate, resume
// or halt a parked run, close, or fail. Worker functions stay "dumb" (do work → emit one fact); all
// routing + gating + run-state writes live here so pause/kill-switch + approve/reject have a single
// decision point. Serialized per run (concurrency key) so deliveries for one run can't interleave.
export const orchestratePipeline = inngest.createFunction(
  {
    id: 'orchestrate-pipeline',
    retries: 2,
    concurrency: [{ limit: 1, key: 'event.data.runId' }],
    triggers: [
      { event: 'audit/completed' },
      { event: 'demo/completed' },
      { event: 'outreach/sent' },
      { event: 'pipeline/resumed' },
      { event: 'pipeline/halted' },
    ],
    // If the router itself exhausts retries (e.g. the next-hop send fails through an Inngest outage
    // after the stage write already committed), fail the run so it leaves the active set — otherwise
    // it would sit 'running' forever with no fact left to move it, and the partial-unique index would
    // block any fresh start for the lead. Failing it frees the lead to be restarted.
    onFailure: async ({ event, step }) => {
      const { runId } = event.data.event.data as { runId: string };
      await step.run('orchestrator-mark-failed', async () => {
        await db
          .update(pipelineRuns)
          .set({ status: 'failed', error: 'orchestrator failed', updatedAt: new Date() })
          .where(and(eq(pipelineRuns.id, runId), inArray(pipelineRuns.status, ACTIVE_RUN_STATUSES)));
      });
    },
  },
  async ({ event, step }) => {
    const eventName = event.name;
    const { runId } = event.data as { runId: string };

    // Decide INSIDE a memoized step: the run row is mutable and our own writes below advance it, so
    // re-reading it on an Inngest replay would re-derive a DIFFERENT hop and skip the send-event
    // step — stalling the pipeline. Memoizing the read+decision freezes the branch across replays.
    // Live settings are read here so a founder autonomy toggle takes effect per hop. leadId is
    // returned from the run row (not event.data) so resume/halt events need only carry runId.
    const decision = await step.run('decide', async (): Promise<{ hop: NextHop; leadId: string | null }> => {
      const [run] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, runId)).limit(1);
      if (!run) return { hop: { kind: 'stop', reason: 'run not found' }, leadId: null };
      const runState = { stage: run.stage as PipelineStage, status: run.status as PipelineRunStatus };

      let hop: NextHop;
      if (eventName === 'pipeline/resumed') {
        hop = decideResume(runState);
      } else if (eventName === 'pipeline/halted') {
        hop = decideHalt(runState);
      } else {
        const [s] = await db.select().from(settings).limit(1);
        const autonomyMode = (s?.autonomyMode as AutonomyMode | undefined) ?? 'guarded';
        const { outcome } = event.data as PipelineFactData;
        hop = decideNextHop({ fact: eventName as PipelineFact, outcome, run: runState, settings: { autonomyMode } });
      }
      return { hop, leadId: run.leadId };
    });

    const { hop, leadId } = decision;

    switch (hop.kind) {
      case 'emit': {
        // Conditional advance pinned to the decision's expected from-stage AND from-status: an
        // auto-hop releases a 'running' run, a founder resume a 'waiting_approval' one. A duplicate
        // delivery finds the row already moved → 0 rows updated → no second emit. The decision to
        // emit comes from the memoized `hop`, NOT this write's row count, so a re-exec can't lose it.
        await step.run('advance-stage', async () => {
          await db
            .update(pipelineRuns)
            .set({ stage: hop.to, status: 'running', error: null, updatedAt: new Date() })
            .where(
              and(
                eq(pipelineRuns.id, runId),
                eq(pipelineRuns.stage, hop.from),
                eq(pipelineRuns.status, hop.fromStatus),
              ),
            );
        });
        // Event `id` makes the next hop exactly-once across the chain even if this step re-executes.
        // A resume-from-pause re-request (from === to) must NOT reuse the stage-keyed id — that id
        // was consumed when the stage first fired — so it derives a fresh one from this delivery.
        await step.sendEvent('emit-next', {
          name: hop.event,
          data: { leadId, runId },
          id: hop.from === hop.to ? `${hop.event}:${runId}:${event.id ?? 'resume'}` : `${hop.event}:${runId}`,
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
        // Ledger: a run just completed — re-estimate today's spend (runs × rate) and, when it nears the
        // daily cap, surface/update a single per-day `cost` escalation. The cost is an ESTIMATE (the
        // subscription has no per-token bill), de-duped on a date-stamped id. Idempotent.
        await step.run('cost-check', async () => {
          const today = startOfToday();
          const [{ runs }] = await db
            .select({ runs: count() })
            .from(pipelineRuns)
            .where(gte(pipelineRuns.startedAt, today));
          const [s] = await db.select().from(settings).limit(1);
          const guardrails = (s?.guardrails as Record<string, unknown> | null) ?? {};
          const meter = computeCostMeter(Number(runs), {
            costPerRun: guardrails.costPerRun,
            // `dailyCostLimit` is the founder-facing key the Settings UI + seed write; read it here
            // (an earlier draft read `dailyCostCap`, which nothing wrote — the cap silently fell back
            // to the default and the founder's policy never applied).
            dailyCap: guardrails.dailyCostLimit,
          });
          if (!meter.nearCap) return;
          const pct = Math.round(meter.fractionUsed * 100);
          const reason = `~${meter.runs} pipeline runs today ≈ $${meter.estimatedCost} of the $${meter.dailyCap} daily cap (rough estimate, not a bill).`;
          await db
            .insert(escalations)
            .values({
              id: `esc-cost-${today.toISOString().slice(0, 10)}`,
              kind: 'cost',
              sev: meter.overCap ? 'high' : 'medium',
              title: `Estimated AI spend at ${pct}% of the daily cap`,
              who: 'Ledger',
              value: Math.round(meter.estimatedCost),
              agent: 'ledger',
              reason,
              rec: 'Pause new pipelines or raise the daily cap in Settings.',
              conf: 100,
              time: 'just now',
              status: 'open',
            })
            .onConflictDoUpdate({
              target: escalations.id,
              set: {
                sev: meter.overCap ? 'high' : 'medium',
                title: `Estimated AI spend at ${pct}% of the daily cap`,
                value: Math.round(meter.estimatedCost),
                reason,
                status: 'open',
                resolvedAt: null,
              },
              setWhere: sql`${escalations.status} <> 'dismissed'`,
            });
        });
        return { runId, hop: hop.kind };
      }
      case 'gate': {
        // Park the run for founder review AND open a pipeline escalation, only if THIS delivery is
        // the one that parks a still-running run (returning row guards against a duplicate opening a
        // second escalation). The founder's approve/reject in the Review Center emits pipeline/
        // resumed|halted, which routes back through this orchestrator to release or terminate the run.
        await step.run('park-and-escalate', async () => {
          // Park + open the escalation ATOMICALLY. If the insert (or a read) throws after the park
          // committed, a non-transactional retry would find the run already 'waiting_approval', skip
          // (parked=0), and never open the escalation — stranding the run with no way to resume. The
          // transaction rolls the park back on any error so the retry re-claims a 'running' row and
          // re-inserts. Mirrors the deal-escalation gate in lib/actions/deals.ts.
          await db.transaction(async (tx) => {
            const parked = await tx
              .update(pipelineRuns)
              .set({ status: 'waiting_approval', updatedAt: new Date() })
              .where(
                and(
                  eq(pipelineRuns.id, runId),
                  eq(pipelineRuns.stage, hop.from),
                  eq(pipelineRuns.status, 'running'),
                ),
              )
              .returning({ id: pipelineRuns.id });
            if (parked.length === 0) return; // already parked/advanced by another delivery — no dup escalation

            const [lead] = leadId
              ? await tx.select().from(leads).where(eq(leads.id, leadId)).limit(1)
              : [undefined];
            const [audit] = leadId
              ? await tx.select().from(audits).where(eq(audits.leadId, leadId)).limit(1)
              : [undefined];
            const company = lead?.company ?? leadId ?? runId;
            await tx
              .insert(escalations)
              .values({
                // Per-gate id (run + parked stage) so a run gated at more than one stage in later
                // phases gets a distinct escalation per gate rather than overwriting one row.
                id: `esc-pipeline-${runId}-${hop.from}`,
                kind: 'pipeline',
                sev: 'medium',
                title: `Approve next step for ${company}`,
                who: company,
                value: lead?.value ?? 0,
                agent: 'nova',
                reason: `Autonomy gate: founder approval required before advancing ${company} past ${hop.from}.`,
                rec: 'Approve to continue the pipeline; reject to halt this run.',
                conf: audit?.confidence ?? 80,
                time: 'just now',
                status: 'open',
                runId,
              })
              .onConflictDoUpdate({
                target: escalations.id,
                set: { status: 'open', resolvedAt: null },
              });
          });
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
