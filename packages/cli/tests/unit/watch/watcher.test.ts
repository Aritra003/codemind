import { describe, it, expect } from 'vitest'
import type { CodeGraph, GraphNode, GraphEdge } from '@stinkit/shared'
import { shouldWatchFile, patchGraph } from '../../../src/watch/watcher'

// ── shouldWatchFile ──────────────────────────────────────────────────────────

describe('shouldWatchFile', () => {
  it('accepts .ts files',  () => expect(shouldWatchFile('/repo/src/auth.ts')).toBe(true))
  it('accepts .tsx files', () => expect(shouldWatchFile('/repo/src/App.tsx')).toBe(true))
  it('accepts .js files',  () => expect(shouldWatchFile('/repo/src/util.js')).toBe(true))
  it('accepts .jsx files', () => expect(shouldWatchFile('/repo/src/comp.jsx')).toBe(true))

  it('rejects node_modules', () =>
    expect(shouldWatchFile('/repo/node_modules/lodash/index.ts')).toBe(false))
  it('rejects .git',        () =>
    expect(shouldWatchFile('/repo/.git/hooks/pre-commit')).toBe(false))
  it('rejects .stinkit',   () =>
    expect(shouldWatchFile('/repo/.stinkit/graph.msgpack')).toBe(false))
  it('rejects dist/',       () =>
    expect(shouldWatchFile('/repo/dist/index.js')).toBe(false))
  it('rejects build/',      () =>
    expect(shouldWatchFile('/repo/build/main.js')).toBe(false))
  it('rejects .next/',      () =>
    expect(shouldWatchFile('/repo/.next/server/page.js')).toBe(false))

  it('rejects .json',  () => expect(shouldWatchFile('/repo/src/config.json')).toBe(false))
  it('rejects .md',    () => expect(shouldWatchFile('/repo/README.md')).toBe(false))
  it('rejects .yaml',  () => expect(shouldWatchFile('/repo/config.yaml')).toBe(false))
  it('rejects .css',   () => expect(shouldWatchFile('/repo/src/styles.css')).toBe(false))
})

// ── patchGraph ───────────────────────────────────────────────────────────────

function makeNode(id: string, file: string): GraphNode {
  return {
    id, file, name: id.split('::')[1] ?? id, kind: 'function',
    line_start: 1, line_end: 5, language: 'typescript',
    is_exported: true, resolution: 'static',
  }
}

function makeEdge(from: string, to: string, kind: GraphEdge['kind'] = 'calls'): GraphEdge {
  return { from, to, kind, weight: 1 }
}

function makeGraph(
  nodeEntries: Array<[string, string]>,  // [id, file]
  edges: GraphEdge[] = [],
): CodeGraph {
  const nodes = new Map(nodeEntries.map(([id, file]) => [id, makeNode(id, file)]))
  return {
    version: 1, createdAt: 0, repo_root: '/repo',
    node_count: nodes.size, edge_count: edges.length,
    completeness_pct: 100, nodes, edges,
    languages: ['typescript'], git_available: false,
  }
}

describe('patchGraph', () => {
  it('removes all nodes that belong to the changed file', () => {
    const graph = makeGraph([
      ['src/a.ts::foo', 'src/a.ts'],
      ['src/b.ts::bar', 'src/b.ts'],
    ])
    const patched = patchGraph(graph, 'src/a.ts', [], [])
    expect(patched.nodes.has('src/a.ts::foo')).toBe(false)
    expect(patched.nodes.has('src/b.ts::bar')).toBe(true)
  })

  it('removes edges whose from starts with the changed file prefix', () => {
    const graph = makeGraph(
      [['src/a.ts::foo', 'src/a.ts'], ['src/b.ts::bar', 'src/b.ts']],
      [
        makeEdge('src/a.ts::foo', 'src/b.ts::bar'),
        makeEdge('src/b.ts::bar', 'src/a.ts::foo'),
      ],
    )
    const patched = patchGraph(graph, 'src/a.ts', [], [])
    expect(patched.edges).toHaveLength(1)
    expect(patched.edges[0]!.from).toBe('src/b.ts::bar')
  })

  it('adds new nodes to the graph', () => {
    const graph = makeGraph([['src/a.ts::old', 'src/a.ts']])
    const newNode = makeNode('src/a.ts::newFn', 'src/a.ts')
    const patched = patchGraph(graph, 'src/a.ts', [newNode], [])
    expect(patched.nodes.has('src/a.ts::newFn')).toBe(true)
    expect(patched.nodes.has('src/a.ts::old')).toBe(false)
  })

  it('adds new edges to the graph', () => {
    const graph = makeGraph([['src/a.ts::foo', 'src/a.ts'], ['src/b.ts::bar', 'src/b.ts']])
    const newNode = makeNode('src/a.ts::foo', 'src/a.ts')
    const newEdge = makeEdge('src/a.ts::foo', 'src/b.ts::bar')
    const patched = patchGraph(graph, 'src/a.ts', [newNode], [newEdge])
    expect(patched.edges).toHaveLength(1)
    expect(patched.edges[0]!.from).toBe('src/a.ts::foo')
  })

  it('updates node_count and edge_count to reflect patched state', () => {
    const graph = makeGraph(
      [['src/a.ts::foo', 'src/a.ts'], ['src/b.ts::bar', 'src/b.ts']],
      [makeEdge('src/a.ts::foo', 'src/b.ts::bar')],
    )
    const newNode = makeNode('src/a.ts::newFn', 'src/a.ts')
    const patched = patchGraph(graph, 'src/a.ts', [newNode], [])
    expect(patched.node_count).toBe(2)  // bar + newFn
    expect(patched.edge_count).toBe(0)  // old edge from a.ts removed
  })

  it('leaves nodes from other files completely untouched', () => {
    const graph = makeGraph([
      ['src/a.ts::foo', 'src/a.ts'],
      ['src/b.ts::bar', 'src/b.ts'],
      ['src/c.ts::baz', 'src/c.ts'],
    ])
    const patched = patchGraph(graph, 'src/a.ts', [], [])
    expect(patched.nodes.has('src/b.ts::bar')).toBe(true)
    expect(patched.nodes.has('src/c.ts::baz')).toBe(true)
  })

  it('does not mutate the original graph', () => {
    const graph = makeGraph([['src/a.ts::foo', 'src/a.ts']])
    const originalSize = graph.nodes.size
    patchGraph(graph, 'src/a.ts', [], [])
    expect(graph.nodes.size).toBe(originalSize)
  })
})
