import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  whatsappConfigured,
  toE164Digits,
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from '@/lib/integrations/whatsapp';

function mockFetch(status: number, json: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
    text: async () => JSON.stringify(json),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const saved = { ...process.env };
beforeEach(() => {
  process.env.WHATSAPP_PHONE_NUMBER_ID = '111';
  process.env.WHATSAPP_ACCESS_TOKEN = 'tok';
});
afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...saved };
});

describe('toE164Digits', () => {
  it('strips formatting to bare digits and drops a leading 00', () => {
    expect(toE164Digits('+84 906 200 434')).toBe('84906200434');
    expect(toE164Digits('(1) 415-555-0100')).toBe('14155550100');
    expect(toE164Digits('0084906200434')).toBe('84906200434');
  });
  it('rejects too-short / too-long / empty', () => {
    expect(toE164Digits('123')).toBeNull();
    expect(toE164Digits('1'.repeat(16))).toBeNull();
    expect(toE164Digits(null)).toBeNull();
    expect(toE164Digits('')).toBeNull();
  });
  it('rejects a national-format number with a leading trunk 0 (no reliable country code)', () => {
    expect(toE164Digits('0906200434')).toBeNull();
    expect(toE164Digits('(090) 620-0434')).toBeNull();
  });
});

describe('whatsappConfigured', () => {
  it('needs both phone id and token', () => {
    expect(whatsappConfigured()).toBe(true);
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    expect(whatsappConfigured()).toBe(false);
  });
});

describe('sendWhatsAppTemplate', () => {
  it('posts a template message with ordered body params to the phone-id endpoint', async () => {
    const fn = mockFetch(200, { messages: [{ id: 'wamid.X' }] });
    const r = await sendWhatsAppTemplate('+84 906 200 434', 'demo_tpl', 'vi', ['Acme', 'https://x/demo/1']);
    expect(r).toEqual({ ok: true, id: 'wamid.X' });
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toBe('https://graph.facebook.com/v21.0/111/messages');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      messaging_product: 'whatsapp',
      to: '84906200434', // normalised
      type: 'template',
      template: { name: 'demo_tpl', language: { code: 'vi' } },
    });
    expect(body.template.components[0].parameters).toEqual([
      { type: 'text', text: 'Acme' },
      { type: 'text', text: 'https://x/demo/1' },
    ]);
  });

  it('rejects an unusable phone without calling fetch', async () => {
    const fn = mockFetch(200, {});
    const r = await sendWhatsAppTemplate('123', 'tpl', 'en', []);
    expect(r.ok).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it('degrades (no throw) when unconfigured', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    mockFetch(200, {});
    const r = await sendWhatsAppTemplate('+84906200434', 'tpl', 'en', []);
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/not configured/) });
  });

  it('surfaces a non-ok API error', async () => {
    mockFetch(400, { error: { message: 'bad template' } });
    const r = await sendWhatsAppTemplate('+84906200434', 'tpl', 'en', []);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/whatsapp 400/);
  });
});

describe('sendWhatsAppText', () => {
  it('posts a free-form text message (for within-session replies)', async () => {
    const fn = mockFetch(200, { messages: [{ id: 'wamid.Y' }] });
    const r = await sendWhatsAppText('84906200434', 'cảm ơn anh');
    expect(r.ok).toBe(true);
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ type: 'text', to: '84906200434', text: { body: 'cảm ơn anh' } });
  });
});
