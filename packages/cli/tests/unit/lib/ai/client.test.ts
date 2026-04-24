import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { UserConfig, BlastRadius } from '@codemind/shared'
import type { GraphSummaryForAI } from '../../../../src/lib/ai/client'

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

const validConfig: UserConfig = {
  anthropic_api_key: 'sk-ant-test',
  telemetry: { enabled: false, install_id: 'test-id' },
  ai: { monthly_token_budget: 500_000, max_retries: 1 },
  limits: { ai_context_max_nodes: 200 },
}

const { anthropic_api_key: _omit, ...noKeyConfig } = validConfig

function okResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
    model: 'claude-opus-4-7',
    usage: { input_tokens: 10, output_tokens: 20 },
  }
}

const testSummary: GraphSummaryForAI = {
  changed_nodes:      [{ id: 'a.ts::fn', name: 'fn', kind: 'function', file_relative: 'a.ts' }],
  direct_dependents:  [],
  transitive_count:   0,
  coverage_gap_count: 0,
  incident_history:   false,
  completeness_pct:   100,
  top_risk_paths:     [],
}

const testRadius: BlastRadius = {
  changed_nodes: ['a.ts::fn'], direct_dependents: [], transitive_dependents: [],
  risk_level: 'LOW', coverage_gaps: [], completeness_pct: 100,
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env['ANTHROPIC_API_KEY']
})

afterEach(() => { vi.useRealTimers() })

describe('AIClient', () => {
  describe('constructor', () => {
    it('throws when no API key and no env var', async () => {
      const { AIClient } = await import('../../../../src/lib/ai/client')
      expect(() => new AIClient(noKeyConfig)).toThrow()
    })

    it('accepts ANTHROPIC_API_KEY env var', async () => {
      process.env['ANTHROPIC_API_KEY'] = 'sk-ant-env'
      const { AIClient } = await import('../../../../src/lib/ai/client')
      expect(() => new AIClient(noKeyConfig)).not.toThrow()
    })
  })

  describe('analyzeBlastRadius', () => {
    it('caps confidence at 0.8 (INV-004)', async () => {
      const { AIClient } = await import('../../../../src/lib/ai/client')
      mockCreate.mockResolvedValueOnce(
        okResponse(JSON.stringify({ risk_summary: 'test', recommendation: 'fix it', confidence: 0.99 }))
      )
      const result = await new AIClient(validConfig).analyzeBlastRadius(testRadius, testSummary)
      expect(result.confidence).toBeLessThanOrEqual(0.8)
    })

    it('returns correct shape with tokens_used', async () => {
      const { AIClient } = await import('../../../../src/lib/ai/client')
      mockCreate.mockResolvedValueOnce(
        okResponse(JSON.stringify({ risk_summary: 'summary', recommendation: 'rec', confidence: 0.5 }))
      )
      const result = await new AIClient(validConfig).analyzeBlastRadius(testRadius, testSummary)
      expect(typeof result.risk_summary).toBe('string')
      expect(typeof result.recommendation).toBe('string')
      expect(result.tokens_used).toBe(30)  // 10 input + 20 output
    })

    it('retries on transient error up to max_retries', async () => {
      const { AIClient } = await import('../../../../src/lib/ai/client')
      const cfg: UserConfig = { ...validConfig, ai: { ...validConfig.ai, max_retries: 2 } }
      mockCreate.mockRejectedValueOnce(new Error('transient'))
      mockCreate.mockResolvedValueOnce(
        okResponse(JSON.stringify({ risk_summary: 'ok', recommendation: 'ok', confidence: 0.5 }))
      )
      const result = await new AIClient(cfg).analyzeBlastRadius(testRadius, testSummary)
      expect(result.risk_summary).toBe('ok')
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })

    it('throws AITimeoutError on timeout', async () => {
      vi.useFakeTimers()
      const { AIClient } = await import('../../../../src/lib/ai/client')
      const { AITimeoutError } = await import('../../../../src/lib/errors')
      mockCreate.mockReturnValueOnce(new Promise(() => {}))  // never resolves

      const promise = new AIClient(validConfig).analyzeBlastRadius(testRadius, testSummary)
      promise.catch(() => {})   // prevent unhandled-rejection noise while test awaits
      await vi.advanceTimersByTimeAsync(31_000)
      await expect(promise).rejects.toBeInstanceOf(AITimeoutError)
    })
  })

  describe('triageError', () => {
    it('returns symbols and likely_domain', async () => {
      const { AIClient } = await import('../../../../src/lib/ai/client')
      mockCreate.mockResolvedValueOnce(
        okResponse(JSON.stringify({ symbols: ['login', 'auth'], likely_domain: 'CODE' }))
      )
      const result = await new AIClient(validConfig).triageError('NullPointerException at login')
      expect(result.symbols).toContain('login')
      expect(result.likely_domain).toBe('CODE')
    })
  })

  describe('resolveEntityNames', () => {
    it('caps confidence at 0.8 on all results (INV-004)', async () => {
      const { AIClient } = await import('../../../../src/lib/ai/client')
      mockCreate.mockResolvedValueOnce(
        okResponse(JSON.stringify([
          { diagram_label: 'Auth', matched_node_id: 'src/auth.ts::Auth', confidence: 0.95 },
        ]))
      )
      const results = await new AIClient(validConfig).resolveEntityNames(['Auth'], ['src/auth.ts::Auth'])
      expect(results[0]!.confidence).toBeLessThanOrEqual(0.8)
    })
  })
})
