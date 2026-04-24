import { describe, it, expect } from 'vitest'
import * as path from 'path'
import { parseFile } from '../../../src/graph/parser'
import type { DiscoveredFile } from '../../../src/graph/walker'

const FIXTURE_DIR = path.resolve(__dirname, '../../fixtures/simple-ts-repo')

function makeFile(relativePath: string, language = 'typescript'): DiscoveredFile {
  return {
    absolutePath: path.join(FIXTURE_DIR, relativePath),
    relativePath,
    language,
  }
}

describe('parseFile — math.ts', () => {
  it('extracts all exported function declarations as nodes', async () => {
    const result = await parseFile(makeFile('src/math.ts'))
    const names = result.nodes.map(n => n.name).sort()
    expect(names).toContain('add')
    expect(names).toContain('multiply')
    expect(names).toContain('square')
    expect(result.parse_errors).toBe(0)
  })

  it('assigns correct NodeId format (relativePath::name)', async () => {
    const result = await parseFile(makeFile('src/math.ts'))
    const addNode = result.nodes.find(n => n.name === 'add')
    expect(addNode?.id).toBe('src/math.ts::add')
  })

  it('marks exported functions as is_exported', async () => {
    const result = await parseFile(makeFile('src/math.ts'))
    for (const node of result.nodes) {
      expect(node.is_exported).toBe(true)
    }
  })

  it('records correct line numbers (1-indexed)', async () => {
    const result = await parseFile(makeFile('src/math.ts'))
    const addNode = result.nodes.find(n => n.name === 'add')
    expect(addNode?.line_start).toBe(1)
    expect((addNode?.line_end ?? 0)).toBeGreaterThanOrEqual(1)
  })

  it('produces call edges from multiply → add', async () => {
    const result = await parseFile(makeFile('src/math.ts'))
    const callEdges = result.edges.filter(e => e.kind === 'calls')
    const targets = callEdges.map(e => e.to)
    expect(targets.some(t => t.endsWith('::add'))).toBe(true)
  })

  it('uses UNRESOLVED prefix for unresolved call targets', async () => {
    const result = await parseFile(makeFile('src/math.ts'))
    for (const edge of result.edges.filter(e => e.kind === 'calls')) {
      expect(edge.to).toMatch(/^(UNRESOLVED::|src\/)/)
    }
  })
})

describe('parseFile — index.ts', () => {
  it('extracts import edges', async () => {
    const result = await parseFile(makeFile('src/index.ts'))
    const importEdges = result.edges.filter(e => e.kind === 'imports')
    expect(importEdges.length).toBeGreaterThan(0)
  })

  it('records parse_errors = 0 for valid TypeScript', async () => {
    const result = await parseFile(makeFile('src/index.ts'))
    expect(result.parse_errors).toBe(0)
  })

  it('returns language = typescript on node', async () => {
    const result = await parseFile(makeFile('src/index.ts'))
    for (const node of result.nodes) {
      expect(node.language).toBe('typescript')
    }
  })
})
