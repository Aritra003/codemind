import type { CodeGraph, NodeId, BlastRadius } from '@stinkit/shared'

export function computeBlastRadius(
  graph:        CodeGraph,
  changedNodes: NodeId[],
): BlastRadius {
  if (changedNodes.length === 0) {
    return {
      changed_nodes:         [],
      direct_dependents:     [],
      transitive_dependents: [],
      risk_level:            'UNKNOWN',
      coverage_gaps:         [],
      completeness_pct:      graph.completeness_pct,
    }
  }

  // Build reverse adjacency: to → Set<from>  (who depends on 'to')
  const reverseAdj = new Map<NodeId, Set<NodeId>>()
  for (const edge of graph.edges) {
    if (edge.kind !== 'calls') continue
    let deps = reverseAdj.get(edge.to)
    if (!deps) { deps = new Set(); reverseAdj.set(edge.to, deps) }
    deps.add(edge.from)
  }

  const changedSet = new Set(changedNodes)
  const visited    = new Set<NodeId>(changedNodes)
  const direct:     NodeId[] = []
  const transitive: NodeId[] = []

  let frontier = changedNodes
  let depth    = 0

  while (frontier.length > 0) {
    depth++
    const next: NodeId[] = []
    for (const nodeId of frontier) {
      const dependents = reverseAdj.get(nodeId)
      if (!dependents) continue
      for (const dep of dependents) {
        if (visited.has(dep) || changedSet.has(dep)) continue
        visited.add(dep)
        if (depth === 1) direct.push(dep)
        else             transitive.push(dep)
        next.push(dep)
      }
    }
    frontier = next
  }

  return {
    changed_nodes:         changedNodes,
    direct_dependents:     direct,
    transitive_dependents: transitive,
    risk_level:            'UNKNOWN',
    coverage_gaps:         [],
    completeness_pct:      graph.completeness_pct,
  }
}
