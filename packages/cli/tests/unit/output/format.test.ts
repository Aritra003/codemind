import { describe, it, expect } from 'vitest'
import type { CodemindResult, BlastRadius } from '@codemind/shared'
import type { DriftReport } from '../../../src/commands/see'
import type { ForensicsTrace } from '../../../src/commands/trace'
import { formatCheckResult, formatSeeResult, formatTraceResult } from '../../../src/lib/output/format'

function strip(s: string): string {
  return s.replace(/\x1B\[[0-9;]*m/g, '')
}

const META = { completeness_pct: 95, duration_ms: 42 }

const BLAST: BlastRadius = {
  changed_nodes:         ['src/auth.ts::login'],
  direct_dependents:     ['src/user.ts::getUser', 'src/api.ts::handler'],
  transitive_dependents: ['src/app.ts::main'],
  risk_level:            'HIGH',
  coverage_gaps:         ['src/user.ts::getUser'],
  completeness_pct:      95,
}

const DRIFT: DriftReport = {
  diagram_path:       'docs/arch.png',
  phantom_count:      2,
  missing_count:      3,
  accuracy_pct:       71,
  extraction_retries: 0,
  entities_matched:   [],
}

const TRACE: ForensicsTrace = {
  origin_classification: 'SINGLE_COMMIT',
  ranked_commits: [{
    hash: 'abc123', author: 'Alice', date: '2024-01-01T00:00:00Z',
    message: 'fix auth bug', score: 0.89, changed_nodes: [],
  }],
  code_paths:    [['src/auth.ts::login', 'src/user.ts::getUser']],
  confidence_cap: 0.8,
  completeness_pct: 95,
}

describe('formatCheckResult', () => {
  it('json=true returns parseable JSON with status field', () => {
    const out = formatCheckResult({ status: 'success', data: BLAST, meta: META }, true)
    const parsed = JSON.parse(out) as { status: string }
    expect(parsed.status).toBe('success')
  })

  it('shows risk level in non-json output', () => {
    const out = strip(formatCheckResult({ status: 'success', data: BLAST, meta: META }, false))
    expect(out).toContain('HIGH')
  })

  it('shows direct dependent count', () => {
    const out = strip(formatCheckResult({ status: 'success', data: BLAST, meta: META }, false))
    expect(out).toMatch(/Direct.*2|2.*direct/i)
  })

  it('shows transitive dependent count', () => {
    const out = strip(formatCheckResult({ status: 'success', data: BLAST, meta: META }, false))
    expect(out).toMatch(/Transitive.*1|1.*transitive/i)
  })

  it('shows coverage gap count', () => {
    const out = strip(formatCheckResult({ status: 'success', data: BLAST, meta: META }, false))
    expect(out).toMatch(/Gap.*1|1.*gap|1.*uncovered/i)
  })

  it('shows completeness percentage', () => {
    const out = strip(formatCheckResult({ status: 'success', data: BLAST, meta: META }, false))
    expect(out).toContain('95%')
  })

  it('shows error message for failed result', () => {
    const result: CodemindResult<BlastRadius> = {
      status: 'failed', data: null, meta: META,
      error: { code: 'GRAPH_NOT_FOUND', message: 'No graph found. Run codemind index first.' },
    }
    const out = strip(formatCheckResult(result, false))
    expect(out).toContain('No graph found')
  })

  it('shows warnings for partial result', () => {
    const result: CodemindResult<BlastRadius> = {
      status: 'partial', data: BLAST, meta: META, warnings: ['Some nodes unresolved'],
    }
    const out = strip(formatCheckResult(result, false))
    expect(out).toContain('Some nodes unresolved')
  })
})

describe('formatSeeResult', () => {
  it('json=true returns parseable JSON', () => {
    const out = formatSeeResult({ status: 'success', data: DRIFT, meta: META }, true)
    expect(() => JSON.parse(out)).not.toThrow()
  })

  it('shows accuracy percentage', () => {
    const out = strip(formatSeeResult({ status: 'success', data: DRIFT, meta: META }, false))
    expect(out).toContain('71%')
  })

  it('shows phantom count', () => {
    const out = strip(formatSeeResult({ status: 'success', data: DRIFT, meta: META }, false))
    expect(out).toMatch(/Phantom.*2|2.*phantom/i)
  })

  it('shows missing count', () => {
    const out = strip(formatSeeResult({ status: 'success', data: DRIFT, meta: META }, false))
    expect(out).toMatch(/Missing.*3|3.*missing/i)
  })

  it('shows diagram path', () => {
    const out = strip(formatSeeResult({ status: 'success', data: DRIFT, meta: META }, false))
    expect(out).toContain('docs/arch.png')
  })

  it('shows error message for failed result', () => {
    const result: CodemindResult<DriftReport> = {
      status: 'failed', data: null, meta: META,
      error: { code: 'FILE_NOT_FOUND', message: 'Diagram file not found.' },
    }
    const out = strip(formatSeeResult(result, false))
    expect(out).toContain('Diagram file not found')
  })
})

describe('formatTraceResult', () => {
  it('json=true returns parseable JSON', () => {
    const out = formatTraceResult({ status: 'success', data: TRACE, meta: META }, true)
    expect(() => JSON.parse(out)).not.toThrow()
  })

  it('shows origin classification', () => {
    const out = strip(formatTraceResult({ status: 'success', data: TRACE, meta: META }, false))
    expect(out).toContain('SINGLE_COMMIT')
  })

  it('shows top commit hash', () => {
    const out = strip(formatTraceResult({ status: 'success', data: TRACE, meta: META }, false))
    expect(out).toContain('abc123')
  })

  it('shows commit author name', () => {
    const out = strip(formatTraceResult({ status: 'success', data: TRACE, meta: META }, false))
    expect(out).toContain('Alice')
  })

  it('shows code paths count', () => {
    const out = strip(formatTraceResult({ status: 'success', data: TRACE, meta: META }, false))
    expect(out).toMatch(/path.*1|1.*path/i)
  })

  it('shows narrative when present', () => {
    const withNarrative = { ...TRACE, narrative: 'Root cause was a null pointer.' }
    const out = strip(formatTraceResult({ status: 'success', data: withNarrative, meta: META }, false))
    expect(out).toContain('Root cause was a null pointer.')
  })

  it('shows error message for failed result', () => {
    const result: CodemindResult<ForensicsTrace> = {
      status: 'failed', data: null, meta: META,
      error: { code: 'GRAPH_NOT_FOUND', message: 'Graph not found.' },
    }
    const out = strip(formatTraceResult(result, false))
    expect(out).toContain('Graph not found')
  })
})
