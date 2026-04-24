import type { Command } from 'commander'
import type { UserConfig } from '@codemind/shared'
import type { CodemindResult } from '@codemind/shared'
import type { CodeGraph } from '@codemind/shared'

export function registerIndexCommand(program: Command, config: UserConfig): void {
  program
    .command('index')
    .description('Build the code graph for this repository')
    .option('--force', 'Rebuild even if graph is fresh')
    .option('--include <globs>', 'Additional file globs to include', '')
    .action(async (opts: { force: boolean; include: string }) => {
      const { runIndex } = await import('./index-runner')
      await runIndex(opts, config)
    })
}

const STALE_MS = 7 * 24 * 60 * 60 * 1000

/** Callable from other commands when graph is stale. */
export async function runIndexIfNeeded(
  repoRoot: string,
  config: UserConfig,
): Promise<CodemindResult<CodeGraph>> {
  const startMs = Date.now()
  const { GraphStore }   = await import('../lib/graph/store')
  const { GraphIndexer } = await import('../lib/graph/indexer')

  const store = new GraphStore(`${repoRoot}/.codemind`)
  const ageMs = await store.ageMs()

  if (ageMs !== null && ageMs <= STALE_MS) {
    const graph = await store.load()
    if (graph) return { status: 'success', data: graph, meta: { completeness_pct: graph.completeness_pct, external_calls_excluded: graph.external_calls_excluded, ambiguous_local_calls: graph.ambiguous_local_calls, duration_ms: Date.now() - startMs } }
  }

  try {
    const indexer = new GraphIndexer()
    const graph   = await indexer.index({ repoRoot, include: [], force: false }, () => {})
    await store.save(graph)
    return { status: 'success', data: graph, meta: { completeness_pct: graph.completeness_pct, external_calls_excluded: graph.external_calls_excluded, ambiguous_local_calls: graph.ambiguous_local_calls, duration_ms: Date.now() - startMs } }
  } catch (err) {
    return {
      status: 'failed', data: null,
      meta: { completeness_pct: 0, duration_ms: Date.now() - startMs },
      error: { code: 'INTERNAL_ERROR', message: `Could not build graph: ${String(err)}` },
    }
  }
}
