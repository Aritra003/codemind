/**
 * SV-002 enforcement: scans all source files and fails the build if any file
 * outside src/lib/ai/client.ts imports @anthropic-ai/* directly.
 *
 * Run by: `pnpm run hygiene` (included in build pipeline via turbo).
 */

import * as fs   from 'fs'
import * as path from 'path'
import * as glob from 'fs'

const ANTHROPIC_IMPORT_PATTERN = /@anthropic-ai\//
const ALLOWED_FILE = path.resolve(__dirname, '../src/lib/ai/client.ts')
const SRC_DIR = path.resolve(__dirname, '../src')

function scanDir(dir: string): string[] {
  const violations: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      violations.push(...scanDir(fullPath))
    } else if (entry.isFile() && fullPath.endsWith('.ts') && fullPath !== ALLOWED_FILE) {
      const contents = fs.readFileSync(fullPath, 'utf8')
      if (ANTHROPIC_IMPORT_PATTERN.test(contents)) {
        violations.push(fullPath)
      }
    }
  }
  return violations
}

const violations = scanDir(SRC_DIR)

if (violations.length > 0) {
  process.stderr.write('\n❌ Hygiene check FAILED (SV-002 — INV-005: code content never to Anthropic)\n')
  process.stderr.write('The following files import @anthropic-ai/* directly:\n')
  for (const v of violations) {
    process.stderr.write(`  ${v}\n`)
  }
  process.stderr.write('\nOnly src/lib/ai/client.ts may import the Anthropic SDK.\n\n')
  process.exit(1)
}

process.stdout.write('✓ Hygiene check passed — no direct Anthropic SDK imports outside lib/ai/client.ts\n')
