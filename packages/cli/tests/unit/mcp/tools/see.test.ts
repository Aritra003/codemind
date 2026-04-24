import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserConfig, CodemindResult } from '@codemind/shared'
import type { DriftReport } from '../../../../src/commands/see'

vi.mock('../../../../src/commands/see')

import * as seeCmd from '../../../../src/commands/see'
import { handle, TOOL_DEF } from '../../../../src/lib/mcp/tools/see'

const CONFIG: UserConfig = {
  telemetry: { enabled: false, install_id: 'test' },
  ai: { monthly_token_budget: 500_000, max_retries: 2 },
  limits: { ai_context_max_nodes: 200 },
}

const META = { completeness_pct: 90, duration_ms: 20 }

const DRIFT: DriftReport = {
  diagram_path: 'docs/arch.png', phantom_count: 1, missing_count: 2,
  accuracy_pct: 75, extraction_retries: 0, entities_matched: [],
}

describe('TOOL_DEF', () => {
  it('name is codemind_see', () => {
    expect(TOOL_DEF.name).toBe('codemind_see')
  })

  it('diagram is a required param', () => {
    expect(TOOL_DEF.inputSchema.required).toContain('diagram')
  })
})

describe('handle (codemind_see)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns content array with type=text on success', async () => {
    vi.mocked(seeCmd.runSeeCore).mockResolvedValue({ status: 'success', data: DRIFT, meta: META })
    const result = await handle({ diagram: 'docs/arch.png' }, CONFIG)
    expect(result.content[0]!.type).toBe('text')
  })

  it('text includes accuracy percentage on success', async () => {
    vi.mocked(seeCmd.runSeeCore).mockResolvedValue({ status: 'success', data: DRIFT, meta: META })
    const result = await handle({ diagram: 'docs/arch.png' }, CONFIG)
    expect(result.content[0]!.text).toContain('75%')
  })

  it('passes diagram path to runSeeCore', async () => {
    vi.mocked(seeCmd.runSeeCore).mockResolvedValue({ status: 'success', data: DRIFT, meta: META })
    await handle({ diagram: 'docs/arch.png' }, CONFIG)
    expect(seeCmd.runSeeCore).toHaveBeenCalledWith('docs/arch.png', expect.any(Object), CONFIG)
  })

  it('shows error text for failed result', async () => {
    const failed: CodemindResult<DriftReport> = {
      status: 'failed', data: null, meta: META,
      error: { code: 'FILE_NOT_FOUND', message: 'Diagram file not found.' },
    }
    vi.mocked(seeCmd.runSeeCore).mockResolvedValue(failed)
    const result = await handle({ diagram: 'missing.png' }, CONFIG)
    expect(result.content[0]!.text).toContain('Diagram file not found')
  })
})
