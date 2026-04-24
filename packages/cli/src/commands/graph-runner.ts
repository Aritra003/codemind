import ora from 'ora'
import * as fs   from 'fs/promises'
import * as path from 'path'
import type { UserConfig, CodeGraph, NodeId } from '@codemind/shared'
import type { GraphOptions } from './graph'
import { GraphStore }    from '../lib/graph/store'
import { GraphTraversal } from '../lib/graph/traversal'
import {
  formatCompletenessWarning,
  formatSeparator,
  formatError,
} from '../lib/output/format'
import { logger } from '../lib/logger'
import chalk from 'chalk'

export async function runGraph(
  opts: Partial<GraphOptions>,
  _config: UserConfig
): Promise<void> {
  const options: GraphOptions = {
    hotspots: opts.hotspots ?? false,
    focus:    opts.focus    ?? '',
    depth:    opts.depth    ?? 2,
    json:     opts.json     ?? false,
    output:   opts.output   ?? '',
    export:   opts.export   ?? '',
    scope:    opts.scope    ?? '',
  }

  const repoRoot = process.cwd()
  const store    = new GraphStore(`${repoRoot}/.codemind`)
  const spinner  = ora('Loading graph…').start()

  try {
    const graph = await store.load()
    if (!graph) {
      spinner.fail('No graph found.')
      process.stderr.write(formatError('NO_GRAPH', 'Run `codemind index` first.') + '\n')
      process.exit(1)
    }

    spinner.stop()
    if (!options.json && !options.export) {
      process.stdout.write(formatCompletenessWarning(graph) + '\n')
    }

    const traversal = new GraphTraversal(graph)

    // --export <format>: write to stdout, let caller redirect
    if (options.export) {
      const fmt = options.export.toLowerCase()
      if (fmt === 'mermaid') {
        process.stdout.write(graphToMermaid(graph, options.scope) + '\n')
      } else if (fmt === 'dot') {
        process.stdout.write(graphToDot(graph, options.scope) + '\n')
      } else {
        // json or unknown → JSON
        const filtered = options.scope ? scopeGraph(graph, options.scope) : graph
        process.stdout.write(JSON.stringify({ ...filtered, nodes: Object.fromEntries(filtered.nodes) }, null, 2) + '\n')
      }
      return
    }

    // --output <file>: write JSON to file
    if (options.output) {
      const outPath = path.isAbsolute(options.output)
        ? options.output
        : path.join(repoRoot, options.output)
      const serialized = JSON.stringify({ ...graph, nodes: Object.fromEntries(graph.nodes) }, null, 2)
      await fs.writeFile(outPath, serialized, 'utf8')
      process.stdout.write(`  Graph written to ${outPath}\n`)
      return
    }

    // --json: dump full graph to stdout
    if (options.json) {
      process.stdout.write(JSON.stringify({ ...graph, nodes: Object.fromEntries(graph.nodes) }, null, 2) + '\n')
      return
    }

    // Terminal display
    process.stdout.write('\n')
    process.stdout.write(chalk.bold('Code Graph') + chalk.dim(` — ${graph.repo_root}`) + '\n')
    process.stdout.write(formatSeparator() + '\n')
    process.stdout.write(
      `  ${chalk.bold(graph.node_count.toString())} nodes  ` +
      `${chalk.bold(graph.edge_count.toString())} edges  ` +
      `languages: ${graph.languages.join(', ')}\n`
    )
    process.stdout.write(formatSeparator() + '\n')

    if (options.hotspots) {
      const spots = traversal.hotspots(20)
      process.stdout.write(chalk.bold('\nTop hotspots by blast radius:\n'))
      for (const { node, dependents } of spots) {
        const graphNode = graph.nodes.get(node)
        const label = graphNode ? `${graphNode.file}:${graphNode.name}` : node
        process.stdout.write(`  ${chalk.cyan(String(dependents).padStart(4))} dependents  ${label}\n`)
      }
    } else if (options.focus) {
      const subg = traversal.subgraph(options.focus as NodeId, options.depth)
      process.stdout.write(chalk.bold(`\nSubgraph around ${chalk.cyan(options.focus)} (depth ${options.depth}):\n`))
      for (const [id, node] of subg.nodes) {
        process.stdout.write(`  ${chalk.dim(id)}  ${node.file}:${node.name}\n`)
      }
    } else {
      process.stdout.write(
        chalk.dim(`\n  Use ${chalk.white('--hotspots')} to rank nodes by blast radius,\n`) +
        chalk.dim(`  or ${chalk.white('--focus <node>')} to explore a subgraph,\n`) +
        chalk.dim(`  or ${chalk.white('--export mermaid|json|dot')} to export.\n`)
      )
    }

    process.stdout.write('\n')
  } catch (err) {
    spinner.fail('Graph command failed')
    logger.error({ err }, 'graph command failed')
    process.stderr.write(formatError('GRAPH_FAILED', 'Unexpected error.', String(err)) + '\n')
    process.exit(1)
  }
}

