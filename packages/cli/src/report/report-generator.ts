import * as fs   from 'fs/promises'
import * as path from 'path'
import type { CodeGraph } from '@stinkit/shared'
import type { AuditData, AuditThinkResult } from './report-types'
import { scanRepo }                         from './scanner'
import { detectCircularDependencies }       from './circular-detector'
import { computeHotspots }                  from './hotspot-analyzer'
import { computeHealthScore }              from './health-score'
import { groupFindingsIntoThemes }         from './theme-grouper'
import { detectPositiveSignals, computeGraphStats } from './positive-detector'
import { buildReport }                      from './report-template'

const REPORTS_DIR = '.stinkit/reports'

export interface AuditReportOptions {
  output?: string
  aiThink?: AuditThinkResult
}

export async function generateAuditReport(
  graph:    CodeGraph,
  repoRoot: string,
  opts:     AuditReportOptions = {},
): Promise<string> {
  const repoName = path.basename(repoRoot)
  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'

  const [findings, circularChains] = await Promise.all([
    scanRepo(repoRoot),
    Promise.resolve(detectCircularDependencies(graph)),
  ])

  const hotspots = computeHotspots(graph)
  const themes   = groupFindingsIntoThemes(findings, circularChains, hotspots)

  const critical = findings.filter(f => f.severity === 'CRITICAL').length
  const high     = findings.filter(f => f.severity === 'HIGH').length
  const medium   = findings.filter(f => f.severity === 'MEDIUM').length
  const uncoveredHotspots = hotspots.filter(h => !h.hasCoverage).length

  const score    = computeHealthScore({ criticalCount: critical, highCount: high, mediumCount: medium, circularDeps: circularChains.length, uncoveredHotspots })
  const stats    = computeGraphStats(graph, hotspots)
  const signals  = detectPositiveSignals(graph, stats)

  const allFiles = new Set<string>()
  for (const [, node] of graph.nodes) allFiles.add(node.file)

  const data: AuditData = {
    repoRoot,
    repoName,
    generatedAt,
    fileCount: allFiles.size,
    languages: graph.languages ?? [],
    findings,
    circularChains,
    hotspots,
    graph: {
      nodeCount:      graph.node_count,
      edgeCount:      graph.edge_count,
      completenessPct: graph.completeness_pct,
    },
  }

  const html = buildReport(data, themes, score, signals, opts.aiThink?.executiveSummary)

  const outPath = opts.output ?? path.join(repoRoot, REPORTS_DIR, `audit-${Date.now()}.html`)
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, html, 'utf8')
  return outPath
}

export { type AuditData }
