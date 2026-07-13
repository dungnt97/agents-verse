# Ops & Runtime — Spec

> How this repo builds, boots, and is verified. Owner-of-truth for: the Compose topology, the two container images, the boot sequence, the npm scripts and what each one actually gates, and CI.
> Env-var semantics (what each var does, which file it must live in) live in [`../env-reference.md`](../env-reference.md) — this file never restates them.

## Boundary

**In scope:** `docker-compose.yml`, `docker-compose.override.yml`, `Dockerfile`, `Dockerfile.worker`, `.dockerignore`, `scripts/docker-entrypoint.sh`, `scripts/backup.sh`, `next.config.mjs`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.config.db.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, `package.json` scripts.

**Out of scope:** what any subsystem *does* at runtime (see its spec), env-var meanings (`../env-reference.md`), the step-by-step VPS procedure (`../deployment-guide.md`).

**Two runtimes.** `web` = Next.js (Node). `worker` = `npx tsx lib/inngest/worker-entrypoint.ts`. Playwright/Chromium, Lighthouse, Gemini and the `claude` CLI run **only** in `worker` (the Chromium binaries and the `claude` CLI are installed in `Dockerfile.worker` alone). `web` may only `inngest.send()`.

---

## Contracts

### Compose services

`db`, `redis`, `inngest`, `9router`, `web`, `worker` — that is the whole set.

| service | image / build | published port | notes |
|---|---|---|---|
| `db` | `postgres:17-alpine` | **none** — internal only | `env_file: .env.local`. `pgdata` volume. `pg_isready` healthcheck gates `web`/`inngest`/`worker` start. |
| `redis` | `redis:7-alpine` | none | `--appendonly yes`, `redisdata` volume. Exists only as Inngest's queue backend. |
| `inngest` | `inngest/inngest:v1.27.0` | none (dashboard `8288` commented out) | `command: ["inngest","start"]` — the binary name **must** be in the array; a bare `["start"]` execs a non-existent binary. |
| `9router` | `decolua/9router@sha256:…` — **digest-pinned** | `127.0.0.1:20129→20128` | The LLM gateway the `claude` CLI is pointed at. **No `env_file`** (least privilege — it holds gateway credentials and used to receive all of `.env.local`). `ninerouter_data` volume persists the connected provider's OAuth. Long-stream timeouts are raised for demo-gen. |
| `web` | `Dockerfile` | `3000:3000` (**all interfaces** — put a TLS proxy in front, or bind `127.0.0.1:3000:3000`) | `USE_DB: "true"` and `INNGEST_BASE_URL: http://inngest:8288` are hardcoded in `environment:`. Healthcheck fetches `/login`. |
| `worker` | `Dockerfile.worker` | none — outbound `connect()` only | `mem_limit: 4g`. `depends_on` db + inngest + **9router**. |

One-time 9router setup: open `http://localhost:20129`, log in with `INITIAL_PASSWORD`, connect a provider, mint an API key. See `../env-reference.md`.

### Boot contract (`web`, `scripts/docker-entrypoint.sh`)

`set -e` → node `select 1` retry loop against `DATABASE_URL` (30 × 1s) → `npm run db:migrate` (**fail-fast**) → `npm run db:seed` (**non-fatal**, `|| echo`) → `exec node_modules/.bin/next start -p 3000` (exec ⇒ Next is PID 1 and gets SIGTERM directly).

Never invert those two properties: a fatal seed crash-loops the container under `restart: unless-stopped`; a tolerant migrate serves an un-migrated schema. Governed by **I5**.

### Images

- **`Dockerfile` (web)** — two stages on `node:22-bookworm-slim`; the runner keeps the **full** `node_modules` (drizzle-kit + tsx) because the entrypoint runs migrate/seed before boot.
- **`Dockerfile.worker`** — base `mcr.microsoft.com/playwright:v1.60.0-noble` (Chromium preinstalled at `/ms-playwright`, matching the pinned `playwright@1.60.0`). It `apt-get install`s **`build-essential` + `python3` before `npm ci`**: `ws`'s native accelerators (`utf-8-validate`/`bufferutil`) are compiled by node-gyp and the slim Playwright base ships no C toolchain — **remove that step and the worker image stops building** (`not found: make`). It then `npm i -g @anthropic-ai/claude-code` (the `claude` CLI demo-gen shells out to).
- **`.dockerignore`** excludes `.env*`, `docs`, `plans`, `*.md`, `.claude` — none of them reach any image.

