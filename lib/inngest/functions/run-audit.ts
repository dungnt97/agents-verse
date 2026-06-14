import { eq } from 'drizzle-orm';
import { inngest, type AuditRequestedData } from '../client';
import { db } from '../../db/client';
import { audits, auditJobs, leads } from '../../db/schema';
import { runPageSpeedAudit } from '../../audit/pagespeed-client';
import { captureScreenshots } from '../../audit/screenshot';
import { scoreScreenshots } from '../../audit/vision-scoring';
import { mapAuditResult } from '../../audit/map-audit-result';

// Durable audit pipeline (runs in the WORKER only). Relative imports + no `server-only` — this
// chain executes under tsx. Steps are memoized so a retry resumes after the last completed step.
// concurrency.key serializes per-lead so two requests for the same lead never overlap.
export const runAudit = inngest.createFunction(
  {
    id: 'run-audit',
    retries: 2,
    // Two constraints: a GLOBAL cap (VPS OOM guard) AND per-lead serialization. A single keyed
    // limit only caps within each lead's own queue (no global cap), so both entries are needed.
    concurrency: [
      { limit: Number(process.env.AUDIT_CONCURRENCY) || 2 },
      { limit: 1, key: 'event.data.leadId' },
    ],
    triggers: [{ event: 'audit/requested' }],
  },
  async ({ event, step }) => {
    const { leadId } = event.data as AuditRequestedData;

    await step.run('mark-running', async () => {
      await db
        .insert(auditJobs)
        .values({ leadId, status: 'running', startedAt: new Date() })
        .onConflictDoUpdate({
          target: auditJobs.leadId,
          set: { status: 'running', startedAt: new Date(), error: null, updatedAt: new Date() },
        });
    });

    try {
      // Read outside a step (cheap, idempotent on retry) — keeps Date fields live (no step serialize).
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (!lead) throw new Error(`lead not found: ${leadId}`);

      // PSI returns small JSON → its own step (memoized).
      const psi = await step.run('pagespeed', () => runPageSpeedAudit(lead.url));

      // Screenshot + vision in ONE step: the PNG Buffers stay in RAM and never cross a step
      // boundary (which would bloat/serialize-fail); only the small VisionScore JSON is returned.
      const vision = await step.run('screenshot-and-score', async () => {
        const shots = await captureScreenshots(lead.url);
        return scoreScreenshots({ shots, company: lead.company, industry: lead.industry });
      });

      await step.run('save', async () => {
        const mapped = mapAuditResult({ lead, psi, vision });
        await db
          .insert(audits)
          .values({ leadId, ...mapped })
          .onConflictDoUpdate({ target: audits.leadId, set: { ...mapped } });
        await db
          .insert(auditJobs)
          .values({ leadId, status: 'done', finishedAt: new Date() })
          .onConflictDoUpdate({
            target: auditJobs.leadId,
            set: { status: 'done', error: null, finishedAt: new Date(), updatedAt: new Date() },
          });
      });

      return { leadId, status: 'done' as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await step.run('mark-failed', async () => {
        await db
          .insert(auditJobs)
          .values({ leadId, status: 'failed', error: message, finishedAt: new Date() })
          .onConflictDoUpdate({
            target: auditJobs.leadId,
            set: { status: 'failed', error: message, finishedAt: new Date(), updatedAt: new Date() },
          });
      });
      throw err; // surface to Inngest (retries, then run marked failed in history)
    }
  },
);
