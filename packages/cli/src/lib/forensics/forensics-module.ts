import type { CodeGraph, NodeId } from '@codemind/shared'
import type { AIClient } from '../ai/client'
import type { RankedCommit, OriginClass, ForensicsTrace } from '../../commands/trace'
import { sanitizeErrorInput } from '../../forensics/sanitize'
import { findCodePaths }      from '../../forensics/backward'
import { rankCommits }        from '../../forensics/ranking'
import { triageError }        from '../../forensics/triage'
import { generateNarrative }  from '../../forensics/narrative'
import type { GitCommit }     from '../../forensics/ranking'
import simpleGit              from 'simple-git'

export class ForensicsModule {
  constructor(
    private readonly graph:    CodeGraph,
    private readonly ai:       AIClient,
    private readonly repoRoot: string,
  ) {}

  sanitizeErrorInput(rawInput: string): string {
    return sanitizeErrorInput(rawInput)
  }

  async parseError(sanitizedInput: string): Promise<{ symbols: string[]; likely_domain: string }> {
    return triageError(this.ai, sanitizedInput)
  }

  async rankCommits(symbols: string[], lookbackDays: number): Promise<RankedCommit[]> {
    const commits = await this.fetchGitCommits(lookbackDays)
    return rankCommits(commits, symbols, [...this.graph.nodes.keys()] as NodeId[])
  }

  classifyOrigin(commits: RankedCommit[]): OriginClass {
    if (commits.length === 0) return 'UNKNOWN'
    return commits.length <= 1 ? 'SINGLE_COMMIT' : 'MULTI_COMMIT'
  }

  findCodePaths(changedNodes: NodeId[], symptomNodes: NodeId[]): NodeId[][] {
    return findCodePaths(this.graph, changedNodes, symptomNodes)
  }

  async assemble(
    rawInput:            string,
    lookbackDays:        number,
    doGenerateNarrative: boolean,
  ): Promise<ForensicsTrace> {
    const sanitized    = sanitizeErrorInput(rawInput)
    const { symbols }  = await triageError(this.ai, sanitized)
    const ranked       = await this.rankCommits(symbols, lookbackDays)
    const origin       = this.classifyOrigin(ranked)

    const symptomNodes = [...this.graph.nodes.values()]
      .filter(n => symbols.some(s => n.name.includes(s)))
      .map(n => n.id as NodeId)
    const changedNodes = ranked.flatMap(c => c.changed_nodes)
    const paths        = findCodePaths(this.graph, changedNodes, symptomNodes)

    const trace: ForensicsTrace = {
      origin_classification: origin,
      ranked_commits:        ranked,
      code_paths:            paths,
      confidence_cap:        0.8,
      completeness_pct:      this.graph.completeness_pct,
    }

    if (doGenerateNarrative) {
      trace.narrative = await generateNarrative(this.ai, trace)
    }

    return trace
  }

  private async fetchGitCommits(lookbackDays: number): Promise<GitCommit[]> {
    try {
      const git    = simpleGit(this.repoRoot)
      const isRepo = await git.checkIsRepo()
      if (!isRepo) return []

      const since = new Date(Date.now() - lookbackDays * 86_400_000).toISOString()
      const raw   = await git.raw([
        'log', `--since=${since}`,
        '--format=COMMIT:%H|%an|%ae|%aI|%s',
        '--name-only',
      ])
      return parseGitLog(raw)
    } catch {
      return []
    }
  }
}

function parseGitLog(raw: string): GitCommit[] {
  const commits: GitCommit[] = []
  let current: Partial<GitCommit> | null = null

  for (const line of raw.split('\n')) {
    if (line.startsWith('COMMIT:')) {
      if (current?.hash) commits.push(current as GitCommit)
      const rest  = line.slice('COMMIT:'.length)
      const parts = rest.split('|')
      current = {
        hash:          parts[0] ?? '',
        author_name:   parts[1] ?? '',
        author_email:  parts[2] ?? '',
        date:          parts[3] ?? '',
        message:       parts[4] ?? '',
        changed_files: [],
      }
    } else if (line.trim() && current) {
      current.changed_files!.push(line.trim())
    }
  }
  if (current?.hash) commits.push(current as GitCommit)
  return commits
}
