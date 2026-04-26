import { describe, it, expect } from 'vitest'
import type { CodeGraph, GraphNode, GraphEdge } from '@stinkit/shared'
import { computeBlastRadius } from '../../../src/analysis/blast-radius'

function makeGraph(nodes: string[], edges: [string, string][]): CodeGraph {
  const nodeMap = new Map<string, GraphNode>(
    nodes.map(id => [id, { id, file: id.split('::')[0]!, name: id.split('::')[1]!, kind: 'function', line_start: 1, line_end: 2, language: 'typescript', is_exported: false, resolution: 'static' }])
  )
  const edgeList: GraphEdge[] = edges.map(([from, to]) => ({ from, to, kind: 'calls', weight: 1 }))
  return { version: 1, createdAt: 0, repo_root: '/r', node_count: nodeMap.size, edge_count: edgeList.length, completeness_pct: 80, nodes: nodeMap, edges: edgeList, languages: ['typescript'], git_available: false }
}

describe('computeBlastRadius', () => {
  it('returns empty result for empty changed_nodes', () => {
    const graph = makeGraph(['a.ts::A', 'b.ts::B'], [['a.ts::A', 'b.ts::B']])
    const result = computeBlastRadius(graph, [])
    expect(result.changed_nodes).toEqual([])
    expect(result.direct_dependents).toEqual([])
    expect(result.transitive_dependents).toEqual([])
    expect(result.completeness_pct).toBe(80)
  })

  it('INV-002: completeness_pct always set from graph', () => {
    const graph = makeGraph(['a.ts::A'], [])
    const result = computeBlastRadius(graph, ['a.ts::A'])
    expect(result.completeness_pct).toBe(80)
  })

  it('single changed node with 2 direct dependents', () => {
    // X calls A, Y calls A — change A → X and Y are direct dependents
    const graph = makeGraph(
      ['a.ts::A', 'x.ts::X', 'y.ts::Y'],
      [['x.ts::X', 'a.ts::A'], ['y.ts::Y', 'a.ts::A']]
    )
    const result = computeBlastRadius(graph, ['a.ts::A'])
    expect(result.direct_dependents).toHaveLength(2)
    expect(result.direct_dependents).toContain('x.ts::X')
    expect(result.direct_dependents).toContain('y.ts::Y')
    expect(result.transitive_dependents).toHaveLength(0)
  })

  it('chain of 3: direct=[B], transitive=[A]', () => {
    // A calls B, B calls C — change C → B is direct, A is transitive
    const graph = makeGraph(
      ['a.ts::A', 'b.ts::B', 'c.ts::C'],
      [['a.ts::A', 'b.ts::B'], ['b.ts::B', 'c.ts::C']]
    )
    const result = computeBlastRadius(graph, ['c.ts::C'])
    expect(result.direct_dependents).toEqual(['b.ts::B'])
    expect(result.transitive_dependents).toEqual(['a.ts::A'])
  })

  it('changed node not in graph produces empty result', () => {
    const graph = makeGraph(['a.ts::A'], [])
    const result = computeBlastRadius(graph, ['missing.ts::X'])
    expect(result.direct_dependents).toHaveLength(0)
    expect(result.transitive_dependents).toHaveLength(0)
  })

  it('cyclic graph does not infinite loop', () => {
    // A calls B, B calls A (cycle)
    const graph = makeGraph(
      ['a.ts::A', 'b.ts::B'],
      [['a.ts::A', 'b.ts::B'], ['b.ts::B', 'a.ts::A']]
    )
    const result = computeBlastRadius(graph, ['a.ts::A'])
    expect(result.direct_dependents).toBeDefined()
  })

  it('changed node itself is not in dependents', () => {
    const graph = makeGraph(
      ['a.ts::A', 'b.ts::B'],
      [['b.ts::B', 'a.ts::A']]
    )
    const result = computeBlastRadius(graph, ['a.ts::A'])
    expect(result.direct_dependents).not.toContain('a.ts::A')
    expect(result.transitive_dependents).not.toContain('a.ts::A')
  })

  it('non-call edges are ignored for blast radius', () => {
    const graph = makeGraph(['a.ts::A', 'b.ts::B'], [])
    graph.edges.push({ from: 'b.ts::B', to: 'a.ts::A', kind: 'imports', weight: 1 })
    const result = computeBlastRadius(graph, ['a.ts::A'])
    expect(result.direct_dependents).toHaveLength(0)
  })
})
