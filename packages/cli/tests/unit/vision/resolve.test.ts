import { describe, it, expect, vi } from 'vitest'
import type { CodeGraph, GraphNode } from '@codemind/shared'
import type { AIClient, DiagramExtractionResult } from '../../../src/lib/ai/client'
import { resolveEntities } from '../../../src/vision/resolve'

function makeGraph(nodeIds: string[]): CodeGraph {
  return {
    version: 1, createdAt: 0, repo_root: '/r', node_count: nodeIds.length,
    edge_count: 0, completeness_pct: 100,
    nodes: new Map(nodeIds.map(id => [id, { id, file: id.split('::')[0]!, name: id.split('::')[1]!, kind: 'function', line_start: 1, line_end: 2, language: 'typescript', is_exported: true, resolution: 'static' } as GraphNode])),
    edges: [], languages: ['typescript'], git_available: false,
  }
}

function makeAI(results: { diagram_label: string; matched_node_id: string | null; confidence: number }[]): AIClient {
  return {
    resolveEntityNames: vi.fn().mockResolvedValue(results),
    extractDiagramEntities: vi.fn(), analyzeBlastRadius: vi.fn(),
    narrateTrace: vi.fn(), triageError: vi.fn(),
  } as unknown as AIClient
}

const extracted: DiagramExtractionResult = {
  entities: ['Auth', 'Database', 'Cache'], confidence: 0.8, retries: 0, partial: false,
}

describe('resolveEntities', () => {
  it('returns empty array for empty extracted entities', async () => {
    const ai = makeAI([])
    const graph = makeGraph([])
    const empty: DiagramExtractionResult = { ...extracted, entities: [] }
    const result = await resolveEntities(ai, empty, graph)
    expect(result).toEqual([])
    expect(ai.resolveEntityNames).not.toHaveBeenCalled()
  })

  it('returns one result per extracted entity', async () => {
    const ai = makeAI([
      { diagram_label: 'Auth', matched_node_id: 'src/auth.ts::Auth', confidence: 0.9 },
      { diagram_label: 'Database', matched_node_id: null, confidence: 0.4 },
      { diagram_label: 'Cache', matched_node_id: 'src/cache.ts::Cache', confidence: 0.85 },
    ])
    const graph = makeGraph(['src/auth.ts::Auth', 'src/cache.ts::Cache'])
    const results = await resolveEntities(ai, extracted, graph)
    expect(results).toHaveLength(3)
  })

  it('INV-004: caps confidence at 0.8 on all results', async () => {
    const ai = makeAI([
      { diagram_label: 'Auth', matched_node_id: 'a.ts::Auth', confidence: 0.95 },
      { diagram_label: 'DB', matched_node_id: null, confidence: 0.99 },
    ])
    const graph = makeGraph(['a.ts::Auth'])
    const ext: DiagramExtractionResult = { ...extracted, entities: ['Auth', 'DB'] }
    const results = await resolveEntities(ai, ext, graph)
    for (const r of results) {
      expect(r.confidence).toBeLessThanOrEqual(0.8)
    }
  })

  it('passes node names from graph to AI', async () => {
    const ai = makeAI([{ diagram_label: 'Auth', matched_node_id: 'src/auth.ts::Auth', confidence: 0.8 }])
    const graph = makeGraph(['src/auth.ts::Auth', 'src/db.ts::Database'])
    const ext: DiagramExtractionResult = { ...extracted, entities: ['Auth'] }
    await resolveEntities(ai, ext, graph)
    const call = vi.mocked(ai.resolveEntityNames).mock.calls[0]!
    expect(call[1]).toContain('Auth')
    expect(call[1]).toContain('Database')
  })
})
