/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for container deploys (.next/standalone). The Docker
  // entrypoint still runs `next start` (it needs the full toolchain to apply migrations + seed
  // before boot); adopting the slim standalone runtime is a later optimization once migrate/seed
  // move to a separate one-shot job.
  output: 'standalone',
  // Only files under `app/` define routes. Next 16 does not run ESLint during `next build`;
  // lint is run separately via `npm run lint` (scoped to app/lib/components).
  //
  // Rendering note: the root layout reads theme/lang cookies on the server to emit correct initial
  // HTML (no FOUC), which makes routes dynamic (SSR-on-demand). Deploy target is therefore a
  // Node/edge host, not a pure static export.
};

export default nextConfig;
