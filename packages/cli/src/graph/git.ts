import simpleGit from 'simple-git'
import type { GraphNode } from '@codemind/shared'

export interface GitNodeHistory {
  node_id:          string
  change_count_6mo: number
  last_changed:     number   // epoch ms; 0 = unknown
  authors:          string[] // names only — NEVER email (INV-003)
}

export async function loadNodeHistory(
  repoRoot: string,
  nodes:    GraphNode[],
): Promise<Map<string, GitNodeHistory>> {
  const git = simpleGit(repoRoot)
  try {
    const isRepo = await git.checkIsRepo()
    if (!isRepo) return new Map()
  } catch {
    return new Map()
  }

  const fileToNodes = new Map<string, GraphNode[]>()
  for (const node of nodes) {
    const list = fileToNodes.get(node.file) ?? []
    list.push(node)
    fileToNodes.set(node.file, list)
  }

  const result = new Map<string, GitNodeHistory>()

  for (const [filePath, fileNodes] of fileToNodes) {
    let raw = ''
    try {
      // %an = author name only (never email — INV-003)
      raw = await git.raw(['log', '--since=6 months ago', '--format=%an', '--', filePath])
    } catch {
      for (const node of fileNodes) {
        result.set(node.id, { node_id: node.id, change_count_6mo: 0, last_changed: 0, authors: [] })
      }
      continue
    }

    const names  = raw.split('\n').map(s => s.trim()).filter(Boolean)
    const unique = [...new Set(names)]

    for (const node of fileNodes) {
      result.set(node.id, {
        node_id:          node.id,
        change_count_6mo: names.length,
        last_changed:     0,
        authors:          unique,
      })
    }
  }

  return result
}
