# Agents Verse — container image for VPS deploy.
# Postgres is Supabase managed (external to this image). The runner keeps the full toolchain
# (drizzle-kit + tsx) so the entrypoint can run migrate -> seed -> start self-contained.

# --- build stage: install all deps + produce the production build ---
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* are inlined into the client bundle at build time, so they must be present here
# (not just at runtime). Pass via --build-arg / compose build.args.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build

# --- runner stage: app + migrate/seed toolchain ---
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Carry the built app, full node_modules (incl. drizzle-kit/tsx for entrypoint), source, and
# generated migrations.
COPY --from=build /app ./
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
# tini-free: Next handles SIGTERM (HTTP drain) and lib/db/client.ts closes the pool on SIGTERM.
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
