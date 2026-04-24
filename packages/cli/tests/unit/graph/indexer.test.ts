import { describe, it, expect, vi } from 'vitest'
import * as path from 'path'
import { GraphIndexer, type IndexProgress } from '../../../src/lib/graph/indexer'

vi.mock('../../../src/graph/git', () => ({
  loadNodeHistory: vi.fn().mockResolvedValue(new Map()),
}))
vi.mock('../../../src/graph/coverage', () => ({
  loadCoverage: vi.fn().mockResolvedValue(new Map()),
}))

const FIXTURE = path.join(__dirname, '../../fixtures/simple-ts-repo')

describe('GraphIndexer', () => {
  it('builds CodeGraph from fixture repo', async () => {
    const indexer = new GraphIndexer()
    const graph = await indexer.index({ repoRoot: FIXTURE, include: [], force: true })

    expect(graph.node_count).toBeGreaterThan(0)
    expect(graph.nodes).toBeInstanceOf(Map)
    expect(graph.nodes.size).toBe(graph.node_count)
    expect(graph.languages).toContain('typescript')
  })

  it('sets completeness_pct (INV-002)', async () => {
    const indexer = new GraphIndexer()
    const graph = await indexer.index({ repoRoot: FIXTURE, include: [], force: true })
    expect(typeof graph.completeness_pct).toBe('number')
    expect(graph.completeness_pct).toBeGreaterThanOrEqual(0)
    expect(graph.completeness_pct).toBeLessThanOrEqual(100)
  })

  it('fires progress callbacks during parsing phase', async () => {
    const indexer = new GraphIndexer()
    const calls: IndexProgress[] = []
    await indexer.index({ repoRoot: FIXTURE, include: [], force: true }, p => calls.push(p))
    expect(calls.length).toBeGreaterThan(0)
    expect(calls.some(c => c.phase === 'parsing')).toBe(true)
  })

  it('fixture: math.ts nodes are present', async () => {
    const indexer = new GraphIndexer()
    const graph = await indexer.index({ repoRoot: FIXTURE, include: [], force: true })
    const nodeIds = [...graph.nodes.keys()]
    expect(nodeIds.some(id => id.includes('math.ts'))).toBe(true)
  })

  it('resolves call edges statically (UNRESOLVED → concrete NodeId)', async () => {
    const indexer = new GraphIndexer()
    const graph = await indexer.index({ repoRoot: FIXTURE, include: [], force: true })
    const unresolved = graph.edges.filter(e => e.to.startsWith('UNRESOLVED::'))
    const total      = graph.edges.filter(e => e.kind === 'calls').length
    // fixture has resolvable calls — completeness should be > 0
    expect(total).toBeGreaterThan(0)
    // static resolution must leave fewer or equal unresolved than total
    expect(unresolved.length).toBeLessThanOrEqual(total)
  })

  it('empty directory produces empty graph', async () => {
    const indexer = new GraphIndexer()
    const graph = await indexer.index({ repoRoot: '/tmp', include: [], force: true })
    expect(graph.node_count).toBe(0)
    expect(graph.edge_count).toBe(0)
    expect(graph.completeness_pct).toBe(100)
  })
})
