/**
 * One-time QR login for the PERSONAL WhatsApp cold-outreach channel (Baileys / WhatsApp Web protocol).
 *
 * Run:  WHATSAPP_PERSONAL_AUTH_DIR=./.wa-personal npx tsx scripts/whatsapp-personal-login.ts
 * A QR code prints in the terminal — scan it from your phone: WhatsApp → Settings → Linked Devices → Link
 * a device. On success the session is written to WHATSAPP_PERSONAL_AUTH_DIR; point the worker's
 * WHATSAPP_PERSONAL_AUTH_DIR at that folder. Use a BURNER number — unofficial clients + cold messaging get
 * numbers banned.
 */
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

async function main(): Promise<void> {
  const dir = process.env.WHATSAPP_PERSONAL_AUTH_DIR || './.wa-personal';
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const sock = makeWASocket({ auth: state });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u) => {
    if (u.qr) {
      console.log('\nScan this QR from WhatsApp → Linked Devices:\n');
      qrcode.generate(u.qr, { small: true });
    }
    if (u.connection === 'open') {
      console.log(`\nLogged in. Session saved to ${dir} — set WHATSAPP_PERSONAL_AUTH_DIR to it.`);
      process.exit(0);
    }
    if (u.connection === 'close') {
      console.error('connection closed:', (u.lastDisconnect?.error as Error | undefined)?.message ?? '');
    }
  });
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
