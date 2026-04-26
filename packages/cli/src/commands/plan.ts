import type { Command } from 'commander'
import type { UserConfig, StinKitResult, GraphNode, CodeGraph, NodeId } from '@stinkit/shared'
import { GraphStore }      from '../lib/graph/store'
import { GraphTraversal }  from '../lib/graph/traversal'
import { AIClient }        from '../lib/ai/client'
import {
  extractKeywords,
  findMatchingNodes,
  getDirectDependents,
  getDirectoryOverview,
} from '../lib/graph/query'

export interface PlanOptions { json: boolean }

export interface PlanResult {
  plan:       string
  tiers:      number
  affected:   number
  tokensUsed: number
  model:      string
}

function computeChangeTiers(affectedNodes: GraphNode[], graph: CodeGraph): GraphNode[][] {
  if (affectedNodes.length === 0) return []
  const affectedIds = new Set(affectedNodes.map(n => n.id))
  const depCount = new Map<NodeId, number>()

  for (const node of affectedNodes) {
    let count = 0
    for (const edge of graph.edges) {
      if (edge.to === node.id && affectedIds.has(edge.from)) count++
    }
    depCount.set(node.id, count)
  }

  const tiers: GraphNode[][] = []
  const assigned = new Set<NodeId>()

  while (assigned.size < affectedNodes.length) {
    const tier = affectedNodes.filter(
      n => !assigned.has(n.id) && (depCount.get(n.id) ?? 0) === 0,
    )
    if (tier.length === 0) {
      // Cycle detected — add all remaining
      tiers.push(affectedNodes.filter(n => !assigned.has(n.id)))
      break
    }
    tiers.push(tier)
    for (const n of tier) {
      assigned.add(n.id)
      for (const other of affectedNodes) {
        if (!assigned.has(other.id)) {
          for (const edge of graph.edges) {
            if (edge.from === other.id && edge.to === n.id) {
              depCount.set(other.id, (depCount.get(other.id) ?? 1) - 1)
            }
          }
        }
      }
    }
  }

  return tiers
}

function hasTestCoverage(node: GraphNode, graph: CodeGraph): boolean {
  const base = node.file.replace(/\.(ts|js|tsx|jsx|py|go)$/, '')
  for (const n of graph.nodes.values()) {
    if (n.file.includes('test') || n.file.includes('spec')) {
      if (n.file.includes(base.split('/').pop() ?? '')) return true
    }
  }
  return false
}

function buildPlanPrompt(params: {
  goal:            string
  changeTiers:     GraphNode[][]
  graph:           CodeGraph
  uncoveredCount:  number
  highestRisk:     { node: GraphNode; dependents: number } | null
  frequentFiles:   string[]
}): string {
  const { goal, changeTiers, graph, uncoveredCount, highestRisk, frequentFiles } = params
  const totalAffected = changeTiers.reduce((s, t) => s + t.length, 0)

  const tierLines = changeTiers.map((tier, i) => {
    const fileLines = tier.map(n => {
      const deps = getDirectDependents(graph, n.id).length
      const cov  = hasTestCoverage(n, graph) ? 'yes' : 'NO'
      return `  - ${n.file} (${deps} dependents, coverage: ${cov})`
    })
    return `Tier ${i + 1} (${tier.length} files — change ${i === 0 ? 'FIRST' : `after Tier ${i}`}):\n${fileLines.join('\n')}`
  })

  const riskLine = highestRisk
    ? `Highest-risk file: ${highestRisk.node.file} (${highestRisk.dependents} dependents)`
    : 'No high-risk files identified'

  return `You are a senior engineer creating a step-by-step refactoring plan.

## GOAL
${goal}

## AFFECTED FILES (${totalAffected} files, ordered from safest to riskiest)
${tierLines.join('\n\n')}

## BLAST RADIUS SUMMARY
Total files affected: ${totalAffected}
Files with no test coverage: ${uncoveredCount}
${riskLine}

## GIT HISTORY CONTEXT
Most recently modified files: ${frequentFiles.join(', ')}

Create a refactoring plan with these requirements:
1. Number each step sequentially
2. For each step specify: what to do, which files to change, risk level (LOW/MEDIUM/HIGH), estimated effort, and what to test
3. Group steps into suggested PRs (each PR should be independently mergeable and not break anything)
4. Include a rollback point after each PR — what to revert if something goes wrong
5. The first step must ALWAYS be "Add tests to affected files that lack coverage"
6. The last step should be "Remove old code / clean up"
7. Be specific — reference actual file paths from the data above

Output format for each step:
STEP N: [title]
  Files: [list]
  Risk: LOW/MEDIUM/HIGH
  Effort: [time estimate]
  Test: [what to verify]

PR BOUNDARY after steps N-M: "[PR title]"
  Rollback: [what to revert if this PR breaks things]`
}

