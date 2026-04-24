import { describe, it, expect } from 'vitest'
import type { NodeId } from '@codemind/shared'
import { rankCommits, type GitCommit } from '../../../src/forensics/ranking'

function makeCommit(hash: string, files: string[], message = 'fix', daysAgo = 1, authorName = 'Alice', authorEmail = 'alice@example.com'): GitCommit {
  const date = new Date(Date.now() - daysAgo * 86_400_000).toISOString()
  return { hash, author_name: authorName, author_email: authorEmail, date, message, changed_files: files }
}

describe('rankCommits', () => {
  it('commit touching a relevant symbol scores higher than one that does not', () => {
    const commits = [
      makeCommit('aaa', ['src/auth.ts'], 'fix auth', 1),
      makeCommit('bbb', ['src/unrelated.ts'], 'fix typo', 1),
    ]
    const ranked = rankCommits(commits, ['auth'], ['src/auth.ts::login'])
    expect(ranked[0]!.hash).toBe('aaa')
  })

  it('more recent commit scores higher for same symbol overlap', () => {
    const commits = [
      makeCommit('old', ['src/auth.ts'], 'fix auth', 30),
      makeCommit('new', ['src/auth.ts'], 'fix auth', 1),
    ]
    const ranked = rankCommits(commits, ['auth'], ['src/auth.ts::login'])
    expect(ranked[0]!.hash).toBe('new')
  })

  it('INV-003: author field contains name only, never email', () => {
    const commits = [makeCommit('aaa', ['src/a.ts'], 'fix', 1, 'Bob Smith', 'bob@example.com')]
    const ranked = rankCommits(commits, [], [])
    expect(ranked[0]!.author).toBe('Bob Smith')
    expect(ranked[0]!.author).not.toContain('@')
  })

  it('returns at most 10 commits', () => {
    const commits = Array.from({ length: 20 }, (_, i) => makeCommit(`hash${i}`, ['src/a.ts'], 'fix', i + 1))
    const ranked = rankCommits(commits, ['a'], ['src/a.ts::fn'])
    expect(ranked.length).toBeLessThanOrEqual(10)
  })

  it('DL-012: output is deterministic for same input', () => {
    const commits = [
      makeCommit('aaa', ['src/auth.ts'], 'fix auth', 5),
      makeCommit('bbb', ['src/db.ts'], 'fix db', 10),
    ]
    const r1 = rankCommits(commits, ['auth'], ['src/auth.ts::login'])
    const r2 = rankCommits(commits, ['auth'], ['src/auth.ts::login'])
    expect(r1.map(c => c.hash)).toEqual(r2.map(c => c.hash))
  })

  it('returns empty array for empty commits', () => {
    expect(rankCommits([], ['auth'], [])).toEqual([])
  })

  it('score is between 0 and 1', () => {
    const commits = [makeCommit('aaa', ['src/auth.ts'], 'fix', 5)]
    const ranked = rankCommits(commits, ['auth'], ['src/auth.ts::fn' as NodeId])
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(0)
    expect(ranked[0]!.score).toBeLessThanOrEqual(1)
  })
})
