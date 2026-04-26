import { describe, it, expect, vi } from 'vitest'
import type { CodeGraph, GraphNode } from '@stinkit/shared'
import { AnalysisModule } from '../../../src/lib/analysis/analysis-module'

vi.mock('../../../src/graph/git', () => ({
  loadNodeHistory: vi.fn().mockResolvedValue(new Map()),
}))
vi.mock('../../../src/graph/coverage', () => ({
  loadCoverage: vi.fn().mockResolvedValue(new Map()),
}))

function makeNode(id: string, file: string): GraphNode {
  return { id, file, name: id.split('::')[1]!, kind: 'function', line_start: 1, line_end: 2, language: 'typescript', is_exported: false, resolution: 'static' }
}

function makeGraph(nodes: GraphNode[]): CodeGraph {
  return {
    version: 1, createdAt: 0, repo_root: '/repo',
    node_count: nodes.length, edge_count: 0, completeness_pct: 80,
    nodes: new Map(nodes.map(n => [n.id, n])),
    edges: [], languages: ['typescript'], git_available: false,
  }
}

describe('AnalysisModule', () => {
  it('resolveFilesToNodes matches by relative path', () => {
    const nodes = [makeNode('src/auth.ts::login', 'src/auth.ts')]
    const graph = makeGraph(nodes)
    const mod = new AnalysisModule(graph)
    const ids = mod.resolveFilesToNodes(['src/auth.ts'], '/repo')
    expect(ids).toContain('src/auth.ts::login')
  })

  it('resolveFilesToNodes handles absolute path input', () => {
    const nodes = [makeNode('src/auth.ts::login', 'src/auth.ts')]
    const graph = makeGraph(nodes)
    const mod = new AnalysisModule(graph)
    const ids = mod.resolveFilesToNodes(['/repo/src/auth.ts'], '/repo')
    expect(ids).toContain('src/auth.ts::login')
  })

  it('computeBlastRadius returns BlastRadius with risk_level set', async () => {
    const callerNode = makeNode('src/main.ts::main', 'src/main.ts')
    const calleeNode = makeNode('src/auth.ts::login', 'src/auth.ts')
    const graph = makeGraph([callerNode, calleeNode])
    graph.edges.push({ from: 'src/main.ts::main', to: 'src/auth.ts::login', kind: 'calls', weight: 1 })
    const mod = new AnalysisModule(graph)
    const radius = await mod.computeBlastRadius(['src/auth.ts'], '/repo')
    expect(radius.risk_level).toBeDefined()
    expect(radius.risk_level).not.toBe('UNKNOWN')
    expect(radius.direct_dependents).toContain('src/main.ts::main')
  })

  it('computeBlastRadius sets completeness_pct (INV-002)', async () => {
    const graph = makeGraph([makeNode('src/a.ts::fn', 'src/a.ts')])
    const mod = new AnalysisModule(graph)
    const radius = await mod.computeBlastRadius(['src/a.ts'], '/repo')
    expect(typeof radius.completeness_pct).toBe('number')
  })
})
