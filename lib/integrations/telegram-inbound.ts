// Pure parser for the Telegram Bot API webhook (app/api/telegram). Telegram authenticates the webhook via
// a secret token in the `X-Telegram-Bot-Api-Secret-Token` header (set when registering the webhook), so
// there is no HMAC to verify here — the route compares that header. This just extracts the message.

export interface InboundTelegram {
  updateId: number | null; // Telegram's monotonic update id — for at-least-once redelivery dedup
  chatId: number; // where to reply
  text: string; // message text (or a synthesised label for /start etc.)
  from: string; // username or first name, for logging
  phone: string | null; // present only if the user shared their contact card
}

// Extract the essentials from an update. Returns null for updates with no usable message (edited-message,
// channel posts, callback queries, etc. are ignored for this MVP).
export function parseTelegramUpdate(body: unknown): InboundTelegram | null {
  if (!body || typeof body !== 'object') return null;
  const updateIdRaw = (body as { update_id?: unknown }).update_id;
  const updateId = typeof updateIdRaw === 'number' ? updateIdRaw : null;
  const msg = (body as { message?: unknown }).message as
    | {
        chat?: { id?: unknown };
        from?: { username?: unknown; first_name?: unknown };
        text?: unknown;
        contact?: { phone_number?: unknown };
      }
    | undefined;
  if (!msg || typeof msg !== 'object') return null;
  const chatId = typeof msg.chat?.id === 'number' ? msg.chat.id : null;
  if (chatId == null) return null;
  const text = typeof msg.text === 'string' ? msg.text : '';
  const contactPhone = typeof msg.contact?.phone_number === 'string' ? msg.contact.phone_number.replace(/[^\d]/g, '') : '';
  if (!text && !contactPhone) return null; // nothing actionable
  const from =
    (typeof msg.from?.username === 'string' && msg.from.username) ||
    (typeof msg.from?.first_name === 'string' && msg.from.first_name) ||
    'unknown';
  return { updateId, chatId, text, from, phone: contactPhone || null };
}
