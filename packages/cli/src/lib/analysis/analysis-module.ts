import type { CodeGraph, NodeId, BlastRadius } from '@codemind/shared'
import * as path from 'path'
import { computeBlastRadius } from '../../analysis/blast-radius'
import { classifyRisk }       from '../../analysis/risk'
import { detectCoverageGaps } from '../../analysis/coverage-gap'
import { correlateIncidents } from '../../analysis/incident'
import { loadNodeHistory }    from '../../graph/git'
import { loadCoverage }       from '../../graph/coverage'

export class AnalysisModule {
  constructor(private readonly graph: CodeGraph) {}

  resolveFilesToNodes(files: string[], repoRoot: string): NodeId[] {
    const nodeIds: NodeId[] = []
    const normalizedFiles = files.map(f =>
      path.isAbsolute(f) ? f : path.join(repoRoot, f)
    )
    for (const [id, node] of this.graph.nodes) {
      const absFile = path.join(repoRoot, node.file)
      if (normalizedFiles.some(f => absFile === f || node.file === path.relative(repoRoot, f))) {
        nodeIds.push(id)
      }
    }
    return nodeIds
  }

  /**
   * Fast tier (think=false): graph traversal + cached coverage only. No git subprocess calls.
   * Think tier (think=true): additionally loads git history for incident correlation.
   */
  async computeBlastRadius(
    changedFiles: string[],
    repoRoot:     string,
    think = false,
  ): Promise<BlastRadius> {
    const changedNodes = this.resolveFilesToNodes(changedFiles, repoRoot)
    const base = computeBlastRadius(this.graph, changedNodes)

    const affected = [...base.changed_nodes, ...base.direct_dependents, ...base.transitive_dependents]

    // Fast tier: coverage only (file read, no subprocesses)
    const coverage = await loadCoverage(repoRoot, affected.map(id => {
      const n = this.graph.nodes.get(id)
      return n ?? { id, file: id.split('::')[0] ?? '', name: id.split('::')[1] ?? id, kind: 'function' as const, line_start: 0, line_end: 0, language: 'typescript', is_exported: false, resolution: 'static' as const }
    }))
    const gaps = detectCoverageGaps(affected, coverage)

    // Think tier: also load git history for incident correlation
    if (think) {
      const affectedNodes = affected
        .map(id => this.graph.nodes.get(id))
        .filter((n): n is NonNullable<typeof n> => n !== undefined)
      const history = await loadNodeHistory(repoRoot, affectedNodes)
      correlateIncidents(changedNodes, history)
    }

    const withGaps: Omit<BlastRadius, 'risk_level'> = { ...base, coverage_gaps: gaps }
    const risk_level = classifyRisk(withGaps)
    return { ...withGaps, risk_level }
  }
}
