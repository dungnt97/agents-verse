import { eq } from 'drizzle-orm';
import { inngest, type ProposalRequestedData } from '../client';
import { db } from '../../db/client';
import { leads, deals, settings, escalations } from '../../db/schema';
import { renderHtmlToPdf } from '../../demo-gen/render';
import { buildProposal, type ProposalPricing } from '../../proposals/proposal';
import { buildProposalHtml } from '../../proposals/proposal-html';
import { sendEmail, supportEmailHtml, resendConfigured } from '../../integrations/resend';
import { demoLanguageForAddress } from '../../data/locale';
import { recordActivity } from '../activity-log';
import { readFile, unlink } from 'node:fs/promises';
import type { Deal } from '../../data/types';

// The proposal PDF itself is English (the scope/terms in lib/proposals/proposal.ts). The email cover +
// subject must match the client's market language — hardcoded Vietnamese was reaching English-market clients.
function proposalCover(client: string, pkg: string, language: string): { subject: string; cover: string } {
  if (language === 'Vietnamese') {
    return {
      subject: `Đề xuất thiết kế website — ${client} (${pkg})`,
      cover: `Xin chào ${client},\n\nGửi anh/chị bản đề xuất + báo giá cho dự án website mới. Chi tiết nằm trong file PDF đính kèm.\n\nRất mong được đồng hành cùng anh/chị.`,
    };
  }
  return {
    subject: `Website design proposal — ${client} (${pkg})`,
    cover: `Hi ${client},\n\nAttached is our proposal and quote for your new website project — the full details are in the PDF.\n\nWe'd love to work with you.`,
  };
}

// Send-proposal (WORKER only — renders a PDF via Playwright + makes the outbound email call; relative
// imports, no `server-only`). Founder-triggered (the web action is the approval gate) + key-gated on
// Resend. Renders the deal's proposal to a real A4 PDF and emails it to the client as an attachment.
export const sendProposal = inngest.createFunction(
  {
    id: 'send-proposal',
    retries: 1,
    concurrency: [{ limit: 2 }, { limit: 1, key: 'event.data.dealId' }],
    triggers: [{ event: 'proposal/requested' }],
    // A founder-approved proposal email that terminally fails must not vanish silently — surface it
    // as an open escalation (+ activity row) so the founder can resend or follow up manually.
    onFailure: async ({ event, error, step }) => {
      const { dealId } = event.data.event.data as ProposalRequestedData;
      await step.run('escalate-proposal-failure', async () => {
        const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
        const client = deal?.client ?? dealId;
        await db
          .insert(escalations)
          .values({
            id: `esc-proposal-failed-${dealId}`,
            kind: 'sales',
            sev: 'high',
            title: `Proposal email failed — ${client}`,
            who: client,
            value: deal?.value ?? 0,
            agent: 'closer',
            reason: `The proposal email could not be sent after retries: ${error.message}`,
            rec: 'Retry from the deal drawer, or send the proposal PDF manually.',
            conf: 100,
            time: 'just now',
            status: 'open',
            dealId,
          })
          .onConflictDoUpdate({
            target: escalations.id,
            set: { status: 'open', resolvedAt: null, reason: `The proposal email could not be sent after retries: ${error.message}` },
          });
        await recordActivity({ agent: 'closer', room: 'sales', type: 'deal', text: `Proposal email to ${client} failed`, status: 'error' });
      });
    },
  },
  async ({ event, step }) => {
    const { dealId } = event.data as ProposalRequestedData;
    if (!resendConfigured()) return { dealId, skipped: 'email not configured (RESEND_API_KEY + OUTREACH_FROM)' };

    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
    if (!deal) return { dealId, skipped: 'deal not found' };
    const [lead] = await db.select().from(leads).where(eq(leads.id, deal.leadId)).limit(1);
    const to = lead?.email;
    if (!to) return { dealId, skipped: 'no client email on file' };

    // Render the proposal to a PDF and return it as base64 (Buffers must not cross a step boundary).
    const pdfB64 = await step.run('render-pdf', async () => {
      const [s] = await db.select().from(settings).limit(1);
      const pricing = (s?.pricing ?? null) as ProposalPricing | null;
      const docData = buildProposal(deal as unknown as Deal, pricing);
      const date = new Date().toISOString().slice(0, 10);
      const html = buildProposalHtml(docData, date);
      const stem = `/tmp/proposal-${process.pid}-${Date.now()}`;
      await renderHtmlToPdf(html, stem + '.html', stem + '.pdf');
      const buf = await readFile(stem + '.pdf');
      await unlink(stem + '.pdf').catch(() => {});
      await unlink(stem + '.html').catch(() => {});
      return buf.toString('base64');
    });

    await step.run('send', async () => {
      const { subject, cover } = proposalCover(deal.client, deal.pkg, demoLanguageForAddress(lead?.formattedAddress));
      const result = await sendEmail({
        to,
        subject,
        html: supportEmailHtml(cover),
        attachments: [{ filename: `proposal-${deal.id}.pdf`, content: pdfB64, contentType: 'application/pdf' }],
        idempotencyKey: `proposal:${deal.id}`,
      });
      if (!result.ok) throw new Error(`proposal email failed: ${result.error}`);
    });

    await step.run('log-activity', () =>
      recordActivity({ agent: 'closer', room: 'sales', type: 'deal', text: `Emailed the proposal to ${deal.client}`, status: 'success' }),
    );
    return { dealId, sent: true };
  },
);
