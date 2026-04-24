import chalk from 'chalk'
import type { BlastRadius, RiskLevel } from '@codemind/shared'
import { RISK_COLOR, RISK_SYMBOL } from '../lib/output/themes'

const BOX_INNER_WIDTH = 60

function timestamp(): string {
  return new Date().toTimeString().slice(0, 8)
}

function boxLine(content: string): string {
  const padded = content.length > BOX_INNER_WIDTH
    ? content.slice(0, BOX_INNER_WIDTH - 1) + '…'
    : content.padEnd(BOX_INNER_WIDTH)
  return ` │  ${padded}│`
}

function boxTop(level: RiskLevel): string {
  const ts    = timestamp()
  const label = ` ${ts} ── ${level} `
  const fill  = '─'.repeat(Math.max(0, BOX_INNER_WIDTH - label.length))
  return RISK_COLOR[level](` ╭─${label}${fill}╮`)
}

const BOX_BOTTOM = ` ╰${'─'.repeat(BOX_INNER_WIDTH + 2)}╯`

export function formatWatchAlert(file: string, blast: BlastRadius): string {
  const { risk_level, direct_dependents, coverage_gaps } = blast
  const color  = RISK_COLOR[risk_level]
  const symbol = RISK_SYMBOL[risk_level]
  const ts     = timestamp()
  const direct = direct_dependents.length
  const gaps   = coverage_gaps.length

  if (risk_level === 'LOW' || risk_level === 'UNKNOWN') {
    const dep = `${direct} dependent${direct !== 1 ? 's' : ''}`
    return chalk.green(` ${ts}  ${symbol} ${risk_level.padEnd(8)} ${file}  →  ${dep} · no gaps`)
  }

  if (risk_level === 'MEDIUM') {
    const dep     = `${direct} dependent${direct !== 1 ? 's' : ''}`
    const gapText = gaps > 0 ? `${gaps} gap${gaps !== 1 ? 's' : ''}` : 'no gaps'
    return chalk.yellow(` ${ts}  ${symbol} ${risk_level.padEnd(8)} ${file}  →  ${dep} · ${gapText}`)
  }

  // HIGH / CRITICAL — box format
  const depLine  = `${direct} direct dependent${direct !== 1 ? 's' : ''} · ${gaps} coverage gap${gaps !== 1 ? 's' : ''}`
  const lines: string[] = [
    boxTop(risk_level),
    color(boxLine(file)),
    color(boxLine(depLine)),
    color(boxLine('')),
  ]

  if (gaps > 0) {
    const gapList = coverage_gaps.slice(0, 3).join(' · ')
    lines.push(color(boxLine(`Gaps:  ${gapList}`)))
  }

  const checkCmd = `codemind check --file ${file}${risk_level === 'CRITICAL' ? ' --think' : ''}`
  lines.push(color(boxLine(`Run:   ${checkCmd}`)))

  if (risk_level === 'CRITICAL') {
    lines.push(color(boxLine('⚠  High-risk change detected.')))
  }

  lines.push(color(BOX_BOTTOM))
  return lines.join('\n')
}
