import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CodeGraph } from '@stinkit/shared'
import { GraphStore } from '../../../src/lib/graph/store'

vi.mock('../../../src/graph/persist', () => ({
  saveGraph: vi.fn().mockResolvedValue(undefined),
  loadGraph: vi.fn(),
}))

import { saveGraph, loadGraph } from '../../../src/graph/persist'
const mockSave = vi.mocked(saveGraph)
const mockLoad = vi.mocked(loadGraph)

function makeGraph(): CodeGraph {
  return {
    version: 1, createdAt: Date.now(), repo_root: '/tmp',
    node_count: 1, edge_count: 0, completeness_pct: 100,
    nodes: new Map([['a.ts::fn', { id: 'a.ts::fn', file: 'a.ts', name: 'fn', kind: 'function', line_start: 1, line_end: 2, language: 'typescript', is_exported: false, resolution: 'static' }]]),
    edges: [], languages: ['typescript'], git_available: false,
  }
}

beforeEach(() => { vi.clearAllMocks() })

describe('GraphStore', () => {
  it('load delegates to loadGraph and returns graph when fresh', async () => {
    const graph = makeGraph()
    mockLoad.mockResolvedValue({ graph, ageMs: 100 })
    const store = new GraphStore('/repo/.stinkit')
    const result = await store.load()
    expect(result).toBe(graph)
    expect(mockLoad).toHaveBeenCalledWith('/repo/.stinkit')
  })

  it('load returns null when loadGraph returns null', async () => {
    mockLoad.mockResolvedValue(null)
    const store = new GraphStore('/repo/.stinkit')
    const result = await store.load()
    expect(result).toBeNull()
  })

  it('load returns null when graph is stale (ageMs > maxAgeMs)', async () => {
    mockLoad.mockResolvedValue({ graph: makeGraph(), ageMs: 10_000 })
    const store = new GraphStore('/repo/.stinkit')
    const result = await store.load(5_000)
    expect(result).toBeNull()
  })

  it('load returns graph when age is within maxAgeMs', async () => {
    const graph = makeGraph()
    mockLoad.mockResolvedValue({ graph, ageMs: 1_000 })
    const store = new GraphStore('/repo/.stinkit')
    const result = await store.load(5_000)
    expect(result).toBe(graph)
  })

  it('save delegates to saveGraph', async () => {
    const graph = makeGraph()
    const store = new GraphStore('/repo/.stinkit')
    await store.save(graph)
    expect(mockSave).toHaveBeenCalledWith('/repo/.stinkit', graph)
  })

  it('exists returns true when graph file is present', async () => {
    mockLoad.mockResolvedValue({ graph: makeGraph(), ageMs: 0 })
    const store = new GraphStore('/repo/.stinkit')
    expect(await store.exists()).toBe(true)
  })

  it('exists returns false when graph file is missing', async () => {
    mockLoad.mockResolvedValue(null)
    const store = new GraphStore('/repo/.stinkit')
    expect(await store.exists()).toBe(false)
  })

  it('ageMs returns null when graph file is missing', async () => {
    mockLoad.mockResolvedValue(null)
    const store = new GraphStore('/repo/.stinkit')
    expect(await store.ageMs()).toBeNull()
  })

  it('ageMs returns number when graph exists', async () => {
    mockLoad.mockResolvedValue({ graph: makeGraph(), ageMs: 5000 })
    const store = new GraphStore('/repo/.stinkit')
    expect(await store.ageMs()).toBe(5000)
  })
})
