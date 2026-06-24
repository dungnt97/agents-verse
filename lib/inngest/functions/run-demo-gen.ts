import { eq } from 'drizzle-orm';
import { inngest, type DemoRequestedData } from '../client';
import { db } from '../../db/client';
import { leads, audits, generatedDemos } from '../../db/schema';
import { generateDemoHtml } from '../../agents/pipelines/demo';

// Durable demo-generation pipeline (runs in the WORKER only — it shells out to the `claude` CLI).
// Relative imports + no `server-only` since this executes under tsx. Serialized per-lead so two
// requests for the same lead never run the (slow, paid-by-subscription) generation concurrently.
export const runDemoGen = inngest.createFunction(
  {
    id: 'run-demo-gen',
    // 2 retries: each Inngest retry RESUMES from the last completed pass (the steps are checkpointed),
    // so a pass that loses a multi-minute gateway spike gets re-attempted across Inngest's longer
    // (minutes) backoff windows — on top of runAgent's in-pass retries — before the run is failed.
    retries: 2,
    // Two caps: the keyless entry caps THIS function's total concurrent generations (fn-scoped, the
    // subscription/VPS-burst guard); the keyed entry serializes per lead. As the only claude-CLI fn
    // today, the fn-scoped cap is effectively the global claude budget. When a second claude-CLI fn
    // is added it must share this budget via an account/env-scoped concurrency key, not a second
    // keyless fn-scoped limit (which would NOT be shared).
    concurrency: [
      { limit: Number(process.env.CLAUDE_AGENT_CONCURRENCY) || 2 },
      { limit: 1, key: 'event.data.leadId' },
    ],
    triggers: [{ event: 'demo/requested' }],
    // Report terminal failure (after retries) as a fact so the orchestrator can fail the run.
    onFailure: async ({ event, step }) => {
      const { leadId, runId } = event.data.event.data as DemoRequestedData;
      if (runId) {
        await step.sendEvent('emit-demo-failed', {
          name: 'demo/completed',
          data: { leadId, runId, outcome: 'failed' as const },
          id: `demo/completed:${runId}`,
        });
      }
    },
  },
  async ({ event, step }) => {
    const { leadId, runId } = event.data as DemoRequestedData;

    await step.run('mark-generating', async () => {
      await db
        .insert(generatedDemos)
        .values({ leadId, status: 'generating', error: null, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: generatedDemos.leadId,
          set: { status: 'generating', error: null, updatedAt: new Date() },
        });
    });

    try {
      // Read lead + its audit (the redesign brief). Cheap + idempotent on retry.
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (!lead) throw new Error(`lead not found: ${leadId}`);
      const [audit] = await db.select().from(audits).where(eq(audits.leadId, leadId)).limit(1);
      if (!audit) throw new Error(`no audit for lead: ${leadId}`);

      // Run the multi-pass pipeline with each pass as its own memoized step (research → director →
      // build → review-revise). A retry / worker restart resumes from the last completed pass instead
      // of re-spending the whole ~20-32 min run — the expensive ~6-min build is never redone once done.
      const html = await generateDemoHtml(
        {
          company: lead.company,
          industry: lead.industry,
          city: lead.city,
          url: lead.url,
          scores: audit.scores,
          problems: audit.problems,
          redesign: audit.redesign,
          summary: audit.summary,
        },
        { run: (id, fn) => step.run(id, fn) },
      );

      await step.run('save', async () => {
        await db
          .insert(generatedDemos)
          .values({ leadId, html, status: 'ready', error: null, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: generatedDemos.leadId,
            set: { html, status: 'ready', error: null, updatedAt: new Date() },
          });
      });

      // Tell the orchestrator the demo step succeeded so it can close the run (or, in later phases,
      // hop onward). Only for orchestrated runs — a one-off manual demo (no runId) drives no pipeline.
      if (runId) {
        // One demo/completed per run (id keyed by runId), shared with the onFailure variant.
        await step.sendEvent('emit-demo-completed', {
          name: 'demo/completed',
          data: { leadId, runId, outcome: 'ok' as const },
          id: `demo/completed:${runId}`,
        });
      }

      return { leadId, status: 'ready' as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await step.run('mark-failed', async () => {
        await db
          .insert(generatedDemos)
          .values({ leadId, status: 'failed', error: message, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: generatedDemos.leadId,
            set: { status: 'failed', error: message, updatedAt: new Date() },
          });
      });
      throw err;
    }
  },
);
