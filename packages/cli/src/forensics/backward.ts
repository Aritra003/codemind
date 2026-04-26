import type { CodeGraph, NodeId } from '@stinkit/shared'

const MAX_DEPTH = 10

export function findCodePaths(
  graph:        CodeGraph,
  changedNodes: NodeId[],
  symptomNodes: NodeId[],
): NodeId[][] {
  if (changedNodes.length === 0 || symptomNodes.length === 0) return []

  const symptomSet = new Set(symptomNodes)
  const results: NodeId[][] = []

  const fwd = new Map<NodeId, Set<NodeId>>()
  for (const edge of graph.edges) {
    if (!fwd.has(edge.from)) fwd.set(edge.from, new Set())
    fwd.get(edge.from)!.add(edge.to)
  }

  for (const start of changedNodes) {
    const queue: [NodeId, NodeId[]][] = [[start, [start]]]
    const visited = new Set<NodeId>()

    while (queue.length > 0) {
      const [node, path] = queue.shift()!

      if (visited.has(node)) continue
      visited.add(node)

      if (symptomSet.has(node) && node !== start) {
        results.push(path)
        continue
      }

      if (path.length >= MAX_DEPTH) continue

      for (const next of fwd.get(node) ?? []) {
        if (!visited.has(next)) {
          queue.push([next, [...path, next]])
        }
      }
    }
  }

  return results
}
