import chalk from 'chalk'
import type { BlastRadius, RiskLevel, CodemindResult } from '@codemind/shared'
import type { DriftReport } from '../../commands/see'
import type { ForensicsTrace } from '../../commands/trace'
import { RISK_SYMBOL, RISK_COLOR } from './themes'

/** DESIGN-SYSTEM.md CLI output grammar — all formatted output goes through here. */

export function formatRiskBadge(level: RiskLevel): string {
  const color  = RISK_COLOR[level]
  const symbol = RISK_SYMBOL[level]
  return color(`${symbol} ${level}`)
}

export function formatCheckResult(result: CodemindResult<BlastRadius>, json: boolean): string {
  if (json) return JSON.stringify(result, null, 2)
  if (result.status === 'failed') return formatError(result.error.code, result.error.message, result.error.hint)
  const { data, meta } = result
  const lines: string[] = [
    '',
    `  ${formatRiskBadge(data.risk_level)}`,
    '',
    `  Changed:     ${data.changed_nodes.length} node${data.changed_nodes.length !== 1 ? 's' : ''}`,
    `  Direct:      ${data.direct_dependents.length} dependent${data.direct_dependents.length !== 1 ? 's' : ''}`,
    `  Transitive:  ${data.transitive_dependents.length} dependent${data.transitive_dependents.length !== 1 ? 's' : ''}`,
    `  Gaps:        ${data.coverage_gaps.length} uncovered`,
    '',
    `  ${formatSeparator()}`,
    `  ${formatCompletenessWarning(meta)}`,
  ]
  if (result.status === 'partial') {
    lines.push(...result.warnings.map(w => chalk.yellow(`  ⚠ ${w}`)))
  }
  return lines.join('\n')
}

export function formatSeeResult(result: CodemindResult<DriftReport>, json: boolean): string {
  if (json) return JSON.stringify(result, null, 2)
  if (result.status === 'failed') return formatError(result.error.code, result.error.message, result.error.hint)
  const { data, meta } = result
  const lines: string[] = [
    '',
    `  Diagram:   ${chalk.cyan(data.diagram_path)}`,
    `  Accuracy:  ${data.accuracy_pct >= 80 ? chalk.green(`${data.accuracy_pct}%`) : chalk.yellow(`${data.accuracy_pct}%`)}`,
    '',
    `  Phantom:   ${data.phantom_count}   Missing:  ${data.missing_count}`,
    '',
    `  ${formatSeparator()}`,
    `  ${formatCompletenessWarning(meta)}`,
  ]
  if (result.status === 'partial') {
    lines.push(...result.warnings.map(w => chalk.yellow(`  ⚠ ${w}`)))
  }
  return lines.join('\n')
}

export function formatTraceResult(result: CodemindResult<ForensicsTrace>, json: boolean): string {
  if (json) return JSON.stringify(result, null, 2)
  if (result.status === 'failed') return formatError(result.error.code, result.error.message, result.error.hint)
  const { data, meta } = result
  const lines: string[] = [
    '',
    `  Origin:  ${chalk.bold(data.origin_classification)}`,
    `  Paths:   ${data.code_paths.length} path${data.code_paths.length !== 1 ? 's' : ''} found`,
    '',
  ]
  const topCommits = data.ranked_commits.slice(0, 3)
  if (topCommits.length > 0) {
    lines.push(chalk.dim('  Top commits:'))
    for (const c of topCommits) {
      lines.push(`    ${chalk.cyan(c.hash.slice(0, 7))}  ${c.author}  ${c.message}  ${chalk.dim(`(score: ${c.score.toFixed(2)})`)}`)
    }
    lines.push('')
  }
  if (data.narrative) {
    lines.push(chalk.dim('  Narrative:'))
    lines.push(`    ${data.narrative}`)
    lines.push('')
  }
  lines.push(`  ${formatSeparator()}`)
  lines.push(`  ${formatCompletenessWarning(meta)}`)
  if (result.status === 'partial') {
    lines.push(...result.warnings.map(w => chalk.yellow(`  ⚠ ${w}`)))
  }
  return lines.join('\n')
}

export function formatAIAttribution(model: string): string {
  // CV-004 (COUNSEL): AI-generated sections must be labeled
  return chalk.dim(`✦ AI analysis  (Claude ${model})`)
}

export interface CompletenessInfo {
  completeness_pct:         number
  external_calls_excluded?: number | undefined
  ambiguous_local_calls?:   number | undefined
}

export function formatCompletenessWarning(info: CompletenessInfo | number): string {
  const pct        = typeof info === 'number' ? info : info.completeness_pct
  const hasRich    = typeof info === 'object' && info.external_calls_excluded !== undefined
  const ext        = hasRich ? (info as CompletenessInfo).external_calls_excluded! : 0
  const amb        = hasRich ? ((info as CompletenessInfo).ambiguous_local_calls ?? 0) : 0

  if (hasRich) {
    const headline = pct >= 80
      ? chalk.dim(`Local completeness: ${pct}%`)
      : chalk.yellow(`⚠ Local completeness: ${pct}%`)
    const detail   = chalk.dim(` · ${ext} external excluded · ${amb} ambiguous local`)
    return headline + detail
  }

  if (pct >= 90) return chalk.dim(`Graph completeness: ${pct}%`)
  return chalk.yellow(`⚠ Graph completeness: ${pct}% — some blast radius paths may be missing`)
}

export function formatSeparator(): string {
  return chalk.dim('─'.repeat(65))
}

export function formatError(code: string, message: string, hint?: string): string {
  const lines = [`  ✗ ${message}`]
  if (hint) lines.push(chalk.dim(`    ${hint}`))
  return lines.join('\n')
}

export function formatSuccess(message: string): string {
  return `  ${chalk.green('✓')} ${message}`
}
