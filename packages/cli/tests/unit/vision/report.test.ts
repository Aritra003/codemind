import { describe, it, expect } from 'vitest'
import type { DriftReport, EntityMatch } from '../../../src/commands/see'
import { generateMermaidDiff } from '../../../src/vision/report'

function makeMatch(label: string, nodeId: string | null): EntityMatch {
  return {
    diagram_label: label,
    code_node_id:  nodeId,
    confidence:    0.8,
    resolution:    nodeId ? 'exact' : 'unmatched',
  }
}

function makeReport(matches: EntityMatch[], missing = 0): DriftReport {
  return {
    diagram_path:       'arch.png',
    phantom_count:      matches.filter(m => m.code_node_id === null).length,
    missing_count:      missing,
    accuracy_pct:       75,
    extraction_retries: 0,
    entities_matched:   matches,
  }
}

describe('generateMermaidDiff', () => {
  it('produces valid Mermaid header', () => {
    const out = generateMermaidDiff(makeReport([]))
    expect(out.trim()).toMatch(/^graph/)
  })

  it('phantom nodes appear in output', () => {
    const report = makeReport([makeMatch('Ghost', null), makeMatch('Auth', 'src/auth.ts::Auth')])
    const out = generateMermaidDiff(report)
    expect(out).toContain('Ghost')
    expect(out).toContain('Auth')
  })

  it('phantom node annotated with phantom style', () => {
    const report = makeReport([makeMatch('Ghost', null)])
    const out = generateMermaidDiff(report)
    expect(out).toMatch(/phantom/)
  })

  it('matched node annotated with matched style', () => {
    const report = makeReport([makeMatch('Auth', 'src/auth.ts::Auth')])
    const out = generateMermaidDiff(report)
    expect(out).toMatch(/matched/)
  })

  it('empty report produces valid (non-empty) Mermaid', () => {
    const out = generateMermaidDiff(makeReport([]))
    expect(out.length).toBeGreaterThan(0)
    expect(out).toContain('graph')
  })

  it('classDef declarations are included for all used styles', () => {
    const report = makeReport([makeMatch('Ghost', null), makeMatch('Auth', 'src/auth.ts::Auth')])
    const out = generateMermaidDiff(report)
    expect(out).toContain('classDef matched')
    expect(out).toContain('classDef phantom')
  })
})
