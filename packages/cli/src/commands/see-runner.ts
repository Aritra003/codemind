import ora from 'ora'
import * as fs   from 'fs/promises'
import * as path from 'path'
import type { UserConfig } from '@codemind/shared'
import type { SeeOptions } from './see'
import { GraphStore }      from '../lib/graph/store'
import { VisionModule }    from '../lib/vision'
import { AIClient }        from '../lib/ai/client'
import { TelemetryClient } from '../lib/telemetry/client'
import {
  formatSeeResult,
  formatCompletenessWarning,
  formatError,
} from '../lib/output/format'
import { logger } from '../lib/logger'
import { runSeeGenerateCore } from './see'

const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg']

type RunSeeOpts = Partial<SeeOptions & { generate?: boolean; scope?: string; output?: string }>

export async function runSee(
  diagramArg: string | undefined,
  opts:       RunSeeOpts,
  config:     UserConfig,
): Promise<void> {
  if (opts.generate) {
    return runSeeGenerate(opts, config)
  }
  return runSeeCompare(diagramArg, opts, config)
}

async function runSeeGenerate(opts: RunSeeOpts, config: UserConfig): Promise<void> {
  const spinner   = ora('Loading graph…').start()
  const telemetry = new TelemetryClient(config.telemetry)

  try {
    const genOpts: import('./see').SeeGenerateOptions = {}
    if (opts.scope)  genOpts.scope  = opts.scope
    if (opts.output) genOpts.output = opts.output

    const result = await runSeeGenerateCore(genOpts, config)

    if (result.status === 'failed') {
      spinner.fail('Generate failed')
      process.stderr.write(
        formatError(result.error.code, result.error.message, result.error.hint) + '\n',
      )
      process.exit(1)
    }

    spinner.stop()

    const { diagram, node_count, edge_count, warning } = result.data

    if (warning) {
      process.stderr.write(`⚠ ${warning}\n`)
    }

    if (opts.output) {
      const outPath = path.isAbsolute(opts.output)
        ? opts.output
        : path.join(process.cwd(), opts.output)
      await fs.writeFile(outPath, diagram, 'utf8')
      process.stderr.write(`Mermaid diagram written to ${outPath}\n`)
    } else {
      process.stdout.write(diagram + '\n')
    }

    telemetry.emit('see_generate_completed', {
      scope_provided:  !!opts.scope,
      node_count,
      edge_count,
      output_to_file:  !!opts.output,
    })
    await telemetry.flush()
  } catch (err) {
    spinner.fail('Generate command failed')
    logger.error({ err }, 'see --generate failed')
    process.stderr.write(formatError('GENERATE_FAILED', 'Unexpected error.', String(err)) + '\n')
    process.exit(1)
  }
}

async function runSeeCompare(
  diagramArg: string | undefined,
  opts:       RunSeeOpts,
  config:     UserConfig,
): Promise<void> {
  const options: SeeOptions = {
    ui:     opts.ui     ?? false,
    json:   opts.json   ?? false,
    report: opts.report ?? false,
  }

  const repoRoot   = process.cwd()
  const store      = new GraphStore(`${repoRoot}/.codemind`)
  const telemetry  = new TelemetryClient(config.telemetry)
  const spinner    = ora('Loading graph…').start()

  try {
    if (!diagramArg) {
      spinner.fail('No diagram provided')
      process.stderr.write(
        formatError(
          'NO_DIAGRAM',
          'Provide a diagram path or use --generate to create one from code.',
          'Usage: codemind see <diagram.png> | codemind see --generate',
        ) + '\n',
      )
      process.exit(1)
    }

    const diagramPath = path.isAbsolute(diagramArg)
      ? diagramArg
      : path.join(repoRoot, diagramArg)

    const ext = path.extname(diagramPath).toLowerCase()
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      spinner.fail(`Unsupported diagram format: ${ext}`)
      process.stderr.write(
        formatError(
          'UNSUPPORTED_FORMAT',
          `Diagram must be PNG, JPG, or SVG. Got: ${ext}`,
          'Convert your diagram to PNG first.',
        ) + '\n',
      )
      process.exit(1)
    }

    try {
      await fs.access(diagramPath)
    } catch {
      spinner.fail(`Diagram not found: ${diagramPath}`)
      process.stderr.write(formatError('FILE_NOT_FOUND', `Cannot read ${diagramPath}`) + '\n')
      process.exit(1)
    }

    const graph = await store.load()
    if (!graph) {
      spinner.fail('No graph found.')
      process.stderr.write(
        formatError('NO_GRAPH', 'Run `codemind index` first.') + '\n',
      )
      process.exit(1)
    }

    spinner.stop()
    process.stdout.write(formatCompletenessWarning(graph) + '\n')

    if (!config.anthropic_api_key) {
      process.stderr.write(
        formatError(
          'NO_API_KEY',
          '`see` requires an Anthropic API key for diagram vision analysis.',
          'Set ANTHROPIC_API_KEY in ~/.codemind/config.yaml or as an env var.',
        ) + '\n',
      )
      process.exit(1)
    }

    const ai     = new AIClient(config)
    const vision = new VisionModule(ai)

    const extractSpinner = ora('Extracting entities from diagram (Opus vision)…').start()
    const extracted = await vision.extractEntities(diagramPath)
    extractSpinner.succeed(`Extracted ${extracted.entities.length} entities from diagram`)

    const resolveSpinner = ora('Resolving entities to graph nodes…').start()
    const resolved = await vision.resolveEntities(extracted, graph)
    resolveSpinner.succeed('Entity resolution complete')

    const driftReport = vision.compareToGraph(resolved, graph)

    const result = {
      status: 'success' as const,
      data:   driftReport,
      meta:   {
        completeness_pct:        graph.completeness_pct,
        external_calls_excluded: graph.external_calls_excluded,
        ambiguous_local_calls:   graph.ambiguous_local_calls,
        duration_ms:             0,
        graph_node_count:        graph.node_count,
      },
    }

    const output = formatSeeResult(result, options.json)
    process.stdout.write(output + '\n')

    telemetry.emit('K-05', {
      diagram_ext:    ext,
      phantom_count:  driftReport.phantom_count,
      missing_count:  driftReport.missing_count,
      accuracy_pct:   driftReport.accuracy_pct,
    })
    await telemetry.flush()
  } catch (err) {
    spinner.fail('See command failed')
    logger.error({ err }, 'see command failed')
    process.stderr.write(formatError('SEE_FAILED', 'Unexpected error.', String(err)) + '\n')
    process.exit(1)
  }
}
