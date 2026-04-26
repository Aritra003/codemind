import type { CodeGraph, GraphNode, GraphEdge } from '@stinkit/shared'
import { walkFiles }          from '../../graph/walker'
import { parseFile }          from '../../graph/parser'
import { loadCoverage }       from '../../graph/coverage'
import { computeCompleteness } from '../../graph/completeness'
import { buildWorkspaceMap }  from '../../graph/workspace'
import { logger }             from '../logger'

export interface IndexerOptions {
  repoRoot: string
  include:  string[]
  force:    boolean
}

export interface IndexProgress {
  phase:         'parsing' | 'resolving' | 'persisting'
  files_done:    number
  files_total:   number
  current_file?: string
}

export class GraphIndexer {
  async index(
    options:     IndexerOptions,
    onProgress?: (p: IndexProgress) => void,
  ): Promise<CodeGraph> {
    const { repoRoot } = options
    const t0 = Date.now()
    const [files, workspaceMap] = await Promise.all([
      walkFiles({ repoRoot, include: [], respectGitignore: false }),
      buildWorkspaceMap(repoRoot),
    ])
    logger.info({ file_count: files.length, workspace_packages: workspaceMap.size, repoRoot }, 'index_start')

    const allNodes: GraphNode[] = []
    const allEdges: GraphEdge[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!
      onProgress?.({ phase: 'parsing', files_done: i, files_total: files.length, current_file: file.relativePath })
      try {
        const result = await parseFile(file)
        allNodes.push(...result.nodes)
        allEdges.push(...result.edges)
        if (result.parse_errors > 0) {
          logger.debug({ file: file.relativePath, parse_errors: result.parse_errors }, 'parse_errors_in_file')
        }
      } catch (err) {
        logger.warn({ file: file.relativePath, err: String(err) }, 'file_skipped')
      }
    }

    onProgress?.({ phase: 'resolving', files_done: files.length, files_total: files.length })
    const { resolvedEdges, nameToIds } = resolveEdges(allEdges, allNodes, workspaceMap)

    // Coverage cached at index time (git history skipped — too slow on large repos)
    await loadCoverage(repoRoot, allNodes)

    const {
      completeness_pct,
      external_calls_excluded,
      ambiguous_local_calls,
      unresolved_calls,
      total_calls,
    } = computeCompleteness(resolvedEdges, nameToIds)
    const languages = [...new Set(allNodes.map(n => n.language).filter(Boolean))] as string[]

    const nodes = new Map(allNodes.map(n => [n.id, n]))

    const graph: CodeGraph = {
      version:                  1,
      createdAt:                Date.now(),
      repo_root:                repoRoot,
      node_count:               nodes.size,
      edge_count:               resolvedEdges.length,
      completeness_pct,
      external_calls_excluded,
      ambiguous_local_calls,
      nodes,
      edges:                    resolvedEdges,
      languages,
      git_available:            false,
    }
    logger.info({
      nodes: graph.node_count,
      edges: graph.edge_count,
      completeness_pct,
      total_calls,
      unresolved_calls,
      languages,
      duration_ms: Date.now() - t0,
    }, 'index_complete')
    return graph
  }

  async reindex(
    _existing:     CodeGraph,
    _changedFiles: string[],
    options:       IndexerOptions,
  ): Promise<CodeGraph> {
    return this.index(options)
  }
}

function resolveEdges(
  edges:        GraphEdge[],
  nodes:        GraphNode[],
  workspaceMap: Map<string, string>,
): { resolvedEdges: GraphEdge[]; nameToIds: Map<string, string[]> } {
  // Build nameToId: name → single id (or '' if ambiguous across all files)
  const nameToIds = new Map<string, string[]>()
  for (const node of nodes) {
    const list = nameToIds.get(node.name) ?? []
    list.push(node.id)
    nameToIds.set(node.name, list)
  }
  const nameToId = new Map<string, string>()
  for (const [name, ids] of nameToIds) {
    nameToId.set(name, ids.length === 1 ? ids[0]! : '')  // '' = ambiguous
  }

  // Build file → Set<directory prefix> from import edges + workspace map
  // e.g. "apps/web/page.ts" → Set{"packages/database", "packages/env"}
  const fileImportedDirs = new Map<string, Set<string>>()
  for (const edge of edges) {
    if (edge.kind !== 'imports') continue
    const dir = workspaceMap.get(edge.to)
    if (!dir) continue
    const set = fileImportedDirs.get(edge.from) ?? new Set<string>()
    set.add(dir)
    fileImportedDirs.set(edge.from, set)
  }

  const resolvedEdges = edges.map(edge => {
    if (!edge.to.startsWith('UNRESOLVED::')) return edge
    const callee = edge.to.slice('UNRESOLVED::'.length)

    // Unambiguous: resolve directly
    const direct = nameToId.get(callee)
    if (direct) return { ...edge, to: direct }

    // Ambiguous: narrow by which packages the caller's file imports
    const candidates = nameToIds.get(callee)
    if (candidates && candidates.length > 1) {
      const callerFile   = edge.from.split('::')[0] ?? edge.from
      const importedDirs = fileImportedDirs.get(callerFile)
      if (importedDirs && importedDirs.size > 0) {
        const matching = candidates.filter(id => {
          const nodeDir = id.split('::')[0] ?? ''
          return [...importedDirs].some(dir => nodeDir.startsWith(dir))
        })
        if (matching.length === 1) return { ...edge, to: matching[0]! }
      }
    }

    return edge
  })

  return { resolvedEdges, nameToIds }
}
