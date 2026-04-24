import { describe, it, expect } from 'vitest'
import type { NodeId } from '@codemind/shared'
import type { GitNodeHistory } from '../../../src/graph/git'
import { correlateIncidents, HIGH_CHURN_THRESHOLD } from '../../../src/analysis/incident'

function hist(id: string, count: number): [NodeId, GitNodeHistory] {
  return [id, { node_id: id, change_count_6mo: count, last_changed: 0, authors: ['Alice'] }]
}

describe('correlateIncidents', () => {
  it('returns false when history map is empty', () => {
    expect(correlateIncidents(['a.ts::A'], new Map())).toBe(false)
  })

  it('returns false when all nodes have low churn', () => {
    const history = new Map([hist('a.ts::A', 1), hist('b.ts::B', 2)])
    expect(correlateIncidents(['a.ts::A', 'b.ts::B'], history)).toBe(false)
  })

  it('returns true when a node has change_count_6mo > HIGH_CHURN_THRESHOLD', () => {
    const history = new Map([hist('a.ts::A', HIGH_CHURN_THRESHOLD + 1)])
    expect(correlateIncidents(['a.ts::A'], history)).toBe(true)
  })

  it('returns false when node is at exactly HIGH_CHURN_THRESHOLD (threshold is >)', () => {
    const history = new Map([hist('a.ts::A', HIGH_CHURN_THRESHOLD)])
    expect(correlateIncidents(['a.ts::A'], history)).toBe(false)
  })

  it('returns false for empty nodes list', () => {
    const history = new Map([hist('a.ts::A', 100)])
    expect(correlateIncidents([], history)).toBe(false)
  })

  it('returns true if ANY node exceeds threshold', () => {
    const history = new Map([hist('a.ts::A', 1), hist('b.ts::B', HIGH_CHURN_THRESHOLD + 1)])
    expect(correlateIncidents(['a.ts::A', 'b.ts::B'], history)).toBe(true)
  })

  it('exported HIGH_CHURN_THRESHOLD matches spec value of 3', () => {
    expect(HIGH_CHURN_THRESHOLD).toBe(3)
  })
})
