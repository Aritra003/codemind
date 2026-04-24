import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AIClient, DiagramExtractionResult } from '../../../src/lib/ai/client'
import { extractDiagramEntities } from '../../../src/vision/extract'
import { UnsupportedFormatError } from '../../../src/lib/errors'

const okResult: DiagramExtractionResult = {
  entities: ['Auth', 'Database'], confidence: 0.75, retries: 0, partial: false,
}

function makeMockAI(impl?: Partial<AIClient>): AIClient {
  return {
    extractDiagramEntities: vi.fn().mockResolvedValue(okResult),
    resolveEntityNames: vi.fn(),
    analyzeBlastRadius: vi.fn(),
    narrateTrace: vi.fn(),
    triageError: vi.fn(),
    ...impl,
  } as unknown as AIClient
}

beforeEach(() => { vi.clearAllMocks() })

describe('extractDiagramEntities', () => {
  it('returns result on first-call success', async () => {
    const ai = makeMockAI()
    const result = await extractDiagramEntities(ai, 'diagram.png')
    expect(result.entities).toEqual(['Auth', 'Database'])
    expect(result.partial).toBe(false)
  })

  it('retries once on first failure then succeeds', async () => {
    const ai = makeMockAI({
      extractDiagramEntities: vi.fn()
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce(okResult),
    })
    const result = await extractDiagramEntities(ai, 'diagram.png')
    expect(result.retries).toBe(1)
    expect(result.partial).toBe(false)
    expect(ai.extractDiagramEntities).toHaveBeenCalledTimes(2)
  })

  it('POL-07: returns partial result on 2nd failure (never throws)', async () => {
    const ai = makeMockAI({
      extractDiagramEntities: vi.fn().mockRejectedValue(new Error('fail')),
    })
    const result = await extractDiagramEntities(ai, 'diagram.png')
    expect(result.partial).toBe(true)
    expect(result.entities).toEqual([])
    expect(result.retries).toBe(1)
  })

  it('throws UnsupportedFormatError for SVG input', async () => {
    const ai = makeMockAI()
    await expect(extractDiagramEntities(ai, 'diagram.svg'))
      .rejects.toBeInstanceOf(UnsupportedFormatError)
    expect(ai.extractDiagramEntities).not.toHaveBeenCalled()
  })

  it('throws UnsupportedFormatError for unknown extension', async () => {
    const ai = makeMockAI()
    await expect(extractDiagramEntities(ai, 'diagram.bmp'))
      .rejects.toBeInstanceOf(UnsupportedFormatError)
  })

  it('does not exceed 1 retry (POL-07)', async () => {
    const ai = makeMockAI({
      extractDiagramEntities: vi.fn().mockRejectedValue(new Error('fail')),
    })
    await extractDiagramEntities(ai, 'diagram.jpg')
    expect(ai.extractDiagramEntities).toHaveBeenCalledTimes(2)
  })
})
