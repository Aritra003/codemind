import * as path from 'path'
import type { AIClient, DiagramExtractionResult } from '../lib/ai/client'
import { UnsupportedFormatError } from '../lib/errors'

const SUPPORTED_EXTS = new Set(['.png', '.jpg', '.jpeg'])

export async function extractDiagramEntities(
  ai:        AIClient,
  imagePath: string,
): Promise<DiagramExtractionResult> {
  const ext = path.extname(imagePath).toLowerCase()
  if (!SUPPORTED_EXTS.has(ext)) {
    throw new UnsupportedFormatError(ext || imagePath)
  }

  // POL-07: first attempt
  try {
    return await ai.extractDiagramEntities(imagePath)
  } catch {
    // first failure — one retry allowed
  }

  // POL-07: single retry
  try {
    const result = await ai.extractDiagramEntities(imagePath)
    return { ...result, retries: 1 }
  } catch {
    // second failure — return partial, never crash (POL-07)
    process.stderr.write('[stinkit] vision extraction failed after 1 retry (D-02)\n')
    return { entities: [], confidence: 0, retries: 1, partial: true }
  }
}
