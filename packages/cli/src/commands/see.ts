import type { Command } from 'commander'
import type { UserConfig, CodemindResult } from '@codemind/shared'
import { GraphStore }    from '../lib/graph/store'
import { AIClient }      from '../lib/ai/client'
import { VisionModule }  from '../lib/vision'
import { generateMermaid } from '../vision/generate'
import type { GenerateMermaidOptions } from '../vision/generate'

export interface DriftReport {
  diagram_path:       string
  phantom_count:      number    // in diagram, not in code
  missing_count:      number    // in code, not in diagram
  accuracy_pct:       number
  extraction_retries: number
  entities_matched:   EntityMatch[]
}

export interface EntityMatch {
  diagram_label:  string
  code_node_id:   string | null   // null = phantom
  confidence:     number          // 0–0.8 per INV-004
  resolution:     'exact' | 'fuzzy' | 'inferred' | 'unmatched'
}

export interface SeeOptions {
  ui:      boolean    // --ui: open browser side-by-side view
  json:    boolean
  report:  boolean
}

export interface SeeGenerateOptions {
  scope?:  string   // path prefix filter
  output?: string   // write to file; defaults to stdout
}

export interface GenerateReport {
  diagram:    string
  node_count: number
  edge_count: number
  warning?:   string
}

export function registerSeeCommand(program: Command, config: UserConfig): void {
  program
    .command('see [diagram]')
    .description('Compare an architecture diagram against the live code graph, or generate one from code')
    .option('--ui',              'Open interactive side-by-side browser view')
    .option('--report',          'Generate HTML drift report')
    .option('--generate',        'Generate a Mermaid diagram from the indexed code graph (no diagram input needed)')
    .option('--scope <path>',    'Path prefix to filter nodes when using --generate')
    .option('--output <file>',   'Output file for generated diagram (default: stdout)')
    .action(async (diagram: string | undefined, opts: Partial<SeeOptions & { generate?: boolean; scope?: string; output?: string }>) => {
      const { runSee } = await import('./see-runner')
      await runSee(diagram, opts, config)
    })
}

export async function runSeeCore(
  diagramPath: string,
  _options: SeeOptions,
  config: UserConfig,
): Promise<CodemindResult<DriftReport>> {
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
      error: { code: 'AI_UNAVAILABLE', message: '`see` requires an Anthropic API key.', hint: 'Set ANTHROPIC_API_KEY in ~/.codemind/config.yaml.' },
    }
  }

  const ai     = new AIClient(config)
  const vision = new VisionModule(ai)

  const extracted  = await vision.extractEntities(diagramPath)
  const resolved   = await vision.resolveEntities(extracted, graph)
  const driftReport = vision.compareToGraph(resolved, graph)

  return {
    status: 'success', data: driftReport,
    meta:  { completeness_pct: graph.completeness_pct, external_calls_excluded: graph.external_calls_excluded, ambiguous_local_calls: graph.ambiguous_local_calls, duration_ms: Date.now() - startMs },
  }
}

export async function runSeeGenerateCore(
  options:  SeeGenerateOptions,
  _config:  UserConfig,
): Promise<CodemindResult<GenerateReport>> {
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

  const genOptions: GenerateMermaidOptions = {}
  if (options.scope) genOptions.scope = options.scope

  const { diagram, nodeCount, edgeCount, warning } = generateMermaid(graph, genOptions)
  const reportData: GenerateReport = { diagram, node_count: nodeCount, edge_count: edgeCount }
  if (warning) reportData.warning = warning

  return {
    status: 'success',
    data:   reportData,
    meta:   { completeness_pct: graph.completeness_pct, external_calls_excluded: graph.external_calls_excluded, ambiguous_local_calls: graph.ambiguous_local_calls, duration_ms: Date.now() - startMs },
  }
}