export async function runPlanCore(
  goal:   string,
  config: UserConfig,
): Promise<StinKitResult<PlanResult>> {
  const repoRoot = process.cwd()
  const store    = new GraphStore(`${repoRoot}/.stinkit`)
  const startMs  = Date.now()

  const graph = await store.load()
  if (!graph) {
    return {
      status: 'failed', data: null,
      meta:   { completeness_pct: 0, duration_ms: Date.now() - startMs },
      error:  { code: 'GRAPH_NOT_FOUND', message: 'No graph found. Run `stinkit index` first.' },
    }
  }

  const keywords      = extractKeywords(goal)
  const matchedNodes  = findMatchingNodes(graph, keywords)

  const traversal = new GraphTraversal(graph)
  const allAffected: GraphNode[] = []
  if (matchedNodes.length > 0) {
    const radius = traversal.computeBlastRadius(matchedNodes.map(n => n.id))
    const allIds = new Set([
      ...radius.changed_nodes,
      ...radius.direct_dependents,
      ...radius.transitive_dependents,
    ])
    for (const id of allIds) {
      const node = graph.nodes.get(id)
      if (node) allAffected.push(node)
    }
  }

  const changeTiers = computeChangeTiers(allAffected.length > 0 ? allAffected : matchedNodes, graph)
  const flatNodes   = changeTiers.flat()
  const uncovered   = flatNodes.filter(n => !hasTestCoverage(n, graph)).length

  const hotspots = traversal.hotspots(1)
  const highestRisk = hotspots[0]
    ? { node: graph.nodes.get(hotspots[0].node)!, dependents: hotspots[0].dependents }
    : null

  const prompt = buildPlanPrompt({
    goal,
    changeTiers,
    graph,
    uncoveredCount: uncovered,
    highestRisk:    highestRisk?.node ? highestRisk as { node: GraphNode; dependents: number } : null,
    frequentFiles:  matchedNodes.slice(0, 5).map(n => n.file),
  })

  const systemText = 'You are a senior software engineer. Create precise, actionable refactoring plans. Reference specific file paths from the data provided.'
  const ai     = new AIClient(config)
  const result = await ai.rawText('plan-refactor', prompt, systemText)

  return {
    status: 'success',
    data:   { plan: result.text, tiers: changeTiers.length, affected: flatNodes.length, tokensUsed: result.tokensUsed, model: result.model },
    meta:   { completeness_pct: graph.completeness_pct, external_calls_excluded: graph.external_calls_excluded, ambiguous_local_calls: graph.ambiguous_local_calls, duration_ms: Date.now() - startMs },
  }
}

export function registerPlanCommand(program: Command, config: UserConfig): void {
  program
    .command('plan <goal>')
    .description('Generate a sequenced, risk-aware refactoring plan from the code graph')
    .action(async (goal: string) => {
      const { runPlan } = await import('./plan-runner')
      await runPlan(goal, config)
    })
}
