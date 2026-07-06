// Outreach channel dispatch. Echo drafts the message content; THIS picks how it goes out, selected by
// OUTREACH_CHANNEL (default email). Both channels reach a discovered lead: email via lead.email, WhatsApp
// via lead.phone. Telegram is intentionally NOT here — its Bot API can't cold-message a stranger, so it's
// a notify/inbound channel (lib/integrations/telegram.ts), not a per-lead outreach channel.
//
// Worker-only (relative imports, no `server-only`): the send functions make outbound calls.
import { resendConfigured, sendEmail, outreachEmailHtml } from './resend';
import { whatsappConfigured, sendWhatsAppTemplate } from './whatsapp';

export type OutreachChannel = 'email' | 'whatsapp';

export function outreachChannel(): OutreachChannel {
  return (process.env.OUTREACH_CHANNEL || 'email').trim().toLowerCase() === 'whatsapp' ? 'whatsapp' : 'email';
}

// Whether the ACTIVE channel has its credentials — the run-outreach guard uses this to degrade cleanly.
export function outreachChannelConfigured(channel: OutreachChannel = outreachChannel()): boolean {
  return channel === 'whatsapp' ? whatsappConfigured() : resendConfigured();
}

// The lead field used as the recipient for the active channel (email address vs phone).
export function recipientForChannel(
  lead: { email: string | null; phone: string | null },
  channel: OutreachChannel = outreachChannel(),
): string | null {
  return channel === 'whatsapp' ? lead.phone : lead.email;
}

export interface OutreachSend {
  leadId: string;
  recipient: string; // email address OR phone, matching the active channel
  company: string;
  draft: { subject: string; body: string };
  demoUrl: string;
  unsubscribe: string;
}

// Send the outreach on the active channel. Returns a uniform {ok,error} (never throws) so the caller's
// send step behaves the same regardless of channel.
export async function sendOutreach(send: OutreachSend): Promise<{ ok: boolean; error?: string }> {
  if (outreachChannel() === 'whatsapp') {
    // Cold first-touch MUST be a pre-approved template (Meta policy). The approved template is expected to
    // reference {{1}} = company and {{2}} = the demo link; adjust these params if your template differs.
    //
    // At-least-once caveat: unlike the email path (deduped by Resend's Idempotency-Key), the WhatsApp
    // Cloud API has NO idempotency key. If a send step's response is lost (network timeout after Meta
    // accepted) the Inngest retry re-sends → the prospect could get two cold texts. Acceptable for this
    // off-by-default v1; before going live at volume, gate the send behind a persisted per-lead sent-marker
    // (or store the returned wamid) so a retry is a no-op.
    const template = process.env.WHATSAPP_TEMPLATE_NAME || 'agentsverse_demo';
    const lang = process.env.WHATSAPP_TEMPLATE_LANG || 'en';
    const r = await sendWhatsAppTemplate(send.recipient, template, lang, [send.company, send.demoUrl]);
    return { ok: r.ok, error: r.error };
  }
  const r = await sendEmail({
    to: send.recipient,
    subject: send.draft.subject,
    html: outreachEmailHtml(send.draft.body, send.demoUrl, send.unsubscribe),
    unsubscribe: send.unsubscribe,
    idempotencyKey: `outreach:${send.leadId}`, // per-lead dedup; channel-agnostic
  });
  return { ok: r.ok, error: r.error };
}
