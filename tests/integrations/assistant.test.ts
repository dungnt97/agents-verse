import { describe, it, expect, afterEach } from 'vitest';
import { assistantConfigured, parseTextDeltas } from '@/lib/integrations/assistant';

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
  let out = '';
  for await (const t of gen) out += t;
  return out;
}

describe('assistantConfigured', () => {
  const keys = ['ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN', 'AGENT_MODEL_SONNET'] as const;
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k] as string;
    }
  });

  it('is true only when all three gateway vars are set', () => {
    for (const k of keys) process.env[k] = 'x';
    expect(assistantConfigured()).toBe(true);
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    expect(assistantConfigured()).toBe(false);
  });
});

describe('parseTextDeltas', () => {
  it('yields only text_delta chunks, ignoring other events / keepalives / [DONE]', async () => {
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
    expect(await collect(parseTextDeltas(sseResponse(sse)))).toBe('Xin chào');
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
    expect(await collect(parseTextDeltas(new Response(stream)))).toBe('hello');
  });
});
