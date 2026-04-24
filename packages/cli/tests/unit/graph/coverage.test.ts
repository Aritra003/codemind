import { describe, it, expect } from 'vitest'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs/promises'
import type { GraphNode } from '@codemind/shared'
import { loadCoverage } from '../../../src/graph/coverage'

const FIXTURES = path.join(__dirname, '../../fixtures/coverage')

function makeNode(id: string, file: string): GraphNode {
  return { id, file, name: id.split('::')[1]!, kind: 'function', line_start: 1, line_end: 5, language: 'typescript', is_exported: false, resolution: 'static' }
}

describe('loadCoverage', () => {
  it('returns empty map when no coverage files found', async () => {
    const result = await loadCoverage('/nonexistent/path', [makeNode('src/a.ts::foo', 'src/a.ts')])
    expect(result.size).toBe(0)
  })

  it('parses lcov.info and marks covered functions', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cov-lcov-'))
    await fs.mkdir(path.join(tmpDir, 'coverage'), { recursive: true })
    await fs.copyFile(path.join(FIXTURES, 'lcov.info'), path.join(tmpDir, 'coverage/lcov.info'))

    const nodes = [
      makeNode('src/math.ts::add',      'src/math.ts'),
      makeNode('src/math.ts::multiply', 'src/math.ts'),
    ]
    const result = await loadCoverage(tmpDir, nodes)

    expect(result.get('src/math.ts::add')?.covered).toBe(true)
    expect(result.get('src/math.ts::multiply')?.covered).toBe(false)
    expect(result.get('src/math.ts::add')?.format).toBe('lcov')
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('parses coverage-summary.json (istanbul/v8)', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cov-istanbul-'))
    await fs.mkdir(path.join(tmpDir, 'coverage'), { recursive: true })
    await fs.copyFile(path.join(FIXTURES, 'coverage-summary.json'), path.join(tmpDir, 'coverage/coverage-summary.json'))

    const nodes = [
      makeNode('src/math.ts::add',   'src/math.ts'),
      makeNode('src/index.ts::main', 'src/index.ts'),
    ]
    const result = await loadCoverage(tmpDir, nodes)

    expect(result.get('src/math.ts::add')?.covered).toBe(false)     // 50% fn coverage → uncovered
    expect(result.get('src/index.ts::main')?.covered).toBe(true)    // 100% fn coverage → covered
    expect(result.get('src/math.ts::add')?.format).toBe('istanbul')
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('does not throw when coverage directory is missing', async () => {
    const nodes = [makeNode('src/a.ts::fn', 'src/a.ts')]
    await expect(loadCoverage('/totally/missing', nodes)).resolves.toBeInstanceOf(Map)
  })

  it('nodes not found in coverage file get covered=false', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cov-miss-'))
    await fs.mkdir(path.join(tmpDir, 'coverage'), { recursive: true })
    await fs.copyFile(path.join(FIXTURES, 'lcov.info'), path.join(tmpDir, 'coverage/lcov.info'))

    const nodes = [makeNode('src/unknown.ts::fn', 'src/unknown.ts')]
    const result = await loadCoverage(tmpDir, nodes)
    expect(result.get('src/unknown.ts::fn')?.covered).toBe(false)
    await fs.rm(tmpDir, { recursive: true, force: true })
  })
})
