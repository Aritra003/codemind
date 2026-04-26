import type { CodeGraph } from '@stinkit/shared'
import type { HotspotEntry } from './report-types'
import { computeBlastRadius } from '../analysis/blast-radius'

const TOP_N = 10

export function computeHotspots(graph: CodeGraph): HotspotEntry[] {
  if (graph.nodes.size === 0) return []

  const fileNodeMap = new Map<string, string[]>()
  for (const [id, node] of graph.nodes) {
    const list = fileNodeMap.get(node.file) ?? []
    list.push(id)
    fileNodeMap.set(node.file, list)
  }

  const scores: Array<{ file: string; count: number }> = []

  for (const [file, nodeIds] of fileNodeMap) {
    if (file.includes('.test.') || file.includes('.spec.')) continue
    const radius = computeBlastRadius(graph, nodeIds)
    const total  = radius.direct_dependents.length + radius.transitive_dependents.length
    if (total > 0) scores.push({ file, count: total })
  }

  scores.sort((a, b) => b.count - a.count)
  const top = scores.slice(0, TOP_N)

  const allFiles = new Set([...fileNodeMap.keys()])

  return top.map(({ file, count }) => {
    const base = file.replace(/\.(ts|tsx|js|jsx)$/, '')
    const filename = base.split('/').pop() ?? ''
    const hasCoverage =
      allFiles.has(`${base}.test.ts`)  ||
      allFiles.has(`${base}.spec.ts`)  ||
      allFiles.has(`${base}.test.tsx`) ||
      allFiles.has(`${base}.spec.tsx`) ||
      allFiles.has(`${base}.test.js`)  ||
      allFiles.has(`${base}.spec.js`)  ||
      [...allFiles].some(f => f.includes('__tests__') && f.includes(filename))
    return { file, dependentCount: count, hasCoverage }
  })
}
