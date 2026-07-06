// Telegram Bot API sender — fetch-based, no SDK. Relative imports, no `server-only` (worker + web routes).
//
// IMPORTANT constraint (why Telegram is NOT a cold-outreach channel): the Bot API can only message a
// chat that has ALREADY started a conversation with the bot (sent /start) — you cannot DM a stranger by
// phone. So this is used for (a) NOTIFY: pushing pipeline events to the founder/team chat
// (TELEGRAM_CHAT_ID), and (b) replying to an INBOUND chat whose chat_id we captured from the webhook.
const API = 'https://api.telegram.org';

export interface TelegramResult {
  ok: boolean;
  messageId?: number;
  error?: string;
}

export function telegramConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

export async function sendTelegramMessage(chatId: string | number, text: string): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: 'telegram not configured (set TELEGRAM_BOT_TOKEN)' };
  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: { message_id?: number }; description?: string };
    if (!res.ok || !j.ok) return { ok: false, error: `telegram ${res.status}: ${j.description ?? ''}`.trim() };
    return { ok: true, messageId: j.result?.message_id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Best-effort ops notification to the configured team chat. No-ops (returns skipped) when unconfigured so
// a caller can fire-and-forget without guarding — a missing notify channel must never break a pipeline.
export async function notifyTelegram(text: string): Promise<TelegramResult> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!telegramConfigured() || !chatId) return { ok: false, error: 'telegram notify not configured' };
  return sendTelegramMessage(chatId, text);
}
