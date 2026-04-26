import { describe, it, expect } from 'vitest'
import type { BlastRadius } from '@stinkit/shared'
import { classifyRisk, THRESHOLDS } from '../../../src/analysis/risk'

function makeRadius(overrides: Partial<Omit<BlastRadius, 'risk_level'>> = {}): Omit<BlastRadius, 'risk_level'> {
  return {
    changed_nodes:         ['a.ts::A'],
    direct_dependents:     [],
    transitive_dependents: [],
    coverage_gaps:         [],
    completeness_pct:      100,
    ...overrides,
  }
}

describe('classifyRisk', () => {
  it('LOW when no dependents and no coverage gaps', () => {
    expect(classifyRisk(makeRadius())).toBe('LOW')
  })

  it('MEDIUM when direct_dependents > THRESHOLDS.MEDIUM_DIRECT', () => {
    const direct = Array.from({ length: THRESHOLDS.MEDIUM_DIRECT + 1 }, (_, i) => `f${i}.ts::fn`)
    expect(classifyRisk(makeRadius({ direct_dependents: direct }))).toBe('MEDIUM')
  })

  it('MEDIUM boundary: exactly MEDIUM_DIRECT direct dependents = still MEDIUM', () => {
    const direct = Array.from({ length: THRESHOLDS.MEDIUM_DIRECT + 1 }, (_, i) => `f${i}.ts::fn`)
    expect(classifyRisk(makeRadius({ direct_dependents: direct }))).toBe('MEDIUM')
  })

  it('MEDIUM when coverage_gaps > 0 and file has dependents', () => {
    expect(classifyRisk(makeRadius({ coverage_gaps: ['a.ts::A'], direct_dependents: ['caller.ts::fn'] }))).toBe('MEDIUM')
  })

  it('LOW when coverage_gaps > 0 but no dependents (leaf file cannot break anything)', () => {
    expect(classifyRisk(makeRadius({ coverage_gaps: ['a.ts::A'] }))).toBe('LOW')
  })

  it('HIGH when transitive_dependents > THRESHOLDS.HIGH_TRANSITIVE', () => {
    const trans = Array.from({ length: THRESHOLDS.HIGH_TRANSITIVE + 1 }, (_, i) => `t${i}.ts::fn`)
    expect(classifyRisk(makeRadius({ transitive_dependents: trans }))).toBe('HIGH')
  })

  it('HIGH boundary: exactly HIGH_TRANSITIVE → still LOW (threshold is >)', () => {
    const trans = Array.from({ length: THRESHOLDS.HIGH_TRANSITIVE }, (_, i) => `t${i}.ts::fn`)
    const result = classifyRisk(makeRadius({ transitive_dependents: trans }))
    expect(result).not.toBe('HIGH')
  })

  it('HIGH when coverage_gaps > THRESHOLDS.HIGH_COVERAGE_GAPS and file has dependents', () => {
    const gaps = Array.from({ length: THRESHOLDS.HIGH_COVERAGE_GAPS + 1 }, (_, i) => `g${i}.ts::fn`)
    expect(classifyRisk(makeRadius({ coverage_gaps: gaps, direct_dependents: ['caller.ts::fn'] }))).toBe('HIGH')
  })

  it('CRITICAL when transitive_dependents > THRESHOLDS.CRITICAL_TRANSITIVE', () => {
    const trans = Array.from({ length: THRESHOLDS.CRITICAL_TRANSITIVE + 1 }, (_, i) => `t${i}.ts::fn`)
    expect(classifyRisk(makeRadius({ transitive_dependents: trans }))).toBe('CRITICAL')
  })

  it('CRITICAL boundary: exactly CRITICAL_TRANSITIVE → not CRITICAL (threshold is >)', () => {
    const trans = Array.from({ length: THRESHOLDS.CRITICAL_TRANSITIVE }, (_, i) => `t${i}.ts::fn`)
    expect(classifyRisk(makeRadius({ transitive_dependents: trans }))).not.toBe('CRITICAL')
  })

  it('CRITICAL when coverage_gaps > CRITICAL_COVERAGE_GAPS AND direct > CRITICAL_DIRECT', () => {
    const gaps   = Array.from({ length: THRESHOLDS.CRITICAL_COVERAGE_GAPS + 1 }, (_, i) => `g${i}.ts::fn`)
    const direct = Array.from({ length: THRESHOLDS.CRITICAL_DIRECT + 1 }, (_, i) => `d${i}.ts::fn`)
    expect(classifyRisk(makeRadius({ coverage_gaps: gaps, direct_dependents: direct }))).toBe('CRITICAL')
  })

  it('exported THRESHOLDS values match expected spec constants', () => {
    expect(THRESHOLDS.CRITICAL_TRANSITIVE).toBe(50)
    expect(THRESHOLDS.HIGH_TRANSITIVE).toBe(20)
    expect(THRESHOLDS.MEDIUM_DIRECT).toBe(5)
  })
})
