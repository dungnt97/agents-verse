import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { leads, deals } from '@/lib/db/schema';
import { inngest } from '@/lib/inngest/client';
import { USE_DB } from '@/lib/repositories/config';
import { verifyResendSignature, parseInboundEmail } from '@/lib/integrations/resend-inbound';

// Resend inbound-email webhook → emits `reply/received` so the Closer (handle-reply) auto-interprets a
// client's reply WITHOUT the founder pasting it. Security surface: every request must carry a valid Svix
// signature against RESEND_INBOUND_SECRET (the route is disabled, 503, when the secret is unset). The
// sender address is mapped to a lead → deal; unmatched senders are accepted (200) and ignored. This is a
// web route: it only `inngest.send`s — it never imports the worker chain.
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.RESEND_INBOUND_SECRET;
  if (!secret) return new Response('inbound webhook disabled (set RESEND_INBOUND_SECRET)', { status: 503 });

  // Read the RAW body before parsing — the signature is computed over the exact bytes.
  const payload = await req.text();
  const id = req.headers.get('svix-id') ?? '';
  const timestamp = req.headers.get('svix-timestamp') ?? '';
  const signature = req.headers.get('svix-signature') ?? '';
  if (!verifyResendSignature({ secret, id, timestamp, signature, payload })) {
    return new Response('invalid signature', { status: 401 });
  }

  // Replay defense-in-depth: reject a signed request whose timestamp is more than 5 minutes off from
  // now (svix-timestamp is unix seconds). The event-id dedup already blocks reprocessing; this also
  // rejects a much-later replay of a captured valid request.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return new Response('stale timestamp', { status: 400 });
  }

  let parsed;
  try {
    parsed = parseInboundEmail(JSON.parse(payload));
  } catch {
    return new Response('bad payload', { status: 400 });
  }
  if (!parsed || !parsed.text) return new Response('ignored', { status: 200 });

  if (!USE_DB) return new Response('ignored (no db)', { status: 200 });

  // Map the sender → the most recent matching lead → its deal. Unknown senders are silently accepted so a
  // misdirected email never 500s a public webhook (Resend would retry on a 5xx).
  const [lead] = await db.select().from(leads).where(eq(leads.email, parsed.from)).limit(1);
  if (!lead) return new Response('ignored (no matching lead)', { status: 200 });
  const [deal] = await db.select().from(deals).where(eq(deals.leadId, lead.id)).limit(1);
  if (!deal) return new Response('ignored (no matching deal)', { status: 200 });

  // svix-id makes the emit idempotent across Resend's at-least-once webhook delivery.
  await inngest.send({
    name: 'reply/received',
    data: { dealId: deal.id, leadId: lead.id, text: parsed.text },
    id: `reply/received:${deal.id}:${id}`,
  });
  return new Response('ok', { status: 200 });
}
