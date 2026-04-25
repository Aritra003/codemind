// Graph query utilities for the web tier — works with plain JSON arrays from DB
// (CLI uses Maps; DB stores serialized arrays, so all operations are array-based here)

export type WNode = { id: string; name: string; file: string; kind: string }
export type WEdge = { from: string; to: string; kind?: string }
export type WebGraph = {
  nodes: WNode[]
  edges: WEdge[]
  node_count?: number
  edge_count?: number
  languages?: string[]
  completeness_pct?: number
}

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

export function findMatchingNodes(graph: WebGraph, keywords: string[]): WNode[] {
  if (keywords.length === 0) return []
  return graph.nodes
    .filter(n => {
      const nameL = n.name.toLowerCase()
      const fileL = n.file.toLowerCase()
      return keywords.some(kw => nameL.includes(kw) || fileL.includes(kw))
    })
    .slice(0, 25)
}

export function getDirectDependents(graph: WebGraph, nodeId: string): string[] {
  return graph.edges.filter(e => e.to === nodeId).map(e => e.from)
}

export function getDirectoryOverview(graph: WebGraph): string[] {
  const dirMap = new Map<string, number>()
  for (const node of graph.nodes) {
    const parts = node.file.split('/')
    const top = parts.length > 1 ? (parts[0] ?? '.') : '.'
    dirMap.set(top, (dirMap.get(top) ?? 0) + 1)
  }
  return [...dirMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([dir, count]) => `${dir}/ — ${count} nodes`)
}

export function buildCallChains(matched: WNode[], graph: WebGraph, maxChains = 5, maxDepth = 3): string[][] {
  const chains: string[][] = []
  const fwd = new Map<string, string[]>()
  for (const e of graph.edges) {
    const bucket = fwd.get(e.from) ?? []
    bucket.push(e.to)
    fwd.set(e.from, bucket)
  }
  const nodeById = new Map(graph.nodes.map(n => [n.id, n]))
  for (const start of matched.slice(0, maxChains)) {
    const chain = [start.file]
    const visited = new Set([start.id])
    let cur = start.id
    for (let d = 0; d < maxDepth; d++) {
      const next = (fwd.get(cur) ?? []).find(n => !visited.has(n))
      if (!next) break
      visited.add(next)
      const nextNode = nodeById.get(next)
      if (nextNode) chain.push(nextNode.file)
      cur = next
    }
    if (chain.length > 1) chains.push(chain)
  }
  return chains
}

export function computeBlastRadius(graph: WebGraph, nodeIds: string[]): { direct: string[]; transitive: string[] } {
  const seed = new Set(nodeIds)
  const direct = new Set<string>()
  for (const e of graph.edges) {
    if (seed.has(e.to)) direct.add(e.from)
  }
  const visited = new Set(nodeIds)
  const queue = [...direct]
  const transitive = new Set<string>()
  while (queue.length) {
    const cur = queue.shift()!
    if (visited.has(cur)) continue
    visited.add(cur)
    for (const e of graph.edges) {
      if (e.to === cur && !visited.has(e.from)) {
        transitive.add(e.from)
        queue.push(e.from)
      }
    }
  }
  return { direct: [...direct], transitive: [...transitive].filter(t => !direct.has(t)) }
}

export function computeChangeTiers(nodes: WNode[], graph: WebGraph): WNode[][] {
  if (nodes.length === 0) return []
  const nodeSet = new Set(nodes.map(n => n.id))
  const depCount = new Map<string, number>()
  for (const n of nodes) {
    depCount.set(n.id, graph.edges.filter(e => e.to === n.id && nodeSet.has(e.from)).length)
  }
  const tiers: WNode[][] = []
  const assigned = new Set<string>()
  while (assigned.size < nodes.length) {
    const tier = nodes.filter(n => !assigned.has(n.id) && (depCount.get(n.id) ?? 0) === 0)
    if (tier.length === 0) { tiers.push(nodes.filter(n => !assigned.has(n.id))); break }
    tiers.push(tier)
    for (const n of tier) {
      assigned.add(n.id)
      for (const other of nodes) {
        if (assigned.has(other.id)) continue
        for (const e of graph.edges) {
          if (e.from === other.id && e.to === n.id) {
            depCount.set(other.id, (depCount.get(other.id) ?? 1) - 1)
          }
        }
      }
    }
  }
  return tiers
}

export function hasTestCoverage(node: WNode, graph: WebGraph): boolean {
  const base = node.file.replace(/\.(ts|js|tsx|jsx|py|go)$/, '').split('/').pop() ?? ''
  return graph.nodes.some(n => (n.file.includes('test') || n.file.includes('spec')) && n.file.includes(base))
}

// Mermaid generation from graph — no AI required
const WARN_THRESHOLD = 50

function sanitiseId(id: string) { return id.replace(/::/g, '__').replace(/[/.]/g, '_') }

function nodeLabel(node: WNode) {
  if (node.kind === 'class') return `"${node.name} (class)"`
  if (node.kind === 'method') return `"${node.name} (method)"`
  if (node.kind === 'module') return `"${node.name} (module)"`
  return `"${node.name}"`
}

function edgeArrow(kind?: string) {
  if (kind === 'imports') return '-.->'
  if (kind === 'extends' || kind === 'implements') return '--|>'
  if (kind === 'declared') return '---'
  return '-->'
}

export function generateMermaid(
  graph: WebGraph,
  scope?: string,
): { diagram: string; nodeCount: number; edgeCount: number; warning?: string } {
  const scopedNodes = scope ? graph.nodes.filter(n => n.file.startsWith(scope)) : graph.nodes
  if (scopedNodes.length === 0) return { diagram: 'graph LR', nodeCount: 0, edgeCount: 0 }

  const scopedIds = new Set(scopedNodes.map(n => n.id))
  const lines = ['graph LR']
  const byFile = new Map<string, WNode[]>()
  for (const n of scopedNodes) {
    const bucket = byFile.get(n.file) ?? []
    bucket.push(n)
    byFile.set(n.file, bucket)
  }
  for (const [file, nodes] of byFile) {
    lines.push(`  subgraph ${JSON.stringify(file)}`)
    for (const n of nodes) lines.push(`    ${sanitiseId(n.id)}[${nodeLabel(n)}]`)
    lines.push('  end')
  }

  const externalStubs = new Set<string>()
  let edgeCount = 0
  const nodeById = new Map(graph.nodes.map(n => [n.id, n]))
  for (const e of graph.edges) {
    if (!scopedIds.has(e.from)) continue
    const fromId = sanitiseId(e.from)
    const arrow = edgeArrow(e.kind)
    if (scopedIds.has(e.to)) {
      lines.push(`  ${fromId} ${arrow} ${sanitiseId(e.to)}`)
    } else {
      const stubId = `ext__${sanitiseId(e.to)}`
      if (!externalStubs.has(stubId)) {
        const toNode = nodeById.get(e.to)
        lines.push(`  ${stubId}["${toNode ? `${toNode.name} (ext)` : `${e.to} (ext)`}"]`)
        externalStubs.add(stubId)
      }
      lines.push(`  ${fromId} ${arrow} ${stubId}`)
    }
    edgeCount++
  }

  const nodeCount = scopedNodes.length
  const result: { diagram: string; nodeCount: number; edgeCount: number; warning?: string } = { diagram: lines.join('\n'), nodeCount, edgeCount }
  if (nodeCount > WARN_THRESHOLD) result.warning = `${nodeCount} nodes — large diagrams may not render well in all tools.`
  return result
}
