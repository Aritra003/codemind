import { describe, it, expect } from 'vitest'
import type { CodeGraph, GraphNode } from '@stinkit/shared'
import { GraphTraversal } from '../../../src/lib/graph/traversal'

function makeGraph(nodeIds: string[], edges: [string, string][]): CodeGraph {
  return {
    version: 1, createdAt: 0, repo_root: '/r',
    node_count: nodeIds.length, edge_count: edges.length,
    completeness_pct: 80,
    nodes: new Map(nodeIds.map(id => [id, {
      id, file: id.split('::')[0]!, name: id.split('::')[1]!,
      kind: 'function', line_start: 1, line_end: 2,
      language: 'typescript', is_exported: false, resolution: 'static',
    } as GraphNode])),
    edges: edges.map(([from, to]) => ({ from, to, kind: 'calls' as const, weight: 1 })),
    languages: ['typescript'], git_available: false,
  }
}

describe('GraphTraversal.computeBlastRadius', () => {
  it('empty changedNodes returns empty result', () => {
    const graph = makeGraph(['a.ts::A', 'b.ts::B'], [['a.ts::A', 'b.ts::B']])
    const r = new GraphTraversal(graph).computeBlastRadius([])
    expect(r.changed_nodes).toEqual([])
    expect(r.direct_dependents).toEqual([])
    expect(r.transitive_dependents).toEqual([])
  })

  it('direct dependent: X calls A → change A → X is direct', () => {
    const graph = makeGraph(['a.ts::A', 'x.ts::X'], [['x.ts::X', 'a.ts::A']])
    const r = new GraphTraversal(graph).computeBlastRadius(['a.ts::A'])
    expect(r.direct_dependents).toContain('x.ts::X')
    expect(r.transitive_dependents).toHaveLength(0)
  })

  it('chain A→B→C: change C → B direct, A transitive', () => {
    const graph = makeGraph(
      ['a.ts::A', 'b.ts::B', 'c.ts::C'],
      [['a.ts::A', 'b.ts::B'], ['b.ts::B', 'c.ts::C']],
    )
    const r = new GraphTraversal(graph).computeBlastRadius(['c.ts::C'])
    expect(r.direct_dependents).toContain('b.ts::B')
    expect(r.transitive_dependents).toContain('a.ts::A')
  })

  it('cyclic graph does not infinite loop', () => {
    const graph = makeGraph(['a.ts::A', 'b.ts::B'], [['a.ts::A', 'b.ts::B'], ['b.ts::B', 'a.ts::A']])
    expect(() => new GraphTraversal(graph).computeBlastRadius(['a.ts::A'])).not.toThrow()
  })

  it('completeness_pct comes from graph', () => {
    const graph = makeGraph(['a.ts::A'], [])
    const r = new GraphTraversal(graph).computeBlastRadius(['a.ts::A'])
    expect(r.completeness_pct).toBe(80)
  })

  it('risk_level is classified (not UNKNOWN)', () => {
    const graph = makeGraph(['a.ts::A'], [])
    const r = new GraphTraversal(graph).computeBlastRadius(['a.ts::A'])
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN']).toContain(r.risk_level)
    expect(r.risk_level).toBe('LOW')
  })
})

describe('GraphTraversal.subgraph', () => {
  it('depth 0 returns only the focus node', () => {
    const graph = makeGraph(['a.ts::A', 'b.ts::B'], [['a.ts::A', 'b.ts::B']])
    const sub = new GraphTraversal(graph).subgraph('a.ts::A', 0)
    expect(sub.nodes.size).toBe(1)
    expect(sub.nodes.has('a.ts::A')).toBe(true)
  })

  it('depth 1 includes direct forward and reverse neighbors', () => {
    // A→B→C; focus=B, depth=1 → should include A, B, C
    const graph = makeGraph(
      ['a.ts::A', 'b.ts::B', 'c.ts::C'],
      [['a.ts::A', 'b.ts::B'], ['b.ts::B', 'c.ts::C']],
    )
    const sub = new GraphTraversal(graph).subgraph('b.ts::B', 1)
    expect(sub.nodes.has('b.ts::B')).toBe(true)
    expect(sub.nodes.has('a.ts::A')).toBe(true)
    expect(sub.nodes.has('c.ts::C')).toBe(true)
  })

  it('unknown focusNode returns empty subgraph', () => {
    const graph = makeGraph(['a.ts::A'], [])
    const sub = new GraphTraversal(graph).subgraph('missing.ts::X', 2)
    expect(sub.nodes.size).toBe(0)
  })

  it('returned subgraph has consistent edge count', () => {
    const graph = makeGraph(
      ['a.ts::A', 'b.ts::B', 'c.ts::C'],
      [['a.ts::A', 'b.ts::B'], ['b.ts::B', 'c.ts::C']],
    )
    const sub = new GraphTraversal(graph).subgraph('b.ts::B', 1)
    for (const edge of sub.edges) {
      expect(sub.nodes.has(edge.from)).toBe(true)
      expect(sub.nodes.has(edge.to)).toBe(true)
    }
  })
})

describe('GraphTraversal.hotspots', () => {
  it('returns empty array for graph with no edges', () => {
    const graph = makeGraph(['a.ts::A', 'b.ts::B'], [])
    const spots = new GraphTraversal(graph).hotspots(10)
    expect(spots.every(s => s.dependents === 0)).toBe(true)
  })

  it('node with more dependents ranks higher', () => {
    // X→A, Y→A, Z→B → A has 2 dependents, B has 1
    const graph = makeGraph(
      ['a.ts::A', 'b.ts::B', 'x.ts::X', 'y.ts::Y', 'z.ts::Z'],
      [['x.ts::X', 'a.ts::A'], ['y.ts::Y', 'a.ts::A'], ['z.ts::Z', 'b.ts::B']],
    )
    const spots = new GraphTraversal(graph).hotspots(5)
    expect(spots[0]!.node).toBe('a.ts::A')
    expect(spots[0]!.dependents).toBe(2)
  })

  it('topN limits results', () => {
    const nodeIds = Array.from({ length: 10 }, (_, i) => `n${i}.ts::n${i}`)
    const edges: [string, string][] = nodeIds.slice(1).map(id => [id, nodeIds[0]!])
    const graph = makeGraph(nodeIds, edges)
    expect(new GraphTraversal(graph).hotspots(3)).toHaveLength(3)
  })

  it('hotspots are sorted descending by dependents', () => {
    const graph = makeGraph(
      ['a.ts::A', 'b.ts::B', 'x.ts::X', 'y.ts::Y'],
      [['x.ts::X', 'a.ts::A'], ['y.ts::Y', 'a.ts::A'], ['x.ts::X', 'b.ts::B']],
    )
    const spots = new GraphTraversal(graph).hotspots(10)
    for (let i = 0; i < spots.length - 1; i++) {
      expect(spots[i]!.dependents).toBeGreaterThanOrEqual(spots[i + 1]!.dependents)
    }
  })
})
