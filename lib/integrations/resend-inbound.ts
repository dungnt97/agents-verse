import { createHmac, timingSafeEqual } from 'node:crypto';

// Pure helpers for the Resend inbound-email webhook (app/api/inbound). Resend signs webhooks with the
// Svix scheme; we verify the signature here (no svix SDK — keeps the lockfile stable) and parse the
// sender + text out of the payload. Kept pure + dependency-light so the security-critical verification
// is unit-testable. The route does the DB mapping (sender email → lead → deal) and emits reply/received.

export interface VerifyInput {
  secret: string; // Resend/Svix signing secret, "whsec_<base64>"
  id: string; // svix-id header
  timestamp: string; // svix-timestamp header
  signature: string; // svix-signature header (space-separated "v1,<base64>")
  payload: string; // raw request body
}

// Constant-time check that the body was signed by the configured secret. Mirrors Svix: the signed content
// is `${id}.${timestamp}.${payload}`, HMAC-SHA256 with the base64-decoded secret, base64-compared against
// each `v1,<sig>` in the header (a key may have multiple active signatures during rotation).
export function verifyResendSignature({ secret, id, timestamp, signature, payload }: VerifyInput): boolean {
  if (!secret || !id || !timestamp || !signature) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  if (key.length === 0) return false;
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${payload}`).digest(); // raw bytes
  for (const part of signature.split(' ')) {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value) continue;
    let given: Buffer;
    try {
      given = Buffer.from(value, 'base64');
    } catch {
      continue;
    }
    if (given.length === expected.length && timingSafeEqual(given, expected)) return true;
  }
  return false;
}

// Pull the bare email address out of a "Name <addr@x>" or plain "addr@x" string, lowercased.
export function extractEmailAddress(from: unknown): string | null {
  if (typeof from === 'string') {
    const m = from.match(/<([^>]+)>/);
    const candidate = (m ? m[1] : from).trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : null;
  }
  // Resend may send { name, address }.
  if (from && typeof from === 'object' && 'address' in from) {
    return extractEmailAddress((from as { address: unknown }).address);
  }
  return null;
}

export interface InboundEmail {
  from: string; // lowercased sender address
  text: string; // best-effort plain-text body
}

// Best-effort parse of the inbound webhook payload into { from, text }. Tolerant of shape drift: reads
// the sender from data.from and the body from data.text (falling back to a tag-stripped data.html).
export function parseInboundEmail(body: unknown): InboundEmail | null {
  if (!body || typeof body !== 'object') return null;
  // Only treat genuine inbound/received events as client replies. Resend posts other event types to the
  // same endpoint (e.g. email.sent/delivered/bounced for OUR outbound mail) — those carry our own From and
  // must NOT be fed to the Closer. A typeless payload is allowed (kept permissive for shape drift).
  const type = (body as { type?: unknown }).type;
  if (typeof type === 'string' && !/received|inbound/i.test(type)) return null;
  const data = ('data' in body ? (body as { data: unknown }).data : body) as Record<string, unknown> | null;
  if (!data || typeof data !== 'object') return null;
  const from = extractEmailAddress((data as { from?: unknown }).from);
  if (!from) return null;
  const text = (data as { text?: unknown }).text;
  const html = (data as { html?: unknown }).html;
  const body0 =
    typeof text === 'string' && text.trim()
      ? text
      : typeof html === 'string'
        ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        : '';
  return { from, text: body0 };
}
