import type { CodeGraph } from '@stinkit/shared'
import type { HotspotEntry, PositiveSignal } from './report-types'

export interface GraphStats {
  avgImportsPerFile: number
  avgBlastRadius:    number
  hotspots:          HotspotEntry[]
}

export function computeGraphStats(graph: CodeGraph, hotspots: HotspotEntry[]): GraphStats {
  const importsByFile = new Map<string, number>()
  for (const edge of graph.edges) {
    if (edge.kind !== 'imports') continue
    const from = edge.from.includes('::') ? (edge.from.split('::')[0] ?? edge.from) : edge.from
    importsByFile.set(from, (importsByFile.get(from) ?? 0) + 1)
  }
  const vals = [...importsByFile.values()]
  const avgImportsPerFile = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  const avgBlastRadius = hotspots.length > 0
    ? hotspots.reduce((a, h) => a + h.dependentCount, 0) / hotspots.length
    : 0
  return { avgImportsPerFile, avgBlastRadius, hotspots }
}

export function detectPositiveSignals(graph: CodeGraph, stats: GraphStats): PositiveSignal[] {
  const signals: PositiveSignal[] = []

  if (stats.avgImportsPerFile < 4) {
    signals.push({
      title: 'Clean module boundaries',
      description: `Average ${stats.avgImportsPerFile.toFixed(1)} imports per file — modules are focused and single-purpose. Low coupling simplifies refactoring.`,
    })
  }

  if (stats.avgBlastRadius > 0 && stats.avgBlastRadius < 30) {
    signals.push({
      title: 'Concentrated, not systemic risk',
      description: `Average blast radius of ${stats.avgBlastRadius.toFixed(0)} dependents — risk is localized, not spread across the whole application.`,
    })
  }

  const coveredHotspots = stats.hotspots.filter(h => h.hasCoverage)
  if (coveredHotspots.length > 0) {
    const names = coveredHotspots.slice(0, 3).map(h => h.file.split('/').pop()).join(', ')
    signals.push({
      title: 'Critical paths protected',
      description: `${coveredHotspots.length} of the top-10 highest-blast-radius files have test coverage (${names}).`,
    })
  }

  if ((graph.languages?.length ?? 0) <= 2) {
    const lang = graph.languages?.join(' + ') ?? 'TypeScript'
    signals.push({
      title: 'Consistent language stack',
      description: `${lang} codebase — lower onboarding cost and more consistent tooling across the project.`,
    })
  }

  if (graph.completeness_pct >= 85) {
    signals.push({
      title: 'High graph completeness',
      description: `${graph.completeness_pct.toFixed(0)}% of function calls resolved statically — blast radius analysis is accurate, not estimated.`,
    })
  }

  return signals
}
