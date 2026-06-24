import { assistantConfigured, connectAssistant, parseTextDeltas, type ChatTurn } from '@/lib/integrations/assistant';
import { slidingWindowLimiter } from '@/lib/integrations/chat-rate-limit';

// Streaming assistant chat for the ChatWidget. Real Q&A via the Anthropic-compatible gateway, streamed
// back as plain-text chunks. When the gateway isn't configured it returns 503 and the widget falls back
// to its built-in rule-based replies (so demo mode is unchanged). Public endpoint → rate-limited + the
// transcript is capped before it reaches the model.
export const dynamic = 'force-dynamic';

const MAX_TURNS = 8; // only the last few turns are sent (bounds tokens + abuse)
const MAX_CONTENT = 2000; // per-message character cap

// Module-level limiter: 20 messages / 5 min per client IP (best-effort, in-memory).
const limited = slidingWindowLimiter(20, 5 * 60_000);

export async function POST(req: Request): Promise<Response> {
  if (!assistantConfigured()) return new Response('assistant not configured', { status: 503 });

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local';
  if (limited(ip, Date.now())) return new Response('rate limited', { status: 429 });

  let body: { messages?: unknown };
  try {
    body = (await req.json()) as { messages?: unknown };
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatTurn[] = raw
    .slice(-MAX_TURNS)
    .map((m): ChatTurn => ({
      role: (m as { role?: unknown })?.role === 'assistant' ? 'assistant' : 'user',
      content: String((m as { content?: unknown })?.content ?? '').slice(0, MAX_CONTENT),
    }))
    .filter((m) => m.content.trim());
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
