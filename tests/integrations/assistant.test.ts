import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  assistantConfigured,
  connectAssistant,
  parseTextDeltas,
  type ChatTurn,
} from '@/lib/integrations/assistant';

// ---- helpers ---------------------------------------------------------------

function sseResponse(body: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new TextEncoder().encode(body));
      c.close();
    },
  });
  return new Response(stream);
}

async function collect(gen: AsyncGenerator<string>): Promise<string> {
  const out: string[] = [];
  for await (const t of gen) out.push(t);
  return out;
}

// Env keys the module reads. Save/restore around every test so cases are isolated.
const ENV_KEYS = ['ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN', 'AGENT_MODEL_SONNET'] as const;

function snapshotEnv(): Record<string, string | undefined> {
  return Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
}

function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k] as string;
  }
}

// ---- assistantConfigured ---------------------------------------------------

describe('assistantConfigured', () => {
  let saved: Record<string, string | undefined>;
  beforeEach(() => {
    saved = snapshotEnv();
  });
  afterEach(() => {
    restoreEnv(saved);
  });

  it('is true only when all three gateway vars are set', () => {
    for (const k of ENV_KEYS) process.env[k] = 'x';
    expect(assistantConfigured()).toBe(true);
  });

  it('is false when ANTHROPIC_BASE_URL is missing', () => {
    for (const k of ENV_KEYS) process.env[k] = 'x';
    delete process.env.ANTHROPIC_BASE_URL;
    expect(assistantConfigured()).toBe(false);
  });

  it('is false when ANTHROPIC_AUTH_TOKEN is missing', () => {
    for (const k of ENV_KEYS) process.env[k] = 'x';
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    expect(assistantConfigured()).toBe(false);
  });

  it('is false when AGENT_MODEL_SONNET is missing', () => {
    for (const k of ENV_KEYS) process.env[k] = 'x';
    delete process.env.AGENT_MODEL_SONNET;
    expect(assistantConfigured()).toBe(false);
  });

  it('is false when none are set', () => {
    for (const k of ENV_KEYS) delete process.env[k];
    expect(assistantConfigured()).toBe(false);
  });

  it('treats empty-string values as not configured', () => {
    process.env.ANTHROPIC_BASE_URL = '';
    process.env.ANTHROPIC_AUTH_TOKEN = 'tok';
    process.env.AGENT_MODEL_SONNET = 'sonnet';
    expect(assistantConfigured()).toBe(false);
  });
});

// ---- connectAssistant ------------------------------------------------------

