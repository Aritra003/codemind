import * as fs   from 'fs/promises'
import * as path from 'path'
import { formatSuccess, formatError } from '../lib/output/format'

const HOOK_CONTENT = `#!/bin/sh
# CodeMind pre-commit hook
# INV-001: this hook NEVER blocks. It always exits 0.
codemind check $(git diff --cached --name-only) || true
`

export async function installPreCommitHook(): Promise<void> {
  const hookPath = path.join(process.cwd(), '.git', 'hooks', 'pre-commit')
  try {
    await fs.writeFile(hookPath, HOOK_CONTENT, { mode: 0o755 })
    process.stdout.write(formatSuccess('Pre-commit hook installed at .git/hooks/pre-commit\n'))
    process.stdout.write('  The hook runs automatically on every commit. It never blocks.\n')
  } catch (err) {
    process.stderr.write(formatError(
      'HOOK_INSTALL_FAILED',
      'Could not install pre-commit hook.',
      `Check that ${hookPath} is writable. Error: ${String(err)}`
    ) + '\n')
    process.exit(1)
  }
}
