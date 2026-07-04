import { assistantConfigured, connectAssistant, parseTextDeltas, type ChatTurn } from '@/lib/integrations/assistant';
import { slidingWindowLimiter } from '@/lib/integrations/chat-rate-limit';

// Streaming assistant chat for the ChatWidget. Real Q&A via the Anthropic-compatible gateway, streamed
// back as plain-text chunks. When the gateway isn't configured it returns 503 and the widget falls back
// to its built-in rule-based replies (so demo mode is unchanged). Public endpoint → rate-limited + the
// transcript is capped before it reaches the model.
export const dynamic = 'force-dynamic';

const MAX_TURNS = 8; // only the last few turns are sent (bounds tokens + abuse)
const MAX_CONTENT = 2000; // per-message character cap

// Per-client limiter (20 msgs / 5 min) PLUS a coarse global ceiling (200 msgs / 5 min) as a spend
// backstop: the per-IP key is only as trustworthy as the proxy, so a global cap bounds total paid-gateway
// cost even if IP keying is defeated. Best-effort, in-memory (resets on restart — fine on one VPS).
const limited = slidingWindowLimiter(20, 5 * 60_000);
const globalLimited = slidingWindowLimiter(200, 5 * 60_000);

// Derive the client key from a TRUSTED source: X-Real-IP (proxy-set) first, else the LAST X-Forwarded-For
// hop — the one appended by our own fronting proxy. The FIRST hop is client-supplied and trivially spoofed
// (rotating it per request would bypass the per-IP cap entirely on this unauthenticated endpoint).
function clientKey(req: Request): string {
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const hops = (req.headers.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return hops.length ? hops[hops.length - 1] : 'local';
}

export async function POST(req: Request): Promise<Response> {
  if (!assistantConfigured()) return new Response('assistant not configured', { status: 503 });

  const now = Date.now();
  // Evaluate BOTH limiters (each call records a hit) so global accounting stays accurate even when the
  // per-IP check passes.
  const ipOver = limited(clientKey(req), now);
  const globalOver = globalLimited('*', now);
  if (ipOver || globalOver) return new Response('rate limited', { status: 429 });

  let body: { messages?: unknown };
  try {
    body = (await req.json()) as { messages?: unknown };
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const sliced: ChatTurn[] = raw
    .slice(-MAX_TURNS)
    .map((m): ChatTurn => ({
      role: (m as { role?: unknown })?.role === 'assistant' ? 'assistant' : 'user',
      content: String((m as { content?: unknown })?.content ?? '').slice(0, MAX_CONTENT),
    }))
    .filter((m) => m.content.trim());

  // The widget seeds an assistant greeting, so the transcript can LEAD with an assistant turn (and slicing
  // can also strand one first) — but the Messages API rejects a transcript whose first turn isn't 'user'
  // or whose roles don't alternate. Drop leading assistant turns, then merge consecutive same-role turns.
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

  // Open the gateway stream BEFORE returning so a connection failure degrades cleanly (502 → widget
  // falls back to rule-based) rather than committing to a broken stream.
  let gateway: Response;
  try {
    gateway = await connectAssistant(messages, req.signal);
  } catch {
    return new Response('assistant unavailable', { status: 502 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const text of parseTextDeltas(gateway)) controller.enqueue(enc.encode(text));
      } catch {
        // Mid-stream failure: end gracefully; the widget keeps whatever streamed.
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}
