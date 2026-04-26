import chalk from 'chalk'
import type { RiskLevel } from '@stinkit/shared'

/** All CLI color constants live here. Never inline chalk calls in other output files. */

export const RISK_SYMBOL: Record<RiskLevel, string> = {
  CRITICAL: '●',
  HIGH:     '●',
  MEDIUM:   '◐',
  LOW:      '○',
  UNKNOWN:  '·',
}

export const RISK_COLOR: Record<RiskLevel, (s: string) => string> = {
  CRITICAL: chalk.red.bold,
  HIGH:     chalk.yellow,
  MEDIUM:   chalk.yellow,
  LOW:      chalk.green,
  UNKNOWN:  chalk.dim,
}

export const BRAND_COLOR = chalk.hex('#6366F1')

export const DIM    = chalk.dim
export const BOLD   = chalk.bold
export const CYAN   = chalk.cyan
export const GREEN  = chalk.green
export const YELLOW = chalk.yellow
export const RED    = chalk.red