### `next.config.mjs`

- `output: 'standalone'` is emitted but **unused** — the entrypoint runs `next start` (it needs the full toolchain). Do not assume a standalone runtime.
- `serverExternalPackages: ['telegram', '@whiskeysockets/baileys']` — the personal-outreach natives are dynamic-imported in the worker and must never be bundled into the web build.
- Every route is dynamic SSR (the root layout reads cookies). No static export.

---

## How it works

### `docker-compose.override.yml` — the auto-merge trap

Docker Compose **auto-merges `docker-compose.override.yml` into every `docker compose` command run from the repo directory.** You do not opt in; there is no flag in the command you type.

Today it does exactly two things:
- `inngest.command: ["inngest","dev"]` — replaces the production keyless-refusing `start` with **keyless dev mode**.
- `INNGEST_DEV: "1"` on **web and worker** — which flips `isDev: true` on the shared client (`lib/inngest/client.ts`), so no event/signing-key handshake happens at all.

It is **gitignored and untracked** — a fresh `git clone` does not have it, so it is a local-developer artifact, not a repo default. That is exactly what makes it dangerous: it survives on any machine that once had it (including a VPS provisioned by copying a working directory), and it is invisible to `git status`.

**Before a production deploy: delete the file, or run `docker compose -f docker-compose.yml …` explicitly.** Otherwise production runs a keyless dev Inngest. Governed by **I2**. Its own header comment says "Do NOT use in production"; nothing enforces it.

### Env files

Two files, and they are not interchangeable: `.env.local` (loaded via `env_file:` on db/inngest/web/worker) and **`./.env`** (Compose `${…}` interpolation only). A `${VAR}` in `docker-compose.yml` reads `./.env` or the shell — **never `.env.local`** — and `environment:` beats `env_file:`, so a value in the wrong file is silently clobbered to `""`. Full rules, the affected var list, and the blast radius: [`../env-reference.md`](../env-reference.md). Governed by **I1**.

### The worker's function registry

All Inngest functions are registered in one place — the `functions: [...]` array of `lib/inngest/worker-entrypoint.ts`: `runAudit`, `runDemoGen`, `orchestratePipeline`, `handleReply`, `runOutreach`, `runBuild`, `runSupport`, `sendProposal`, `autoDiscovery`, `reapStaleRuns`. All but `autoDiscovery` and `reapStaleRuns` are event-triggered; both are **cron**-scheduled. `reapStaleRuns`'s schedule and its stale-run timeout are env-tunable (documented in `../env-reference.md`). **There is no `app/api/inngest` route** — `npx inngest dev` alone runs nothing; the worker process must be up. The web app only ever `inngest.send()`s.

---

## Invariants

Full rules with what-breaks + what-enforces: [`../invariants.md`](../invariants.md). Referenced by ID only.

| ID | One-liner |
|---|---|
| **I1** | Compose `${…}` interpolation reads `./.env`, never `.env.local`; `environment:` beats `env_file:`. |
| **I2** | `docker-compose.override.yml` is auto-merged — delete it (or `-f docker-compose.yml`) before a production deploy. |
| **I3** | Never add `ports:` to `db`. |
| **I4** | `docker compose down -v` deletes the `pgdata` volume. |
| **I5** | Migrate is fail-fast; seed is non-fatal. Never invert. |
| **I6** | `package-lock.json` stays committed (Docker + CI `npm ci`). |
| **I7** | `npm run lint` cannot fail on warnings. `npm run typecheck` is the real gate. |
| **I8** | A new test type is not a gate until it is wired into `.github/workflows/ci.yml`. |
| **B1** | Worker-chain modules: relative imports only, no `server-only`, no `@/`, no `next/*`. |
| **B2** | Web code never imports `lib/audit/*`, `lib/agents/*`, `lib/demo-gen/*`, `lib/inngest/functions/*`. |
| **R1** | Keep the audit `concurrency` array with both entries (global cap + per-lead key). |
| **R2** | Do not raise `AUDIT_CONCURRENCY` / `CLAUDE_AGENT_CONCURRENCY` without raising `mem_limit`. |
| **R3** | The `claude`-CLI functions share ONE account-scoped concurrency budget (`scope:'account', key:'"claude-agent"'`); a new claude function must reuse that same scope+key, not a keyless fn-scoped limit. |
| **F3** | Migrations are append-only; never hand-edit applied SQL. |

