import type { AuditData, PositiveSignal, Finding } from './report-types'
import { esc } from './report-cover'

export function renderPositiveSignals(signals: PositiveSignal[]): string {
  const cards = signals.length > 0
    ? signals.map(s => `
<div class="signal">
  <h3>✓ ${esc(s.title)}</h3>
  <p style="margin:0;margin-top:.3rem">${esc(s.description)}</p>
</div>`).join('')
    : '<p>Run <code>stinkit index</code> to unlock positive signal detection.</p>'

  return `
<section class="section" id="s6">
  <div class="container">
    <h2 class="positive">What's Working Well</h2>
    <p>Reports that only list problems are demoralizing. These signals indicate areas of genuine engineering quality worth preserving.</p>
    ${cards}
  </div>
</section>`
}

export function renderRawFindings(data: AuditData): string {
  const byFile = new Map<string, Finding[]>()
  for (const f of data.findings) {
    const list = byFile.get(f.file) ?? []
    list.push(f)
    byFile.set(f.file, list)
  }

  if (byFile.size === 0 && data.circularChains.length === 0 && data.hotspots.length === 0) {
    return `
<section class="section" id="s7">
  <div class="container">
    <h2>Appendix — Raw Findings</h2>
    <p>No findings detected across ${data.fileCount.toLocaleString()} files.</p>
  </div>
</section>`
  }

  const fileBlocks = [...byFile.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([file, findings]) => {
    const rows = findings.map(f =>
      `<div style="padding:.3rem 0;border-bottom:1px solid var(--border)">
        <span class="badge badge-${esc(f.severity)}" style="font-size:.65rem">${esc(f.severity)}</span>
        <code style="margin-left:.5rem;font-size:.78rem">${f.line ? `L${f.line}` : ''}</code>
        <span style="color:var(--muted);font-size:.82rem;margin-left:.5rem">${esc(f.message)}</span>
      </div>`
    ).join('')
    return `
<div style="margin-bottom:1.2rem">
  <div style="font-family:var(--font-mono);font-size:.82rem;padding:.5rem .8rem;background:var(--surface2);border-radius:6px 6px 0 0;border:1px solid var(--border)">${esc(file)}</div>
  <div style="border:1px solid var(--border);border-top:none;padding:.3rem .8rem;border-radius:0 0 6px 6px">${rows}</div>
</div>`
  }).join('')

  const hotspotRows = data.hotspots.map(h => `
<tr>
  <td style="font-family:var(--font-mono);font-size:.8rem">${esc(h.file)}</td>
  <td style="text-align:right;font-family:var(--font-mono)">${h.dependentCount}</td>
  <td style="text-align:center">
    <span class="badge badge-${h.hasCoverage ? 'LOW' : 'HIGH'}" style="font-size:.65rem">${h.hasCoverage ? 'YES' : 'NO'}</span>
  </td>
</tr>`).join('')

  return `
<section class="section" id="s7">
  <div class="container">
    <h2>Appendix — Raw Findings</h2>
    <h3 style="margin-bottom:1rem;margin-top:1.5rem">Security & Quality Findings (by file)</h3>
    ${fileBlocks}
    ${data.hotspots.length > 0 ? `
    <h3 style="margin-bottom:1rem;margin-top:1.5rem">Top ${data.hotspots.length} Blast-Radius Hotspots</h3>
    <table class="meta-table">
      <thead><tr><td>File</td><td style="text-align:right">Dependents</td><td style="text-align:center">Tested</td></tr></thead>
      <tbody>${hotspotRows}</tbody>
    </table>` : ''}
    ${data.circularChains.length > 0 ? `
    <h3 style="margin-bottom:1rem;margin-top:1.5rem">Circular Dependency Chains</h3>
    ${data.circularChains.map(c => `<div class="file-entry" style="padding:.4rem 0">↻ ${esc(c.files.join(' → '))}</div>`).join('')}` : ''}
  </div>
</section>`
}

export function renderMetadata(data: AuditData): string {
  return `
<section class="section" id="s8">
  <div class="container">
    <h2>Report Metadata</h2>
    <table class="meta-table">
      <tbody>
        <tr><td>StinKit Version</td><td>5.0.0</td></tr>
        <tr><td>Report Generated</td><td>${esc(data.generatedAt)}</td></tr>
        <tr><td>Repository</td><td>${esc(data.repoName)}</td></tr>
        <tr><td>Files Indexed</td><td>${data.fileCount.toLocaleString()}</td></tr>
        <tr><td>Graph Nodes</td><td>${data.graph.nodeCount.toLocaleString()}</td></tr>
        <tr><td>Graph Edges</td><td>${data.graph.edgeCount.toLocaleString()}</td></tr>
        <tr><td>Graph Completeness</td><td>${data.graph.completenessPct.toFixed(1)}%</td></tr>
        <tr><td>Languages</td><td>${esc(data.languages.join(', ') || 'TypeScript')}</td></tr>
        <tr><td>Total Findings</td><td>${data.findings.length}</td></tr>
        <tr><td>Circular Chains</td><td>${data.circularChains.length}</td></tr>
      </tbody>
    </table>
    <h3 style="margin-top:1.5rem;margin-bottom:.5rem">Known Limitations</h3>
    <ul style="padding-left:1.5rem;color:var(--muted);font-size:.875rem">
      <li>Static analysis only — runtime behavior may differ.</li>
      <li>Coverage is estimated from test file existence, not instrumented coverage data.</li>
      <li>Dynamic imports (import(\`\${variable}\`)) are not resolved and may undercount edges.</li>
      <li>Security patterns use regex heuristics — false positives are possible, especially for test fixtures.</li>
      <li>Blast radius is computed from the call graph, not the module import graph.</li>
    </ul>
  </div>
</section>`
}
