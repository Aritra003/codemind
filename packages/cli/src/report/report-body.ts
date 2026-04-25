import type { Theme, AuditData } from './report-types'
import { esc } from './report-cover'

type MatrixCell = { themes: Theme[]; heat: 'hot' | 'warm' | 'cool' }

function matrixPosition(theme: Theme): { row: 0 | 1 | 2 | 3; col: 0 | 1 | 2 } {
  const rowMap: Record<string, 0 | 1 | 2 | 3> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  const row = rowMap[theme.severity] ?? 2
  const maxBlast = Math.max(...theme.findings.map(f => f.blastRadius ?? 0), 0)
  const col: 0 | 1 | 2 = maxBlast > 50 ? 2 : maxBlast > 10 ? 1 : 0
  return { row, col }
}

function dotColor(sev: string): string {
  const map: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' }
  return map[sev] ?? '#94a3b8'
}

export function renderRiskMatrix(themes: Theme[]): string {
  const rows = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const
  const cols = ['Low', 'Medium', 'High'] as const

  const grid: MatrixCell[][] = rows.map(() =>
    cols.map(() => ({ themes: [] as Theme[], heat: 'cool' as const }))
  )
  for (const t of themes) {
    const { row, col } = matrixPosition(t)
    const cell = grid[row]![col]!
    cell.themes.push(t)
    cell.heat = row === 0 && col >= 1 ? 'hot' : row <= 1 && col === 2 ? 'hot' : row <= 1 ? 'warm' : 'cool'
  }

  const header = cols.map(c => `<div class="rg-head" style="font-size:.65rem">${esc(c)}</div>`).join('')
  const rowsHtml = rows.map((sev, r) => {
    const label = `<div class="rg-head" style="writing-mode:vertical-rl;font-size:.6rem">${esc(sev)}</div>`
    const cells = grid[r]!.map(cell => {
      const dots = cell.themes.map(t =>
        `<span class="rg-dot" style="background:${dotColor(t.severity)}"></span>${esc(t.title)}<br>`
      ).join('')
      return `<div class="rg-cell rg-${cell.heat}">${dots || ''}</div>`
    }).join('')
    return label + cells
  }).join('')

  return `
<section class="section" id="s3">
  <div class="container">
    <h2 class="danger">Risk Matrix</h2>
    <p>Each cluster is plotted by severity (Y) and blast radius (X). Top-right = fix first.</p>
    <div class="risk-grid">
      <div></div>${header}
      ${rowsHtml}
    </div>
    <p style="font-size:.8rem;color:var(--muted)">Blast radius: Low &lt;10 · Medium 10–50 · High &gt;50 transitive dependents</p>
  </div>
</section>`
}

function renderThemeCard(theme: Theme): string {
  const files = [...new Set(theme.findings.map(f => f.file))].slice(0, 12)
  const fileList = files.map(file => {
    const lines = theme.findings.filter(f => f.file === file).map(f => f.line).filter(Boolean)
    return `<div class="file-entry">${esc(file)}${lines.length > 0 ? ` <span class="file-line">:${lines.join(', ')}</span>` : ''}</div>`
  }).join('')
  const tierLabel = theme.priorityTier.replace('_', ' ')

  return `
<div class="theme-card" id="theme-${esc(theme.id)}">
  <div class="theme-hdr" onclick="toggleTheme('${esc(theme.id)}')">
    <span class="badge badge-${esc(theme.severity)}">${esc(theme.severity)}</span>
    <span class="badge badge-${esc(theme.priorityTier)}">${esc(tierLabel)}</span>
    <h3 style="flex:1;margin:0">${esc(theme.title)}</h3>
    <span style="color:var(--muted);font-size:.85rem">${theme.findings.length} finding${theme.findings.length > 1 ? 's' : ''}</span>
    <span id="chv-${esc(theme.id)}" style="color:var(--muted);margin-left:.5rem">▶</span>
  </div>
  <div class="theme-body" id="body-${esc(theme.id)}">
    <div class="t-section"><div class="t-label">What We Found</div><p>${esc(theme.whatFound)}</p></div>
    <div class="t-section"><div class="t-label danger">Why This Is Dangerous</div><p>${esc(theme.whyDangerous)}</p></div>
    <div class="t-section">
      <div class="t-label action">What To Do</div>
      <pre class="code">${esc(theme.whatToDo)}</pre>
      <p style="margin-top:.5rem">Effort: <code>${esc(theme.effort)}</code></p>
    </div>
    <div class="t-section"><div class="t-label danger">What Happens If You Don't</div><p>${esc(theme.whatIfNot)}</p></div>
    <div class="t-section"><div class="t-label">Affected Files</div>${fileList}</div>
  </div>
</div>`
}

