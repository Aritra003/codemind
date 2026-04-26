import type { NodeId } from '@stinkit/shared'
import type { NodeCoverage } from '../graph/coverage'

export function detectCoverageGaps(
  affectedNodes: NodeId[],
  coverage:      Map<NodeId, NodeCoverage>,
): NodeId[] {
  // No coverage data: treat all nodes as uncovered (conservative — unknown ≠ covered)
  if (coverage.size === 0) return [...affectedNodes]
  // Nodes absent from the coverage map are also treated as gaps
  return affectedNodes.filter(id => !(coverage.get(id)?.covered ?? false))
}
