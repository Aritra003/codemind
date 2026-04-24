import { describe, it, expect } from 'vitest'
import type { CodeGraph, GraphNode } from '@codemind/shared'
import { findCodePaths } from '../../../src/forensics/backward'

function makeGraph(nodeIds: string[], edges: [string, string][]): CodeGraph {
  return {
    version: 1, createdAt: 0, repo_root: '/r', node_count: nodeIds.length, edge_count: edges.length,
    completeness_pct: 100,
    nodes: new Map(nodeIds.map(id => [id, { id, file: id.split('::')[0]!, name: id.split('::')[1]!, kind: 'function', line_start: 1, line_end: 2, language: 'typescript', is_exported: true, resolution: 'static' } as GraphNode])),
    edges: edges.map(([from, to]) => ({ from, to, kind: 'calls' as const, weight: 1 })),
    languages: ['typescript'], git_available: false,
  }
}

describe('findCodePaths', () => {
  it('returns [] when no path exists between symptom and changed', () => {
    const graph = makeGraph(['a.ts::A', 'b.ts::B'], [])
    expect(findCodePaths(graph, ['a.ts::A'], ['b.ts::B'])).toEqual([])
  })

  it('linear chain A→B→C: changed=[A], symptom=[C] → returns path [[A,B,C]]', () => {
    // A calls B, B calls C; A is changed, C has the symptom
    const graph = makeGraph(
      ['a.ts::A', 'b.ts::B', 'c.ts::C'],
      [['a.ts::A', 'b.ts::B'], ['b.ts::B', 'c.ts::C']]
    )
    const paths = findCodePaths(graph, ['a.ts::A'], ['c.ts::C'])
    expect(paths).toHaveLength(1)
    expect(paths[0]).toEqual(['a.ts::A', 'b.ts::B', 'c.ts::C'])
  })

  it('direct edge: changed=[A], symptom=[B], A calls B → returns [[A,B]]', () => {
    const graph = makeGraph(['a.ts::A', 'b.ts::B'], [['a.ts::A', 'b.ts::B']])
    const paths = findCodePaths(graph, ['a.ts::A'], ['b.ts::B'])
    expect(paths).toHaveLength(1)
    expect(paths[0]).toEqual(['a.ts::A', 'b.ts::B'])
  })

  it('cyclic graph terminates without infinite loop', () => {
    // A→B→A cycle
    const graph = makeGraph(
      ['a.ts::A', 'b.ts::B', 'c.ts::C'],
      [['a.ts::A', 'b.ts::B'], ['b.ts::B', 'a.ts::A'], ['a.ts::A', 'c.ts::C']]
    )
    expect(() => findCodePaths(graph, ['c.ts::C'], ['b.ts::B'])).not.toThrow()
  })

  it('returns empty array when symptomNodes is empty', () => {
    const graph = makeGraph(['a.ts::A'], [])
    expect(findCodePaths(graph, ['a.ts::A'], [])).toEqual([])
  })

  it('returns empty array when changedNodes is empty', () => {
    const graph = makeGraph(['a.ts::A'], [])
    expect(findCodePaths(graph, [], ['a.ts::A'])).toEqual([])
  })

  it('depth limit of 10 is respected (no deep paths)', () => {
    // Build a chain of 15 nodes; changed is node 0, symptom is node 14
    const nodeIds = Array.from({ length: 15 }, (_, i) => `n${i}.ts::n${i}`)
    const edges: [string, string][] = nodeIds.slice(0, -1).map((id, i) => [id, nodeIds[i + 1]!])
    const graph = makeGraph(nodeIds, edges)
    // Path length = 15 > depth limit 10, so should not find path
    const paths = findCodePaths(graph, [nodeIds[0]!], [nodeIds[14]!])
    expect(paths).toEqual([])
  })
})
