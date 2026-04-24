import { describe, it, expect, vi } from 'vitest'
import type { AIClient } from '../../../src/lib/ai/client'
import type { ForensicsTrace } from '../../../src/commands/trace'
import { generateNarrative } from '../../../src/forensics/narrative'

const EMPTY_TRACE: Pick<ForensicsTrace, 'ranked_commits' | 'origin_classification' | 'code_paths'> = {
  ranked_commits:        [],
  origin_classification: 'UNKNOWN',
  code_paths:            [],
}

function makeAI(narrateResult = 'AI narrative text'): AIClient {
  return { narrateTrace: vi.fn().mockResolvedValue(narrateResult) } as unknown as AIClient
}

describe('generateNarrative', () => {
  it('INV-004: always appends confidence-cap disclaimer', async () => {
    const result = await generateNarrative(makeAI('Some narrative.'), EMPTY_TRACE)
    expect(result).toContain('confidence capped at 80%')
    expect(result).toContain('INV-004')
  })

  it('includes AI-generated narrative text', async () => {
    const result = await generateNarrative(makeAI('Root cause was a null pointer.'), EMPTY_TRACE)
    expect(result).toContain('Root cause was a null pointer.')
  })

  it('disclaimer is appended even when AI returns empty string', async () => {
    const result = await generateNarrative(makeAI(''), EMPTY_TRACE)
    expect(result).toContain('confidence capped at 80%')
  })

  it('passes trace object to ai.narrateTrace', async () => {
    const mockNarrate = vi.fn().mockResolvedValue('text')
    const ai = { narrateTrace: mockNarrate } as unknown as AIClient
    const trace = { ...EMPTY_TRACE, origin_classification: 'SINGLE_COMMIT' as const }
    await generateNarrative(ai, trace)
    expect(mockNarrate).toHaveBeenCalledWith(trace)
  })

  it('AI text appears before the disclaimer', async () => {
    const result = await generateNarrative(makeAI('narrative body'), EMPTY_TRACE)
    const bodyIdx      = result.indexOf('narrative body')
    const disclaimerIdx = result.indexOf('INV-004')
    expect(bodyIdx).toBeLessThan(disclaimerIdx)
  })
})
