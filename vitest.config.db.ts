import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Root dir (trailing slash) used to resolve the `@/…` path alias the app uses.
const root = fileURLToPath(new URL('./', import.meta.url));

// DB-mode integration suite: exercises the real `USE_DB=true` repository path against a
// migrated + seeded Postgres. Run via `npm run test:db` (which sets USE_DB=true and expects
// DATABASE_URL). The tests self-skip when DATABASE_URL is absent, so this is safe to run
// anywhere — CI provides a postgres:17 service + db:migrate + db:seed first.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: root },
      { find: /^server-only$/, replacement: fileURLToPath(new URL('./tests/shims/empty.ts', import.meta.url)) },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    // One shared Postgres → run files serially to avoid cross-test races; allow headroom for I/O.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
