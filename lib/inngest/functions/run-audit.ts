import { eq } from 'drizzle-orm';
import { inngest, type AuditRequestedData } from '../client';
import { db } from '../../db/client';
import { audits, auditJobs, auditScreenshots, leads } from '../../db/schema';
import { runPerformanceAudit } from '../../audit/perf-audit';
import { captureScreenshots } from '../../audit/screenshot';
import { scoreScreenshots } from '../../audit/vision-scoring';
import { mapAuditResult } from '../../audit/map-audit-result';
import { greenfieldAudit } from '../../audit/greenfield-audit';
import { safeFetch } from '../../discovery/safe-fetch';
import { hasAuditableWebsite } from '../../discovery/website-presence';
import { recordActivity } from '../activity-log';

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
    // When part of an orchestrated run, report terminal failure (after retries are exhausted) as a
    // fact so the orchestrator can fail the run. Transient failures retry without emitting.
    onFailure: async ({ event, step }) => {
      const { leadId, runId } = event.data.event.data as AuditRequestedData;
      if (runId) {
        await step.sendEvent('emit-audit-failed', {
          name: 'audit/completed',
          data: { leadId, runId, outcome: 'failed' as const },
          id: `audit/completed:${runId}`,
        });
      }
    },
  },
  async ({ event, step }) => {
    const { leadId, runId } = event.data as AuditRequestedData;

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

      // GREENFIELD lead (the auto-hunter's target: contactable but NO website) — there is nothing to audit.
      // Save a "build a first site" brief and hand off to demo-gen (which designs from the real venue photos
      // + niche), skipping the URL-based performance + screenshot + vision passes entirely.
      if (!hasAuditableWebsite(lead.url)) {
        const mapped = greenfieldAudit(lead);
        await step.run('save-greenfield', async () => {
          await db
            .insert(audits)
            .values({ leadId, ...mapped })
            .onConflictDoUpdate({ target: audits.leadId, set: { ...mapped } });
          const dims = Object.values(mapped.scores);
          const site = Math.round(dims.reduce((sum, n) => sum + n, 0) / dims.length);
          const score = Math.min(95, site + 40);
          await db.update(leads).set({ site, score }).where(eq(leads.id, leadId));
          await db
            .insert(auditJobs)
            .values({ leadId, status: 'done', finishedAt: new Date() })
            .onConflictDoUpdate({
              target: auditJobs.leadId,
              set: { status: 'done', error: null, finishedAt: new Date(), updatedAt: new Date() },
            });
        });
        if (runId) {
          await step.sendEvent('emit-audit-completed', {
            name: 'audit/completed',
            data: { leadId, runId, outcome: 'ok' as const },
            id: `audit/completed:${runId}`,
          });
        }
        await step.run('log-activity-greenfield', async () => {
          await recordActivity({ agent: 'vega', room: 'audit', type: 'audit', text: `Audited ${lead.company} — greenfield (no current website)`, status: 'success' });
        });
        return { leadId, status: 'done' as const };
      }

      // Fail fast on a keyless deploy: the vision pass hard-requires GEMINI_API_KEY (inventing neutral
      // scores would fabricate the pipeline's sort key), so throw before burning a Chromium capture rather
      // than after. The greenfield branch above returns first, so keyless greenfield audits still work.
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is required to audit a lead that has a website');
      }

      // SSRF guard: the lead URL comes from discovery (attacker-influenceable) and both the Lighthouse engine
      // and the screenshot capture navigate to it from INSIDE the Docker network. Resolve + validate the FULL
      // redirect chain up front (safeFetch re-checks every hop) and navigate only to the settled public URL —
      // so the perf engine, which unlike the screenshot page has no per-request guard, can't be 3xx-walked to
      // an internal host. A throw (blocked host / too many redirects) lands in the catch → mark-failed.
      const safeUrl = await step.run('resolve-url', async () => {
        const { res, finalUrl } = await safeFetch(lead.url, { timeoutMs: 15000 });
        await res.body?.cancel().catch(() => {}); // validation only — don't download the body
        return finalUrl;
      });

      // Performance audit (PageSpeed hosted, or self-hosted Lighthouse) → small JSON, its own memoized step.
      const psi = await step.run('pagespeed', () => runPerformanceAudit(safeUrl));

      // Screenshot + vision in ONE step: the PNG Buffers stay in RAM and never cross a step
      // boundary (which would bloat/serialize-fail); only the small VisionScore JSON is returned.
      const vision = await step.run('screenshot-and-score', async () => {
        const shots = await captureScreenshots(safeUrl);
        // Cache the desktop screenshot (base64) as the real "current website" preview. Stored INSIDE this
        // step so the PNG Buffer never crosses a step boundary; only the small score JSON is returned.
        const png = shots.desktop.toString('base64');
        await db
          .insert(auditScreenshots)
          .values({ leadId, png })
          .onConflictDoUpdate({ target: auditScreenshots.leadId, set: { png, updatedAt: new Date() } });
        return scoreScreenshots({ shots, company: lead.company, industry: lead.industry });
      });

      await step.run('save', async () => {
        const mapped = mapAuditResult({ lead, psi, vision });
        await db
          .insert(audits)
          .values({ leadId, ...mapped })
          .onConflictDoUpdate({ target: audits.leadId, set: { ...mapped } });
        // The lead's headline numbers must come from the real audit, never a placeholder — they drive the
        // pipeline sort. site = measured current-site quality (avg of the scored dims); score = redesign
        // potential (the upside we can sell) = site + 40, capped at 95 so no lead ever looks perfect.
        const dims = Object.values(mapped.scores);
        const site = Math.round(dims.reduce((sum, n) => sum + n, 0) / dims.length);
        const score = Math.min(95, site + 40);
        await db.update(leads).set({ site, score }).where(eq(leads.id, leadId));
        await db
          .insert(auditJobs)
          .values({ leadId, status: 'done', finishedAt: new Date() })
          .onConflictDoUpdate({
            target: auditJobs.leadId,
            set: { status: 'done', error: null, finishedAt: new Date(), updatedAt: new Date() },
          });
      });

      // Tell the orchestrator the audit step succeeded so it can decide the next hop. Only for
      // orchestrated runs — a one-off manual audit (no runId) drives no pipeline.
      if (runId) {
        // One audit/completed per run (id keyed by runId) — success and the onFailure variant share
        // the id, and they're mutually exclusive, so the orchestrator processes exactly one.
        await step.sendEvent('emit-audit-completed', {
          name: 'audit/completed',
          data: { leadId, runId, outcome: 'ok' as const },
          id: `audit/completed:${runId}`,
        });
      }

      await step.run('log-activity', async () => {
        const [l] = await db.select({ company: leads.company }).from(leads).where(eq(leads.id, leadId)).limit(1);
        await recordActivity({ agent: 'vega', room: 'audit', type: 'audit', text: `Audited ${l?.company ?? leadId}`, status: 'success' });
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
