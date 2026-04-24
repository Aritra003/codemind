import { defineConfig } from 'vitest/config'
import * as path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@codemind/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  // Native Node modules must not be transformed by Vite
  server: { deps: { external: ['tree-sitter', 'tree-sitter-typescript', 'tree-sitter-javascript', 'msgpackr'] } },
  test: {
    globals:     true,
    environment: 'node',
    include:     ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider:  'v8',
      reporter:  ['text', 'lcov'],
      include:   ['src/**/*.ts'],
      exclude:   ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        lines:      80,
        branches:   75,
        functions:  80,
        statements: 80,
      },
    },
  },
})
