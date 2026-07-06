// `qrcode-terminal` ships no types. Only used by scripts/whatsapp-personal-login.ts to render the Baileys
// pairing QR in the terminal.
declare module 'qrcode-terminal' {
  export function generate(input: string, opts?: { small?: boolean }, cb?: (qr: string) => void): void;
  const _default: { generate: typeof generate };
  export default _default;
}
