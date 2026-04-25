import type { Finding, Theme, CircularChain, HotspotEntry } from './report-types'
import { THEME_DEFS } from './theme-data'

export function groupFindingsIntoThemes(
  findings:       Finding[],
  circularChains: CircularChain[],
  hotspots:       HotspotEntry[],
): Theme[] {
  const allFindings: Finding[] = [...findings]

  for (const chain of circularChains) {
    allFindings.push({
      type:     'circular_dependency',
      severity: 'MEDIUM',
      file:     chain.files[0] ?? 'unknown',
      message:  `Circular chain: ${chain.files.join(' → ')}`,
    })
  }

  for (const spot of hotspots) {
    if (!spot.hasCoverage && spot.dependentCount > 20) {
      allFindings.push({
        type:        'missing_test_coverage',
        severity:    'HIGH',
        file:        spot.file,
        blastRadius: spot.dependentCount,
        message:     `${spot.dependentCount} transitive dependents, no test coverage`,
      })
    }
  }

  return THEME_DEFS
    .map(def => {
      const matching = allFindings.filter(f => def.types.includes(f.type))
      if (matching.length === 0) return null
      return {
        id:           def.id,
        title:        def.title,
        severity:     def.severity,
        findings:     matching,
        whatFound:    def.whatFound(matching),
        whyDangerous: def.whyDangerous,
        whatToDo:     def.whatToDo,
        whatIfNot:    def.whatIfNot,
        effort:       def.effort,
        priorityTier: def.priorityTier,
      } satisfies Theme
    })
    .filter((t): t is Theme => t !== null)
}
