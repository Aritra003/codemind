// @ts-check
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
  {
    files: ['packages/*/src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: true }
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      // Enforce structured logging — no console.log in library code
      'no-console': 'error',
      // Enforce explicit return types on public API functions
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      // No floating promises
      '@typescript-eslint/no-floating-promises': 'error',
      // No unused vars
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // INV-005: Anthropic SDK must only be imported in lib/ai/client.ts
      // Enforced via hygiene-check.ts at build time (see packages/cli/scripts/hygiene-check.ts)
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@anthropic-ai/*'],
          message: 'Import Anthropic SDK only through src/lib/ai/client.ts (INV-005)'
        }]
      }]
    }
  },
  {
    // Relax for test files
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: { 'no-console': 'off' }
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.js']
  }
]
