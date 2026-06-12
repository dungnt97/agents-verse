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
];

export default eslintConfig;
