import { describe, it, expect } from 'vitest'
import type { CodeGraph, GraphNode } from '@stinkit/shared'
import type { EntityResolutionResult } from '../../../src/lib/ai/client'
import { compareToGraph } from '../../../src/vision/compare'

function makeGraph(nodeIds: string[], exported = true): CodeGraph {
  return {
    version: 1, createdAt: 0, repo_root: '/r', node_count: nodeIds.length,
    edge_count: 0, completeness_pct: 100,
    nodes: new Map(nodeIds.map(id => [id, { id, file: id.split('::')[0]!, name: id.split('::')[1]!, kind: 'function', line_start: 1, line_end: 2, language: 'typescript', is_exported: exported, resolution: 'static' } as GraphNode])),
    edges: [], languages: ['typescript'], git_available: false,
  }
}

function resolved(label: string, nodeId: string | null, conf = 0.8): EntityResolutionResult {
  return { diagram_label: label, matched_node_id: nodeId, confidence: conf }
}

describe('compareToGraph', () => {
  it('1 matched + 1 phantom + 1 missing exported node → accuracy_pct = 33', () => {
    const graph = makeGraph(['src/auth.ts::Auth', 'src/db.ts::Database'])
    // resolved: Auth→matched, Ghost→phantom; database is missing from diagram
    const r = [resolved('Auth', 'src/auth.ts::Auth'), resolved('Ghost', null)]
    const report = compareToGraph(r, graph)
    expect(report.accuracy_pct).toBe(33)
    expect(report.phantom_count).toBe(1)
    expect(report.missing_count).toBe(1)
  })

  it('all entities matched, no missing nodes → 100%', () => {
    const graph = makeGraph(['src/a.ts::A', 'src/b.ts::B'])
    const r = [resolved('A', 'src/a.ts::A'), resolved('B', 'src/b.ts::B')]
    const report = compareToGraph(r, graph)
    expect(report.accuracy_pct).toBe(100)
    expect(report.phantom_count).toBe(0)
    expect(report.missing_count).toBe(0)
  })

  it('all entities phantom (empty graph) → 0%', () => {
    const graph = makeGraph([])
    const r = [resolved('X', null), resolved('Y', null)]
    const report = compareToGraph(r, graph)
    expect(report.accuracy_pct).toBe(0)
  })

  it('no entities, no graph → 100% (nothing to drift)', () => {
    const report = compareToGraph([], makeGraph([]))
    expect(report.accuracy_pct).toBe(100)
  })

  it('non-exported graph nodes are not counted as missing', () => {
    const graph = makeGraph(['src/a.ts::A', 'src/internal.ts::helper'], false)
    const r = [resolved('A', 'src/a.ts::A')]
    const report = compareToGraph(r, graph)
    // helper is non-exported, should not count as missing
    expect(report.missing_count).toBe(0)
    expect(report.accuracy_pct).toBe(100)
  })

  it('entities_matched contains all resolved entities', () => {
    const graph = makeGraph(['src/a.ts::A'])
    const r = [resolved('A', 'src/a.ts::A'), resolved('Ghost', null)]
    const report = compareToGraph(r, graph)
    expect(report.entities_matched).toHaveLength(2)
    const phantom = report.entities_matched.find(e => e.code_node_id === null)
    expect(phantom?.resolution).toBe('unmatched')
    const matched = report.entities_matched.find(e => e.code_node_id !== null)
    expect(matched?.resolution).toBe('exact')
  })
})
