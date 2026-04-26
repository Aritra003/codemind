import { describe, it, expect } from 'vitest'
import type { NodeId } from '@stinkit/shared'
import { rankCommits, type GitCommit } from '../../../src/forensics/ranking'

const MAX_LOOKBACK_DAYS = 180

function makeCommit(hash: string, files: string[], daysAgo: number, msg = 'fix'): GitCommit {
  const date = new Date(Date.now() - daysAgo * 86_400_000).toISOString()
  return { hash, author_name: 'Alice', author_email: 'alice@example.com', date, message: msg, changed_files: files }
}

describe('rankCommits — adversarial QA', () => {
  it('commit at exactly MAX_LOOKBACK_DAYS (180 days) has recency = 0', () => {
    const commits = [makeCommit('old', ['src/a.ts'], MAX_LOOKBACK_DAYS)]
    const ranked = rankCommits(commits, ['a'], ['src/a.ts::fn' as NodeId])
    // score = min(1, symbolOverlap*0.4 + 0*0.4) — recency exactly 0
    // Both symbolOverlap and recency contribute to score; recency at 180d = 0
    expect(ranked[0]!.score).toBeLessThanOrEqual(0.4)
  })

  it('commit older than MAX_LOOKBACK_DAYS also has recency = 0 (clamped by Math.max)', () => {
    const commits = [makeCommit('ancient', ['src/a.ts'], 200)]
    const ranked = rankCommits(commits, ['a'], ['src/a.ts::fn' as NodeId])
    expect(ranked[0]!.score).toBeLessThanOrEqual(0.4)
  })

  it('future-dated commit does not produce score > 1 (clamped by min(1, ...))', () => {
    const futureDateMs = Date.now() + 10 * 86_400_000  // 10 days in future
    const commit: GitCommit = {
      hash: 'future', author_name: 'Bob', author_email: 'b@b.com',
      date: new Date(futureDateMs).toISOString(),
      message: 'fix', changed_files: ['src/a.ts'],
    }
    const ranked = rankCommits([commit], ['a'], ['src/a.ts::fn' as NodeId])
    expect(ranked[0]!.score).toBeLessThanOrEqual(1)
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(0)
  })

  it('tie-breaking: commits with equal scores are sorted deterministically by hash', () => {
    // Both commits touch the same file, same age — scores must be equal
    // Result order must be deterministic (hash ascending)
    const commits = [
      makeCommit('bbb', ['src/a.ts'], 10),
      makeCommit('aaa', ['src/a.ts'], 10),
    ]
    const ranked = rankCommits(commits, ['nonexistent'], ['src/a.ts::fn' as NodeId])
    // Scores equal → sorted by hash ascending
    expect(ranked[0]!.hash).toBe('aaa')
    expect(ranked[1]!.hash).toBe('bbb')
  })

  it('only symbol overlap contributes when no relevant nodes match', () => {
    // relevantNodes has no file overlap with commits → only message match can score
    const commits = [makeCommit('aaa', ['src/unrelated.ts'], 1, 'fix auth login')]
    const ranked = rankCommits(commits, ['auth'], [])
    // No relevantFiles, but symbols=['auth'] matches message 'fix auth login'
    expect(ranked[0]!.score).toBeGreaterThan(0)
  })

  it('commit with no file overlap and no symbol match in message scores 0', () => {
    const commits = [makeCommit('zzz', ['src/css.ts'], MAX_LOOKBACK_DAYS, 'fix styles')]
    const ranked = rankCommits(commits, ['auth'], ['src/auth.ts::login' as NodeId])
    expect(ranked[0]!.score).toBe(0)
  })
})
