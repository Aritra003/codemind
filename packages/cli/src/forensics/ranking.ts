import type { NodeId } from '@stinkit/shared'
import type { RankedCommit } from '../commands/trace'

export interface GitCommit {
  hash:          string
  author_name:   string
  author_email:  string
  date:          string
  message:       string
  changed_files: string[]
}

const MAX_LOOKBACK_DAYS = 180
const TOP_N             = 10

export function rankCommits(
  commits:       GitCommit[],
  symbols:       string[],
  relevantNodes: NodeId[],
): RankedCommit[] {
  if (commits.length === 0) return []

  const relevantFiles = new Set(relevantNodes.map(n => n.split('::')[0]!))

  const scored = commits.map(c => {
    const ageDays      = (Date.now() - new Date(c.date).getTime()) / 86_400_000
    const recency      = Math.max(0, 1 - ageDays / MAX_LOOKBACK_DAYS)

    let symbolOverlap = 0
    if (relevantFiles.size > 0) {
      const fileHits = c.changed_files.filter(f => relevantFiles.has(f)).length
      symbolOverlap  = Math.max(symbolOverlap, fileHits / relevantFiles.size)
    }
    if (symbols.length > 0) {
      const lowerMsg  = c.message.toLowerCase()
      const symHits   = symbols.filter(s => lowerMsg.includes(s.toLowerCase())).length
      symbolOverlap   = Math.max(symbolOverlap, symHits / symbols.length)
    }

    const score = Math.min(1, symbolOverlap * 0.4 + recency * 0.4)

    const changedNodes = relevantNodes.filter(n =>
      c.changed_files.includes(n.split('::')[0]!)
    )

    return {
      hash:          c.hash,
      author:        c.author_name,   // INV-003: name only, never email
      date:          c.date,
      message:       c.message,
      score,
      changed_nodes: changedNodes,
    } satisfies RankedCommit
  })

  return scored
    .sort((a, b) => b.score - a.score || a.hash.localeCompare(b.hash))
    .slice(0, TOP_N)
}
