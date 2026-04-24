import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CodemindResult, BlastRadius } from '@codemind/shared'
import type { DriftReport } from '../../../src/commands/see'
import type { ForensicsTrace } from '../../../src/commands/trace'

vi.mock('fs/promises', () => ({
  mkdir:     vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

import * as fs from 'fs/promises'
import { writeCheckReport, writeSeeReport, writeTraceReport } from '../../../src/lib/output/html-report'

const META = { completeness_pct: 95, duration_ms: 42 }

const BLAST: BlastRadius = {
  changed_nodes: ['src/auth.ts::login'], direct_dependents: ['src/user.ts::getUser'],
  transitive_dependents: [], risk_level: 'HIGH', coverage_gaps: [], completeness_pct: 95,
}

const DRIFT: DriftReport = {
  diagram_path: 'docs/arch.png', phantom_count: 1, missing_count: 2,
  accuracy_pct: 80, extraction_retries: 0, entities_matched: [],
}

const TRACE: ForensicsTrace = {
  origin_classification: 'SINGLE_COMMIT',
  ranked_commits: [{ hash: 'abc123', author: 'Alice', date: '2024-01-01', message: 'fix', score: 0.8, changed_nodes: [] }],
  code_paths: [], confidence_cap: 0.8, completeness_pct: 95,
}

describe('writeCheckReport', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns a path inside .codemind/reports/', async () => {
    const path = await writeCheckReport({ status: 'success', data: BLAST, meta: META }, '/repo')
    expect(path).toContain('.codemind/reports/')
  })

  it('filename starts with "check-"', async () => {
    const path = await writeCheckReport({ status: 'success', data: BLAST, meta: META }, '/repo')
    expect(path.split('/').pop()).toMatch(/^check-/)
  })

  it('filename ends with .html', async () => {
    const path = await writeCheckReport({ status: 'success', data: BLAST, meta: META }, '/repo')
    expect(path).toMatch(/\.html$/)
  })

  it('creates the reports directory before writing', async () => {
    await writeCheckReport({ status: 'success', data: BLAST, meta: META }, '/repo')
    expect(fs.mkdir).toHaveBeenCalledWith(
      expect.stringContaining('.codemind/reports'),
      expect.objectContaining({ recursive: true }),
    )
  })

  it('HTML content contains risk level', async () => {
    await writeCheckReport({ status: 'success', data: BLAST, meta: META }, '/repo')
    const [, content] = vi.mocked(fs.writeFile).mock.calls[0] as [string, string]
    expect(content).toContain('HIGH')
  })

  it('HTML content is a valid HTML document', async () => {
    await writeCheckReport({ status: 'success', data: BLAST, meta: META }, '/repo')
    const [, content] = vi.mocked(fs.writeFile).mock.calls[0] as [string, string]
    expect(content).toContain('<!DOCTYPE html>')
    expect(content).toContain('</html>')
  })
})

describe('writeSeeReport', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns a path with "see-" prefix filename', async () => {
    const path = await writeSeeReport({ status: 'success', data: DRIFT, meta: META }, '/repo')
    expect(path.split('/').pop()).toMatch(/^see-/)
  })

  it('HTML content contains accuracy percentage', async () => {
    await writeSeeReport({ status: 'success', data: DRIFT, meta: META }, '/repo')
    const [, content] = vi.mocked(fs.writeFile).mock.calls[0] as [string, string]
    expect(content).toContain('80')
  })

  it('HTML content contains diagram path', async () => {
    await writeSeeReport({ status: 'success', data: DRIFT, meta: META }, '/repo')
    const [, content] = vi.mocked(fs.writeFile).mock.calls[0] as [string, string]
    expect(content).toContain('docs/arch.png')
  })
})

describe('writeTraceReport', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns a path with "trace-" prefix filename', async () => {
    const path = await writeTraceReport({ status: 'success', data: TRACE, meta: META }, '/repo')
    expect(path.split('/').pop()).toMatch(/^trace-/)
  })

  it('HTML content contains origin classification', async () => {
    await writeTraceReport({ status: 'success', data: TRACE, meta: META }, '/repo')
    const [, content] = vi.mocked(fs.writeFile).mock.calls[0] as [string, string]
    expect(content).toContain('SINGLE_COMMIT')
  })

  it('HTML content contains commit hash', async () => {
    await writeTraceReport({ status: 'success', data: TRACE, meta: META }, '/repo')
    const [, content] = vi.mocked(fs.writeFile).mock.calls[0] as [string, string]
    expect(content).toContain('abc123')
  })
})
