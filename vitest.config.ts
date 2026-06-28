import { defineConfig, configDefaults } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Root dir (trailing slash) used to resolve the `@/…` path alias the app uses.
const root = fileURLToPath(new URL('./', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Mirror tsconfig `@/* -> ./*`.
      { find: /^@\//, replacement: root },
      // `server-only` throws outside a React Server Component; stub it so server-only
      // modules can be unit-tested in the node environment.
      { find: /^server-only$/, replacement: fileURLToPath(new URL('./tests/shims/empty.ts', import.meta.url)) },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // DB-mode integration tests (tests/db/**) need a live Postgres; they run separately
    // via `npm run test:db` (vitest.config.db.ts) so the default suite stays infra-free.
    exclude: [...configDefaults.exclude, 'tests/db/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      // The unit suite targets the pure/logic layer of lib/. Everything excluded below is covered by
      // a DIFFERENT test type (so its lines aren't double-counted as "uncovered" here):
      //  - server actions + repositories  -> npm run test:db (real Postgres integration)
      //  - app/** RSC pages/layouts/routes + components/** -> Playwright e2e (npm run test:e2e)
      //  - modules that shell `claude`, spawn Playwright, or call external APIs (PageSpeed/Gemini/
      //    Places/Resend/Inngest worker fns) — not meaningfully unit-testable.
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/db/**',
        'lib/inngest/functions/**',
        'lib/inngest/worker-entrypoint.ts',
        'lib/audit/screenshot.ts',
        'lib/audit/pagespeed-client.ts',
        'lib/audit/vision-scoring.ts',
        'lib/discovery/places-client.ts',
        'lib/discovery/email-scraper.ts',
        'lib/agents/runner.ts',
        'lib/agents/pipelines/demo.ts',
        'lib/demo-gen/render.ts',
        'lib/demo-gen/layout-audit.ts',
        'lib/demo-gen/webapp-qa.ts',
        'lib/auth/**',
        'lib/actions/**',
        'lib/repositories/**',
        'lib/data/index.ts', // the mock AV singleton: fixture data + data-shaped derivations; its lookup helpers are unit-tested via av-singleton.test and it is exercised end-to-end in demo mode
        'lib/i18n/**', // i18n dictionaries + the useLandingInfoT React hook -> exercised by Playwright e2e
        '**/*.d.ts',
        '**/*.tsx',
      ],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
