# Agents Verse — container image for VPS deploy.
# Postgres runs as the `db` service in docker-compose (no external managed DB). The runner keeps
# the full toolchain (drizzle-kit + tsx) so the entrypoint can run migrate -> seed -> start.

# --- build stage: install all deps + produce the production build ---
FROM node:22-bookworm-slim AS build
WORKDIR /app
# ws's native accelerators (bufferutil/utf-8-validate — pulled in via telegram/baileys) are compiled by
# node-gyp during `npm ci`, which needs a C toolchain + python3 the slim base doesn't ship (fails with
# "Could not find any Python installation"). Install them first so the web image builds reproducibly.
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
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
