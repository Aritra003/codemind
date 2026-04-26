import { describe, it, expect } from 'vitest'
import type { NodeId } from '@stinkit/shared'
import type { NodeCoverage } from '../../../src/graph/coverage'
import { detectCoverageGaps } from '../../../src/analysis/coverage-gap'

function cov(id: string, covered: boolean): [NodeId, NodeCoverage] {
  return [id, { node_id: id, covered, format: 'lcov' }]
}

describe('detectCoverageGaps', () => {
  it('returns all nodes as gaps when coverage map is empty (conservative)', () => {
    const gaps = detectCoverageGaps(['a.ts::A', 'b.ts::B'], new Map())
    expect(gaps).toEqual(['a.ts::A', 'b.ts::B'])
  })

  it('returns empty array when affected nodes is empty', () => {
    const coverage = new Map([cov('a.ts::A', true)])
    expect(detectCoverageGaps([], coverage)).toEqual([])
  })

  it('returns only uncovered nodes', () => {
    const coverage = new Map([
      cov('a.ts::A', true),
      cov('b.ts::B', false),
      cov('c.ts::C', false),
    ])
    const gaps = detectCoverageGaps(['a.ts::A', 'b.ts::B', 'c.ts::C'], coverage)
    expect(gaps).not.toContain('a.ts::A')
    expect(gaps).toContain('b.ts::B')
    expect(gaps).toContain('c.ts::C')
  })

  it('nodes not present in coverage map are treated as gaps', () => {
    const coverage = new Map([cov('a.ts::A', true)])
    const gaps = detectCoverageGaps(['a.ts::A', 'missing.ts::fn'], coverage)
    expect(gaps).toContain('missing.ts::fn')
    expect(gaps).not.toContain('a.ts::A')
  })

  it('all covered → no gaps', () => {
    const coverage = new Map([cov('a.ts::A', true), cov('b.ts::B', true)])
    expect(detectCoverageGaps(['a.ts::A', 'b.ts::B'], coverage)).toHaveLength(0)
  })
})
