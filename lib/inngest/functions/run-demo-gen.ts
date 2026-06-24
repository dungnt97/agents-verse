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
    retries: 1,
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

      // The CLI call is the slow part — its own step so a save failure doesn't re-spend the call.
      const html = await step.run('generate', () =>
        generateDemoHtml({
          company: lead.company,
          industry: lead.industry,
          city: lead.city,
          url: lead.url,
          scores: audit.scores,
          problems: audit.problems,
          redesign: audit.redesign,
          summary: audit.summary,
        }),
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
