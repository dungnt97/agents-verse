import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

// Flat ESLint config (ESLint 9). We register the TypeScript parser/plugin directly and name the
// high-value rules explicitly — this avoids the FlatCompat + preset-config circular-reference bug
// that the `next/typescript` shim hits under ESLint 9. `tsc --noEmit` remains the primary type gate;
// ESLint here catches lint-level issues (unused vars, etc.). Next-specific rule presets are deferred.
const eslintConfig = [
  // Legacy buildless prototype files are not linted (kept until the workspace migration lands).
  { ignores: ['.next/**', 'out/**', 'node_modules/**', '*.jsx', 'data*.js', 'site-mock.jsx'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
      'prefer-const': 'warn',
    },
  },
  // B2 — web code must NEVER import a worker engine (it would pull Playwright/Gemini/the claude CLI into
  // `next build`). Type-only imports are allowed (erased at compile). Web sends an Inngest event instead.
  {
    files: ['app/**/*.{ts,tsx}', 'lib/actions/**/*.ts', 'lib/repositories/**/*.ts'],
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-restricted-imports': ['warn', {
        patterns: [{
          group: ['@/lib/audit/*', '@/lib/agents/*', '@/lib/demo-gen/*', '@/lib/inngest/functions/*'],
          allowTypeImports: true,
          message: 'Web code must not import a worker engine (B2) — send an Inngest event via lib/inngest/client instead.',
        }],
      }],
    },
  },
  // Components get BOTH the B2 worker-engine ban AND B4 (never import the mock AV — receive entity data as
  // props from a Server Component). Combined in one block so neither rule is overridden for this path.
  {
    files: ['components/**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-restricted-imports': ['warn', {
        patterns: [{
          group: ['@/lib/audit/*', '@/lib/agents/*', '@/lib/demo-gen/*', '@/lib/inngest/functions/*'],
          allowTypeImports: true,
          message: 'Web code must not import a worker engine (B2) — send an Inngest event via lib/inngest/client instead.',
        }],
        paths: [{
          name: '@/lib/data',
          allowTypeImports: true,
          message: 'Components must not import the mock AV (B4) — receive entity data as props. Client-safe helpers live in @/lib/data/format.',
        }],
      }],
    },
  },
];

export default eslintConfig;
