import { defineConfig } from 'tsup'

export default defineConfig({
  entry:      ['src/index.ts'],
  format:     ['cjs'],
  dts:        true,
  outDir:     'dist',
  // MCP SDK uses package `exports` field — bundle inline so esbuild resolves it correctly
  noExternal: ['@modelcontextprotocol/sdk'],
})
