import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserConfig } from '@codemind/shared'

vi.mock('../../../../src/lib/graph/store')

import { GraphStore } from '../../../../src/lib/graph/store'
import { handle, TOOL_DEF } from '../../../../src/lib/mcp/tools/status'

const CONFIG: UserConfig = {
  telemetry: { enabled: false, install_id: 'test' },
  ai: { monthly_token_budget: 500_000, max_retries: 2 },
  limits: { ai_context_max_nodes: 200 },
}

describe('TOOL_DEF', () => {
  it('name is codemind_status', () => {
    expect(TOOL_DEF.name).toBe('codemind_status')
  })
})

describe('handle (codemind_status)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns content with type=text', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      exists:  vi.fn().mockResolvedValue(true),
      ageMs:   vi.fn().mockResolvedValue(7_200_000),
      load:    vi.fn().mockResolvedValue({ completeness_pct: 95 }),
    } as unknown as GraphStore))
    const result = await handle({}, CONFIG)
    expect(result.content[0]!.type).toBe('text')
  })

  it('text is parseable JSON', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      exists:  vi.fn().mockResolvedValue(true),
      ageMs:   vi.fn().mockResolvedValue(7_200_000),
      load:    vi.fn().mockResolvedValue({ completeness_pct: 95 }),
    } as unknown as GraphStore))
    const result = await handle({}, CONFIG)
    expect(() => JSON.parse(result.content[0]!.text)).not.toThrow()
  })

  it('graph_available is true when graph exists', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      exists:  vi.fn().mockResolvedValue(true),
      ageMs:   vi.fn().mockResolvedValue(7_200_000),
      load:    vi.fn().mockResolvedValue({ completeness_pct: 95 }),
    } as unknown as GraphStore))
    const result = await handle({}, CONFIG)
    const data = JSON.parse(result.content[0]!.text) as { graph_available: boolean }
    expect(data.graph_available).toBe(true)
  })

  it('graph_available is false when graph does not exist', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      exists:  vi.fn().mockResolvedValue(false),
      ageMs:   vi.fn().mockResolvedValue(null),
      load:    vi.fn().mockResolvedValue(null),
    } as unknown as GraphStore))
    const result = await handle({}, CONFIG)
    const data = JSON.parse(result.content[0]!.text) as { graph_available: boolean }
    expect(data.graph_available).toBe(false)
  })

  it('returns graph_age_ms', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      exists:  vi.fn().mockResolvedValue(true),
      ageMs:   vi.fn().mockResolvedValue(7_200_000),
      load:    vi.fn().mockResolvedValue({ completeness_pct: 95 }),
    } as unknown as GraphStore))
    const result = await handle({}, CONFIG)
    const data = JSON.parse(result.content[0]!.text) as { graph_age_ms: number }
    expect(data.graph_age_ms).toBe(7_200_000)
  })

  it('returns version string', async () => {
    vi.mocked(GraphStore).mockImplementation(() => ({
      exists:  vi.fn().mockResolvedValue(true),
      ageMs:   vi.fn().mockResolvedValue(1000),
      load:    vi.fn().mockResolvedValue({ completeness_pct: 90 }),
    } as unknown as GraphStore))
    const result = await handle({}, CONFIG)
    const data = JSON.parse(result.content[0]!.text) as { version: string }
    expect(typeof data.version).toBe('string')
    expect(data.version.length).toBeGreaterThan(0)
  })
})
