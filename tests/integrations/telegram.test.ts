import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { telegramConfigured, sendTelegramMessage, notifyTelegram } from '@/lib/integrations/telegram';

function mockFetch(status: number, json: unknown) {
  const fn = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => json });
  vi.stubGlobal('fetch', fn);
  return fn;
}
const saved = { ...process.env };
beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'bot:tok';
  delete process.env.TELEGRAM_CHAT_ID;
});
afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...saved };
});

describe('sendTelegramMessage', () => {
  it('posts to /bot<token>/sendMessage and returns the message id', async () => {
    const fn = mockFetch(200, { ok: true, result: { message_id: 42 } });
    const r = await sendTelegramMessage(123, 'hello');
    expect(r).toEqual({ ok: true, messageId: 42 });
    expect(String(fn.mock.calls[0][0])).toBe('https://api.telegram.org/botbot:tok/sendMessage');
    expect(JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string)).toMatchObject({ chat_id: 123, text: 'hello' });
  });
  it('degrades when unconfigured', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const fn = mockFetch(200, {});
    const r = await sendTelegramMessage(1, 'x');
    expect(r.ok).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });
  it('surfaces a Telegram API error (ok:false)', async () => {
    mockFetch(400, { ok: false, description: 'chat not found' });
    const r = await sendTelegramMessage(1, 'x');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/chat not found/);
  });
});

describe('telegramConfigured + notifyTelegram', () => {
  it('notify no-ops without a configured team chat', async () => {
    const fn = mockFetch(200, { ok: true, result: {} });
    const r = await notifyTelegram('ping');
    expect(r.ok).toBe(false); // no TELEGRAM_CHAT_ID
    expect(fn).not.toHaveBeenCalled();
  });
  it('notify sends to the configured team chat', async () => {
    process.env.TELEGRAM_CHAT_ID = '999';
    const fn = mockFetch(200, { ok: true, result: { message_id: 7 } });
    const r = await notifyTelegram('new reply');
    expect(r.ok).toBe(true);
    expect(JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string)).toMatchObject({ chat_id: '999', text: 'new reply' });
  });
  it('telegramConfigured reflects the token', () => {
    expect(telegramConfigured()).toBe(true);
    delete process.env.TELEGRAM_BOT_TOKEN;
    expect(telegramConfigured()).toBe(false);
  });
});
