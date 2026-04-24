import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserConfig, CodeGraph, GraphNode } from '@codemind/shared'

vi.mock('../../../../src/lib/graph/store')

import { GraphStore } from '../../../../src/lib/graph/store'
import { handle, TOOL_DEF } from '../../../../src/lib/mcp/tools/graph'

const CONFIG: UserConfig = {
  telemetry: { enabled: false, install_id: 'test' },
  ai: { monthly_token_budget: 500_000, max_retries: 2 },
  limits: { ai_context_max_nodes: 200 },
}

function makeGraph(): CodeGraph {
  return {
    version: 1, createdAt: Date.now() - 3_600_000, repo_root: '/repo',
    node_count: 42, edge_count: 120,
    completeness_pct: 95,
    nodes: new Map<string, GraphNode>(),
    edges: [],
    languages: ['typescript'],
    git_available: true,
  }
}

describe('TOOL_DEF', () => {
  it('name is codemind_graph', () => {
    expect(TOOL_DEF.name).toBe('codemind_graph')
  })
})

describe('handle (codemind_graph)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns content with type=text', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
      ageMs: vi.fn().mockResolvedValue(3_600_000),
    } as unknown as GraphStore))
    const result = await handle({}, CONFIG)
    expect(result.content[0]!.type).toBe('text')
  })

  it('text is parseable JSON when graph exists', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
      ageMs: vi.fn().mockResolvedValue(3_600_000),
    } as unknown as GraphStore))
    const result = await handle({}, CONFIG)
    expect(() => JSON.parse(result.content[0]!.text)).not.toThrow()
  })

  it('JSON includes node_count', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
      ageMs: vi.fn().mockResolvedValue(3_600_000),
    } as unknown as GraphStore))
    const result = await handle({}, CONFIG)
    const data = JSON.parse(result.content[0]!.text) as { node_count: number }
    expect(data.node_count).toBe(42)
  })

  it('JSON includes languages', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(makeGraph()),
      ageMs: vi.fn().mockResolvedValue(3_600_000),
    } as unknown as GraphStore))
    const result = await handle({}, CONFIG)
    const data = JSON.parse(result.content[0]!.text) as { languages: string[] }
    expect(data.languages).toContain('typescript')
  })

  it('returns no-graph message when graph is null', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      load: vi.fn().mockResolvedValue(null),
      ageMs: vi.fn().mockResolvedValue(null),
    } as unknown as GraphStore))
    const result = await handle({}, CONFIG)
    expect(result.content[0]!.text).toContain('codemind index')
  })
})
