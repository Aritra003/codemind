import type { GraphEdge } from '@stinkit/shared'

export interface CompletenessReport {
  completeness_pct:        number   // local resolution rate — external calls excluded from denominator
  external_calls_excluded: number   // calls whose callee has no node in the graph (npm packages etc.)
  ambiguous_local_calls:   number   // calls whose callee matches ≥2 nodes but couldn't be narrowed
  blind_spots:             string[] // files with 0 locally-resolved calls
  unresolved_calls:        number   // external + ambiguous (backward-compat total)
  total_calls:             number
}

const UNRESOLVED_PREFIX     = 'UNRESOLVED::'
const UNRESOLVED_DYN_PREFIX = 'UNRESOLVED_DYN::'

/**
 * nameToIds: the same map built during edge resolution — callee name → all node IDs with that name.
 * When omitted (tests), all unresolved calls are treated as local-ambiguous (preserves old behaviour).
 */
export function computeCompleteness(
  edges:      GraphEdge[],
  nameToIds?: Map<string, string[]>,
): CompletenessReport {
  const callEdges = edges.filter(e => e.kind === 'calls')
  const total     = callEdges.length

  let resolved        = 0
  let externalCalls   = 0
  let ambiguousLocal  = 0

  const unresolvedLocalFiles = new Set<string>()
  const resolvedFiles        = new Set<string>()

  for (const edge of callEdges) {
    const file = edge.from.split('::')[0] ?? edge.from

    // Module-level call edges (from synthetic __module__ nodes) power blast radius but are
    // excluded from completeness — they represent structural call patterns rather than
    // function-to-function dependencies that can reliably be resolved.
    if (edge.from.endsWith('::__module__')) continue

    if (!edge.to.startsWith(UNRESOLVED_PREFIX) && !edge.to.startsWith(UNRESOLVED_DYN_PREFIX)) {
      resolved++
      resolvedFiles.add(file)
      continue
    }

    // Dynamic import() — always local but unresolvable
    if (edge.to.startsWith(UNRESOLVED_DYN_PREFIX)) {
      ambiguousLocal++
      unresolvedLocalFiles.add(file)
      continue
    }

    const callee    = edge.to.slice(UNRESOLVED_PREFIX.length)
    const inGraph   = nameToIds?.size ? (nameToIds.get(callee)?.length ?? 0) : -1

    if (inGraph === 0) {
      // Callee is not in the graph at all → external package call
      externalCalls++
    } else {
      // inGraph > 0 (ambiguous) OR nameToIds not provided (old behaviour)
      ambiguousLocal++
      unresolvedLocalFiles.add(file)
    }
  }

  const localTotal       = resolved + ambiguousLocal
  const completeness_pct = localTotal === 0 ? 100 : Math.round((resolved / localTotal) * 100)

  const blind_spots = [...unresolvedLocalFiles].filter(f => !resolvedFiles.has(f))

  return {
    completeness_pct,
    external_calls_excluded: externalCalls,
    ambiguous_local_calls:   ambiguousLocal,
    blind_spots,
    unresolved_calls: externalCalls + ambiguousLocal,
    total_calls:      total,
  }
}
