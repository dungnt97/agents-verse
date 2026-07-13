// Server-side client for the workspace/marketing assistant chat. Worker-safe (no `server-only`) so the
// discovery cron can reach it under tsx via orion-qualify; it still reads secrets from env and no
// `'use client'` module imports it. Calls the same Anthropic-compatible
// gateway the `claude` CLI uses (ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN), with the sonnet model id.
// The assistant is Q&A ONLY — it answers questions about Agents Verse and gives general help; it never
// executes work. No live account data is injected, so the (public) marketing widget can't leak anything.
// When the gateway isn't configured the caller degrades to the static rule-based reply (demo mode).

const SYSTEM_PROMPT = [
  'You are the Verse assistant for Agents Verse — an autonomous, demo-first AI web-design agency.',
  'Your job is Q&A and guidance ONLY: explain how the agency and its features work (lead discovery,',
  'website audits, demo generation, outreach, deals, delivery, autonomy modes, escalations), answer',
  'product questions, and point people to the right screen. You do NOT do work or build projects for',
  'anyone — if asked to perform a task, politely say you are a Q&A assistant and describe where in the',
  'app that work happens.',
  'You do NOT have access to live account numbers; for specific current figures (today’s spend, open',
  'escalations, a particular lead), tell the user where to find them on the dashboard rather than inventing.',
  'Reply in the SAME language as the user (Vietnamese or English). Be concise, warm, and concrete. No emoji.',
].join('\n');

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

const base = () => (process.env.ANTHROPIC_BASE_URL || '').replace(/\/$/, '');

// True when the gateway is configured to actually answer (mirrors the worker's claude-CLI requirements).
export function assistantConfigured(): boolean {
  return !!process.env.ANTHROPIC_BASE_URL && !!process.env.ANTHROPIC_AUTH_TOKEN && !!process.env.AGENT_MODEL_SONNET;
}

// Open a streaming Messages request against the gateway. Throws on a connection/non-OK error BEFORE any
// bytes stream, so the route can cleanly fall back (degrade) instead of committing to a broken stream.
// `system` overrides the default Q&A prompt — the per-demo inquiry chat passes its own (lead-scoped,
// qualify-lightly, never-quote-a-price) system prompt.
export async function connectAssistant(messages: ChatTurn[], signal?: AbortSignal, system: string = SYSTEM_PROMPT): Promise<Response> {
  const res = await fetch(`${base()}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_AUTH_TOKEN as string,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.AGENT_MODEL_SONNET,
      max_tokens: 600,
      system,
      stream: true,
      messages,
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`assistant gateway ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res;
}

// Non-streaming completion against the same gateway — for server-side agents (e.g. Orion's lead
// qualifier) that need ONE structured answer, not a token stream. Throws on a non-OK response so the
// caller can fall back. Returns the concatenated text content of the reply.
export async function completeText(
  prompt: string,
  opts?: { maxTokens?: number; system?: string; signal?: AbortSignal; timeoutMs?: number },
): Promise<string> {
  // Always bound the call: without a signal, a gateway that accepts the TCP connection but then stalls
  // (mid-restart, upstream hang) would block the caller for undici's ~5-minute default — freezing the
  // whole discovery pass or the "Ask AI summary" click. A caller-supplied signal takes precedence.
  const signal = opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 45_000);
  const res = await fetch(`${base()}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_AUTH_TOKEN as string,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.AGENT_MODEL_SONNET,
      max_tokens: opts?.maxTokens ?? 600,
      ...(opts?.system ? { system: opts.system } : {}),
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`assistant complete ${res.status}: ${detail.slice(0, 200)}`);
  }
  const j = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  return (j.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
}

// Parse an Anthropic-style SSE stream, yielding only the assistant's text deltas. Tolerant of keepalives,
// non-text events, and a trailing partial line. Exported for unit testing the parser in isolation.
export async function* parseTextDeltas(res: Response): AsyncGenerator<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    /* v8 ignore next -- split() always yields >=1 element, so pop() is never undefined */
    buf = lines.pop() ?? ''; // keep the last (possibly partial) line
    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith('data:')) continue;
      const payload = s.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const j = JSON.parse(payload) as { type?: string; delta?: { type?: string; text?: string } };
        if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta' && j.delta.text) {
          yield j.delta.text;
        }
      } catch {
        // ignore keepalive / non-JSON data lines
      }
    }
  }
}