---

## Extension recipes

**Add an env var**
1. Read it with an explicit default + graceful degrade when unset.
2. Add it to `.env.example` with a one-line comment (what it does, what happens unset).
3. Decide the file (**I1**): a plain secret → `.env.local`; anything a Compose `environment:`/`${…}` block touches → `./.env` **and** the compose service.
4. If a container needs it, confirm that service has `env_file: .env.local` — **`9router` does not**.
5. Document it in `../env-reference.md` (the only owner of the var table).
6. `docker compose up -d --build <service>`.

**Add a Compose service**
1. Add it with `restart: unless-stopped`, a healthcheck, and **no `ports:`** unless it must be reachable (bind `127.0.0.1:` if only local).
2. Prefer **no `env_file`** (least privilege, like `9router`); pass only what it needs via `environment:` + `${VAR:?message}` from `./.env`.
3. Add `depends_on: {condition: service_healthy}` on its consumers.
4. **Pin third-party images by digest** if they hold credentials.
5. Update the service table above and the diagram in `../deployment-guide.md`.

**Add an Inngest worker function**
1. Create `lib/inngest/functions/<name>.ts` — **relative imports only, no `server-only`, no `@/`, no `next/*`** (**B1**).
2. Add its event payload interface to `lib/inngest/client.ts`.
3. Register it in the `functions: [...]` array of `lib/inngest/worker-entrypoint.ts` — nothing else registers functions.
4. Give it a concurrency guard. For `claude`-CLI work, reuse the shared account-scoped entry every claude function declares (`scope:'account', key:'"claude-agent"'`, capped at `CLAUDE_AGENT_CONCURRENCY`) so it stays inside the ONE shared budget — **R3** — and does *not* lift that ceiling. For Chromium work, a keyless `AUDIT_CONCURRENCY` limit is per function, so each Chromium function you add *raises* that ceiling.
5. Emit its fact event on **every** terminal path, including `onFailure` (see `../invariants.md` C1/C2).
6. **Add its entry file to `ENTRY_FILES` in `tests/discovery/run-discovery-core-worker-safety.test.ts`** — otherwise its tsx-safety is enforced by nothing (see Tests).
7. `docker compose up -d --build worker`.

**Add a test type / gate**
1. Unit → `tests/<area>/*.test.ts` (picked up by `vitest.config.ts`).
2. DB-mode → `tests/db/*.test.ts`; it **must self-skip when `DATABASE_URL` is unset**; the suite runs serially.
3. e2e → `tests/e2e/*.spec.ts` + a project entry in `playwright.config.ts`.
4. **Wire it into `.github/workflows/ci.yml`.** A `package.json` script alone is *not* a gate (**I8**) — `coverage` and `test:e2e` prove it.

---

## Traps

- **`npm run lint` is theatre.** It is `eslint app lib components --no-error-on-unmatched-pattern` with **no `--max-warnings`**, so it exits 0 with warnings present; `scripts/`, `tests/` and `drizzle/` are not linted at all; and `eslint.config.mjs` deliberately drops the `next/*` presets (a FlatCompat circular-reference bug under ESLint 9), leaving only `@typescript-eslint/no-unused-vars` and `prefer-const`, both at `warn`. It can catch nothing structural. `npm run typecheck` is the real gate — its `tsconfig.json` `include` is `**/*.ts(x)`, so it *does* cover `tests/`, `scripts/` and `*.config.ts`.
- **Vitest stubs `server-only`** (aliased to `tests/shims/empty.ts`) and resolves `@/`. Both are necessary — they are why server-only modules are unit-testable — but they mean **no test that merely *imports* a module can surface a client-boundary violation (B3) or a worker-chain `server-only`/`@/`/`next/*` violation (B1)**: under vitest both resolve fine. B3 is caught only by `next build`. B1 is caught only by the *static* walker in `tests/discovery/run-discovery-core-worker-safety.test.ts` — which runs inside `npm run test` but reads source text, and only for its `ENTRY_FILES` (see below).
- **`npm run coverage` fails today** against its own `100/100/100/100` thresholds and is not in CI, so nobody notices. Do not treat a red coverage run as a regression you caused.
- `AUDIT_PROVIDER` unset **auto-picks**: PageSpeed when a Google key exists, else the worker's local Lighthouse (`lib/audit/perf-audit.ts`, `runPerformanceAudit`). Audits therefore work with zero Google setup — but pinning `AUDIT_PROVIDER=pagespeed` forfeits that and throws without a key.
- The `inngest` image has no ENTRYPOINT; its `command:` array **must** start with the literal `inngest`.
- `USE_DB: "true"` is hardcoded in the compose `environment:` for web and worker — `.env.local` cannot flip the stack back to mock mode.
- `.dockerignore` drops `docs`, `plans`, `*.md` — never make an image depend on a file it excludes.
- `scripts/telegram-user-login.ts` and `scripts/whatsapp-personal-login.ts` are **interactive one-time** login helpers (`npx tsx …` on the host), not services.

