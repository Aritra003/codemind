import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserConfig, CodemindResult } from '@codemind/shared'
import type { ForensicsTrace } from '../../../../src/commands/trace'

vi.mock('../../../../src/commands/trace')

import * as traceCmd from '../../../../src/commands/trace'
import { handle, TOOL_DEF } from '../../../../src/lib/mcp/tools/trace'

const CONFIG: UserConfig = {
  telemetry: { enabled: false, install_id: 'test' },
  ai: { monthly_token_budget: 500_000, max_retries: 2 },
  limits: { ai_context_max_nodes: 200 },
}

const META = { completeness_pct: 95, duration_ms: 30 }

const TRACE: ForensicsTrace = {
  origin_classification: 'SINGLE_COMMIT',
  ranked_commits: [{ hash: 'abc123', author: 'Alice', date: '2024-01-01', message: 'fix', score: 0.9, changed_nodes: [] }],
  code_paths:    [],
  confidence_cap: 0.8,
  completeness_pct: 95,
}

describe('TOOL_DEF', () => {
  it('name is codemind_trace', () => {
    expect(TOOL_DEF.name).toBe('codemind_trace')
  })

  it('error is a required param', () => {
    expect(TOOL_DEF.inputSchema.required).toContain('error')
  })
})

describe('handle (codemind_trace)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns content array with type=text on success', async () => {
    vi.mocked(traceCmd.runTraceCore).mockResolvedValue({ status: 'success', data: TRACE, meta: META })
    const result = await handle({ error: 'TypeError: null' }, CONFIG)
    expect(result.content[0]!.type).toBe('text')
  })

  it('text includes origin classification on success', async () => {
    vi.mocked(traceCmd.runTraceCore).mockResolvedValue({ status: 'success', data: TRACE, meta: META })
    const result = await handle({ error: 'TypeError: null' }, CONFIG)
    expect(result.content[0]!.text).toContain('SINGLE_COMMIT')
  })

  it('passes error string to runTraceCore', async () => {
    vi.mocked(traceCmd.runTraceCore).mockResolvedValue({ status: 'success', data: TRACE, meta: META })
    await handle({ error: 'my error text' }, CONFIG)
    expect(traceCmd.runTraceCore).toHaveBeenCalledWith('my error text', expect.any(Object), CONFIG)
  })

  it('forwards narrative flag to runTraceCore', async () => {
    vi.mocked(traceCmd.runTraceCore).mockResolvedValue({ status: 'success', data: TRACE, meta: META })
    await handle({ error: 'err', narrative: true }, CONFIG)
    expect(traceCmd.runTraceCore).toHaveBeenCalledWith(
      'err',
      expect.objectContaining({ narrative: true }),
      CONFIG,
    )
  })

  it('shows error text for failed result', async () => {
    const failed: CodemindResult<ForensicsTrace> = {
      status: 'failed', data: null, meta: META,
      error: { code: 'GRAPH_NOT_FOUND', message: 'Graph not found.' },
    }
    vi.mocked(traceCmd.runTraceCore).mockResolvedValue(failed)
    const result = await handle({ error: 'err' }, CONFIG)
    expect(result.content[0]!.text).toContain('Graph not found')
  })
})
