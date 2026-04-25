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
const PREVIEW_CAP = 50   // max nodes shown — keeps the diagram readable
const EDGE_CAP    = 120  // max edges — avoids spaghetti
const WARN_AT     = 30   // advisory warning threshold

function sanitiseId(id: string) { return id.replace(/::/g, '__').replace(/[/.]/g, '_') }

function edgeArrow(kind?: string) {
  if (kind === 'imports')                       return '--->'
  if (kind === 'circular')                      return '-. circular .->'
  if (kind === 'extends' || kind === 'implements') return '--|>'
  return '--->'
}

export function generateMermaid(
  graph: WebGraph,
  scope?: string,
): { diagram: string; nodeCount: number; edgeCount: number; totalCount: number; warning?: string } {
  const allScoped = scope
    ? graph.nodes.filter(n => n.file.startsWith(scope))
    : graph.nodes
  if (allScoped.length === 0) {
    const hint = scope ? `No files found under "${scope}".` : 'No files indexed yet.'
    return { diagram: `graph TD\n  msg["${hint}"]`, nodeCount: 0, edgeCount: 0, totalCount: 0 }
  }

  const totalCount = allScoped.length

  // Rank nodes by how many in-scope files depend on them — most-depended-on first.
  // This makes the most critical files the layout anchors.
  const scopedIdSet = new Set(allScoped.map(n => n.id))
  const inDeg = new Map<string, number>()
  for (const e of graph.edges) {
    if (scopedIdSet.has(e.to) && scopedIdSet.has(e.from)) {
      inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1)
    }
  }
  const sorted = [...allScoped].sort((a, b) => (inDeg.get(b.id) ?? 0) - (inDeg.get(a.id) ?? 0))
  const scopedNodes = sorted.slice(0, PREVIEW_CAP)
  const renderIds   = new Set(scopedNodes.map(n => n.id))

  const lines = ['graph TD']

  // Node definitions — short labels, stadium shape for hub files
  for (const n of scopedNodes) {
    const raw   = n.name.replace(/"/g, "'")
    const label = raw.length > 26 ? raw.slice(0, 24) + '…' : raw
    const deg   = inDeg.get(n.id) ?? 0
    // Stadium shape for heavily-depended-on files so they stand out visually
    lines.push(deg >= 6
      ? `  ${sanitiseId(n.id)}(["${label}"])`
      : `  ${sanitiseId(n.id)}["${label}"]`)
  }

  // Edges — only between rendered nodes
  let edgeCount = 0
  for (const e of graph.edges) {
    if (edgeCount >= EDGE_CAP) break
    if (!renderIds.has(e.from) || !renderIds.has(e.to)) continue
    lines.push(`  ${sanitiseId(e.from)} ${edgeArrow(e.kind)} ${sanitiseId(e.to)}`)
    edgeCount++
  }

  // Style hub nodes with brand color so they're instantly recognisable
  const hubs = scopedNodes.filter(n => (inDeg.get(n.id) ?? 0) >= 6)
  if (hubs.length > 0) {
    lines.push('  classDef hub fill:#4F46E5,stroke:#6366F1,color:#e2e8f0,stroke-width:2px')
    lines.push(`  class ${hubs.map(n => sanitiseId(n.id)).join(',')} hub`)
  }

  const nodeCount = scopedNodes.length
  const result: { diagram: string; nodeCount: number; edgeCount: number; totalCount: number; warning?: string } = {
    diagram: lines.join('\n'), nodeCount, edgeCount, totalCount,
  }
  if (totalCount > PREVIEW_CAP) {
    result.warning = `Showing top ${PREVIEW_CAP} of ${totalCount} files by dependency count. Use Scope to focus on a directory.`
  } else if (nodeCount > WARN_AT) {
    result.warning = `${nodeCount} nodes — use Scope to focus on a directory for a clearer view.`
  }
  return result
}
