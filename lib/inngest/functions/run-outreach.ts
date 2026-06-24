import { and, eq, sql } from 'drizzle-orm';
import { inngest, type OutreachRequestedData, type OutreachApprovedData } from '../client';
import { db } from '../../db/client';
import { leads, generatedDemos, audits, escalations, settings } from '../../db/schema';
import { runAgent } from '../../agents/runner';
import { echoOutreach } from '../../agents/defs/echo-outreach';
import { sendEmail, outreachEmailHtml, resendConfigured } from '../../integrations/resend';
import type { AutonomyMode } from '../../data/deal-stage-machine';

// Echo outreach (WORKER only — shells `claude` + makes the outbound email call; relative imports, no
// `server-only`). The HIGHEST-risk action: a real email to a real prospect. Sending is GATED by
// autonomy — only `full` sends unattended; every other mode drafts the email and parks it as an
// `outreach` escalation for the founder to approve before it goes out. Triggers: outreach/requested
// (draft → send-or-gate) and outreach/approved (send the okayed draft). Both send paths share one
// sendable-guard (don't email a lead already contacted or without a ready demo), a payload-stable
// idempotency key, and a mark-sent step that also clears any parked draft escalation.
const escId = (leadId: string) => `esc-outreach-${leadId}`;
const appUrl = () => process.env.APP_URL || process.env.BETTER_AUTH_URL || '';
const unsubscribeFor = (leadId: string) =>
  `mailto:${process.env.OUTREACH_REPLY_TO || process.env.OUTREACH_FROM || 'unsubscribe@localhost'}?subject=Unsubscribe%20${leadId}`;

type Sendable = { email: string; company: string } | { skip: string };

// One guard for BOTH send paths: refuse to email a lead that's already contacted, has no ready demo to
// link, has no address, or when email isn't configured at all (degrade instead of throw+retry).
async function loadSendable(leadId: string): Promise<Sendable> {
  if (!resendConfigured()) return { skip: 'email not configured (RESEND_API_KEY + OUTREACH_FROM)' };
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return { skip: 'lead not found' };
  if (lead.demo === 'sent') return { skip: 'already contacted' };
  if (!lead.email) return { skip: 'lead has no email' };
  const [demo] = await db.select().from(generatedDemos).where(eq(generatedDemos.leadId, leadId)).limit(1);
  if (!demo || demo.status !== 'ready') return { skip: 'no ready demo to link' };
  return { email: lead.email, company: lead.company };
}

// Send via Resend (idempotency-keyed per lead so a retry/duplicate can't email twice).
async function sendOutreachEmail(leadId: string, email: string, subject: string, body: string): Promise<void> {
  const unsubscribe = unsubscribeFor(leadId);
  const result = await sendEmail({
    to: email,
    subject,
    html: outreachEmailHtml(body, `${appUrl()}/demo/${leadId}`, unsubscribe),
    unsubscribe,
    idempotencyKey: `outreach:${leadId}`,
  });
  if (!result.ok) throw new Error(`outreach send failed: ${result.error}`);
}

// After a successful send: advance the lead AND resolve any parked draft escalation (so a stale draft
// can't be approved into a second send). Atomic + idempotent.
async function markSent(leadId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(leads).set({ stage: 'contacted', demo: 'sent' }).where(eq(leads.id, leadId));
    await tx
      .update(escalations)
      .set({ status: 'resolved', resolvedAt: new Date() })
      .where(and(eq(escalations.id, escId(leadId)), eq(escalations.status, 'open')));
  });
}

