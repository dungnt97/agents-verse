/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The legacy buildless prototype (root *.jsx / *.js / index.html) is kept in place but is NOT
  // part of this build — only files under `app/` define routes. Next 16 does not run ESLint during
  // `next build`; lint is run separately via `npm run lint` (scoped to app/lib/components).
  //
  // Rendering note: the root layout reads theme/lang cookies on the server to emit correct initial
  // HTML (no FOUC), which makes routes dynamic (SSR-on-demand). Deploy target is therefore a
  // Node/edge host, not a pure static export.
};

export default nextConfig;
