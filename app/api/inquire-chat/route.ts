import { eq } from 'drizzle-orm';
import { assistantConfigured, connectAssistant, parseTextDeltas, type ChatTurn } from '@/lib/integrations/assistant';
import { slidingWindowLimiter } from '@/lib/integrations/chat-rate-limit';
import { buildInquirySystemPrompt } from '@/lib/integrations/inquiry-chat-prompt';
import { demoLanguageForAddress } from '@/lib/demo-gen/locale';
import { USE_DB } from '@/lib/repositories/config';
import { db } from '@/lib/db/client';
import { leads, audits } from '@/lib/db/schema';

// Per-demo inquiry chat (public, on /inquire/[leadId]). Streams a lead-scoped consultant reply from the
// gateway: it answers questions about the redesign and does LIGHT qualification, but the system prompt
// forbids quoting a price. Degrades to 503 (the client shows a friendly note + the form) when the gateway
// or DB is off. Public → rate-limited + the transcript is capped before the model.
export const dynamic = 'force-dynamic';

const MAX_TURNS = 8;
const MAX_CONTENT = 2000;
const perClient = slidingWindowLimiter(Number(process.env.INQUIRY_CHAT_PER_CLIENT_MAX) || 30, 5 * 60_000);
const globalCap = slidingWindowLimiter(Number(process.env.INQUIRY_CHAT_GLOBAL_MAX) || 300, 5 * 60_000);

function clientKey(req: Request): string {
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const hops = (req.headers.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return hops.length ? hops[hops.length - 1] : 'local';
}

export async function POST(req: Request): Promise<Response> {
  if (!assistantConfigured() || !USE_DB) return new Response('inquiry chat not available', { status: 503 });

  const now = Date.now();
  const over = perClient(clientKey(req), now);
  const overGlobal = globalCap('*', now);
  if (over || overGlobal) return new Response('rate limited', { status: 429 });

  let body: { leadId?: unknown; messages?: unknown };
  try {
    body = (await req.json()) as { leadId?: unknown; messages?: unknown };
  } catch {
    return new Response('bad json', { status: 400 });
  }
  const leadId = typeof body.leadId === 'string' ? body.leadId : '';
  if (!leadId) return new Response('no lead', { status: 400 });

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return new Response('unknown lead', { status: 404 });
  const [audit] = await db.select({ summary: audits.summary }).from(audits).where(eq(audits.leadId, leadId)).limit(1);

  const system = buildInquirySystemPrompt({
    company: lead.company,
    industry: lead.industry,
    city: lead.city,
    language: demoLanguageForAddress(lead.formattedAddress),
    summary: audit?.summary ?? null,
  });

  // Normalise the transcript: cap turns + length, drop leading assistant turns, merge same-role runs, and
  // require a trailing user turn (the Messages API rejects anything else).
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const sliced: ChatTurn[] = raw
    .slice(-MAX_TURNS)
    .map((m): ChatTurn => ({
      role: (m as { role?: unknown })?.role === 'assistant' ? 'assistant' : 'user',
      content: String((m as { content?: unknown })?.content ?? '').slice(0, MAX_CONTENT),
    }))
    .filter((m) => m.content.trim());
  while (sliced.length && sliced[0].role !== 'user') sliced.shift();
  const messages: ChatTurn[] = [];
  for (const m of sliced) {
    const last = messages[messages.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + m.content;
    else messages.push({ role: m.role, content: m.content });
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return new Response('no user message', { status: 400 });
  }

  let gateway: Response;
  try {
    gateway = await connectAssistant(messages, req.signal, system);
  } catch {
    return new Response('assistant unavailable', { status: 502 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const text of parseTextDeltas(gateway)) controller.enqueue(enc.encode(text));
      } catch {
        /* mid-stream failure: end gracefully */
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}
