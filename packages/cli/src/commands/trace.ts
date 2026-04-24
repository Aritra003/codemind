import type { Command } from 'commander'
import type { UserConfig, CodemindResult, NodeId } from '@codemind/shared'
import { GraphStore }     from '../lib/graph/store'
import { AIClient }       from '../lib/ai/client'
import { ForensicsModule } from '../lib/forensics'

export interface ForensicsTrace {
  origin_classification: OriginClass
  ranked_commits:        RankedCommit[]
  code_paths:            NodeId[][]
  narrative?:            string     // Opus-generated, only if --narrative
  confidence_cap:        0.8        // INV-004: never claim > 80%
  completeness_pct:      number
}

export type OriginClass =
  | 'SINGLE_COMMIT'
  | 'MULTI_COMMIT'
  | 'EXTERNAL_DEPENDENCY'
  | 'CONFIG_CHANGE'
  | 'UNKNOWN'

export interface RankedCommit {
  hash:        string
  author:      string    // name only — never email (PII per INV-003 + GDPR)
  date:        string
  message:     string
  score:       number    // relevance 0–1
  changed_nodes: NodeId[]
}

export interface TraceOptions {
  narrative: boolean    // --narrative: Opus-generated explanation
  lookback:  number     // --lookback <days>, default 90
  json:      boolean
  report:    boolean
}

export function registerTraceCommand(program: Command, config: UserConfig): void {
  program
    .command('trace <error-or-symptom>')
    .description('Trace a production error or symptom to root-cause commits')
    .option('--narrative',         'Generate an Opus narrative explanation')
    .option('--lookback <days>',   'How far back to search git history', '90')
    .option('--report',            'Generate HTML forensics report')
    .action(async (errorInput: string, opts: Partial<TraceOptions>) => {
      const { runTrace } = await import('./trace-runner')
      await runTrace(errorInput, opts, config)
    })
}

export async function runTraceCore(
  errorInput: string,
  options: TraceOptions,
  config: UserConfig,
): Promise<CodemindResult<ForensicsTrace>> {
  const repoRoot = process.cwd()
  const store    = new GraphStore(`${repoRoot}/.codemind`)
  const startMs  = Date.now()

  const graph = await store.load()
  if (!graph) {
    return {
      status: 'failed', data: null,
      meta:  { completeness_pct: 0, duration_ms: Date.now() - startMs },
      error: { code: 'GRAPH_NOT_FOUND', message: 'No graph found. Run `codemind index` first.' },
    }
  }

  if (!config.anthropic_api_key) {
    return {
      status: 'failed', data: null,
      meta:  { completeness_pct: graph.completeness_pct, external_calls_excluded: graph.external_calls_excluded, ambiguous_local_calls: graph.ambiguous_local_calls, duration_ms: Date.now() - startMs },
      error: { code: 'AI_UNAVAILABLE', message: '`trace` requires an Anthropic API key.', hint: 'Set ANTHROPIC_API_KEY in ~/.codemind/config.yaml.' },
    }
  }

  const ai       = new AIClient(config)
  const forensics = new ForensicsModule(graph, ai, repoRoot)
  const trace     = await forensics.assemble(errorInput, options.lookback, options.narrative)

  return {
    status: 'success', data: trace,
    meta:  { completeness_pct: graph.completeness_pct, external_calls_excluded: graph.external_calls_excluded, ambiguous_local_calls: graph.ambiguous_local_calls, duration_ms: Date.now() - startMs },
  }
}
