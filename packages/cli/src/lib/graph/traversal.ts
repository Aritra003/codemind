import type { CodeGraph, NodeId, BlastRadius } from '@codemind/shared'
import { computeBlastRadius } from '../../analysis/blast-radius'
import { classifyRisk } from '../../analysis/risk'

export class GraphTraversal {
  constructor(private readonly graph: CodeGraph) {}

  computeBlastRadius(changedNodes: NodeId[]): BlastRadius {
    const base = computeBlastRadius(this.graph, changedNodes)
    return { ...base, risk_level: classifyRisk(base) }
  }

  subgraph(focusNode: NodeId, depth: number): CodeGraph {
    if (!this.graph.nodes.has(focusNode)) {
      return { ...this.graph, nodes: new Map(), edges: [], node_count: 0, edge_count: 0 }
    }

    const fwd = new Map<NodeId, Set<NodeId>>()
    const rev = new Map<NodeId, Set<NodeId>>()
    for (const edge of this.graph.edges) {
      if (!fwd.has(edge.from)) fwd.set(edge.from, new Set())
      fwd.get(edge.from)!.add(edge.to)
      if (!rev.has(edge.to)) rev.set(edge.to, new Set())
      rev.get(edge.to)!.add(edge.from)
    }

    const included = new Set<NodeId>([focusNode])
    let frontier = new Set<NodeId>([focusNode])

    for (let d = 0; d < depth; d++) {
      const next = new Set<NodeId>()
      for (const node of frontier) {
        for (const n of fwd.get(node) ?? []) { if (!included.has(n)) { included.add(n); next.add(n) } }
        for (const n of rev.get(node) ?? []) { if (!included.has(n)) { included.add(n); next.add(n) } }
      }
      frontier = next
      if (frontier.size === 0) break
    }

    const nodes = new Map([...this.graph.nodes].filter(([id]) => included.has(id)))
    const edges = this.graph.edges.filter(e => included.has(e.from) && included.has(e.to))
    return { ...this.graph, nodes, edges, node_count: nodes.size, edge_count: edges.length }
  }

  hotspots(topN = 10): Array<{ node: NodeId; dependents: number }> {
    const rev = new Map<NodeId, Set<NodeId>>()
    for (const edge of this.graph.edges) {
      if (!rev.has(edge.to)) rev.set(edge.to, new Set())
      rev.get(edge.to)!.add(edge.from)
    }

    const results: Array<{ node: NodeId; dependents: number }> = []
    for (const nodeId of this.graph.nodes.keys()) {
      const visited = new Set<NodeId>()
      const queue: NodeId[] = [nodeId]
      while (queue.length > 0) {
        const cur = queue.shift()!
        for (const dep of rev.get(cur) ?? []) {
          if (!visited.has(dep)) { visited.add(dep); queue.push(dep) }
        }
      }
      results.push({ node: nodeId, dependents: visited.size })
    }

    return results
      .sort((a, b) => b.dependents - a.dependents || a.node.localeCompare(b.node))
      .slice(0, topN)
  }
}
