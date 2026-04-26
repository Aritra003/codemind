import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserConfig, CodeGraph, GraphNode } from '@stinkit/shared'
import type { ForensicsTrace } from '../../../src/commands/trace'

vi.mock('../../../src/lib/graph/store')
vi.mock('../../../src/lib/ai/client')
vi.mock('../../../src/lib/forensics')

import { GraphStore }     from '../../../src/lib/graph/store'
import { AIClient }       from '../../../src/lib/ai/client'
import { ForensicsModule } from '../../../src/lib/forensics'
import { runTraceCore }   from '../../../src/commands/trace'

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

const OPTIONS = { narrative: false, lookback: 90, json: false, report: false }

function makeGraph(): CodeGraph {
  return {
    version: 1, createdAt: Date.now(), repo_root: '/repo', node_count: 8, edge_count: 15,
    completeness_pct: 88,
    nodes: new Map<string, GraphNode>(), edges: [], languages: ['typescript'], git_available: false,
  }
}

const TRACE: ForensicsTrace = {
  origin_classification: 'SINGLE_COMMIT',
  ranked_commits: [{ hash: 'abc', author: 'Alice', date: '2024-01-01', message: 'fix', score: 0.8, changed_nodes: [] }],
  code_paths:    [],
  confidence_cap: 0.8,
  completeness_pct: 88,
}

describe('runTraceCore', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns failed GRAPH_NOT_FOUND when no graph exists', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(null),
    } as unknown as GraphStore))
    const result = await runTraceCore('TypeError: null', OPTIONS, WITH_KEY)
    expect(result.status).toBe('failed')
    if (result.status === 'failed') expect(result.error.code).toBe('GRAPH_NOT_FOUND')
  })

  it('returns failed AI_UNAVAILABLE when no API key', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    const result = await runTraceCore('TypeError: null', OPTIONS, NO_KEY)
    expect(result.status).toBe('failed')
    if (result.status === 'failed') expect(result.error.code).toBe('AI_UNAVAILABLE')
  })

  it('returns success with ForensicsTrace when graph and key present', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(AIClient).mockImplementation(() => ({}) as unknown as AIClient)
    vi.mocked(ForensicsModule).mockImplementation(() => ({
      assemble: vi.fn().mockResolvedValue(TRACE),
    } as unknown as ForensicsModule))
    const result = await runTraceCore('TypeError: null', OPTIONS, WITH_KEY)
    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.confidence_cap).toBe(0.8)
      expect(result.data.origin_classification).toBe('SINGLE_COMMIT')
    }
  })

  it('meta.completeness_pct matches graph on success', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(AIClient).mockImplementation(() => ({}) as unknown as AIClient)
    vi.mocked(ForensicsModule).mockImplementation(() => ({
      assemble: vi.fn().mockResolvedValue(TRACE),
    } as unknown as ForensicsModule))
    const result = await runTraceCore('TypeError: null', OPTIONS, WITH_KEY)
    expect(result.meta.completeness_pct).toBe(88)
  })

  it('passes errorInput and options to ForensicsModule.assemble', async () => {
    const mockAssemble = vi.fn().mockResolvedValue(TRACE)
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
    } as unknown as GraphStore))
    vi.mocked(AIClient).mockImplementation(() => ({}) as unknown as AIClient)
    vi.mocked(ForensicsModule).mockImplementation(() => ({
      assemble: mockAssemble,
    } as unknown as ForensicsModule))
    await runTraceCore('my error text', { ...OPTIONS, narrative: true, lookback: 30 }, WITH_KEY)
    expect(mockAssemble).toHaveBeenCalledWith('my error text', 30, true)
  })
})
