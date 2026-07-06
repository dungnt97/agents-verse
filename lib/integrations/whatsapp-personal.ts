import { existsSync } from 'node:fs';
import { join } from 'node:path';

// WhatsApp via a PERSONAL account (Baileys — the WhatsApp Web multi-device protocol). Can cold-DM ANY
// number. Worker-only; Baileys (pulls sharp + native modules) is dynamic-imported so it never enters the
// web bundle (relative imports, no `server-only`).
//
// STRONG BAN CAVEAT (by design, documented): using an unofficial client is against WhatsApp's ToS and Meta
// bans numbers doing cold/bulk messaging FAST — use a BURNER number, keep volume low. A one-time QR login
// (scripts/whatsapp-personal-login.ts) writes the session into WHATSAPP_PERSONAL_AUTH_DIR; sends are then
// headless.

export interface WaPersonalResult {
  ok: boolean;
  error?: string;
}

export function whatsappPersonalConfigured(): boolean {
  const dir = process.env.WHATSAPP_PERSONAL_AUTH_DIR;
  return !!dir && existsSync(join(dir, 'creds.json'));
}

interface WaSock {
  ev: { on(event: string, cb: (arg: unknown) => void): void };
  sendMessage(jid: string, content: { text: string }): Promise<unknown>;
  onWhatsApp(num: string): Promise<Array<{ exists: boolean; jid: string }> | undefined>;
}

// One long-lived socket per worker process; on a disconnect the promise is cleared so the next send
// reconnects from the saved auth state.
let sockPromise: Promise<WaSock> | null = null;
async function getSock(): Promise<WaSock> {
  if (!sockPromise) {
    sockPromise = (async () => {
      const baileys = (await import('@whiskeysockets/baileys')) as unknown as {
        default?: (opts: unknown) => WaSock;
        makeWASocket?: (opts: unknown) => WaSock;
        useMultiFileAuthState: (dir: string) => Promise<{ state: unknown; saveCreds: () => Promise<void> }>;
      };
      const makeWASocket = baileys.default ?? baileys.makeWASocket;
      if (!makeWASocket) throw new Error('baileys: makeWASocket export not found');
      const { state, saveCreds } = await baileys.useMultiFileAuthState(process.env.WHATSAPP_PERSONAL_AUTH_DIR as string);
      const sock = makeWASocket({ auth: state });
      sock.ev.on('creds.update', () => void saveCreds());
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('whatsapp connect timeout')), 30_000);
        sock.ev.on('connection.update', (arg: unknown) => {
          const u = arg as { connection?: string; lastDisconnect?: { error?: { message?: string } } };
          if (u.connection === 'open') {
            clearTimeout(timer);
            resolve();
          } else if (u.connection === 'close') {
            clearTimeout(timer);
            sockPromise = null; // force reconnect on the next send
            reject(new Error(`whatsapp connection closed: ${u.lastDisconnect?.error?.message ?? ''}`));
          }
        });
      });
      return sock;
    })().catch((e) => {
      sockPromise = null;
      throw e;
    });
  }
  return sockPromise;
}

export async function sendWhatsAppPersonal(phone: string, text: string): Promise<WaPersonalResult> {
  if (!whatsappPersonalConfigured()) {
    return { ok: false, error: 'whatsapp personal not configured (WHATSAPP_PERSONAL_AUTH_DIR with a QR-logged-in session)' };
  }
  const digits = phone.replace(/[^\d]/g, '').replace(/^00/, '');
  if (!/^[1-9]\d{7,14}$/.test(digits)) return { ok: false, error: `invalid phone: ${phone}` };
  try {
    const sock = await getSock();
    // Confirm the number is actually on WhatsApp (and get its canonical jid) before sending.
    const check = await sock.onWhatsApp(digits);
    if (!check || !check[0]?.exists) return { ok: false, error: `no WhatsApp account for ${digits}` };
    await sock.sendMessage(check[0].jid, { text });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
