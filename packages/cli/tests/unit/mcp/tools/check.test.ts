import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserConfig, StinKitResult, BlastRadius } from '@stinkit/shared'

vi.mock('../../../../src/commands/check')

import * as checkCmd from '../../../../src/commands/check'
import { handle, TOOL_DEF } from '../../../../src/lib/mcp/tools/check'

const CONFIG: UserConfig = {
  telemetry: { enabled: false, install_id: 'test' },
  ai: { monthly_token_budget: 500_000, max_retries: 2 },
  limits: { ai_context_max_nodes: 200 },
}

const META = { completeness_pct: 95, duration_ms: 10 }

const BLAST: BlastRadius = {
  changed_nodes:         ['src/auth.ts::login'],
  direct_dependents:     ['src/user.ts::getUser'],
  transitive_dependents: [],
  risk_level:            'HIGH',
  coverage_gaps:         [],
  completeness_pct:      95,
}

describe('TOOL_DEF', () => {
  it('name is stinkit_check', () => {
    expect(TOOL_DEF.name).toBe('stinkit_check')
  })
})

describe('handle (stinkit_check)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns content array with type=text on success', async () => {
    vi.mocked(checkCmd.runCheckCore).mockResolvedValue({ status: 'success', data: BLAST, meta: META })
    const result = await handle({}, CONFIG)
    expect(result.content[0]!.type).toBe('text')
  })

  it('text content includes risk level on success', async () => {
    vi.mocked(checkCmd.runCheckCore).mockResolvedValue({ status: 'success', data: BLAST, meta: META })
    const result = await handle({}, CONFIG)
    expect(result.content[0]!.text).toContain('HIGH')
  })

  it('passes files array to runCheckCore', async () => {
    vi.mocked(checkCmd.runCheckCore).mockResolvedValue({ status: 'success', data: BLAST, meta: META })
    await handle({ files: ['src/auth.ts'] }, CONFIG)
    expect(checkCmd.runCheckCore).toHaveBeenCalledWith(
      ['src/auth.ts'],
      expect.objectContaining({ think: false }),
      CONFIG,
    )
  })

  it('defaults to empty files array when not provided', async () => {
    vi.mocked(checkCmd.runCheckCore).mockResolvedValue({ status: 'success', data: BLAST, meta: META })
    await handle({}, CONFIG)
    expect(checkCmd.runCheckCore).toHaveBeenCalledWith([], expect.any(Object), CONFIG)
  })

  it('shows error text for failed result', async () => {
    const failed: StinKitResult<BlastRadius> = {
      status: 'failed', data: null, meta: META,
      error: { code: 'GRAPH_NOT_FOUND', message: 'No graph found.' },
    }
    vi.mocked(checkCmd.runCheckCore).mockResolvedValue(failed)
    const result = await handle({}, CONFIG)
    expect(result.content[0]!.text).toContain('No graph found')
  })

  it('forwards think flag to runCheckCore', async () => {
    vi.mocked(checkCmd.runCheckCore).mockResolvedValue({ status: 'success', data: BLAST, meta: META })
    await handle({ think: true }, CONFIG)
    expect(checkCmd.runCheckCore).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ think: true }),
      CONFIG,
    )
  })
})
