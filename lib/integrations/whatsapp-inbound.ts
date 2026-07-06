import { createHmac, timingSafeEqual } from 'node:crypto';

// Pure helpers for the WhatsApp Cloud API inbound webhook (app/api/whatsapp). Meta signs each POST with
// X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(APP_SECRET, rawBody). Kept pure + dependency-light so the
// security-critical verification is unit-testable (mirrors resend-inbound.ts).

// Constant-time verification of Meta's X-Hub-Signature-256 over the RAW request body.
export function verifyWhatsAppSignature(opts: { appSecret: string; signatureHeader: string; payload: string }): boolean {
  const { appSecret, signatureHeader, payload } = opts;
  if (!appSecret || !signatureHeader) return false;
  const m = signatureHeader.match(/^sha256=([a-f0-9]+)$/i);
  if (!m) return false;
  const expected = createHmac('sha256', appSecret).update(payload).digest();
  let given: Buffer;
  try {
    given = Buffer.from(m[1], 'hex');
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export interface InboundWhatsApp {
  from: string; // sender phone as digits (wa_id)
  text: string; // message text
  id: string; // message id (wamid) — stable dedup key across Meta's at-least-once delivery
  timestamp: number | null; // when the user sent it (unix seconds) — for a replay-staleness check
}

// Pull { from, text, id, timestamp } out of the FIRST inbound text message. Returns null for delivery/read
// STATUS events (value.statuses) and non-text messages — only a genuine text reply reaches the Closer.
export function parseWhatsAppInbound(body: unknown): InboundWhatsApp | null {
  if (!body || typeof body !== 'object') return null;
  const entry = (body as { entry?: unknown }).entry;
  if (!Array.isArray(entry)) return null;
  for (const e of entry) {
    const changes = (e as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const c of changes) {
      const value = (c as { value?: unknown })?.value as
        | { messages?: unknown[]; statuses?: unknown[] }
        | undefined;
      const messages = value?.messages;
      if (!Array.isArray(messages)) continue; // status-only events have no `messages`
      for (const msg of messages) {
        const m = msg as { from?: unknown; id?: unknown; type?: unknown; timestamp?: unknown; text?: { body?: unknown } };
        const from = typeof m.from === 'string' ? m.from.replace(/[^\d]/g, '') : '';
        const text = m.type === 'text' && typeof m.text?.body === 'string' ? m.text.body : '';
        const id = typeof m.id === 'string' ? m.id : '';
        const ts = Number(m.timestamp);
        if (from && text) return { from, text, id: id || `${from}:${text.slice(0, 40)}`, timestamp: Number.isFinite(ts) ? ts : null };
      }
    }
  }
  return null;
}
