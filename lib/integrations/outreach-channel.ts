// Outreach channel dispatch. Echo drafts the message content; THIS picks how it goes out, selected by
// OUTREACH_CHANNEL (default email). Channels and how they reach a discovered lead:
//   email            → Resend, to lead.email       (official, cold-permissible w/ unsubscribe)
//   whatsapp         → WhatsApp Cloud API, phone    (official; cold first-touch = approved template)
//   telegram-user    → Telegram MTProto userbot     (PERSONAL account; cold-DM by phone; ban risk)
//   whatsapp-personal→ Baileys WhatsApp Web         (PERSONAL account; cold-DM any number; strong ban risk)
// The two personal channels send FREE-FORM text (a personal account has no template restriction) — so they
// use Echo's draft directly. The official Bot API is deliberately absent (it can't cold-message a stranger;
// it stays a notify/inbound channel in telegram.ts).
//
// Worker-only (relative imports, no `server-only`): the send functions make outbound calls; the personal
// adapters dynamic-import their heavy libs so nothing leaks into the web bundle.
import { resendConfigured, sendEmail, outreachEmailHtml } from './resend';
import { whatsappConfigured, sendWhatsAppTemplate } from './whatsapp';
import { telegramUserConfigured, sendTelegramUser } from './telegram-user';
import { whatsappPersonalConfigured, sendWhatsAppPersonal } from './whatsapp-personal';

export type OutreachChannel = 'email' | 'whatsapp' | 'telegram-user' | 'whatsapp-personal';
const CHANNELS: OutreachChannel[] = ['email', 'whatsapp', 'telegram-user', 'whatsapp-personal'];

export function outreachChannel(): OutreachChannel {
  const raw = (process.env.OUTREACH_CHANNEL || 'email').trim().toLowerCase();
  return (CHANNELS as string[]).includes(raw) ? (raw as OutreachChannel) : 'email';
}

// Whether the ACTIVE channel has its credentials — the run-outreach guard uses this to degrade cleanly.
export function outreachChannelConfigured(channel: OutreachChannel = outreachChannel()): boolean {
  switch (channel) {
    case 'whatsapp':
      return whatsappConfigured();
    case 'telegram-user':
      return telegramUserConfigured();
    case 'whatsapp-personal':
      return whatsappPersonalConfigured();
    default:
      return resendConfigured();
  }
}

// The lead field used as the recipient for the active channel: email uses the address, every message
// channel uses the phone.
export function recipientForChannel(
  lead: { email: string | null; phone: string | null },
  channel: OutreachChannel = outreachChannel(),
): string | null {
  return channel === 'email' ? lead.email : lead.phone;
}

export interface OutreachSend {
  leadId: string;
  recipient: string; // email address OR phone, matching the active channel
  company: string;
  draft: { subject: string; body: string };
  demoUrl: string;
  unsubscribe: string;
}

// A plain-text version of the draft for chat channels — Echo's body plus the demo link on its own line.
function plainOutreachText(body: string, demoUrl: string): string {
  return `${body.trim()}\n\n${demoUrl}`;
}

// Send the outreach on the active channel. Returns a uniform {ok,error} (never throws) so the caller's
// send step behaves the same regardless of channel. NOTE: the message channels (whatsapp/telegram-user/
// whatsapp-personal) have NO provider idempotency key like Resend's, so a send-step retry after a lost
// response can re-send. Acceptable for these off-by-default v1 channels; gate behind a persisted per-lead
// sent-marker before high volume.
export async function sendOutreach(send: OutreachSend): Promise<{ ok: boolean; error?: string }> {
  switch (outreachChannel()) {
    case 'whatsapp': {
      // Cold first-touch MUST be a pre-approved template (Meta policy). The approved template is expected to
      // reference {{1}} = company and {{2}} = the demo link; adjust these params if your template differs.
      const template = process.env.WHATSAPP_TEMPLATE_NAME || 'agentsverse_demo';
      const lang = process.env.WHATSAPP_TEMPLATE_LANG || 'en';
      return sendWhatsAppTemplate(send.recipient, template, lang, [send.company, send.demoUrl]);
    }
    case 'telegram-user':
      // Personal account → free-form cold text is allowed (no template gate).
      return sendTelegramUser(send.recipient, plainOutreachText(send.draft.body, send.demoUrl));
    case 'whatsapp-personal':
      return sendWhatsAppPersonal(send.recipient, plainOutreachText(send.draft.body, send.demoUrl));
    default: {
      const r = await sendEmail({
        to: send.recipient,
        subject: send.draft.subject,
        html: outreachEmailHtml(send.draft.body, send.demoUrl, send.unsubscribe),
        unsubscribe: send.unsubscribe,
        idempotencyKey: `outreach:${send.leadId}`, // per-lead dedup; channel-agnostic
      });
      return { ok: r.ok, error: r.error };
    }
  }
}
