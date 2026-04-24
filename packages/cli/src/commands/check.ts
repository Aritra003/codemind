import type { Command } from 'commander'
import type { UserConfig, CodemindResult, BlastRadius } from '@codemind/shared'
import { GraphStore }    from '../lib/graph/store'
import { AnalysisModule } from '../lib/analysis'

export interface CheckOptions {
  think:    boolean   // --think: trigger deep analysis via Opus
  report:   boolean   // --report: generate HTML report
  json:     boolean   // --json: machine-readable output
  verbose:  boolean
  estimateCost: boolean  // --estimate-cost: show token cost before calling Opus
}

export function registerCheckCommand(program: Command, config: UserConfig): void {
  program
    .command('check [files...]')
    .description('Show the blast radius of staged changes')
    .option('--file <path>',   'Analyze a specific file (alternative to positional arg)')
    .option('--think',         'Deep analysis via Claude claude-opus-4-7 (uses your API key)')
    .option('--report',        'Generate an HTML report in .codemind/reports/')
    .option('--estimate-cost', 'Show estimated Anthropic API cost before calling Opus')
    .option('--json',          'Output machine-readable JSON instead of formatted text')
    .action(async (files: string[], opts: Partial<CheckOptions> & { file?: string }, cmd: import('commander').Command) => {
      const json     = opts.json ?? (cmd.parent?.opts() as { json?: boolean })?.json ?? false
      const allFiles = [...files, ...(opts.file ? [opts.file] : [])]
      const { runCheck } = await import('./check-runner')
      await runCheck(allFiles, { ...opts, json }, config)
    })
}

/** Pure function — testable without Commander. */
export async function runCheckCore(
  changedFiles: string[],
  _options: CheckOptions,
  _config: UserConfig,
): Promise<CodemindResult<BlastRadius>> {
  const repoRoot = process.cwd()
  const store    = new GraphStore(`${repoRoot}/.codemind`)
  const startMs  = Date.now()

  const graph = await store.load()
  if (!graph) {
    return {
      status: 'failed', data: null,
      meta:  { completeness_pct: 0, duration_ms: Date.now() - startMs },
      error: { code: 'GRAPH_NOT_FOUND', message: 'No graph found. Run `codemind index` first.', hint: 'Run `codemind index` to build the code graph.' },
    }
  }

  const analysis    = new AnalysisModule(graph)
  const blastRadius = await analysis.computeBlastRadius(changedFiles, repoRoot)

  return {
    status: 'success', data: blastRadius,
    meta:  {
      completeness_pct:        graph.completeness_pct,
      external_calls_excluded: graph.external_calls_excluded,
      ambiguous_local_calls:   graph.ambiguous_local_calls,
      duration_ms:             Date.now() - startMs,
    },
  }
}
