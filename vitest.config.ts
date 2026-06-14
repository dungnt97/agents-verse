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
  },
});
