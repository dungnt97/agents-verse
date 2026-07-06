import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { telegramUserConfigured, sendTelegramUser } from '@/lib/integrations/telegram-user';
import { whatsappPersonalConfigured, sendWhatsAppPersonal } from '@/lib/integrations/whatsapp-personal';

// These guard paths run BEFORE the heavy libs are dynamic-imported, so we can assert the degrade + input
// validation without loading GramJS / Baileys or opening a connection.
const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe('telegram-user adapter guards', () => {
  beforeEach(() => {
    delete process.env.TELEGRAM_API_ID;
    delete process.env.TELEGRAM_API_HASH;
    delete process.env.TELEGRAM_USER_SESSION;
  });
  it('telegramUserConfigured requires api id + hash + session', () => {
    expect(telegramUserConfigured()).toBe(false);
    process.env.TELEGRAM_API_ID = '1';
    process.env.TELEGRAM_API_HASH = 'h';
    expect(telegramUserConfigured()).toBe(false);
    process.env.TELEGRAM_USER_SESSION = 's';
    expect(telegramUserConfigured()).toBe(true);
  });
  it('sendTelegramUser degrades (no throw, no import) when unconfigured', async () => {
    const r = await sendTelegramUser('+84906200434', 'hi');
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/not configured/) });
  });
});

describe('whatsapp-personal adapter guards', () => {
  let dir: string;
  beforeEach(() => {
    delete process.env.WHATSAPP_PERSONAL_AUTH_DIR;
    dir = mkdtempSync(join(tmpdir(), 'wa-personal-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  it('whatsappPersonalConfigured needs a creds.json in the auth dir', () => {
    process.env.WHATSAPP_PERSONAL_AUTH_DIR = dir;
    expect(whatsappPersonalConfigured()).toBe(false); // no creds yet
    writeFileSync(join(dir, 'creds.json'), '{}');
    expect(whatsappPersonalConfigured()).toBe(true);
  });
  it('sendWhatsAppPersonal degrades when unconfigured', async () => {
    const r = await sendWhatsAppPersonal('+84906200434', 'hi');
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/not configured/) });
  });
  it('rejects an invalid phone before opening a connection (configured but bad number)', async () => {
    writeFileSync(join(dir, 'creds.json'), '{}');
    process.env.WHATSAPP_PERSONAL_AUTH_DIR = dir;
    const r = await sendWhatsAppPersonal('0906200434', 'hi'); // national leading-0 → invalid
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/invalid phone/) });
  });
});