function scopeGraph(graph: CodeGraph, scope: string): CodeGraph {
  const nodes = new Map([...graph.nodes].filter(([, n]) => n.file.startsWith(scope)))
  const nodeIds = new Set(nodes.keys())
  const edges = graph.edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to))
  return { ...graph, nodes, edges, node_count: nodes.size, edge_count: edges.length }
}

/** Generate Mermaid LR diagram. Top 120 nodes by in-degree to keep diagrams readable. */
function graphToMermaid(graph: CodeGraph, scope?: string): string {
  const g = scope ? scopeGraph(graph, scope) : graph
  const topNodes = selectTopNodes(g, 120)
  const topSet   = new Set(topNodes)

  const lines = ['graph LR']
  const sanitize = (s: string) => s.replace(/[^\w]/g, '_').slice(0, 40)

  const edges = g.edges.filter(
    e => e.kind === 'calls' && topSet.has(e.from) && topSet.has(e.to)
  )

  // Deduplicate edges
  const seen = new Set<string>()
  for (const edge of edges) {
    const key = `${edge.from}|${edge.to}`
    if (seen.has(key)) continue
    seen.add(key)
    const fromNode = g.nodes.get(edge.from)
    const toNode   = g.nodes.get(edge.to)
    const fromLabel = fromNode ? `${sanitize(fromNode.name)}` : sanitize(edge.from)
    const toLabel   = toNode   ? `${sanitize(toNode.name)}`   : sanitize(edge.to)
    const fromId    = sanitize(edge.from)
    const toId      = sanitize(edge.to)
    lines.push(`  ${fromId}["${fromLabel}"] --> ${toId}["${toLabel}"]`)
  }

  if (lines.length === 1) {
    lines.push('  %% no resolved edges in scope')
  }

  return lines.join('\n')
}

/** Generate Graphviz DOT diagram. */
function graphToDot(graph: CodeGraph, scope?: string): string {
  const g = scope ? scopeGraph(graph, scope) : graph
  const topNodes = selectTopNodes(g, 120)
  const topSet   = new Set(topNodes)

  const sanitize = (s: string) => `"${s.replace(/"/g, '\\"').slice(0, 60)}"`
  const lines = ['digraph codemind {', '  rankdir=LR;', '  node [shape=box fontsize=10];']

  const edges = g.edges.filter(
    e => e.kind === 'calls' && topSet.has(e.from) && topSet.has(e.to)
  )
  const seen = new Set<string>()
  for (const edge of edges) {
    const key = `${edge.from}|${edge.to}`
    if (seen.has(key)) continue
    seen.add(key)
    const fromNode = g.nodes.get(edge.from)
    const toNode   = g.nodes.get(edge.to)
    const fromLabel = fromNode ? `${fromNode.file}::${fromNode.name}` : edge.from
    const toLabel   = toNode   ? `${toNode.file}::${toNode.name}`     : edge.to
    lines.push(`  ${sanitize(fromLabel)} -> ${sanitize(toLabel)};`)
  }

  lines.push('}')
  return lines.join('\n')
}

function selectTopNodes(graph: CodeGraph, limit: number): NodeId[] {
  const inDegree = new Map<NodeId, number>()
  for (const edge of graph.edges) {
    if (edge.kind !== 'calls') continue
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
  }
  return [...graph.nodes.keys()]
    .sort((a, b) => (inDegree.get(b) ?? 0) - (inDegree.get(a) ?? 0))
    .slice(0, limit)
}
