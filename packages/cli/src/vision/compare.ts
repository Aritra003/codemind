import type { CodeGraph } from '@stinkit/shared'
import type { EntityResolutionResult } from '../lib/ai/client'
import type { DriftReport, EntityMatch } from '../commands/see'

export function compareToGraph(
  resolved:          EntityResolutionResult[],
  graph:             CodeGraph,
  diagramPath        = '',
  extractionRetries  = 0,
): DriftReport {
  if (resolved.length === 0 && graph.nodes.size === 0) {
    return { diagram_path: diagramPath, phantom_count: 0, missing_count: 0, accuracy_pct: 100, extraction_retries: extractionRetries, entities_matched: [] }
  }

  const matchedNodeIds = new Set(resolved.map(r => r.matched_node_id).filter(Boolean) as string[])

  // exported graph nodes not referenced by any resolved entity
  const missingNodes = [...graph.nodes.values()].filter(
    n => n.is_exported && !matchedNodeIds.has(n.id)
  )

  const matched  = resolved.filter(r => r.matched_node_id !== null)
  const phantoms = resolved.filter(r => r.matched_node_id === null)
  const total    = matched.length + phantoms.length + missingNodes.length

  const accuracy_pct = total === 0 ? 0 : Math.round((matched.length / total) * 100)

  const entities_matched: EntityMatch[] = resolved.map(r => ({
    diagram_label: r.diagram_label,
    code_node_id:  r.matched_node_id,
    confidence:    r.confidence,
    resolution:    r.matched_node_id !== null ? 'exact' : 'unmatched',
  }))

  return {
    diagram_path:       diagramPath,
    phantom_count:      phantoms.length,
    missing_count:      missingNodes.length,
    accuracy_pct,
    extraction_retries: extractionRetries,
    entities_matched,
  }
}
