import * as fs   from 'fs/promises'
import * as path from 'path'
import type { Dirent } from 'fs'

export interface WalkerOptions {
  repoRoot:         string
  include:          string[]   // additional include globs (future: use `ignore` package)
  respectGitignore: boolean
}

export interface DiscoveredFile {
  absolutePath: string
  relativePath: string
  language:     string | null
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '.stinkit', '.next', '__pycache__', '.turbo', 'out', '.cache',
])

const LANG_MAP: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript',
}

export async function walkFiles(options: WalkerOptions): Promise<DiscoveredFile[]> {
  const results: DiscoveredFile[] = []
  await collectFiles(options.repoRoot, options.repoRoot, results)
  return results
}

export function detectLanguage(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase()
  return LANG_MAP[ext] ?? null
}

async function collectFiles(
  dir:      string,
  repoRoot: string,
  out:      DiscoveredFile[],
): Promise<void> {
  let entries: Dirent<string>[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true, encoding: 'utf8' })
  } catch {
    return   // unreadable dir — skip silently
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(abs, repoRoot, out)
    } else if (entry.isFile()) {
      const lang = detectLanguage(entry.name)
      if (lang !== null) {
        out.push({
          absolutePath: abs,
          relativePath: path.relative(repoRoot, abs),
          language:     lang,
        })
      }
    }
  }
}
