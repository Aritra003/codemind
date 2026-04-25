import type { CodeGraph } from '@codemind/shared'
import type { CircularChain } from './report-types'

export function detectCircularDependencies(graph: CodeGraph): CircularChain[] {
  const fileImports = new Map<string, Set<string>>()

  for (const edge of graph.edges) {
    if (edge.kind !== 'imports') continue
    if (!edge.to.startsWith('.')) continue
    const from = edge.from.includes('::') ? (edge.from.split('::')[0] ?? edge.from) : edge.from
    const existing = fileImports.get(from) ?? new Set<string>()
    existing.add(edge.to)
    fileImports.set(from, existing)
  }

  const chains: CircularChain[] = []
  const visited  = new Set<string>()
  const inStack  = new Set<string>()
  const stackArr: string[] = []
  const seenCycleKeys = new Set<string>()

  function dfs(file: string): void {
    visited.add(file)
    inStack.add(file)
    stackArr.push(file)

    for (const dep of fileImports.get(file) ?? []) {
      if (!visited.has(dep)) {
        dfs(dep)
      } else if (inStack.has(dep)) {
        const start = stackArr.indexOf(dep)
        if (start >= 0) {
          const cycle = [...stackArr.slice(start)]
          const key   = [...cycle].sort().join('|')
          if (!seenCycleKeys.has(key)) {
            seenCycleKeys.add(key)
            chains.push({ files: cycle })
          }
        }
      }
    }

    stackArr.pop()
    inStack.delete(file)
  }

  for (const file of fileImports.keys()) {
    if (!visited.has(file)) dfs(file)
  }

  return chains
}
