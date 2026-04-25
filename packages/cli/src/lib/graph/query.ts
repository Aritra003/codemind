import type { CodeGraph, GraphNode, NodeId } from '@codemind/shared'

const STOPWORDS = new Set([
  'how', 'does', 'the', 'what', 'would', 'break', 'if', 'i', 'to', 'a', 'an',
  'in', 'is', 'it', 'of', 'and', 'for', 'this', 'that', 'with', 'are', 'be',
  'which', 'where', 'who', 'when', 'why', 'do', 'should', 'can', 'will', 'my',
  'most', 'all', 'new', 'or', 'on', 'at', 'by', 'from', 'its', 'main', 'some',
])

export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_/-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w))
}

export function findMatchingNodes(graph: CodeGraph, keywords: string[]): GraphNode[] {
  if (keywords.length === 0) return []
  const results: GraphNode[] = []
  for (const node of graph.nodes.values()) {
    const nameL = node.name.toLowerCase()
    const fileL = node.file.toLowerCase()
    if (keywords.some(kw => nameL.includes(kw) || fileL.includes(kw))) {
      results.push(node)
    }
  }
  return results.slice(0, 25)
}

export function getDirectDependents(graph: CodeGraph, nodeId: NodeId): NodeId[] {
  const deps: NodeId[] = []
  for (const edge of graph.edges) {
    if (edge.to === nodeId) deps.push(edge.from)
  }
  return deps
}

export function getDirectCallees(graph: CodeGraph, nodeId: NodeId): NodeId[] {
  const callees: NodeId[] = []
  for (const edge of graph.edges) {
    if (edge.from === nodeId) callees.push(edge.to)
  }
  return callees
}

export function getDirectoryOverview(graph: CodeGraph): string[] {
  const dirMap = new Map<string, number>()
  for (const node of graph.nodes.values()) {
    const parts = node.file.split('/')
    const top = parts.length > 1 ? (parts[0] ?? '.') : '.'
    dirMap.set(top, (dirMap.get(top) ?? 0) + 1)
  }
  return [...dirMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([dir, count]) => `${dir}/ — ${count} nodes`)
}

export function buildCallChains(
  matchedNodes: GraphNode[],
  graph: CodeGraph,
  maxChains = 5,
  maxDepth  = 3,
): string[][] {
  const chains: string[][] = []
  const fwd = new Map<NodeId, Set<NodeId>>()
  for (const edge of graph.edges) {
    if (!fwd.has(edge.from)) fwd.set(edge.from, new Set())
    fwd.get(edge.from)!.add(edge.to)
  }

  for (const start of matchedNodes.slice(0, maxChains)) {
    const chain: string[] = [start.file]
    const visited = new Set<NodeId>([start.id])
    let cur = start.id
    for (let d = 0; d < maxDepth; d++) {
      const nexts = [...(fwd.get(cur) ?? [])]
      const next = nexts.find(n => !visited.has(n))
      if (!next) break
      visited.add(next)
      const nextNode = graph.nodes.get(next)
      if (nextNode) chain.push(nextNode.file)
      cur = next
    }
    if (chain.length > 1) chains.push(chain)
  }

  return chains
}
