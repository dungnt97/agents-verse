import { timingSafeEqual } from 'node:crypto';
import { parseTelegramUpdate } from '@/lib/integrations/telegram-inbound';
import { sendTelegramMessage, notifyTelegram } from '@/lib/integrations/telegram';

// Telegram Bot API webhook. Telegram authenticates the webhook with a secret token in the
// X-Telegram-Bot-Api-Secret-Token header (registered via setWebhook), so we compare it here — the route
// is disabled (404) when TELEGRAM_WEBHOOK_SECRET is unset. Telegram can't cold-message a stranger, so this
// is an INBOUND entry point (someone messages the bot): we acknowledge them and notify the team chat.
export const dynamic = 'force-dynamic';

// Constant-time secret compare (avoids a per-byte timing side-channel on the sole auth gate).
function secretMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Best-effort in-memory dedup of Telegram's at-least-once update redelivery (bounded set). A redelivered
// update_id is skipped so it can't double-send the reply + team notification. Per-process (like the chat
// rate limiter) — fine on a single VPS.
const seenUpdates = new Set<number>();
function alreadyHandled(updateId: number | null): boolean {
  if (updateId == null) return false;
  if (seenUpdates.has(updateId)) return true;
  seenUpdates.add(updateId);
  if (seenUpdates.size > 5000) seenUpdates.delete(seenUpdates.values().next().value as number);
  return false;
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return new Response('telegram webhook disabled (set TELEGRAM_WEBHOOK_SECRET)', { status: 404 });
  if (!secretMatches(req.headers.get('x-telegram-bot-api-secret-token'), secret)) {
    return new Response('invalid secret', { status: 401 });
  }

  let update: unknown;
  try {
    update = await req.json();
  } catch {
    return new Response('bad payload', { status: 400 });
  }
  const msg = parseTelegramUpdate(update);
  if (!msg) return new Response('ignored', { status: 200 }); // non-message update
  if (alreadyHandled(msg.updateId)) return new Response('ok (dup)', { status: 200 }); // redelivered update

  // Acknowledge the sender in their own chat, and mirror the message to the team chat (best-effort — a
  // notify failure must not 5xx the webhook, which would make Telegram retry).
  const isStart = msg.text.startsWith('/start');
  const reply = isStart
    ? 'Hi! You are chatting with the Agents Verse bot. Send a message and our team will follow up shortly.'
    : 'Thanks — we received your message and the team will get back to you shortly.';
  await sendTelegramMessage(msg.chatId, reply).catch(() => {});
  if (!isStart) {
    await notifyTelegram(`Telegram inbound from @${msg.from} (chat ${msg.chatId}): ${msg.text.slice(0, 300)}`).catch(() => {});
  }
  return new Response('ok', { status: 200 });
}
