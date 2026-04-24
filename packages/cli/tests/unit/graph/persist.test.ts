import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs   from 'fs/promises'
import * as path from 'path'
import * as os   from 'os'
import { saveGraph, loadGraph } from '../../../src/graph/persist'
import type { CodeGraph } from '@codemind/shared'

let tmpDir: string

function makeGraph(overrides: Partial<CodeGraph> = {}): CodeGraph {
  return {
    version:         1,
    createdAt:       Date.now(),
    repo_root:       '/tmp/test',
    node_count:      2,
    edge_count:      1,
    completeness_pct: 80,
    nodes: new Map([
      ['src/a.ts::foo', { id: 'src/a.ts::foo', file: 'src/a.ts', name: 'foo', kind: 'function', line_start: 1, line_end: 3, language: 'typescript', is_exported: true, resolution: 'static' }],
      ['src/b.ts::bar', { id: 'src/b.ts::bar', file: 'src/b.ts', name: 'bar', kind: 'function', line_start: 1, line_end: 2, language: 'typescript', is_exported: false, resolution: 'static' }],
    ]),
    edges:     [{ from: 'src/a.ts::foo', to: 'src/b.ts::bar', kind: 'calls', weight: 1 }],
    languages: ['typescript'],
    git_available: false,
    ...overrides,
  }
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'persist-test-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('saveGraph / loadGraph', () => {
  it('returns null when graph file does not exist', async () => {
    const result = await loadGraph(tmpDir)
    expect(result).toBeNull()
  })

  it('round-trips a graph (save → load → identical)', async () => {
    const original = makeGraph()
    await saveGraph(tmpDir, original)
    const loaded = await loadGraph(tmpDir)
    expect(loaded).not.toBeNull()
    expect(loaded!.graph.node_count).toBe(original.node_count)
    expect(loaded!.graph.completeness_pct).toBe(original.completeness_pct)
    expect(loaded!.graph.languages).toEqual(original.languages)
  })

  it('preserves Map<NodeId, GraphNode> after round-trip', async () => {
    const original = makeGraph()
    await saveGraph(tmpDir, original)
    const { graph } = (await loadGraph(tmpDir))!
    expect(graph.nodes).toBeInstanceOf(Map)
    expect(graph.nodes.size).toBe(2)
    expect(graph.nodes.get('src/a.ts::foo')?.name).toBe('foo')
  })

  it('includes ageMs in loaded result', async () => {
    const before = Date.now()
    await saveGraph(tmpDir, makeGraph())
    const result = await loadGraph(tmpDir)
    expect(result!.ageMs).toBeGreaterThanOrEqual(0)
    expect(result!.ageMs).toBeLessThan(Date.now() - before + 1000)
  })

  it('writes atomically (no .tmp file left behind on success)', async () => {
    await saveGraph(tmpDir, makeGraph())
    const files = await fs.readdir(path.join(tmpDir, 'graph'))
    expect(files.some(f => f.endsWith('.tmp'))).toBe(false)
    expect(files).toContain('index.msgpack')
  })
})