export function renderThemesSection(themes: Theme[]): string {
  const cards = themes.map(renderThemeCard).join('')
  return `
<section class="section" id="s4">
  <div class="container">
    <h2 class="danger">Findings by Theme</h2>
    <p>Click any card to expand. Each card contains: what we found · why it is dangerous · how to fix it · consequences of inaction · affected files.</p>
    ${cards || '<p>No findings detected. Run <code>codemind index</code> to build a fresh graph.</p>'}
  </div>
</section>`
}

export function renderRoadmap(themes: Theme[], data: AuditData): string {
  const today    = themes.filter(t => t.priorityTier === 'TODAY')
  const sprint   = themes.filter(t => t.priorityTier === 'THIS_SPRINT')
  const next     = themes.filter(t => t.priorityTier === 'NEXT_SPRINT')

  const li = (items: string[]): string => items.map(s => `<li>${esc(s)}</li>`).join('')

  const todayItems    = today.map(t => `${t.title} (${t.findings.length} instances)`)
  const sprintItems   = sprint.map(t => `${t.title} (${t.findings.length} instances)`)
  const nextItems     = next.map(t => `${t.title} (${t.findings.length} instances)`)

  const topSpot = data.hotspots[0]
  const uncovered = data.hotspots.filter(h => !h.hasCoverage).length
  const projectedScore = Math.min(100, data.graph.completenessPct > 0 ? 75 : 60)

  return `
<section class="section" id="s5">
  <div class="container">
    <h2>Remediation Roadmap</h2>
    <div class="timeline">
      <div class="tl-card">
        <div class="tl-tier today">TODAY &lt;1 hour</div>
        <ul class="tl-items">${li(todayItems.length ? todayItems : ['No critical items — excellent!'])}</ul>
      </div>
      <div class="tl-card">
        <div class="tl-tier sprint">THIS SPRINT 3–5 days</div>
        <ul class="tl-items">${li(sprintItems.length ? sprintItems : ['All high-severity items resolved'])}</ul>
      </div>
      <div class="tl-card">
        <div class="tl-tier next">NEXT SPRINT 2–3 days</div>
        <ul class="tl-items">${li(nextItems.length ? nextItems : ['Architectural improvements complete'])}</ul>
      </div>
      <div class="tl-card">
        <div class="tl-tier ongoing">ONGOING</div>
        <ul class="tl-items">
          <li>Run codemind audit monthly</li>
          <li>Add codemind check to CI/CD</li>
          ${uncovered > 0 ? `<li>Add tests to ${uncovered} uncovered hotspot${uncovered > 1 ? 's' : ''}</li>` : ''}
          ${topSpot ? `<li>Monitor blast radius of ${esc(topSpot.file.split('/').pop() ?? topSpot.file)}</li>` : ''}
        </ul>
      </div>
    </div>
    <p style="font-family:var(--font-mono);font-size:.8rem;color:var(--muted)">
      After fixing TODAY + THIS SPRINT items: projected health score ≥ ${projectedScore}
    </p>
  </div>
</section>`
}
