/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for container deploys (.next/standalone). The Docker
  // entrypoint still runs `next start` (it needs the full toolchain to apply migrations + seed
  // before boot); adopting the slim standalone runtime is a later optimization once migrate/seed
  // move to a separate one-shot job.
  output: 'standalone',
  // Worker-only personal-outreach libraries (Telegram MTProto userbot + Baileys WhatsApp). They are
  // dynamic-imported inside the worker send-adapters and must never be bundled into the web server build
  // (Baileys pulls sharp + native modules); keep them external so `next build` leaves them as runtime deps.
  serverExternalPackages: ['telegram', '@whiskeysockets/baileys'],
  // Only files under `app/` define routes. Next 16 does not run ESLint during `next build`;
  // lint is run separately via `npm run lint` (scoped to app/lib/components).
  //
  // Rendering note: the root layout reads theme/lang cookies on the server to emit correct initial
  // HTML (no FOUC), which makes routes dynamic (SSR-on-demand). Deploy target is therefore a
  // Node/edge host, not a pure static export.
};

export default nextConfig;
