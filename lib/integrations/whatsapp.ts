// WhatsApp Cloud API (Meta) sender — worker-only, fetch-based (no SDK, keeps the lockfile stable).
// Relative imports + no `server-only` so it's safe under tsx in the worker.
//
// Meta policy is baked into the two send functions on purpose:
//   - COLD first-touch to a discovered lead's phone MUST use a pre-approved TEMPLATE. Free-form cold
//     messages are forbidden and get the sender number banned. → sendWhatsAppTemplate.
//   - Free-form TEXT is allowed ONLY inside the 24h customer-service window AFTER the lead messages us.
//     → sendWhatsAppText (used for replies, never for cold first contact).
const GRAPH = 'https://graph.facebook.com/v21.0';

export interface WhatsAppResult {
  ok: boolean;
  id?: string;
  error?: string;
}

// True when the Cloud API is configured to actually send (mirrors the web action's guard pattern).
export function whatsappConfigured(): boolean {
  return !!process.env.WHATSAPP_PHONE_NUMBER_ID && !!process.env.WHATSAPP_ACCESS_TOKEN;
}

// Cloud API wants the recipient as E.164 digits WITHOUT '+' (e.g. "84906200434"). Discovery phones come
// from Google Places `internationalPhoneNumber` / Apify, which are already international ("+84 906 …").
// Strip formatting and a leading '00' international prefix, then REQUIRE a valid E.164 shape: 8–15 digits
// with NO leading '0'. A leading 0 is a NATIONAL trunk prefix — we have no reliable country code to turn
// it into E.164, and sending it as-is dials the wrong/invalid number — so reject it (the caller skips).
export function toE164Digits(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/[^\d]/g, '').replace(/^00/, '');
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

async function sendMessage(body: Record<string, unknown>): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    return { ok: false, error: 'whatsapp not configured (set WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN)' };
  }
  try {
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return { ok: false, error: `whatsapp ${res.status}: ${t.slice(0, 200)}` };
    }
    const j = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[] };
    return { ok: true, id: j.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// COLD first-touch: a pre-approved template with ordered body text params (fill {{1}}, {{2}}, …).
export async function sendWhatsAppTemplate(
  to: string,
  template: string,
  lang: string,
  bodyParams: string[],
): Promise<WhatsAppResult> {
  const num = toE164Digits(to);
  if (!num) return { ok: false, error: `invalid recipient phone: ${to}` };
  return sendMessage({
    to: num,
    type: 'template',
    template: {
      name: template,
      language: { code: lang },
      ...(bodyParams.length
        ? { components: [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) }] }
        : {}),
    },
  });
}

// Free-form text — VALID ONLY inside the 24h window after the recipient messaged us (Meta rule). Use for
// replies within a live conversation, NEVER for a cold first message (that must be a template).
export async function sendWhatsAppText(to: string, text: string): Promise<WhatsAppResult> {
  const num = toE164Digits(to);
  if (!num) return { ok: false, error: `invalid recipient phone: ${to}` };
  return sendMessage({ to: num, type: 'text', text: { body: text } });
}
