import ora from 'ora'
import * as fs   from 'fs'
import * as path from 'path'
import type { UserConfig } from '@codemind/shared'
import type { CheckOptions } from './check'
import { GraphStore }     from '../lib/graph/store'
import { AnalysisModule } from '../lib/analysis'
import { AIClient }       from '../lib/ai/client'
import { TelemetryClient } from '../lib/telemetry/client'
import {
  formatCheckResult,
  formatCompletenessWarning,
  formatAIAttribution,
  formatError,
} from '../lib/output/format'
import { logger } from '../lib/logger'

const STALE_GRAPH_DAYS = 7

export async function runCheck(
  files: string[],
  opts: Partial<CheckOptions>,
  config: UserConfig
): Promise<void> {
  const options: CheckOptions = {
    think:        opts.think        ?? false,
    report:       opts.report       ?? false,
    json:         opts.json         ?? false,
    verbose:      opts.verbose      ?? false,
    estimateCost: opts.estimateCost ?? false,
  }

  const repoRoot = process.cwd()

  // Validate explicitly specified files before touching the graph
  for (const f of files) {
    const abs = path.isAbsolute(f) ? f : path.resolve(repoRoot, f)
    if (!fs.existsSync(abs)) {
      process.stderr.write(formatError('FILE_NOT_FOUND', `File not found: ${f}`, 'Check the path and try again.') + '\n')
      process.exit(1)
    }
  }

  const store    = new GraphStore(`${repoRoot}/.codemind`)
  const telemetry = new TelemetryClient(config.telemetry)
  const spinner  = ora('Loading graph…').start()

  try {
    const graph = await store.load()
    if (!graph) {
      spinner.fail('No graph found.')
      process.stderr.write(
        formatError('NO_GRAPH', 'Run `codemind index` first to build the code graph.') + '\n'
      )
      process.exit(1)
    }

    const ageMs = await store.ageMs()
    if (ageMs !== null && ageMs > STALE_GRAPH_DAYS * 24 * 60 * 60 * 1000) {
      spinner.warn(`Graph is ${Math.floor(ageMs / 86400000)} days old — consider running \`codemind index\``)
    } else {
      spinner.stop()
    }

    // Verify explicitly specified files have indexed nodes
    for (const f of files) {
      const rel = path.relative(repoRoot, path.isAbsolute(f) ? f : path.resolve(repoRoot, f))
      const hasNodes = [...graph.nodes.values()].some(n => n.file === rel)
      if (!hasNodes) {
        spinner.stop()
        process.stderr.write(
          formatError(
            'FILE_NOT_INDEXED',
            `${f} exists but has no indexed nodes.`,
            'It may be in an unsupported language or excluded. Run `codemind index` to rebuild.'
          ) + '\n'
        )
        process.exit(1)
      }
    }

    if (!options.json) process.stdout.write(formatCompletenessWarning(graph) + '\n')

    const changedFiles = files.length > 0
      ? files
      : await getStagedFiles()

    if (changedFiles.length === 0) {
      process.stdout.write('  No changed files detected. Stage some files or pass file paths.\n')
      process.exit(0)
    }

    const analysis  = new AnalysisModule(graph)
    const t0 = Date.now()
    const blastRadius = await analysis.computeBlastRadius(changedFiles, repoRoot, options.think)
    logger.info({
      files:           changedFiles,
      risk_level:      blastRadius.risk_level,
      direct:          blastRadius.direct_dependents.length,
      transitive:      blastRadius.transitive_dependents.length,
      gaps:            blastRadius.coverage_gaps.length,
      duration_ms:     Date.now() - t0,
    }, 'check_complete')

    let aiResult: Awaited<ReturnType<AIClient['analyzeBlastRadius']>> | undefined
    if (options.think) {
      if (!config.anthropic_api_key) {
        process.stderr.write(
          formatError(
            'NO_API_KEY',
            'Deep analysis requires an Anthropic API key.',
            'Set ANTHROPIC_API_KEY in ~/.codemind/config.yaml or as an env var.'
          ) + '\n'
        )
        process.exit(1)
      }
      const ai = new AIClient(config)
      const thinkSpinner = ora('Deep analysis via Claude Opus…').start()
      const graphSummary = {
        changed_nodes:      blastRadius.changed_nodes.map(id => ({ id, name: id.split('::')[1] ?? id, kind: 'function', file_relative: id.split('::')[0] ?? '' })),
        direct_dependents:  blastRadius.direct_dependents.map(id => ({ id, name: id.split('::')[1] ?? id, kind: 'function' })),
        transitive_count:   blastRadius.transitive_dependents.length,
        coverage_gap_count: blastRadius.coverage_gaps.length,
        incident_history:   false,
        completeness_pct:   graph.completeness_pct,
        top_risk_paths:     [],
      }
      aiResult = await ai.analyzeBlastRadius(blastRadius, graphSummary)
      thinkSpinner.succeed('Deep analysis complete')
    }

    const result = {
      status: 'success' as const,
      data: blastRadius,
      meta: {
        completeness_pct:        graph.completeness_pct,
        external_calls_excluded: graph.external_calls_excluded,
        ambiguous_local_calls:   graph.ambiguous_local_calls,
        duration_ms:             0,
        graph_node_count:        graph.node_count,
      },
    }

    const output = formatCheckResult(result, options.json)
    process.stdout.write(output + '\n')

    if (aiResult) {
      process.stdout.write(formatAIAttribution(aiResult.model) + '\n')
      process.stdout.write(aiResult.risk_summary + '\n')
      process.stdout.write(aiResult.recommendation + '\n')
    }

    const eventName = blastRadius.risk_level === 'CRITICAL' || blastRadius.risk_level === 'HIGH'
      ? 'K-04' : 'K-03'
    telemetry.emit(eventName, {
      risk_level:       blastRadius.risk_level,
      direct_count:     blastRadius.direct_dependents.length,
      transitive_count: blastRadius.transitive_dependents.length,
      think_used:       options.think,
    })
    await telemetry.flush()
  } catch (err) {
    spinner.fail('Check failed')
    logger.error({ err }, 'check command failed')
    process.stderr.write(formatError('CHECK_FAILED', 'Unexpected error.', String(err)) + '\n')
    process.exit(1)
  }
}

async function getStagedFiles(): Promise<string[]> {
  const { execFile } = await import('child_process')
  const { promisify } = await import('util')
  const exec = promisify(execFile)
  try {
    const { stdout } = await exec('git', ['diff', '--cached', '--name-only'])
    return stdout.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}
