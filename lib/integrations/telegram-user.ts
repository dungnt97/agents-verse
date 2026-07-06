// Telegram USERBOT (GramJS / MTProto) — sends as a PERSONAL account, so unlike the Bot API it CAN
// cold-DM a stranger by phone number. Worker-only; GramJS is dynamic-imported so its weight never enters
// the web bundle (relative imports, no `server-only`).
//
// BAN CAVEAT (by design, documented): mass cold messaging triggers Telegram's PEER_FLOOD limit and can get
// the account banned — use a SECONDARY account and keep volume low. A one-time interactive login
// (scripts/telegram-user-login.ts) produces TELEGRAM_USER_SESSION; the send path is then headless.

export interface TgUserResult {
  ok: boolean;
  error?: string;
}

export function telegramUserConfigured(): boolean {
  return (
    !!process.env.TELEGRAM_API_ID && !!process.env.TELEGRAM_API_HASH && !!process.env.TELEGRAM_USER_SESSION
  );
}

// Minimal structural view of the bits of the GramJS client we use (avoids leaning on GramJS types across a
// dynamic import under strict TS).
interface TgClient {
  connect(): Promise<void>;
  invoke(req: unknown): Promise<{ users?: unknown[] }>;
  sendMessage(entity: unknown, opts: { message: string }): Promise<unknown>;
}

// One long-lived connected client per worker process (reused across sends).
let clientPromise: Promise<TgClient> | null = null;
async function getClient(): Promise<TgClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const gramjs = (await import('telegram')) as unknown as {
        TelegramClient: new (session: unknown, apiId: number, apiHash: string, opts: unknown) => TgClient;
      };
      const { StringSession } = (await import('telegram/sessions')) as unknown as {
        StringSession: new (s: string) => unknown;
      };
      const session = new StringSession(process.env.TELEGRAM_USER_SESSION as string);
      const client = new gramjs.TelegramClient(session, Number(process.env.TELEGRAM_API_ID), process.env.TELEGRAM_API_HASH as string, {
        connectionRetries: 3,
      });
      await client.connect();
      return client;
    })().catch((e) => {
      clientPromise = null; // let a later call retry the connection
      throw e;
    });
  }
  return clientPromise;
}

// Send to an @username (direct) or an international phone (resolved via a temporary contact import, which
// is what lets a personal account reach someone not yet in its contacts).
export async function sendTelegramUser(recipient: string, text: string): Promise<TgUserResult> {
  if (!telegramUserConfigured()) {
    return { ok: false, error: 'telegram user not configured (TELEGRAM_API_ID + TELEGRAM_API_HASH + TELEGRAM_USER_SESSION)' };
  }
  try {
    const client = await getClient();
    let entity: unknown;
    if (recipient.startsWith('@')) {
      entity = recipient;
    } else {
      const phone = '+' + recipient.replace(/[^\d]/g, '');
      const { Api } = (await import('telegram')) as unknown as { Api: Record<string, any> };
      const bigInt = ((await import('big-integer')) as unknown as { default: (n: number) => unknown }).default;
      const res = await client.invoke(
        new Api.contacts.ImportContacts({
          contacts: [new Api.InputPhoneContact({ clientId: bigInt(0), phone, firstName: 'Lead', lastName: '' })],
        }),
      );
      if (!res.users || res.users.length === 0) return { ok: false, error: `no Telegram account for ${phone}` };
      entity = res.users[0];
    }
    await client.sendMessage(entity, { message: text });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
