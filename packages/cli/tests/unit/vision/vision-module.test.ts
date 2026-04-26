import { describe, it, expect, vi } from 'vitest'
import type { CodeGraph } from '@stinkit/shared'
import type { AIClient, DiagramExtractionResult, EntityResolutionResult } from '../../../src/lib/ai/client'
import { VisionModule } from '../../../src/lib/vision/vision-module'

vi.mock('../../../src/vision/extract', () => ({
  extractDiagramEntities: vi.fn().mockResolvedValue({
    entities: ['Auth'], confidence: 0.8, retries: 0, partial: false,
  }),
}))
vi.mock('../../../src/vision/resolve', () => ({
  resolveEntities: vi.fn().mockResolvedValue([
    { diagram_label: 'Auth', matched_node_id: 'src/auth.ts::Auth', confidence: 0.8 },
  ]),
}))
vi.mock('../../../src/vision/compare', () => ({
  compareToGraph: vi.fn().mockReturnValue({
    diagram_path: '', phantom_count: 0, missing_count: 0, accuracy_pct: 100,
    extraction_retries: 0, entities_matched: [],
  }),
}))

const mockAI: AIClient = {
  extractDiagramEntities: vi.fn(), resolveEntityNames: vi.fn(),
  analyzeBlastRadius: vi.fn(), narrateTrace: vi.fn(), triageError: vi.fn(),
} as unknown as AIClient

const mockGraph: CodeGraph = {
  version: 1, createdAt: 0, repo_root: '/r', node_count: 0, edge_count: 0,
  completeness_pct: 100, nodes: new Map(), edges: [], languages: [], git_available: false,
}

describe('VisionModule', () => {
  it('extractEntities delegates to extract.ts', async () => {
    const mod = new VisionModule(mockAI)
    const result = await mod.extractEntities('diagram.png')
    const { extractDiagramEntities } = await import('../../../src/vision/extract')
    expect(vi.mocked(extractDiagramEntities)).toHaveBeenCalledWith(mockAI, 'diagram.png')
    expect(result.entities).toContain('Auth')
  })

  it('resolveEntities delegates to resolve.ts', async () => {
    const extracted: DiagramExtractionResult = { entities: ['Auth'], confidence: 0.8, retries: 0, partial: false }
    const mod = new VisionModule(mockAI)
    const results = await mod.resolveEntities(extracted, mockGraph)
    const { resolveEntities } = await import('../../../src/vision/resolve')
    expect(vi.mocked(resolveEntities)).toHaveBeenCalledWith(mockAI, extracted, mockGraph)
    expect(results).toHaveLength(1)
  })

  it('compareToGraph delegates to compare.ts', () => {
    const resolved: EntityResolutionResult[] = [{ diagram_label: 'Auth', matched_node_id: 'src/auth.ts::Auth', confidence: 0.8 }]
    const mod = new VisionModule(mockAI)
    const report = mod.compareToGraph(resolved, mockGraph)
    expect(report.accuracy_pct).toBe(100)
  })
})
