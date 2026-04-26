import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserConfig, BlastRadius, CodeGraph, GraphNode } from '@stinkit/shared'

vi.mock('../../../src/lib/graph/store')
vi.mock('../../../src/lib/analysis')

import { GraphStore }    from '../../../src/lib/graph/store'
import { AnalysisModule } from '../../../src/lib/analysis'
import { runCheckCore }  from '../../../src/commands/check'

const CONFIG: UserConfig = {
  telemetry: { enabled: false, install_id: 'test' },
  ai: { monthly_token_budget: 500_000, max_retries: 2 },
  limits: { ai_context_max_nodes: 200 },
}

const OPTIONS = { think: false, report: false, json: false, verbose: false, estimateCost: false }

function makeGraph(): CodeGraph {
  return {
    version: 1, createdAt: Date.now(), repo_root: '/repo', node_count: 10, edge_count: 20,
    completeness_pct: 95,
    nodes: new Map<string, GraphNode>(), edges: [], languages: ['typescript'], git_available: false,
  }
}

const BLAST: BlastRadius = {
  changed_nodes: ['src/a.ts::fn'], direct_dependents: ['src/b.ts::fn'],
  transitive_dependents: [], risk_level: 'MEDIUM', coverage_gaps: [], completeness_pct: 95,
}

describe('runCheckCore', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns failed GRAPH_NOT_FOUND when no graph exists', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(null),
    } as unknown as GraphStore))
    const result = await runCheckCore([], OPTIONS, CONFIG)
    expect(result.status).toBe('failed')
    if (result.status === 'failed') {
      expect(result.error.code).toBe('GRAPH_NOT_FOUND')
    }
  })

  it('returns success with BlastRadius when graph exists', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(AnalysisModule).mockImplementation(() => ({
      computeBlastRadius:   vi.fn().mockResolvedValue(BLAST),
      resolveFilesToNodes:  vi.fn().mockReturnValue([]),
    } as unknown as AnalysisModule))
    const result = await runCheckCore([], OPTIONS, CONFIG)
    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.risk_level).toBe('MEDIUM')
    }
  })

  it('meta.completeness_pct matches the graph', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(AnalysisModule).mockImplementation(() => ({
      computeBlastRadius:  vi.fn().mockResolvedValue(BLAST),
      resolveFilesToNodes: vi.fn().mockReturnValue([]),
    } as unknown as AnalysisModule))
    const result = await runCheckCore([], OPTIONS, CONFIG)
    expect(result.meta.completeness_pct).toBe(95)
  })

  it('passes changedFiles to AnalysisModule.computeBlastRadius', async () => {
    const mockCompute = vi.fn().mockResolvedValue(BLAST)
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(AnalysisModule).mockImplementation(() => ({
      computeBlastRadius:  mockCompute,
      resolveFilesToNodes: vi.fn().mockReturnValue([]),
    } as unknown as AnalysisModule))
    await runCheckCore(['src/auth.ts'], OPTIONS, CONFIG)
    expect(mockCompute).toHaveBeenCalledWith(['src/auth.ts'], expect.any(String))
  })

  it('result data is null for failed result', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(null),
    } as unknown as GraphStore))
    const result = await runCheckCore([], OPTIONS, CONFIG)
    expect(result.data).toBeNull()
  })
})
