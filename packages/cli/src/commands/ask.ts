import type { Command } from 'commander'
import type { UserConfig, StinKitResult } from '@stinkit/shared'
import { GraphStore }      from '../lib/graph/store'
import { GraphTraversal }  from '../lib/graph/traversal'
import { AIClient }        from '../lib/ai/client'
import {
  extractKeywords,
  findMatchingNodes,
  getDirectDependents,
  buildCallChains,
  getDirectoryOverview,
} from '../lib/graph/query'

export interface AskOptions { json: boolean }

export interface AskResult {
  answer:     string
  tokensUsed: number
  model:      string
  nodesUsed:  number
}

function buildAskPrompt(params: {
  question:          string
  matchedNodes:      ReturnType<typeof findMatchingNodes>
  callChains:        string[][]
  blastInfo?:        { direct: number; transitive: number }
  hotspots:          Array<{ nodeId: string; name: string; file: string; dependents: number }>
  dirOverview:       string[]
  nodeCount:         number
  edgeCount:         number
  languages:         string[]
  completeness:      number
}): string {
  const { question, matchedNodes, callChains, blastInfo, hotspots, dirOverview, nodeCount, edgeCount, languages, completeness } = params

  const nodeLines = matchedNodes.map(n => {
    const deps = params.matchedNodes.length // placeholder — real count computed per node in context
    return `- ${n.file}::${n.name} (${n.kind})`
  })

  const chainLines = callChains.map(c => c.join(' → '))

  const hotLines = hotspots.slice(0, 10).map((h, i) =>
    `${i + 1}. ${h.file}::${h.name} — ${h.dependents} dependents`,
  )

  const blastSection = blastInfo
    ? `\n## BLAST RADIUS (first matched node)\nDirect dependents: ${blastInfo.direct}\nTransitive dependents: ${blastInfo.transitive}\n`
    : ''

  return `You are a senior software architect explaining a codebase to a developer.

## CODEBASE OVERVIEW
- ${nodeCount} nodes, ${edgeCount} edges
- Languages: ${languages.join(', ')}
- Local completeness: ${completeness}%
- Directory structure:
${dirOverview.map(d => `  ${d}`).join('\n')}

## RELEVANT CODE STRUCTURE (${matchedNodes.length} nodes matched)
${nodeLines.join('\n')}

## CALL CHAINS (execution paths through relevant code)
${chainLines.length > 0 ? chainLines.join('\n') : '(no multi-hop paths found for matched nodes)'}
${blastSection}
## TOP HOTSPOTS (highest blast radius)
${hotLines.join('\n')}

## QUESTION
${question}

Answer the question using ONLY the structural data provided above. Reference specific files and call chains. If the data doesn't contain enough information to answer fully, say what you CAN answer and what would require deeper analysis. Be concrete — file names, function names, dependency counts. No generic advice.`
}

export async function runAskCore(
  question: string,
  config:   UserConfig,
): Promise<StinKitResult<AskResult>> {
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

  const keywords     = extractKeywords(question)
  const matchedNodes = findMatchingNodes(graph, keywords)

  const traversal = new GraphTraversal(graph)
  const hotspotRaw = traversal.hotspots(10)
  const hotspots = hotspotRaw.map(h => {
    const node = graph.nodes.get(h.node)
    return { nodeId: h.node, name: node?.name ?? h.node, file: node?.file ?? '', dependents: h.dependents }
  })

  const callChains = buildCallChains(matchedNodes, graph)
  const dirOverview = getDirectoryOverview(graph)

  const impactWords = ['break', 'remove', 'refactor', 'safe', 'change', 'delete', 'replace', 'migrate']
  const isImpact = impactWords.some(w => question.toLowerCase().includes(w))
  let blastInfo: { direct: number; transitive: number } | undefined
  if (isImpact && matchedNodes.length > 0) {
    const radius = traversal.computeBlastRadius([matchedNodes[0]!.id])
    blastInfo = { direct: radius.direct_dependents.length, transitive: radius.transitive_dependents.length }
  }

  // Augment matched nodes with dependent counts
  const augmented = matchedNodes.map(n => ({
    ...n,
    _dependents: getDirectDependents(graph, n.id).length,
  }))

  const promptParams: Parameters<typeof buildAskPrompt>[0] = {
    question,
    matchedNodes: augmented,
    callChains,
    hotspots,
    dirOverview,
    nodeCount:    graph.node_count,
    edgeCount:    graph.edge_count,
    languages:    graph.languages,
    completeness: graph.completeness_pct,
  }
  if (blastInfo) promptParams.blastInfo = blastInfo
  const prompt = buildAskPrompt(promptParams)

  const systemText = 'You are a senior software architect. Answer questions about codebase structure using only the provided graph data. Be concrete and reference specific file paths.'

  const ai     = new AIClient(config)
  const result = await ai.rawText('ask-question', prompt, systemText)

  return {
    status: 'success',
    data:   { answer: result.text, tokensUsed: result.tokensUsed, model: result.model, nodesUsed: matchedNodes.length },
    meta:   { completeness_pct: graph.completeness_pct, external_calls_excluded: graph.external_calls_excluded, ambiguous_local_calls: graph.ambiguous_local_calls, duration_ms: Date.now() - startMs },
  }
}

export function registerAskCommand(program: Command, config: UserConfig): void {
  program
    .command('ask <question>')
    .description('Ask a natural language question about your codebase architecture')
    .action(async (question: string) => {
      const { runAsk } = await import('./ask-runner')
      await runAsk(question, config)
    })
}
