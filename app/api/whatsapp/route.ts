import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { leads, deals } from '@/lib/db/schema';
import { inngest } from '@/lib/inngest/client';
import { USE_DB } from '@/lib/repositories/config';
import { verifyWhatsAppSignature, parseWhatsAppInbound } from '@/lib/integrations/whatsapp-inbound';

// WhatsApp Cloud API webhook. GET = Meta's one-time verification handshake. POST = an inbound message →
// emits `reply/received` so the Closer interprets it (mirrors the Resend inbound route). Security: POST
// bodies are HMAC-verified against WHATSAPP_APP_SECRET (X-Hub-Signature-256); the route is disabled (404)
// when the secret is unset. Web route: only `inngest.send`s — never imports the worker chain.
export const dynamic = 'force-dynamic';

// Meta calls GET once with hub.challenge to confirm the endpoint; echo the challenge iff the verify token
// matches WHATSAPP_VERIFY_TOKEN.
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('forbidden', { status: 403 });
}

export async function POST(req: Request): Promise<Response> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return new Response('whatsapp webhook disabled (set WHATSAPP_APP_SECRET)', { status: 404 });

  // Read the RAW body before parsing — the signature is over the exact bytes.
  const payload = await req.text();
  const signatureHeader = req.headers.get('x-hub-signature-256') ?? '';
  if (!verifyWhatsAppSignature({ appSecret, signatureHeader, payload })) {
    return new Response('invalid signature', { status: 401 });
  }

  let parsed;
  try {
    parsed = parseWhatsAppInbound(JSON.parse(payload));
  } catch {
    return new Response('bad payload', { status: 400 });
  }
  if (!parsed) return new Response('ignored', { status: 200 }); // status/non-text event

  // Replay defense-in-depth: X-Hub-Signature-256 signs only the body (no timestamp), so a captured
  // validly-signed POST could be replayed after the event-id dedup window. Reject when the message's own
  // timestamp is more than 5 minutes stale (mirrors the Resend inbound route's svix-timestamp check).
  if (parsed.timestamp != null && Math.abs(Date.now() / 1000 - parsed.timestamp) > 300) {
    return new Response('stale timestamp', { status: 400 });
  }

  if (!USE_DB) return new Response('ignored (no db)', { status: 200 });

  // Match the sender's phone digits against the lead's stored phone (normalised to digits in SQL, since
  // discovery stores it formatted). Unknown senders are accepted (200) so a stray message never 5xxs.
  const [lead] = await db
    .select()
    .from(leads)
    .where(sql`regexp_replace(coalesce(${leads.phone}, ''), '[^0-9]', '', 'g') = ${parsed.from}`)
    .limit(1);
  if (!lead) return new Response('ignored (no matching lead)', { status: 200 });
  // First inbound message from a known lead with no deal → the Closer creates the deal (handle-reply).
  // Deterministic dealId so the emit is idempotent and per-deal serialization holds before the row exists.
  const [deal] = await db.select().from(deals).where(sql`${deals.leadId} = ${lead.id}`).limit(1);
  const dealId = deal?.id ?? `deal-${lead.id}`;

  // wamid makes the emit idempotent across Meta's at-least-once webhook delivery.
  await inngest.send({
    name: 'reply/received',
    data: { dealId, leadId: lead.id, text: parsed.text },
    id: `reply/received:${dealId}:${parsed.id}`,
  });
  return new Response('ok', { status: 200 });
}
