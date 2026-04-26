import type { NodeId } from '@stinkit/shared'
import type { GitNodeHistory } from '../graph/git'

export const HIGH_CHURN_THRESHOLD = 3

export function correlateIncidents(
  nodes:   NodeId[],
  history: Map<NodeId, GitNodeHistory>,
): boolean {
  return nodes.some(id => (history.get(id)?.change_count_6mo ?? 0) > HIGH_CHURN_THRESHOLD)
}
