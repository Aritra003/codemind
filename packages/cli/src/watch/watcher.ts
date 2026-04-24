import * as path from 'path'
import * as fs   from 'fs/promises'
import type { CodeGraph, GraphNode, GraphEdge } from '@codemind/shared'
import { parseFile }        from '../graph/parser'
import { detectLanguage }   from '../graph/walker'
import type { DiscoveredFile } from '../graph/walker'
import { GraphStore }       from '../lib/graph/store'
import { AnalysisModule }   from '../lib/analysis'
import { logger }           from '../lib/logger'
import { formatWatchAlert } from './watch-format'

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.codemind', 'dist', 'build',
  '.next', 'out', 'coverage', '__pycache__', '.turbo', '.cache',
])

export function shouldWatchFile(absolutePath: string): boolean {
  const parts = absolutePath.split(path.sep)
  if (parts.some(p => IGNORE_DIRS.has(p))) return false
  return detectLanguage(absolutePath) !== null
}

export function patchGraph(
  graph:    CodeGraph,
  relPath:  string,
  newNodes: GraphNode[],
  newEdges: GraphEdge[],
): CodeGraph {
  const prefix = relPath + '::'
  const nodes  = new Map(graph.nodes)
  for (const [id, node] of nodes) {
    if (node.file === relPath) nodes.delete(id)
  }
  const retained = graph.edges.filter(e => !e.from.startsWith(prefix))
  for (const node of newNodes) nodes.set(node.id, node)
  const edges = [...retained, ...newEdges]
  return { ...graph, nodes, edges, node_count: nodes.size, edge_count: edges.length }
}

export interface WatchStatus {
  running:          boolean
  started_at:       string
  changes_analyzed: number
  high_alerts:      number
  last_change?: {
    file:       string
    risk:       string
    dependents: number
    at:         string
  }
}

export async function writeWatchStatus(storeDir: string, status: WatchStatus): Promise<void> {
  await fs.writeFile(path.join(storeDir, 'watch-status.json'), JSON.stringify(status, null, 2), 'utf8')
}

export interface WatchOptions {
  thinkOnCritical?: boolean
  debounceMs?:      number
  scope?:           string
}

export async function startWatch(options: WatchOptions): Promise<void> {
  const repoRoot   = process.cwd()
  const storeDir   = path.join(repoRoot, '.codemind')
  const debounceMs = options.debounceMs ?? 2000

  const store = new GraphStore(storeDir)
  let graph   = await store.load()
  if (!graph) throw new Error('Graph not found. Run `codemind index` first.')

  const fileCount = new Set([...graph.nodes.values()].map(n => n.file)).size
  const nodeStr   = String(graph.node_count).padEnd(4)
  const fileStr   = String(fileCount).padEnd(4)
  process.stdout.write([
    '',
    ' ╭──────────────────────────────────────────────────────────╮',
    ` │  CODEMIND WATCH                                          │`,
    ` │  Monitoring ${nodeStr} nodes across ${fileStr} files              │`,
    ' │  Press Ctrl+C to stop                                    │',
    ' ╰──────────────────────────────────────────────────────────╯',
    '',
  ].join('\n') + '\n')

  const startedAt = new Date().toISOString()
  const startTime = Date.now()
  let changeCount = 0
  let highAlerts  = 0

  await writeWatchStatus(storeDir, { running: true, started_at: startedAt, changes_analyzed: 0, high_alerts: 0 })

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const chokidar = require('chokidar') as typeof import('chokidar')
  const watchRoot = options.scope ? path.join(repoRoot, options.scope) : repoRoot

  const watcher = chokidar.watch(watchRoot, {
    ignored: [/node_modules/, /\.git/, /\.codemind/, /dist\//, /build\//, /\.next\//,
              /coverage\//, /\.test\./, /\.spec\./],
    persistent:    true,
    ignoreInitial: true,
  })

  const pending = new Map<string, ReturnType<typeof setTimeout>>()

  const analyzeChange = async (absolutePath: string): Promise<void> => {
    if (!shouldWatchFile(absolutePath)) return
    const relPath  = path.relative(repoRoot, absolutePath)
    const language = detectLanguage(absolutePath)
    if (!language) return

    const file: DiscoveredFile = { absolutePath, relativePath: relPath, language }
    let result
    try {
      result = await parseFile(file)
    } catch (err) {
      logger.warn({ file: relPath, err }, 'watch_parse_failed')
      return
    }

    graph = patchGraph(graph!, relPath, result.nodes, result.edges)

    const analysis = new AnalysisModule(graph)
    let blast
    try {
      blast = await analysis.computeBlastRadius([absolutePath], repoRoot, false)
    } catch (err) {
      logger.warn({ file: relPath, err }, 'watch_analysis_failed')
      return
    }

    changeCount++
    if (blast.risk_level === 'HIGH' || blast.risk_level === 'CRITICAL') highAlerts++

    process.stdout.write(formatWatchAlert(relPath, blast) + '\n')
    if (blast.risk_level === 'CRITICAL') process.stdout.write('\x07')

    const status: WatchStatus = {
      running: true, started_at: startedAt,
      changes_analyzed: changeCount, high_alerts: highAlerts,
      last_change: { file: relPath, risk: blast.risk_level, dependents: blast.direct_dependents.length, at: new Date().toISOString() },
    }
    await writeWatchStatus(storeDir, status)
  }

  watcher.on('change', (absolutePath: string) => {
    const existing = pending.get(absolutePath)
    if (existing) clearTimeout(existing)
    pending.set(absolutePath, setTimeout(() => {
      pending.delete(absolutePath)
      analyzeChange(absolutePath).catch(err => logger.error({ err }, 'watch_error'))
    }, debounceMs))
  })

  const cleanup = async (): Promise<void> => {
    await watcher.close()
    await writeWatchStatus(storeDir, { running: false, started_at: startedAt, changes_analyzed: changeCount, high_alerts: highAlerts })
    const minutes = Math.round((Date.now() - startTime) / 60000)
    process.stdout.write(`\n  Watched for ${minutes} min · ${changeCount} changes · ${highAlerts} high-risk alerts.\n`)
    process.exit(0)
  }

  process.once('SIGINT',  () => { cleanup().catch(() => process.exit(1)) })
  process.once('SIGTERM', () => { cleanup().catch(() => process.exit(1)) })
}
