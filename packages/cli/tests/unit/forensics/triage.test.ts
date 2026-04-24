import { describe, it, expect, vi } from 'vitest'
import type { AIClient } from '../../../src/lib/ai/client'
import { triageError } from '../../../src/forensics/triage'

function makeAI(symbols: string[] = [], likely_domain = 'UNKNOWN'): AIClient {
  return {
    triageError: vi.fn().mockResolvedValue({ symbols, likely_domain }),
  } as unknown as AIClient
}

describe('triageError', () => {
  it('passes through symbols returned by AI', async () => {
    const ai = makeAI(['UserService', 'getUser'], 'CODE')
    const result = await triageError(ai, 'some error')
    expect(result.symbols).toEqual(['UserService', 'getUser'])
  })

  it('passes through valid domain CODE', async () => {
    const result = await triageError(makeAI([], 'CODE'), 'err')
    expect(result.likely_domain).toBe('CODE')
  })

  it('passes through valid domain INFRA', async () => {
    const result = await triageError(makeAI([], 'INFRA'), 'err')
    expect(result.likely_domain).toBe('INFRA')
  })

  it('passes through valid domain CONFIG', async () => {
    const result = await triageError(makeAI([], 'CONFIG'), 'err')
    expect(result.likely_domain).toBe('CONFIG')
  })

  it('passes through valid domain NETWORK', async () => {
    const result = await triageError(makeAI([], 'NETWORK'), 'err')
    expect(result.likely_domain).toBe('NETWORK')
  })

  it('normalizes unrecognized domain to UNKNOWN', async () => {
    const result = await triageError(makeAI([], 'RANDOM_GARBAGE'), 'err')
    expect(result.likely_domain).toBe('UNKNOWN')
  })

  it('forwards sanitized input verbatim to ai.triageError', async () => {
    const ai = makeAI()
    await triageError(ai, 'sanitized stack trace text')
    expect(ai.triageError).toHaveBeenCalledWith('sanitized stack trace text')
  })

  it('returns empty symbols when AI returns none', async () => {
    const result = await triageError(makeAI([], 'UNKNOWN'), 'err')
    expect(result.symbols).toEqual([])
  })
})
