import type { CodeGraph, GraphNode, GraphEdge } from '@stinkit/shared'

export interface GenerateMermaidOptions {
  scope?:  string   // path prefix filter on node.file
  output?: string   // file path (handled by caller)
}

export interface GenerateMermaidResult {
  diagram:   string
  nodeCount: number
  edgeCount: number
  warning?:  string
}

const NODE_COUNT_WARNING_THRESHOLD = 50

function sanitiseId(nodeId: string): string {
  return nodeId.replace(/::/g, '__').replace(/[/.]/g, '_')
}

function nodeLabel(node: GraphNode): string {
  switch (node.kind) {
    case 'function':      return `"${node.name}"`
    case 'arrow_function': return `"${node.name} (arrow)"`
    case 'class':         return `"${node.name} (class)"`
    case 'method':        return `"${node.name} (method)"`
    case 'module':        return `"${node.name} (module)"`
    default:              return `"${node.name}"`
  }
}

function edgeArrow(kind: GraphEdge['kind']): string {
  switch (kind) {
    case 'calls':      return '-->'
    case 'imports':    return '-.->'
    case 'extends':    return '--|>'
    case 'implements': return '--|>'
    case 'declared':   return '---'
    default:           return '-->'
  }
}

export function generateMermaid(
  graph:    CodeGraph,
  options?: GenerateMermaidOptions,
): GenerateMermaidResult {
  const scope = options?.scope

  const scopedNodes = new Map<string, GraphNode>()
  for (const [id, node] of graph.nodes) {
    if (!scope || node.file.startsWith(scope)) {
      scopedNodes.set(id, node)
    }
  }

  if (scopedNodes.size === 0) {
    return { diagram: 'graph LR', nodeCount: 0, edgeCount: 0 }
  }

  const lines: string[] = ['graph LR']

  // Group nodes by file → subgraphs
  const byFile = new Map<string, GraphNode[]>()
  for (const node of scopedNodes.values()) {
    const bucket = byFile.get(node.file) ?? []
    bucket.push(node)
    byFile.set(node.file, bucket)
  }

  for (const [file, nodes] of byFile) {
    lines.push(`  subgraph ${file}`)
    for (const node of nodes) {
      lines.push(`    ${sanitiseId(node.id)}[${nodeLabel(node)}]`)
    }
    lines.push('  end')
  }

  // Edges — only those where the `from` node is in scope
  const externalStubs = new Set<string>()
  let edgeCount = 0

  for (const edge of graph.edges) {
    const fromInScope = scopedNodes.has(edge.from)
    if (!fromInScope) continue

    const toInScope = scopedNodes.has(edge.to)
    const fromId = sanitiseId(edge.from)
    const arrow  = edgeArrow(edge.kind)

    if (toInScope) {
      lines.push(`  ${fromId} ${arrow} ${sanitiseId(edge.to)}`)
      edgeCount++
    } else {
      // Stub for out-of-scope or unknown target
      const toNode = graph.nodes.get(edge.to)
      const stubId = `ext__${sanitiseId(edge.to)}`
      if (!externalStubs.has(stubId)) {
        const label = toNode ? `"${toNode.name} (external)"` : `"${edge.to} (external)"`
        lines.push(`  ${stubId}[${label}]`)
        externalStubs.add(stubId)
      }
      lines.push(`  ${fromId} ${arrow} ${stubId}`)
      edgeCount++
    }
  }

  const nodeCount = scopedNodes.size
  const result: GenerateMermaidResult = { diagram: lines.join('\n'), nodeCount, edgeCount }
  if (nodeCount > NODE_COUNT_WARNING_THRESHOLD) {
    result.warning = `${nodeCount} nodes in scope — large diagrams may not render well in some tools.`
  }
  return result
}
