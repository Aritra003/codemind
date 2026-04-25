import type { AuditData, HealthScore, Theme } from './report-types'

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function barColor(score: number): string {
  if (score >= 90) return '#22c55e'
  if (score >= 75) return '#4ade80'
  if (score >= 60) return '#eab308'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function top3(themes: Theme[]): string {
  const order: Record<string, number> = { TODAY: 0, THIS_SPRINT: 1, NEXT_SPRINT: 2 }
  return [...themes].sort((a, b) => (order[a.priorityTier] ?? 3) - (order[b.priorityTier] ?? 3))
    .slice(0, 3).map((t, i) => `  ${i + 1}. Fix ${t.title} (${t.effort})`).join('\n')
}

export function renderCover(data: AuditData): string {
  return `
<section class="cover section" id="s1">
  <div class="container">
    <div class="confidential">CONFIDENTIAL</div>
    <h1>${esc(data.repoName)} — Engineering Audit Report</h1>
    <p class="cover-meta">
      Generated ${esc(data.generatedAt)}&nbsp;·&nbsp;
      CodeMind v5.0&nbsp;·&nbsp;
      ${data.fileCount.toLocaleString()} files indexed&nbsp;·&nbsp;
      Languages: ${esc(data.languages.join(', ') || 'TypeScript')}
    </p>
    <p class="cover-meta" style="margin-top:.3rem">
      Graph: ${data.graph.nodeCount.toLocaleString()} nodes &nbsp;·&nbsp;
      ${data.graph.edgeCount.toLocaleString()} edges &nbsp;·&nbsp;
      ${data.graph.completenessPct.toFixed(0)}% completeness
    </p>
  </div>
</section>`
}

export function renderExecSummary(
  data:       AuditData,
  themes:     Theme[],
  score:      HealthScore,
  aiSummary?: string,
): string {
  const critical = data.findings.filter(f => f.severity === 'CRITICAL').length
  const high     = data.findings.filter(f => f.severity === 'HIGH').length
  const medium   = data.findings.filter(f => f.severity === 'MEDIUM').length
  const topTheme = themes.find(t => t.severity === 'CRITICAL') ?? themes[0]
  const color    = barColor(score.score)

  const p1 = aiSummary ??
    `Static analysis identified <strong>${critical} critical</strong>, ${high} high, and ${medium} medium severity findings across this codebase.` +
    (topTheme ? ` The most urgent finding is <strong>${esc(topTheme.title)}</strong> — ${esc(topTheme.whatFound)}` : '')

  const topSpot = data.hotspots[0]
  const p2 = `The codebase has ${data.graph.nodeCount.toLocaleString()} indexed nodes and ${data.circularChains.length} circular dependency chain${data.circularChains.length !== 1 ? 's' : ''}.` +
    (topSpot ? ` The highest blast-radius file (<code>${esc(topSpot.file)}</code>) has <strong>${topSpot.dependentCount} transitive dependents</strong> — a single bug there cascades across the entire application.` : '')

  const actions = themes.length > 0 ? top3(themes) : '  No actionable themes found.'

  return `
<section class="section" id="s2">
  <div class="container">
    <h2>Executive Summary</h2>
    <div class="health-card">
      <div>
        <div class="health-score" style="color:${color}">${score.score}</div>
        <div style="color:var(--muted);font-size:.8rem;margin-top:.2rem">${esc(score.label)}</div>
      </div>
      <div class="health-grade grade-${esc(score.grade)}">${esc(score.grade)}</div>
      <div>
        <div class="bar-track"><div class="bar-fill" style="width:${score.score}%;background:${color}"></div></div>
        <div style="font-family:var(--font-mono);font-size:.7rem;color:var(--muted);margin-top:.2rem">${score.score}/100</div>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><div class="stat-val c-red">${critical}</div><div class="stat-lbl">Critical</div></div>
      <div class="stat"><div class="stat-val c-orange">${high}</div><div class="stat-lbl">High</div></div>
      <div class="stat"><div class="stat-val c-yellow">${medium}</div><div class="stat-lbl">Medium</div></div>
      <div class="stat"><div class="stat-val c-green">${data.graph.completenessPct.toFixed(0)}%</div><div class="stat-lbl">Graph Completeness</div></div>
    </div>
    <p>${p1}</p>
    <p>${p2}</p>
    <pre class="code">Top 3 recommended actions:\n${esc(actions)}</pre>
  </div>
</section>`
}
