import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GraphNode } from '@codemind/shared'
import { loadNodeHistory } from '../../../src/graph/git'

vi.mock('simple-git')

const mockGit = {
  checkIsRepo: vi.fn(),
  raw:         vi.fn(),
}

import simpleGit from 'simple-git'
const mockSimpleGit = vi.mocked(simpleGit)

beforeEach(() => {
  vi.clearAllMocks()
  mockSimpleGit.mockReturnValue(mockGit as unknown as ReturnType<typeof simpleGit>)
})

function makeNode(id: string, file: string): GraphNode {
  return { id, file, name: id.split('::')[1]!, kind: 'function', line_start: 1, line_end: 5, language: 'typescript', is_exported: false, resolution: 'static' }
}

describe('loadNodeHistory', () => {
  it('returns empty map when git is not available', async () => {
    mockGit.checkIsRepo.mockResolvedValue(false)
    const result = await loadNodeHistory('/repo', [makeNode('src/a.ts::foo', 'src/a.ts')])
    expect(result.size).toBe(0)
  })

  it('returns empty map when checkIsRepo throws', async () => {
    mockGit.checkIsRepo.mockRejectedValue(new Error('not git'))
    const result = await loadNodeHistory('/repo', [makeNode('src/a.ts::foo', 'src/a.ts')])
    expect(result.size).toBe(0)
  })

  it('returns history entry for each node when git is available', async () => {
    mockGit.checkIsRepo.mockResolvedValue(true)
    mockGit.raw.mockResolvedValue('Alice\nBob\nAlice\n')
    const node = makeNode('src/a.ts::foo', 'src/a.ts')
    const result = await loadNodeHistory('/repo', [node])
    expect(result.has('src/a.ts::foo')).toBe(true)
    const entry = result.get('src/a.ts::foo')!
    expect(entry.change_count_6mo).toBe(3)
    expect(entry.authors).toContain('Alice')
    expect(entry.authors).toContain('Bob')
  })

  it('deduplicates author names', async () => {
    mockGit.checkIsRepo.mockResolvedValue(true)
    mockGit.raw.mockResolvedValue('Alice\nAlice\nAlice\n')
    const node = makeNode('src/b.ts::bar', 'src/b.ts')
    const result = await loadNodeHistory('/repo', [node])
    expect(result.get('src/b.ts::bar')!.authors).toEqual(['Alice'])
  })

  it('authors never contain email addresses', async () => {
    mockGit.checkIsRepo.mockResolvedValue(true)
    mockGit.raw.mockResolvedValue('Alice\nBob\n')
    const node = makeNode('src/c.ts::baz', 'src/c.ts')
    const result = await loadNodeHistory('/repo', [node])
    const { authors } = result.get('src/c.ts::baz')!
    expect(authors.some(a => a.includes('@'))).toBe(false)
  })

  it('groups multiple nodes in same file under one git call', async () => {
    mockGit.checkIsRepo.mockResolvedValue(true)
    mockGit.raw.mockResolvedValue('Alice\n')
    const nodes = [
      makeNode('src/d.ts::fn1', 'src/d.ts'),
      makeNode('src/d.ts::fn2', 'src/d.ts'),
    ]
    const result = await loadNodeHistory('/repo', nodes)
    expect(result.size).toBe(2)
    expect(mockGit.raw).toHaveBeenCalledTimes(1)
  })

  it('returns change_count_6mo=0 for empty git output', async () => {
    mockGit.checkIsRepo.mockResolvedValue(true)
    mockGit.raw.mockResolvedValue('')
    const node = makeNode('src/e.ts::fn', 'src/e.ts')
    const result = await loadNodeHistory('/repo', [node])
    expect(result.get('src/e.ts::fn')!.change_count_6mo).toBe(0)
  })
})
