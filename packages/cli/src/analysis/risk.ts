import type { BlastRadius, RiskLevel } from '@stinkit/shared'

export const THRESHOLDS = {
  CRITICAL_TRANSITIVE:   50,
  CRITICAL_COVERAGE_GAPS: 10,
  CRITICAL_DIRECT:        5,
  HIGH_TRANSITIVE:       20,
  HIGH_COVERAGE_GAPS:     5,
  MEDIUM_DIRECT:          5,
} as const

export function classifyRisk(radius: Omit<BlastRadius, 'risk_level'>): RiskLevel {
  const transitive = radius.transitive_dependents.length
  const direct     = radius.direct_dependents.length
  const gaps       = radius.coverage_gaps.length

  // A file nobody depends on can't break anything — always LOW regardless of gaps
  if (direct === 0 && transitive === 0) return 'LOW'

  if (
    transitive > THRESHOLDS.CRITICAL_TRANSITIVE ||
    (gaps > THRESHOLDS.CRITICAL_COVERAGE_GAPS && direct > THRESHOLDS.CRITICAL_DIRECT)
  ) return 'CRITICAL'

  if (transitive > THRESHOLDS.HIGH_TRANSITIVE || gaps > THRESHOLDS.HIGH_COVERAGE_GAPS) return 'HIGH'

  if (direct > THRESHOLDS.MEDIUM_DIRECT || gaps > 0) return 'MEDIUM'

  return 'LOW'
}
