/**
 * One-time interactive login for the Telegram USERBOT (personal-account cold-outreach channel).
 *
 * Run:  TELEGRAM_API_ID=... TELEGRAM_API_HASH=... npx tsx scripts/telegram-user-login.ts
 * Get API_ID / API_HASH from https://my.telegram.org → "API development tools".
 *
 * It prompts for your phone (international, +…), the login code Telegram sends, and a 2FA password if you
 * have one, then prints TELEGRAM_USER_SESSION=<string>. Paste that into .env.local — the worker then sends
 * headlessly. Use a SECONDARY account (cold messaging risks a ban).
 */
import { createInterface } from 'node:readline/promises';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

async function main(): Promise<void> {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  if (!apiId || !apiHash) throw new Error('Set TELEGRAM_API_ID and TELEGRAM_API_HASH (from my.telegram.org).');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => rl.question(q);
  const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });

  await client.start({
    phoneNumber: async () => ask('Phone (international, e.g. +8490…): '),
    phoneCode: async () => ask('Login code you received: '),
    password: async () => ask('2FA password (leave blank if none): '),
    onError: (e: unknown) => console.error('login error:', e),
  });

  console.log('\n--- copy this line into .env.local ---');
  console.log('TELEGRAM_USER_SESSION=' + client.session.save());
  console.log('--------------------------------------');
  await client.disconnect();
  rl.close();
  process.exit(0);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
