import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserConfig, CodemindResult, BlastRadius } from '@codemind/shared'
import type { ForensicsTrace } from '../../../../src/commands/trace'
import type { DriftReport } from '../../../../src/commands/see'

vi.mock('../../../../src/commands/check')
vi.mock('../../../../src/commands/trace')
vi.mock('../../../../src/commands/see')

import * as checkCmd from '../../../../src/commands/check'
import * as traceCmd from '../../../../src/commands/trace'
import * as seeCmd   from '../../../../src/commands/see'
import { handle as checkHandle }  from '../../../../src/lib/mcp/tools/check'
import { handle as traceHandle }  from '../../../../src/lib/mcp/tools/trace'
import { handle as seeHandle }    from '../../../../src/lib/mcp/tools/see'

const CONFIG: UserConfig = {
  telemetry: { enabled: false, install_id: 'test' },
  ai: { monthly_token_budget: 500_000, max_retries: 2 },
  limits: { ai_context_max_nodes: 200 },
}

const META = { completeness_pct: 90, duration_ms: 5 }

function blastResult(): CodemindResult<BlastRadius> {
  return {
    status: 'success',
    data: { changed_nodes: [], direct_dependents: [], transitive_dependents: [],
            risk_level: 'LOW', coverage_gaps: [], completeness_pct: 90 },
    meta: META,
  }
}

const TRACE: ForensicsTrace = {
  origin_classification: 'UNKNOWN', ranked_commits: [], code_paths: [],
  confidence_cap: 0.8, completeness_pct: 90,
}

const DRIFT: DriftReport = {
  diagram_path: 'arch.png', phantom_count: 0, missing_count: 0,
  accuracy_pct: 100, extraction_retries: 0, entities_matched: [],
}

describe('MCP tool adversarial inputs', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('codemind_check — bad arg types', () => {
    it('files as string (not array) defaults to empty array', async () => {
      vi.mocked(checkCmd.runCheckCore).mockResolvedValue(blastResult())
      await checkHandle({ files: 'src/auth.ts' }, CONFIG)
      expect(checkCmd.runCheckCore).toHaveBeenCalledWith([], expect.any(Object), CONFIG)
    })

    it('files as null defaults to empty array', async () => {
      vi.mocked(checkCmd.runCheckCore).mockResolvedValue(blastResult())
      await checkHandle({ files: null }, CONFIG)
      expect(checkCmd.runCheckCore).toHaveBeenCalledWith([], expect.any(Object), CONFIG)
    })

    it('think as string "true" is treated as false (strict boolean check)', async () => {
      vi.mocked(checkCmd.runCheckCore).mockResolvedValue(blastResult())
      await checkHandle({ think: 'true' }, CONFIG)
      expect(checkCmd.runCheckCore).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ think: false }),
        CONFIG,
      )
    })
  })

  describe('codemind_trace — missing/wrong error arg', () => {
    it('missing error arg coerces to empty string and does not throw', async () => {
      vi.mocked(traceCmd.runTraceCore).mockResolvedValue({ status: 'success', data: TRACE, meta: META })
      await expect(traceHandle({}, CONFIG)).resolves.toBeDefined()
      expect(traceCmd.runTraceCore).toHaveBeenCalledWith('', expect.any(Object), CONFIG)
    })

    it('null error arg is treated as absent (nullish coalescing → empty string)', async () => {
      vi.mocked(traceCmd.runTraceCore).mockResolvedValue({ status: 'success', data: TRACE, meta: META })
      await traceHandle({ error: null }, CONFIG)
      // `null ?? ''` → '' not 'null' — nullish coalescing catches null
      expect(traceCmd.runTraceCore).toHaveBeenCalledWith('', expect.any(Object), CONFIG)
    })

    it('lookback as string uses default 90', async () => {
      vi.mocked(traceCmd.runTraceCore).mockResolvedValue({ status: 'success', data: TRACE, meta: META })
      await traceHandle({ error: 'err', lookback: '30' }, CONFIG)
      expect(traceCmd.runTraceCore).toHaveBeenCalledWith(
        'err',
        expect.objectContaining({ lookback: 90 }),
        CONFIG,
      )
    })
  })

  describe('codemind_see — missing/wrong diagram arg', () => {
    it('missing diagram arg coerces to empty string', async () => {
      vi.mocked(seeCmd.runSeeCore).mockResolvedValue({ status: 'success', data: DRIFT, meta: META })
      await expect(seeHandle({}, CONFIG)).resolves.toBeDefined()
      expect(seeCmd.runSeeCore).toHaveBeenCalledWith('', expect.any(Object), CONFIG)
    })

    it('numeric diagram arg is coerced to string', async () => {
      vi.mocked(seeCmd.runSeeCore).mockResolvedValue({ status: 'success', data: DRIFT, meta: META })
      await traceHandle({ error: 42 }, CONFIG)
      expect(traceCmd.runTraceCore).toHaveBeenCalledWith('42', expect.any(Object), CONFIG)
    })
  })
})
