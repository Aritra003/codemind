import type { CodeGraph } from '@codemind/shared'
import type { AIClient, DiagramExtractionResult, EntityResolutionResult } from '../lib/ai/client'

const CAP = 0.8  // INV-004

export async function resolveEntities(
  ai:        AIClient,
  extracted: DiagramExtractionResult,
  graph:     CodeGraph,
): Promise<EntityResolutionResult[]> {
  if (extracted.entities.length === 0) return []

  const nodeNames = [...graph.nodes.values()].map(n => n.name)
  const raw = await ai.resolveEntityNames(extracted.entities, nodeNames)
  return raw.map(r => ({ ...r, confidence: Math.min(r.confidence, CAP) }))
}