export const runOutreach = inngest.createFunction(
  {
    id: 'run-outreach',
    retries: 1,
    concurrency: [
      { limit: Number(process.env.CLAUDE_AGENT_CONCURRENCY) || 2 },
      { limit: 1, key: 'event.data.leadId' },
    ],
    triggers: [{ event: 'outreach/requested' }, { event: 'outreach/approved' }],
  },
  async ({ event, step }) => {
    const eventName = event.name;
    const { leadId } = event.data as { leadId: string };

    // Founder approved a parked draft → re-validate (the lead may have changed), then send.
    if (eventName === 'outreach/approved') {
      const { subject, body, runId } = event.data as OutreachApprovedData;
      const sendable = await step.run('check-approved', () => loadSendable(leadId));
      if ('skip' in sendable) {
        // The lead changed since the draft was parked (already contacted, demo unlinked…). Close the
        // originating run instead of leaving it stranded at 'outreach'.
        if (runId)
          await step.sendEvent('emit-skip', {
            name: 'outreach/sent',
            data: { leadId, runId, outcome: 'failed' },
            id: `outreach/sent:${leadId}`,
          });
        return { leadId, skipped: sendable.skip };
      }
      await step.run('send-approved', () => sendOutreachEmail(leadId, sendable.email, subject, body));
      await step.run('mark-sent-approved', () => markSent(leadId));
      await step.sendEvent('emit-sent', {
        name: 'outreach/sent',
        data: { leadId, runId, outcome: 'ok' },
        id: `outreach/sent:${leadId}`,
      });
      return { leadId, sent: true };
    }

    // outreach/requested — load + guard, draft, then send (full) or gate (everything else).
    const { runId } = event.data as OutreachRequestedData;
    const loaded = await step.run('load', async () => {
      const sendable = await loadSendable(leadId);
      if ('skip' in sendable) return { skip: sendable.skip };
      const [audit] = await db.select().from(audits).where(eq(audits.leadId, leadId)).limit(1);
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      const [s] = await db.select().from(settings).limit(1);
      return {
        email: sendable.email,
        company: sendable.company,
        industry: lead?.industry ?? '',
        city: lead?.city ?? '',
        value: lead?.value ?? 0,
        score: lead?.score ?? 0,
        cta: audit?.redesign?.cta ?? 'xem bản demo mới',
        summary: audit?.summary ?? 'a faster, mobile-first homepage redesign with a clear call-to-action',
        autonomyMode: (s?.autonomyMode as AutonomyMode | undefined) ?? 'guarded',
      };
    });
    if ('skip' in loaded) {
      // Nothing to send (no email / no ready demo). If this came from a pipeline run, close it with a
      // failed outcome so it doesn't sit 'running' at 'outreach' forever and block a fresh start.
      if (runId)
        await step.sendEvent('emit-skip', {
          name: 'outreach/sent',
          data: { leadId, runId, outcome: 'failed' },
          id: `outreach/sent:${leadId}`,
        });
      return { leadId, skipped: loaded.skip };
    }

    // Draft the email (the claude call) — memoized so a later gate/send failure doesn't re-spend it.
    const draft = await step.run('draft', () =>
      runAgent(echoOutreach, {
        company: loaded.company,
        industry: loaded.industry,
        city: loaded.city,
        cta: loaded.cta,
        summary: loaded.summary,
      }),
    );

    if (loaded.autonomyMode === 'full') {
      await step.run('send', () => sendOutreachEmail(leadId, loaded.email, draft.subject, draft.body));
      await step.run('mark-sent', () => markSent(leadId));
      await step.sendEvent('emit-sent', { name: 'outreach/sent', data: { leadId, runId, outcome: 'ok' }, id: `outreach/sent:${leadId}` });
      return { leadId, sent: true };
    }

    // Gate: park the draft as an outreach escalation for the founder to approve. The draft lives on the
    // row (title/rec); the lead is recovered from the deterministic id. A founder-DISMISSED draft is NOT
    // resurrected (the conflict update skips a dismissed row).
    await step.run('escalate', async () => {
      await db
        .insert(escalations)
        .values({
          id: escId(leadId),
          kind: 'outreach',
          sev: 'medium',
          title: draft.subject,
          who: loaded.company,
          value: loaded.value,
          agent: 'echo',
          reason: `Outreach draft for ${loaded.company} — review the email before it is sent.`,
          rec: draft.body,
          conf: loaded.score,
          time: 'just now',
          status: 'open',
          // Link the parked draft to its run so approving the send advances the originating pipeline.
          runId: runId ?? null,
        })
        .onConflictDoUpdate({
          target: escalations.id,
          set: { status: 'open', resolvedAt: null, title: draft.subject, rec: draft.body },
          setWhere: sql`${escalations.status} <> 'dismissed'`,
        });
    });
    return { leadId, gated: true };
  },
);
