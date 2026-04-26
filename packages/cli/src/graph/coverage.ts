import * as fs   from 'fs/promises'
import * as path from 'path'
import type { GraphNode } from '@stinkit/shared'

export type CoverageFormat = 'lcov' | 'v8' | 'istanbul' | 'none'

export interface NodeCoverage {
  node_id: string
  covered: boolean
  format:  CoverageFormat
}

export async function loadCoverage(
  repoRoot: string,
  nodes:    GraphNode[],
): Promise<Map<string, NodeCoverage>> {
  const lcovPath    = path.join(repoRoot, 'coverage', 'lcov.info')
  const istanbulPath = path.join(repoRoot, 'coverage', 'coverage-summary.json')

  const [lcovRaw, istanbulRaw] = await Promise.all([
    fs.readFile(lcovPath, 'utf8').catch(() => null),
    fs.readFile(istanbulPath, 'utf8').catch(() => null),
  ])

  if (lcovRaw !== null) return parseLcov(lcovRaw, nodes)
  if (istanbulRaw !== null) return parseIstanbul(istanbulRaw, nodes)
  return new Map()
}

function parseLcov(raw: string, nodes: GraphNode[]): Map<string, NodeCoverage> {
  // Build map: file → Set of covered function names
  const covered = new Map<string, Set<string>>()
  let currentFile = ''
  for (const line of raw.split('\n')) {
    if (line.startsWith('SF:'))  { currentFile = line.slice(3).trim() }
    if (line.startsWith('FNDA:')) {
      const [countStr, name] = line.slice(5).split(',')
      if (name && Number(countStr) > 0) {
        const s = covered.get(currentFile) ?? new Set<string>()
        s.add(name.trim())
        covered.set(currentFile, s)
      }
    }
  }

  const result = new Map<string, NodeCoverage>()
  for (const node of nodes) {
    const isCovered = covered.get(node.file)?.has(node.name) ?? false
    result.set(node.id, { node_id: node.id, covered: isCovered, format: 'lcov' })
  }
  return result
}

function parseIstanbul(raw: string, nodes: GraphNode[]): Map<string, NodeCoverage> {
  let parsed: Record<string, { functions?: { pct: number } }>
  try {
    parsed = JSON.parse(raw) as typeof parsed
  } catch {
    return new Map()
  }

  const result = new Map<string, NodeCoverage>()
  for (const node of nodes) {
    const fileSummary = parsed[node.file]
    const pct = fileSummary?.functions?.pct ?? 0
    result.set(node.id, { node_id: node.id, covered: pct >= 100, format: 'istanbul' })
  }
  return result
}
