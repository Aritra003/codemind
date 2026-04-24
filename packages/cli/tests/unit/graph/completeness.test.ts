import { describe, it, expect } from 'vitest'
import { computeCompleteness } from '../../../src/graph/completeness'
import type { GraphEdge } from '@codemind/shared'

function edge(from: string, to: string, resolved: boolean): GraphEdge {
  return { from, to: resolved ? to : `UNRESOLVED::${to}`, kind: 'calls', weight: 1 }
}

describe('computeCompleteness', () => {
  it('returns 100% for empty edge list (vacuous truth)', () => {
    const r = computeCompleteness([])
    expect(r.completeness_pct).toBe(100)
    expect(r.total_calls).toBe(0)
    expect(r.unresolved_calls).toBe(0)
  })

  it('returns 100% when all call edges are resolved', () => {
    const edges = [edge('a', 'b', true), edge('b', 'c', true)]
    expect(computeCompleteness(edges).completeness_pct).toBe(100)
  })

  it('returns 0% when all call edges are unresolved', () => {
    const edges = [edge('a', 'x', false), edge('b', 'y', false)]
    expect(computeCompleteness(edges).completeness_pct).toBe(0)
  })

  it('computes partial completeness correctly', () => {
    const edges = [edge('a', 'b', true), edge('a', 'c', false)]
    const r = computeCompleteness(edges)
    expect(r.completeness_pct).toBe(50)
    expect(r.unresolved_calls).toBe(1)
    expect(r.total_calls).toBe(2)
  })

  it('ignores non-call edges (imports, extends) in calculation', () => {
    const edges: GraphEdge[] = [
      { from: 'a', to: 'b', kind: 'imports', weight: 1 },
      edge('a', 'c', false),
    ]
    const r = computeCompleteness(edges)
    expect(r.total_calls).toBe(1)
    expect(r.unresolved_calls).toBe(1)
  })

  it('completeness_pct is always a number between 0 and 100', () => {
    const r1 = computeCompleteness([])
    const r2 = computeCompleteness([edge('a', 'b', false)])
    expect(r1.completeness_pct).toBeGreaterThanOrEqual(0)
    expect(r1.completeness_pct).toBeLessThanOrEqual(100)
    expect(r2.completeness_pct).toBeGreaterThanOrEqual(0)
    expect(r2.completeness_pct).toBeLessThanOrEqual(100)
  })
})
