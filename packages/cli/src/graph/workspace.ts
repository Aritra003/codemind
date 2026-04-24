import * as fs   from 'fs/promises'
import * as path from 'path'

/** packageName → directory prefix relative to repoRoot (e.g. "@cap/database" → "packages/database") */
export type WorkspaceMap = Map<string, string>

export async function buildWorkspaceMap(repoRoot: string): Promise<WorkspaceMap> {
  const patterns = await getWorkspacePatterns(repoRoot)
  const dirs     = await expandPatterns(repoRoot, patterns)
  const map      = new Map<string, string>()

  await Promise.all(dirs.map(async dir => {
    try {
      const raw = await fs.readFile(path.join(repoRoot, dir, 'package.json'), 'utf8')
      const pkg = JSON.parse(raw) as { name?: string }
      if (typeof pkg.name === 'string' && pkg.name) {
        map.set(pkg.name, dir)
      }
    } catch { /* no package.json or invalid — skip */ }
  }))

  return map
}

async function getWorkspacePatterns(repoRoot: string): Promise<string[]> {
  // pnpm-workspace.yaml takes priority
  try {
    const raw = await fs.readFile(path.join(repoRoot, 'pnpm-workspace.yaml'), 'utf8')
    const lines = raw.split('\n')
    const patterns: string[] = []
    for (const line of lines) {
      const m = line.match(/^\s*-\s*["']?([^"'#\n]+)["']?\s*$/)
      if (m) patterns.push(m[1]!.trim())
    }
    if (patterns.length > 0) return patterns
  } catch { /* fall through */ }

  // Fallback: package.json workspaces field
  try {
    const raw = await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8')
    const pkg = JSON.parse(raw) as { workspaces?: string[] | { packages?: string[] } }
    const ws = pkg.workspaces
    if (Array.isArray(ws)) return ws
    if (ws && Array.isArray(ws.packages)) return ws.packages
  } catch { /* fall through */ }

  return []
}

async function expandPatterns(repoRoot: string, patterns: string[]): Promise<string[]> {
  const results: string[] = []
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      // Simple glob: only handle trailing /* (sufficient for workspace patterns)
      const base = pattern.replace(/\/\*$/, '')
      try {
        const entries = await fs.readdir(path.join(repoRoot, base), { withFileTypes: true })
        for (const e of entries) {
          if (e.isDirectory()) results.push(`${base}/${e.name}`)
        }
      } catch { /* skip */ }
    } else {
      // Exact directory
      results.push(pattern)
    }
  }
  return results
}
