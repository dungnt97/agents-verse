import { eq } from 'drizzle-orm';
import { inngest, type SupportApprovedData } from '../client';
import { db } from '../../db/client';
import { deals, leads, escalations, settings } from '../../db/schema';
import { runAgent } from '../../agents/runner';
import { miraSupport } from '../../agents/defs/mira-support';
import { demoLanguageForAddress } from '../../demo-gen/locale';
import { sendEmail, supportEmailHtml, resendConfigured } from '../../integrations/resend';
import type { AutonomyMode } from '../../data/deal-stage-machine';

// Mira onboarding (WORKER only — shells `claude` + sends transactional email; relative imports, no
// `server-only`). When a deal is WON she drafts an asset-request email in the client's market language and
// either sends it (full autonomy) or parks it as a `support` escalation for the founder to approve — Echo's
// gate. The email is transactional (a client who just signed), so no unsubscribe footer. Idempotent
// per lead. Decoupled from pipeline_runs (driven by deal/won, like Cipher's build).
const escId = (leadId: string) => `esc-support-${leadId}`;

async function sendSupportEmail(email: string, subject: string, body: string, leadId: string): Promise<void> {
  const result = await sendEmail({
    to: email,
    subject,
    html: supportEmailHtml(body),
    idempotencyKey: `support:${leadId}`,
  });
  if (!result.ok) throw new Error(`support send failed: ${result.error}`);
}

export const runSupport = inngest.createFunction(
  {
    id: 'run-support',
    retries: 1,
    concurrency: [
      // Shares the global `claude`-CLI budget with every other claude function (see run-demo-gen).
      { scope: 'account', key: '"claude-agent"', limit: Number(process.env.CLAUDE_AGENT_CONCURRENCY) || 2 },
      { limit: 1, key: 'event.data.leadId' },
    ],
    triggers: [{ event: 'deal/won' }, { event: 'support/approved' }],
    // A terminally-failed onboarding email (draft or send) must not vanish — the client just signed
    // and is waiting to hear from us. Surface an open escalation so the founder follows up manually.
    onFailure: async ({ event, error, step }) => {
      const { leadId } = event.data.event.data as { leadId: string };
      await step.run('escalate-support-failure', async () => {
        const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
        const client = lead?.company ?? leadId;
        await db
          .insert(escalations)
          .values({
            id: `esc-support-failed-${leadId}`,
            kind: 'support',
            sev: 'high',
            title: `Onboarding email failed — ${client}`,
            who: client,
            value: 0,
            agent: 'mira',
            reason: `The onboarding email could not be drafted/sent after retries: ${error.message}`,
            rec: 'Contact the new client manually to request their assets.',
            conf: 100,
            time: 'just now',
            status: 'open',
          })
          .onConflictDoUpdate({
            target: escalations.id,
            set: { status: 'open', resolvedAt: null, reason: `The onboarding email could not be drafted/sent after retries: ${error.message}` },
          });
      });
    },
  },
  async ({ event, step }) => {
    const eventName = event.name;
    const { leadId } = event.data as { leadId: string };

    // Founder approved a parked onboarding draft → send it.
    if (eventName === 'support/approved') {
      const { subject, body } = event.data as SupportApprovedData;
      const target = await step.run('check-approved', async () => {
        if (!resendConfigured()) return { skip: 'email not configured' };
        const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
        if (!lead?.email) return { skip: 'lead has no email' };
        return { email: lead.email };
      });
      if ('skip' in target) return { leadId, skipped: target.skip };
      await step.run('send-approved', () => sendSupportEmail(target.email, subject, body, leadId));
      await step.run('resolve-approved', async () => {
        await db
          .update(escalations)
          .set({ status: 'resolved', resolvedAt: new Date() })
          .where(eq(escalations.id, escId(leadId)));
      });
      return { leadId, sent: true };
    }

    // deal/won — draft the onboarding email, then send (full) or gate (everything else).
    const loaded = await step.run('load', async () => {
      if (!resendConfigured()) return { skip: 'email not configured (RESEND_API_KEY + OUTREACH_FROM)' };
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (!lead) return { skip: 'lead not found' };
      if (!lead.email) return { skip: 'lead has no email' };
      const [deal] = await db.select().from(deals).where(eq(deals.leadId, leadId)).limit(1);
      const [s] = await db.select().from(settings).limit(1);
      return {
        email: lead.email,
        client: deal?.client ?? lead.company,
        industry: lead.industry,
        city: lead.city,
        pkg: deal?.pkg ?? 'website',
        value: deal?.value ?? 0,
        language: demoLanguageForAddress(lead.formattedAddress),
        autonomyMode: (s?.autonomyMode as AutonomyMode | undefined) ?? 'guarded',
      };
    });
    if ('skip' in loaded) return { leadId, skipped: loaded.skip };

    const draft = await step.run('draft', () =>
      runAgent(miraSupport, {
        client: loaded.client,
        industry: loaded.industry,
        city: loaded.city,
        pkg: loaded.pkg,
        language: loaded.language,
      }),
    );

    if (loaded.autonomyMode === 'full') {
      await step.run('send', () => sendSupportEmail(loaded.email, draft.subject, draft.body, leadId));
      return { leadId, sent: true };
    }

    // Gate: park the onboarding draft as a `support` escalation for the founder to approve. Draft lives on
    // the row (title/rec); the lead is recovered from the deterministic id. A dismissed draft isn't revived.
    await step.run('escalate', async () => {
      await db
        .insert(escalations)
        .values({
          id: escId(leadId),
          kind: 'support',
          sev: 'medium',
          title: draft.subject,
          who: loaded.client,
          value: loaded.value,
          agent: 'mira',
          reason: `Onboarding email for ${loaded.client} — review before it is sent to the new client.`,
          rec: draft.body,
          conf: 90,
          time: 'just now',
          status: 'open',
        })
        .onConflictDoUpdate({
          target: escalations.id,
          set: { status: 'open', resolvedAt: null, title: draft.subject, rec: draft.body },
        });
    });
    return { leadId, gated: true };
  },
);