---

## Tests

### What each script actually covers

| script | runs | needs DB | needs keys | is it a CI gate? |
|---|---|---|---|---|
| `npm run typecheck` | `tsc --noEmit` — covers `tests/`, `scripts/`, `*.config.ts` too | no | no | **yes** |
| `npm run lint` | `eslint app lib components --no-error-on-unmatched-pattern`; no `--max-warnings` ⇒ **cannot fail on warnings** | no | no | in CI, but toothless (**I7**) |
| `npm run test` | `vitest run` over `tests/**/*.test.ts` **minus `tests/db/**`** | no | no | **yes** |
| `npm run build` | `next build` — the only thing that enforces the `server-only` client boundary | no | no | **yes** |
| `npm run test:db` | `USE_DB=true` over `tests/db/**` only, `fileParallelism: false`; **self-skips without `DATABASE_URL`** | **yes** (migrated + seeded) | no | **yes** (separate job) |
| `npm run coverage` | vitest + v8, `include: lib/**/*.ts`, thresholds **100/100/100/100** with a long "covered by a different test type" exclude list | no | no | **no** — thresholds are not enforced anywhere, and they fail today |
| `npm run test:e2e` | `playwright test` against a **running** app (`E2E_BASE_URL`, default `localhost:3000`); projects `setup` → `public`, `workspace`. `setup` logs in as `E2E_EMAIL`/`E2E_PASSWORD` (defaults to the seeded founder) and saves a gitignored `storageState` | yes (a real seeded founder) | no | **no** |

### CI (`.github/workflows/ci.yml`)

- Triggers on push/PR to `main` only. `concurrency` cancels superseded runs.
- Job **`verify`** (Node 22, `npm ci`): typecheck → lint → test → build. **No DB, no secrets.**
- Job **`test-db`**: `postgres:17` service + `USE_DB=true`, `SEED_DEMO_DATA=true`, a throwaway `BETTER_AUTH_SECRET`; `db:migrate` → `db:seed` → `test:db`.

### What is guarded by NOTHING

- **`coverage` and `test:e2e` are not in CI.** Their thresholds and assertions gate nothing.
- **No `docker build` or `docker compose config` runs in CI.** A broken `Dockerfile.worker`, a malformed compose file, or a service that fails to boot is caught only on a real deploy.
- **No secret/dependency scanning** of any kind.
- **The worker-safety walker covers only its `ENTRY_FILES`, not the whole worker.** `tests/discovery/run-discovery-core-worker-safety.test.ts` (`ENTRY_FILES`) statically walks the *runtime* import closure of `lib/discovery/run-discovery-core.ts`, `lib/inngest/functions/auto-discovery.ts`, and `lib/inngest/start-pipeline-run.ts` and fails on any reachable `server-only` / `@/` / `next/*` import. Every other registered function — `run-audit`, `run-demo-gen`, `orchestrate-pipeline`, `handle-reply`, `run-outreach`, `run-build`, `run-support`, `send-proposal`, `reap-stale-runs` — is **unguarded**: a worker-unsafe import in their closure typechecks clean, tests clean, and only explodes when the container boots. **Any new worker function must add its entry file to `ENTRY_FILES`.**
- **The web/worker import boundary (B2) is enforced by nothing** — no lint rule, no test, no bundler externals. It is clean today by convention alone.
