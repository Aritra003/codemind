import ora from 'ora'
import type { UserConfig } from '@stinkit/shared'
import type { TraceOptions } from './trace'
import { GraphStore }      from '../lib/graph/store'
import { ForensicsModule } from '../lib/forensics'
import { AIClient }        from '../lib/ai/client'
import { TelemetryClient } from '../lib/telemetry/client'
import {
  formatTraceResult,
  formatCompletenessWarning,
  formatError,
} from '../lib/output/format'
import { logger } from '../lib/logger'

export async function runTrace(
  errorInput: string,
  opts: Partial<TraceOptions>,
  config: UserConfig
): Promise<void> {
  const options: TraceOptions = {
    narrative: opts.narrative ?? false,
    lookback:  opts.lookback  ?? 90,
    json:      opts.json      ?? false,
    report:    opts.report    ?? false,
  }

  const repoRoot  = process.cwd()
  const store     = new GraphStore(`${repoRoot}/.stinkit`)
  const telemetry = new TelemetryClient(config.telemetry)
  const spinner   = ora('Loading graph…').start()

  try {
    const graph = await store.load()
    if (!graph) {
      spinner.fail('No graph found.')
      process.stderr.write(
        formatError('NO_GRAPH', 'Run `stinkit index` first.') + '\n'
      )
      process.exit(1)
    }

    spinner.stop()
    process.stdout.write(formatCompletenessWarning(graph) + '\n')

    if (!config.anthropic_api_key) {
      process.stderr.write(
        formatError(
          'NO_API_KEY',
          '`trace` requires an Anthropic API key for error triage.',
          'Set ANTHROPIC_API_KEY in ~/.stinkit/config.yaml or as an env var.'
        ) + '\n'
      )
      process.exit(1)
    }

    const ai        = new AIClient(config)
    const forensics = new ForensicsModule(graph, ai, repoRoot)

    const traceSpinner = ora('Tracing root cause…').start()
    const trace = await forensics.assemble(errorInput, options.lookback, options.narrative)
    traceSpinner.succeed('Trace complete')

    const result = {
      status: 'success' as const,
      data:   trace,
      meta:   {
        completeness_pct:        graph.completeness_pct,
        external_calls_excluded: graph.external_calls_excluded,
        ambiguous_local_calls:   graph.ambiguous_local_calls,
        duration_ms:             0,
        graph_node_count:        graph.node_count,
      },
    }

    const output = formatTraceResult(result, options.json)
    process.stdout.write(output + '\n')

    telemetry.emit('K-06', {
      origin_class:   trace.origin_classification,
      commits_ranked: trace.ranked_commits.length,
      narrative_used: options.narrative,
    })
    await telemetry.flush()
  } catch (err) {
    spinner.fail('Trace failed')
    logger.error({ err }, 'trace command failed')
    process.stderr.write(formatError('TRACE_FAILED', 'Unexpected error.', String(err)) + '\n')
    process.exit(1)
  }
}
