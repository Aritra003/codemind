import ora  from 'ora'
import chalk from 'chalk'
import type { UserConfig } from '@stinkit/shared'
import type { AuditOptions }   from './audit'
import type { AuditThinkResult } from '../report/report-types'
import { GraphStore }              from '../lib/graph/store'
import { scanRepo }                from '../report/scanner'
import { detectCircularDependencies } from '../report/circular-detector'
import { computeHotspots }         from '../report/hotspot-analyzer'
import { computeHealthScore }      from '../report/health-score'
import { groupFindingsIntoThemes } from '../report/theme-grouper'
import { detectPositiveSignals, computeGraphStats } from '../report/positive-detector'
import { generateAuditReport }     from '../report/report-generator'
import { formatError }             from '../lib/output/format'
import { logger }                  from '../lib/logger'
import { TelemetryClient }         from '../lib/telemetry/client'

export async function runAudit(opts: AuditOptions, config: UserConfig): Promise<void> {
  const repoRoot  = process.cwd()
  const store     = new GraphStore(`${repoRoot}/.stinkit`)
  const telemetry = new TelemetryClient(config.telemetry)
  const spinner   = ora('Loading graph…').start()

  try {
    const graph = await store.load()
    if (!graph) {
      spinner.fail('No graph found.')
      process.stderr.write(formatError('NO_GRAPH', 'Run `stinkit index` first to build the code graph.') + '\n')
      process.exit(1)
    }
    spinner.text = 'Scanning repository…'

    const [findings, circularChains] = await Promise.all([
      scanRepo(repoRoot),
      Promise.resolve(detectCircularDependencies(graph)),
    ])

    const hotspots = computeHotspots(graph)
    const themes   = groupFindingsIntoThemes(findings, circularChains, hotspots)
    const critical = findings.filter(f => f.severity === 'CRITICAL').length
    const high     = findings.filter(f => f.severity === 'HIGH').length
    const medium   = findings.filter(f => f.severity === 'MEDIUM').length
    const score    = computeHealthScore({ criticalCount: critical, highCount: high, mediumCount: medium, circularDeps: circularChains.length, uncoveredHotspots: hotspots.filter(h => !h.hasCoverage).length })
    const stats    = computeGraphStats(graph, hotspots)
    const signals  = detectPositiveSignals(graph, stats)
    spinner.succeed('Analysis complete')

    let thinkResult: AuditThinkResult | undefined
    if (opts.think) {
      if (!config.anthropic_api_key && !process.env['ANTHROPIC_API_KEY']) {
        process.stderr.write(formatError('NO_API_KEY', 'Deep analysis requires an Anthropic API key.', 'Set ANTHROPIC_API_KEY in ~/.stinkit/config.yaml') + '\n')
        process.exit(1)
      }
      const thinkSpinner = ora('Generating AI narrative (Claude Opus 4.7)…').start()
      try {
        const { AIClient } = await import('../lib/ai/client')
        const ai = new AIClient(config)
        thinkResult = await ai.analyzeAudit({ themes, score, signals, graph })
        thinkSpinner.succeed('AI narrative generated')
      } catch (e) {
        thinkSpinner.warn(`AI narrative failed: ${String(e)} — using templated text`)
      }
    }

    if (opts.json) {
      process.stdout.write(JSON.stringify({ score, themes: themes.map(t => ({ id: t.id, title: t.title, severity: t.severity, count: t.findings.length })), signals }, null, 2) + '\n')
      return
    }

    printTerminalSummary(score, themes, signals, critical, high, medium, circularChains.length, hotspots.length)

    if (opts.report) {
      const reportSpinner = ora('Building HTML report…').start()
      const outPath = await generateAuditReport(graph, repoRoot, {
        ...(opts.output   ? { output:   opts.output   } : {}),
        ...(thinkResult   ? { aiThink:  thinkResult   } : {}),
      })
      reportSpinner.succeed(`Report saved → ${outPath}`)
      await openInBrowser(outPath)
    }

    logger.info({ critical, high, medium, circular: circularChains.length, health: score.score }, 'audit_complete')
    await telemetry.flush()
  } catch (err) {
    spinner.fail('Audit failed')
    logger.error({ err }, 'audit command failed')
    process.stderr.write(formatError('AUDIT_FAILED', 'Unexpected error.', String(err)) + '\n')
    process.exit(1)
  }
}

function printTerminalSummary(
  score: import('../report/report-types').HealthScore,
  themes: import('../report/report-types').Theme[],
  signals: import('../report/report-types').PositiveSignal[],
  critical: number, high: number, medium: number,
  circular: number, hotspots: number,
): void {
  const gradeColor = score.grade === 'A' || score.grade === 'B' ? chalk.green : score.grade === 'C' ? chalk.yellow : chalk.red
  process.stdout.write('\n')
  process.stdout.write(`  ${gradeColor(`Health Score: ${score.score}/100 (${score.grade} — ${score.label})`)}\n\n`)
  process.stdout.write(`  ${chalk.red(`✗ Critical: ${critical}`)}   ${chalk.yellow(`⚠ High: ${high}`)}   ${chalk.dim(`Medium: ${medium}`)}\n`)
  process.stdout.write(`  Circular deps: ${circular}   Hotspots: ${hotspots}\n\n`)

  if (themes.length > 0) {
    process.stdout.write(chalk.bold('  Findings by theme:\n'))
    for (const t of themes) {
      const sev = t.severity === 'CRITICAL' ? chalk.red(t.severity) : t.severity === 'HIGH' ? chalk.yellow(t.severity) : chalk.dim(t.severity)
      process.stdout.write(`    [${sev}] ${t.title} — ${t.findings.length} finding${t.findings.length > 1 ? 's' : ''}\n`)
    }
    process.stdout.write('\n')
  }

  if (signals.length > 0) {
    process.stdout.write(chalk.bold('  What\'s working well:\n'))
    for (const s of signals) {
      process.stdout.write(chalk.green(`    ✓ ${s.title}\n`))
    }
    process.stdout.write('\n')
  }

  process.stdout.write(chalk.dim('  Run with --report to generate a full HTML audit report.\n\n'))
}

async function openInBrowser(filePath: string): Promise<void> {
  try {
    const { execFile } = await import('child_process')
    const url = `file://${filePath}`
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
    execFile(cmd, [url])
  } catch { /* non-critical — report path already printed */ }
}
