import { describe, it, expect } from 'vitest'
import type { CodeGraph, GraphNode, GraphEdge } from '@stinkit/shared'
import { generateMermaid } from '../../../src/vision/generate'

function makeGraph(
  nodes: Array<{ id: string; file: string; name: string; kind?: string }>,
  edges: Array<{ from: string; to: string; kind?: string }> = [],
): CodeGraph {
  const nodeMap = new Map<string, GraphNode>(
    nodes.map(n => [
      n.id,
      {
        id:          n.id,
        file:        n.file,
        name:        n.name,
        kind:        (n.kind ?? 'function') as GraphNode['kind'],
        line_start:  1,
        line_end:    5,
        language:    'typescript',
        is_exported: true,
        resolution:  'static',
      } as GraphNode,
    ]),
  )
  return {
    version:          1,
    createdAt:        0,
    repo_root:        '/repo',
    node_count:       nodes.length,
    edge_count:       edges.length,
    completeness_pct: 100,
    nodes:            nodeMap,
    edges:            edges.map(e => ({
      from:   e.from,
      to:     e.to,
      kind:   (e.kind ?? 'calls') as GraphEdge['kind'],
      weight: 1,
    })),
    languages:     ['typescript'],
    git_available: false,
  }
}

describe('generateMermaid', () => {
  it('always starts with "graph LR"', () => {
    const graph = makeGraph([{ id: 'src/a.ts::foo', file: 'src/a.ts', name: 'foo' }])
    const result = generateMermaid(graph)
    expect(result.diagram).toMatch(/^graph LR/)
  })

  it('returns just "graph LR" for empty graph', () => {
    const graph = makeGraph([])
    const result = generateMermaid(graph)
    expect(result.diagram.trim()).toBe('graph LR')
    expect(result.nodeCount).toBe(0)
    expect(result.edgeCount).toBe(0)
  })

  it('sanitises :: / . to valid Mermaid IDs', () => {
    const graph = makeGraph([{ id: 'src/auth/service.ts::login', file: 'src/auth/service.ts', name: 'login' }])
    const result = generateMermaid(graph)
    expect(result.diagram).toContain('src_auth_service_ts__login')
    expect(result.diagram).not.toContain('::')
    // slashes in subgraph labels are fine; check node ID line has no slash
    const nodeIdLine = result.diagram.split('\n').find(l => l.includes('src_auth_service_ts__login['))
    expect(nodeIdLine).toBeDefined()
    expect(nodeIdLine).not.toMatch(/src\//)
  })

  it('groups nodes by file using subgraph', () => {
    const graph = makeGraph([
      { id: 'src/a.ts::foo', file: 'src/a.ts', name: 'foo' },
      { id: 'src/b.ts::bar', file: 'src/b.ts', name: 'bar' },
    ])
    const result = generateMermaid(graph)
    expect(result.diagram).toContain('subgraph src/a.ts')
    expect(result.diagram).toContain('subgraph src/b.ts')
  })

  it('labels function nodes with just the name', () => {
    const graph = makeGraph([{ id: 'src/a.ts::foo', file: 'src/a.ts', name: 'foo', kind: 'function' }])
    const result = generateMermaid(graph)
    expect(result.diagram).toContain('["foo"]')
  })

  it('labels class nodes with name (class)', () => {
    const graph = makeGraph([{ id: 'src/a.ts::MyClass', file: 'src/a.ts', name: 'MyClass', kind: 'class' }])
    const result = generateMermaid(graph)
    expect(result.diagram).toContain('["MyClass (class)"]')
  })

  it('labels method nodes with name (method)', () => {
    const graph = makeGraph([{ id: 'src/a.ts::doThing', file: 'src/a.ts', name: 'doThing', kind: 'method' }])
    const result = generateMermaid(graph)
    expect(result.diagram).toContain('["doThing (method)"]')
  })

  it('labels arrow_function nodes with name (arrow)', () => {
    const graph = makeGraph([{ id: 'src/a.ts::handler', file: 'src/a.ts', name: 'handler', kind: 'arrow_function' }])
    const result = generateMermaid(graph)
    expect(result.diagram).toContain('["handler (arrow)"]')
  })

  it('labels module nodes with name (module)', () => {
    const graph = makeGraph([{ id: 'src/a.ts::__module__', file: 'src/a.ts', name: '__module__', kind: 'module' }])
    const result = generateMermaid(graph)
    expect(result.diagram).toContain('["__module__ (module)"]')
  })

  it('renders calls edges as -->', () => {
    const graph = makeGraph(
      [
        { id: 'src/a.ts::foo', file: 'src/a.ts', name: 'foo' },
        { id: 'src/b.ts::bar', file: 'src/b.ts', name: 'bar' },
      ],
      [{ from: 'src/a.ts::foo', to: 'src/b.ts::bar', kind: 'calls' }],
    )
    const result = generateMermaid(graph)
    expect(result.diagram).toContain('src_a_ts__foo --> src_b_ts__bar')
  })

  it('renders imports edges as -.->', () => {
    const graph = makeGraph(
      [
        { id: 'src/a.ts::foo', file: 'src/a.ts', name: 'foo' },
        { id: 'src/b.ts::bar', file: 'src/b.ts', name: 'bar' },
      ],
      [{ from: 'src/a.ts::foo', to: 'src/b.ts::bar', kind: 'imports' }],
    )
    const result = generateMermaid(graph)
    expect(result.diagram).toContain('src_a_ts__foo -.-> src_b_ts__bar')
  })

  it('renders extends edges as --|>', () => {
    const graph = makeGraph(
      [
        { id: 'src/a.ts::Base', file: 'src/a.ts', name: 'Base', kind: 'class' },
        { id: 'src/b.ts::Child', file: 'src/b.ts', name: 'Child', kind: 'class' },
      ],
      [{ from: 'src/b.ts::Child', to: 'src/a.ts::Base', kind: 'extends' }],
    )
    const result = generateMermaid(graph)
    expect(result.diagram).toContain('src_b_ts__Child --|> src_a_ts__Base')
  })

  it('renders implements edges as --|>', () => {
    const graph = makeGraph(
      [
        { id: 'src/a.ts::IFoo', file: 'src/a.ts', name: 'IFoo', kind: 'class' },
        { id: 'src/b.ts::FooImpl', file: 'src/b.ts', name: 'FooImpl', kind: 'class' },
      ],
      [{ from: 'src/b.ts::FooImpl', to: 'src/a.ts::IFoo', kind: 'implements' }],
    )
    const result = generateMermaid(graph)
    expect(result.diagram).toContain('src_b_ts__FooImpl --|> src_a_ts__IFoo')
  })

  it('renders declared edges as ---', () => {
    const graph = makeGraph(
      [
        { id: 'src/a.ts::foo', file: 'src/a.ts', name: 'foo' },
        { id: 'src/b.ts::bar', file: 'src/b.ts', name: 'bar' },
      ],
      [{ from: 'src/a.ts::foo', to: 'src/b.ts::bar', kind: 'declared' }],
    )
    const result = generateMermaid(graph)
    expect(result.diagram).toContain('src_a_ts__foo --- src_b_ts__bar')
  })

  it('filters nodes by scope prefix (INV-GEN-04)', () => {
    const graph = makeGraph([
      { id: 'src/services/auth.ts::login', file: 'src/services/auth.ts', name: 'login' },
      { id: 'src/utils/hash.ts::hash',     file: 'src/utils/hash.ts',     name: 'hash'  },
    ])
    const result = generateMermaid(graph, { scope: 'src/services/' })
    expect(result.diagram).toContain('src_services_auth_ts__login')
    expect(result.diagram).not.toContain('src_utils_hash_ts__hash')
    expect(result.nodeCount).toBe(1)
  })

  it('returns empty diagram when scope matches nothing', () => {
    const graph = makeGraph([{ id: 'src/a.ts::foo', file: 'src/a.ts', name: 'foo' }])
    const result = generateMermaid(graph, { scope: 'src/nonexistent/' })
    expect(result.diagram.trim()).toBe('graph LR')
    expect(result.nodeCount).toBe(0)
  })

  it('renders out-of-scope edge targets as external stubs (INV-GEN-04)', () => {
    const graph = makeGraph(
      [
        { id: 'src/services/auth.ts::login', file: 'src/services/auth.ts', name: 'login' },
        { id: 'src/utils/hash.ts::hash',     file: 'src/utils/hash.ts',     name: 'hash'  },
      ],
      [{ from: 'src/services/auth.ts::login', to: 'src/utils/hash.ts::hash', kind: 'calls' }],
    )
    const result = generateMermaid(graph, { scope: 'src/services/' })
    expect(result.diagram).toContain('ext__src_utils_hash_ts__hash')
    expect(result.diagram).toContain('"hash (external)"')
  })

  it('does not render edges where both nodes are out of scope', () => {
    const graph = makeGraph(
      [
        { id: 'src/a.ts::foo', file: 'src/a.ts', name: 'foo' },
        { id: 'src/b.ts::bar', file: 'src/b.ts', name: 'bar' },
      ],
      [{ from: 'src/a.ts::foo', to: 'src/b.ts::bar', kind: 'calls' }],
    )
    const result = generateMermaid(graph, { scope: 'src/services/' })
    expect(result.edgeCount).toBe(0)
  })

  it('returns accurate nodeCount and edgeCount', () => {
    const graph = makeGraph(
      [
        { id: 'src/a.ts::foo', file: 'src/a.ts', name: 'foo' },
        { id: 'src/b.ts::bar', file: 'src/b.ts', name: 'bar' },
      ],
      [{ from: 'src/a.ts::foo', to: 'src/b.ts::bar', kind: 'calls' }],
    )
    const result = generateMermaid(graph)
    expect(result.nodeCount).toBe(2)
    expect(result.edgeCount).toBe(1)
  })

  it('returns a warning when nodeCount > 50 (INV-GEN-01)', () => {
    const nodes = Array.from({ length: 51 }, (_, i) => ({
      id:   `src/a.ts::fn${i}`,
      file: 'src/a.ts',
      name: `fn${i}`,
    }))
    const graph = makeGraph(nodes)
    const result = generateMermaid(graph)
    expect(result.warning).toBeDefined()
    expect(result.warning).toContain('51')
  })

  it('returns no warning when nodeCount is exactly 50', () => {
    const nodes = Array.from({ length: 50 }, (_, i) => ({
      id:   `src/a.ts::fn${i}`,
      file: 'src/a.ts',
      name: `fn${i}`,
    }))
    const graph = makeGraph(nodes)
    const result = generateMermaid(graph)
    expect(result.warning).toBeUndefined()
  })

  it('skips edges whose from or to node is not in the graph', () => {
    const graph = makeGraph(
      [{ id: 'src/a.ts::foo', file: 'src/a.ts', name: 'foo' }],
      [{ from: 'src/a.ts::foo', to: 'src/missing.ts::ghost', kind: 'calls' }],
    )
    // ghost node not in graph.nodes — should not crash, just skip or stub
    expect(() => generateMermaid(graph)).not.toThrow()
  })
})