describe('connectAssistant', () => {
  let saved: Record<string, string | undefined>;
  const realFetch = global.fetch;

  beforeEach(() => {
    saved = snapshotEnv();
    process.env.ANTHROPIC_BASE_URL = 'https://gw.example.com/';
    process.env.ANTHROPIC_AUTH_TOKEN = 'secret-token';
    process.env.AGENT_MODEL_SONNET = 'claude-sonnet-test';
  });

  afterEach(() => {
    restoreEnv(saved);
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  const messages: ChatTurn[] = [
    { role: 'user', content: 'How does lead discovery work?' },
    { role: 'assistant', content: 'It scans Google Places.' },
    { role: 'user', content: 'Thanks' },
  ];

  it('returns the Response when the gateway replies ok with a body, and sends a correct request', async () => {
    const okRes = sseResponse('data: {}\n');
    const fetchMock = vi.fn().mockResolvedValue(okRes);
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await connectAssistant(messages);
    expect(res).toBe(okRes);

    // URL: trailing slash stripped from base, then `/v1/messages` appended.
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://gw.example.com/v1/messages');

    const opts = init as RequestInit;
    expect(opts.method).toBe('POST');

    const headers = opts.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('secret-token');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(headers['content-type']).toBe('application/json');

    const sent = JSON.parse(opts.body as string) as {
      model: string;
      max_tokens: number;
      system: string;
      stream: boolean;
      messages: ChatTurn[];
    };
    expect(sent.model).toBe('claude-sonnet-test');
    expect(sent.max_tokens).toBe(600);
    expect(sent.stream).toBe(true);
    expect(sent.messages).toEqual(messages);
    // System prompt is included and carries the Q&A-only guardrails (covers SYSTEM_PROMPT usage).
    expect(sent.system).toContain('Verse assistant for Agents Verse');
    expect(sent.system).toContain('Q&A');
    expect(sent.system).toContain('You do NOT do work');
    expect(sent.system).toContain('SAME language as the user');
  });

  it('forwards the abort signal to fetch when provided', async () => {
    const okRes = sseResponse('data: {}\n');
    const fetchMock = vi.fn().mockResolvedValue(okRes);
    global.fetch = fetchMock as unknown as typeof fetch;

    const controller = new AbortController();
    await connectAssistant(messages, controller.signal);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
  });

  it('strips only a single trailing slash from the base url', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://gw.example.com';
    const okRes = sseResponse('data: {}\n');
    const fetchMock = vi.fn().mockResolvedValue(okRes);
    global.fetch = fetchMock as unknown as typeof fetch;

    await connectAssistant(messages);
    expect(fetchMock.mock.calls[0][0]).toBe('https://gw.example.com/v1/messages');
  });

  it('uses an empty base when ANTHROPIC_BASE_URL is unset', async () => {
    delete process.env.ANTHROPIC_BASE_URL;
    const okRes = sseResponse('data: {}\n');
    const fetchMock = vi.fn().mockResolvedValue(okRes);
    global.fetch = fetchMock as unknown as typeof fetch;

    await connectAssistant(messages);
    expect(fetchMock.mock.calls[0][0]).toBe('/v1/messages');
  });

  it('throws with the status and (truncated) detail on a non-ok response', async () => {
    const detail = 'x'.repeat(500); // longer than the 200-char slice
    const fetchMock = vi.fn().mockImplementation(() => new Response(detail, { status: 502 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(connectAssistant(messages)).rejects.toThrow(/assistant gateway 502:/);
    // Detail is truncated to 200 chars in the message.
    try {
      await connectAssistant(messages);
      throw new Error('expected throw');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg.startsWith('assistant gateway 502: ')).toBe(true);
      expect(msg).toContain('x'.repeat(200));
      expect(msg).not.toContain('x'.repeat(201));
    }
  });

  it('throws when the response is ok but has a null body', async () => {
    const noBody = new Response(null, { status: 204 }); // ok=true, body=null
    const fetchMock = vi.fn().mockResolvedValue(noBody);
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(connectAssistant(messages)).rejects.toThrow(/assistant gateway 204:/);
  });

  it('tolerates res.text() rejecting and still throws with empty detail', async () => {
    // Response-like object: not ok, no body, and .text() rejects -> the `.catch(() => "")` path.
    const flaky = {
      ok: false,
      body: null,
      status: 500,
      text: vi.fn().mockRejectedValue(new Error('stream read failed')),
    } as unknown as Response;
    const fetchMock = vi.fn().mockResolvedValue(flaky);
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(connectAssistant(messages)).rejects.toThrow('assistant gateway 500: ');
  });
});

// ---- parseTextDeltas -------------------------------------------------------

describe('parseTextDeltas', () => {
  it('yields only text_delta chunks, ignoring other events / keepalives / [DONE] / blank lines', async () => {
    const sse = [
      'event: message_start',
      'data: {"type":"message_start"}',
      '',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Xin "}}',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"chào"}}',
      ': keepalive',
      'data: {"type":"content_block_stop"}',
      'data: [DONE]',
      '',
    ].join('\n');
    expect(await collect(parseTextDeltas(sseResponse(sse)))).toEqual(['Xin ', 'chào']);
  });

  it('reassembles a data line split across read boundaries', async () => {
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode('data: {"type":"content_block_delta","delta":{"type":"text_'));
        c.enqueue(enc.encode('delta","text":"hello"}}\n'));
        c.close();
      },
    });
    expect(await collect(parseTextDeltas(new Response(stream)))).toEqual(['hello']);
  });

  it('ignores a data line with empty payload after the "data:" prefix', async () => {
    const sse = ['data:', 'data:   ', ''].join('\n');
    expect(await collect(parseTextDeltas(sseResponse(sse)))).toEqual([]);
  });

  it('ignores invalid JSON data lines (keepalive / malformed)', async () => {
    const sse = [
      'data: not-json-at-all',
      'data: {broken',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}',
      '',
    ].join('\n');
    expect(await collect(parseTextDeltas(sseResponse(sse)))).toEqual(['ok']);
  });

  it('ignores content_block_delta events whose delta is not a text_delta', async () => {
    const sse = [
      'data: {"type":"content_block_delta","delta":{"type":"input_json_delta","partial_json":"{}"}}',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"kept"}}',
      '',
    ].join('\n');
    expect(await collect(parseTextDeltas(sseResponse(sse)))).toEqual(['kept']);
  });

  it('ignores a text_delta with empty/missing text', async () => {
    const sse = [
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":""}}',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta"}}',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"real"}}',
      '',
    ].join('\n');
    expect(await collect(parseTextDeltas(sseResponse(sse)))).toEqual(['real']);
  });

  it('skips lines that do not start with "data:" (event / comment lines)', async () => {
    const sse = [
      'event: ping',
      ': a comment',
      'random noise',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"after"}}',
      '',
    ].join('\n');
    expect(await collect(parseTextDeltas(sseResponse(sse)))).toEqual(['after']);
  });

  it('drops a trailing partial line that never receives its newline', async () => {
    // No trailing newline: the final (partial) line stays buffered and is never emitted.
    const sse =
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"done"}}\n' +
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"partial';
    expect(await collect(parseTextDeltas(sseResponse(sse)))).toEqual(['done']);
  });

  it('returns nothing for an empty stream', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.close();
      },
    });
    expect(await collect(parseTextDeltas(new Response(stream)))).toEqual([]);
  });
});
