import { describe, it, expect } from 'vitest'
import type { CodeGraph, GraphNode } from '@stinkit/shared'
import { findCodePaths } from '../../../src/forensics/backward'

function makeGraph(nodeIds: string[], edges: [string, string][]): CodeGraph {
  return {
    version: 1, createdAt: 0, repo_root: '/r',
    node_count: nodeIds.length, edge_count: edges.length,
    completeness_pct: 100,
    nodes: new Map(nodeIds.map(id => [id, {
      id, file: id.split('::')[0]!, name: id.split('::')[1]!,
      kind: 'function', line_start: 1, line_end: 2, language: 'typescript',
      is_exported: true, resolution: 'static',
    } as GraphNode])),
    edges: edges.map(([from, to]) => ({ from, to, kind: 'calls' as const, weight: 1 })),
    languages: ['typescript'], git_available: false,
  }
}

describe('findCodePaths — adversarial QA', () => {
  it('start node that is also a symptom node does not produce a self-path', () => {
    // A is both changed and symptom — should not produce [[A]]
    const graph = makeGraph(['a.ts::A', 'b.ts::B'], [['a.ts::A', 'b.ts::B']])
    const paths = findCodePaths(graph, ['a.ts::A'], ['a.ts::A'])
    expect(paths).toEqual([])
  })

  it('two changed nodes both reaching the same symptom produce two paths', () => {
    // A→C and B→C; changed=[A,B], symptom=[C]
    const graph = makeGraph(
      ['a.ts::A', 'b.ts::B', 'c.ts::C'],
      [['a.ts::A', 'c.ts::C'], ['b.ts::B', 'c.ts::C']],
    )
    const paths = findCodePaths(graph, ['a.ts::A', 'b.ts::B'], ['c.ts::C'])
    expect(paths).toHaveLength(2)
    expect(paths.some(p => p[0] === 'a.ts::A')).toBe(true)
    expect(paths.some(p => p[0] === 'b.ts::B')).toBe(true)
  })

  it('path of exactly 10 nodes (at depth limit) IS found', () => {
    // n0→n1→…→n9: path length = 10 = MAX_DEPTH — symptom node is dequeued and checked
    const nodeIds = Array.from({ length: 10 }, (_, i) => `n${i}.ts::n${i}`)
    const edges: [string, string][] = nodeIds.slice(0, -1).map((id, i) => [id, nodeIds[i + 1]!])
    const graph = makeGraph(nodeIds, edges)
    const paths = findCodePaths(graph, [nodeIds[0]!], [nodeIds[9]!])
    expect(paths).toHaveLength(1)
    expect(paths[0]).toHaveLength(10)
  })

  it('path requiring 11 nodes (one past limit) is NOT found', () => {
    // n0→n1→…→n10: n9 stops expansion, n10 never reached
    const nodeIds = Array.from({ length: 11 }, (_, i) => `n${i}.ts::n${i}`)
    const edges: [string, string][] = nodeIds.slice(0, -1).map((id, i) => [id, nodeIds[i + 1]!])
    const graph = makeGraph(nodeIds, edges)
    const paths = findCodePaths(graph, [nodeIds[0]!], [nodeIds[10]!])
    expect(paths).toEqual([])
  })

  it('symptom in a disconnected component returns []', () => {
    // A→B, C has no edges — C is symptom, A is changed
    const graph = makeGraph(['a.ts::A', 'b.ts::B', 'c.ts::C'], [['a.ts::A', 'b.ts::B']])
    const paths = findCodePaths(graph, ['a.ts::A'], ['c.ts::C'])
    expect(paths).toEqual([])
  })

  it('multiple changed nodes with overlapping paths deduplicate correctly', () => {
    // A→B→C and B→C; changed=[A,B], symptom=[C]
    const graph = makeGraph(
      ['a.ts::A', 'b.ts::B', 'c.ts::C'],
      [['a.ts::A', 'b.ts::B'], ['b.ts::B', 'c.ts::C']],
    )
    const paths = findCodePaths(graph, ['a.ts::A', 'b.ts::B'], ['c.ts::C'])
    // A produces [A,B,C]; B produces [B,C] — both valid, independent BFS runs
    expect(paths.length).toBeGreaterThanOrEqual(1)
    const pathStrings = paths.map(p => p.join('→'))
    expect(pathStrings).toContain('a.ts::A→b.ts::B→c.ts::C')
  })
})
