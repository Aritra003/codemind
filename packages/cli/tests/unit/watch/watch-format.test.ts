import { describe, it, expect } from 'vitest'
import type { BlastRadius } from '@stinkit/shared'
import { formatWatchAlert } from '../../../src/watch/watch-format'

function makeBlast(overrides: Partial<BlastRadius> = {}): BlastRadius {
  return {
    changed_nodes:        ['src/a.ts::foo'],
    direct_dependents:    [],
    transitive_dependents: [],
    risk_level:           'LOW',
    coverage_gaps:        [],
    completeness_pct:     100,
    ...overrides,
  }
}

describe('formatWatchAlert', () => {
  it('LOW produces a single line (no box)', () => {
    const out = formatWatchAlert('src/utils/format.ts', makeBlast({ risk_level: 'LOW' }))
    expect(out.split('\n')).toHaveLength(1)
  })

  it('LOW line contains the file name and risk level', () => {
    const out = formatWatchAlert('src/utils/format.ts', makeBlast({ risk_level: 'LOW' }))
    expect(out).toContain('src/utils/format.ts')
    expect(out).toContain('LOW')
  })

  it('LOW line shows dependent count', () => {
    const blast = makeBlast({
      risk_level:        'LOW',
      direct_dependents: ['src/b.ts::bar', 'src/c.ts::baz'],
    })
    const out = formatWatchAlert('src/utils/format.ts', blast)
    expect(out).toContain('2 dependent')
  })

  it('MEDIUM produces a single line (no box)', () => {
    const out = formatWatchAlert('src/api/routes.ts', makeBlast({ risk_level: 'MEDIUM' }))
    expect(out.split('\n')).toHaveLength(1)
  })

  it('MEDIUM line contains gap count when gaps exist', () => {
    const blast = makeBlast({
      risk_level:     'MEDIUM',
      coverage_gaps:  ['src/workers/webhook.ts'],
    })
    const out = formatWatchAlert('src/api/routes.ts', blast)
    expect(out).toContain('1 gap')
  })

  it('MEDIUM line shows "no gaps" when no coverage gaps', () => {
    const out = formatWatchAlert('src/api/routes.ts', makeBlast({ risk_level: 'MEDIUM' }))
    expect(out).toContain('no gaps')
  })

  it('HIGH produces a box (multiple lines with border chars)', () => {
    const out = formatWatchAlert('src/auth/middleware.ts', makeBlast({ risk_level: 'HIGH' }))
    expect(out.split('\n').length).toBeGreaterThan(3)
    expect(out).toContain('╭')
    expect(out).toContain('╰')
  })

  it('HIGH box contains the file name', () => {
    const out = formatWatchAlert('src/auth/middleware.ts', makeBlast({ risk_level: 'HIGH' }))
    expect(out).toContain('src/auth/middleware.ts')
  })

  it('HIGH box contains a `stinkit check` hint', () => {
    const out = formatWatchAlert('src/auth/middleware.ts', makeBlast({ risk_level: 'HIGH' }))
    expect(out).toContain('stinkit check')
  })

  it('HIGH box does NOT contain --think', () => {
    const out = formatWatchAlert('src/auth/middleware.ts', makeBlast({ risk_level: 'HIGH' }))
    expect(out).not.toContain('--think')
  })

  it('CRITICAL box contains --think hint', () => {
    const out = formatWatchAlert('src/db/connection.ts', makeBlast({ risk_level: 'CRITICAL' }))
    expect(out).toContain('--think')
  })

  it('CRITICAL box contains gap file names when gaps exist', () => {
    const blast = makeBlast({
      risk_level:    'CRITICAL',
      coverage_gaps: ['src/workers/webhook.ts', 'src/mobile/auth.ts'],
    })
    const out = formatWatchAlert('src/db/connection.ts', blast)
    expect(out).toContain('src/workers/webhook.ts')
  })

  it('output contains an HH:MM:SS timestamp pattern', () => {
    const out = formatWatchAlert('src/a.ts', makeBlast())
    expect(out).toMatch(/\d{2}:\d{2}:\d{2}/)
  })

  it('UNKNOWN risk produces a single line like LOW', () => {
    const out = formatWatchAlert('src/a.ts', makeBlast({ risk_level: 'UNKNOWN' }))
    expect(out.split('\n')).toHaveLength(1)
  })
})
