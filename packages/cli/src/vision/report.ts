import type { DriftReport } from '../commands/see'

export function generateMermaidDiff(report: DriftReport): string {
  const lines: string[] = ['graph LR']

  for (const entity of report.entities_matched) {
    const safeId  = entity.diagram_label.replace(/\W+/g, '_')
    const label   = entity.diagram_label.replace(/"/g, "'")
    const style   = entity.code_node_id !== null ? 'matched' : 'phantom'
    const symbol  = style === 'matched' ? '✓' : '⚠'
    lines.push(`  ${safeId}["${label} ${symbol}"]:::${style}`)
  }

  lines.push('')
  lines.push('  classDef matched fill:#22c55e,color:#fff')
  lines.push('  classDef phantom fill:#ef4444,color:#fff')
  lines.push('  classDef missing fill:#eab308,color:#000')

  return lines.join('\n')
}
