import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserConfig, CodeGraph, GraphNode } from '@stinkit/shared'
import type { DriftReport } from '../../../src/commands/see'

vi.mock('../../../src/lib/graph/store')
vi.mock('../../../src/lib/ai/client')
vi.mock('../../../src/lib/vision')
vi.mock('../../../src/vision/generate')

import { GraphStore }    from '../../../src/lib/graph/store'
import { AIClient }      from '../../../src/lib/ai/client'
import { VisionModule }  from '../../../src/lib/vision'
import { generateMermaid } from '../../../src/vision/generate'
import { runSeeCore, runSeeGenerateCore } from '../../../src/commands/see'

const WITH_KEY: UserConfig = {
  anthropic_api_key: 'test-key',
  telemetry: { enabled: false, install_id: 'test' },
  ai: { monthly_token_budget: 500_000, max_retries: 2 },
  limits: { ai_context_max_nodes: 200 },
}

const NO_KEY: UserConfig = {
  telemetry: { enabled: false, install_id: 'test' },
  ai: { monthly_token_budget: 500_000, max_retries: 2 },
  limits: { ai_context_max_nodes: 200 },
}

const OPTIONS         = { ui: false, json: false, report: false }
const GENERATE_OPTIONS = {}

function makeGraph(): CodeGraph {
  return {
    version: 1, createdAt: Date.now(), repo_root: '/repo', node_count: 5, edge_count: 10,
    completeness_pct: 90,
    nodes: new Map<string, GraphNode>(), edges: [], languages: ['typescript'], git_available: false,
  }
}

const DRIFT: DriftReport = {
  diagram_path: 'docs/arch.png', phantom_count: 1, missing_count: 2,
  accuracy_pct: 75, extraction_retries: 0, entities_matched: [],
}

describe('runSeeCore', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns failed GRAPH_NOT_FOUND when no graph exists', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(null),
    } as unknown as GraphStore))
    const result = await runSeeCore('docs/arch.png', OPTIONS, WITH_KEY)
    expect(result.status).toBe('failed')
    if (result.status === 'failed') expect(result.error.code).toBe('GRAPH_NOT_FOUND')
  })

  it('returns failed AI_UNAVAILABLE when no API key', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    const result = await runSeeCore('docs/arch.png', OPTIONS, NO_KEY)
    expect(result.status).toBe('failed')
    if (result.status === 'failed') expect(result.error.code).toBe('AI_UNAVAILABLE')
  })

  it('returns success with DriftReport when graph and key present', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(AIClient).mockImplementation(() => ({}) as unknown as AIClient)
    vi.mocked(VisionModule).mockImplementation(() => ({
      extractEntities: vi.fn().mockResolvedValue({ entities: [], confidence: 0.8, retries: 0, partial: false }),
      resolveEntities: vi.fn().mockResolvedValue([]),
      compareToGraph:  vi.fn().mockReturnValue(DRIFT),
    } as unknown as VisionModule))
    const result = await runSeeCore('docs/arch.png', OPTIONS, WITH_KEY)
    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.accuracy_pct).toBe(75)
      expect(result.data.phantom_count).toBe(1)
    }
  })

  it('meta.completeness_pct matches graph on success', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(AIClient).mockImplementation(() => ({}) as unknown as AIClient)
    vi.mocked(VisionModule).mockImplementation(() => ({
      extractEntities: vi.fn().mockResolvedValue({ entities: [], confidence: 0.8, retries: 0, partial: false }),
      resolveEntities: vi.fn().mockResolvedValue([]),
      compareToGraph:  vi.fn().mockReturnValue(DRIFT),
    } as unknown as VisionModule))
    const result = await runSeeCore('docs/arch.png', OPTIONS, WITH_KEY)
    expect(result.meta.completeness_pct).toBe(90)
  })
})

describe('runSeeGenerateCore', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns failed GRAPH_NOT_FOUND when no graph exists', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(null),
    } as unknown as GraphStore))
    const result = await runSeeGenerateCore(GENERATE_OPTIONS, WITH_KEY)
    expect(result.status).toBe('failed')
    if (result.status === 'failed') expect(result.error.code).toBe('GRAPH_NOT_FOUND')
  })

  it('succeeds without an API key (INV-GEN-02: no AI needed)', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(generateMermaid).mockReturnValue({
      diagram: 'graph LR', nodeCount: 0, edgeCount: 0,
    })
    const result = await runSeeGenerateCore(GENERATE_OPTIONS, NO_KEY)
    expect(result.status).toBe('success')
  })

  it('returns GenerateReport with diagram, nodeCount, edgeCount', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(generateMermaid).mockReturnValue({
      diagram: 'graph LR\n  subgraph src/a.ts\n    src_a_ts__foo["foo"]\n  end',
      nodeCount: 1,
      edgeCount: 0,
    })
    const result = await runSeeGenerateCore(GENERATE_OPTIONS, WITH_KEY)
    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.diagram).toContain('graph LR')
      expect(result.data.node_count).toBe(1)
      expect(result.data.edge_count).toBe(0)
    }
  })

  it('passes scope to generateMermaid when provided', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(generateMermaid).mockReturnValue({
      diagram: 'graph LR', nodeCount: 0, edgeCount: 0,
    })
    await runSeeGenerateCore({ scope: 'src/services/' }, WITH_KEY)
    expect(vi.mocked(generateMermaid)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ scope: 'src/services/' }),
    )
  })

  it('includes warning in result when generateMermaid returns one', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(generateMermaid).mockReturnValue({
      diagram: 'graph LR', nodeCount: 51, edgeCount: 0,
      warning: '51 nodes in scope — large diagrams may not render well in some tools.',
    })
    const result = await runSeeGenerateCore(GENERATE_OPTIONS, WITH_KEY)
    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.warning).toBeDefined()
    }
  })

  it('meta.completeness_pct matches graph', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(generateMermaid).mockReturnValue({
      diagram: 'graph LR', nodeCount: 0, edgeCount: 0,
    })
    const result = await runSeeGenerateCore(GENERATE_OPTIONS, WITH_KEY)
    expect(result.meta.completeness_pct).toBe(90)
  })
})
