export const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0A0A0F;--surface:#111118;--surface2:#1a1a24;--border:#2a2a3a;
  --text:#e2e8f0;--muted:#94a3b8;
  --red:#ef4444;--orange:#f97316;--yellow:#eab308;--green:#22c55e;--blue:#3b82f6;--purple:#a855f7;
  --font-mono:'JetBrains Mono','Fira Code',Consolas,monospace;
  --font-sans:'DM Sans',system-ui,-apple-system,sans-serif;
}
body{background:var(--bg);color:var(--text);font-family:var(--font-sans);line-height:1.6}
a{color:var(--blue)}
.container{max-width:1100px;margin:0 auto;padding:0 2rem}
.section{padding:3rem 0;border-bottom:1px solid var(--border)}
h1{font-size:2.4rem;font-weight:700;letter-spacing:-0.02em}
h2{font-size:1.6rem;font-weight:600;border-left:4px solid var(--blue);padding-left:1rem;margin-bottom:1.5rem}
h2.danger{border-left-color:var(--red)}
h2.positive{border-left-color:var(--green)}
h3{font-size:1.1rem;font-weight:600;margin-bottom:0.4rem}
p{color:var(--muted);margin-bottom:1rem}
code,.mono{font-family:var(--font-mono);font-size:0.875rem}
.badge{display:inline-block;padding:.15rem .6rem;border-radius:9999px;font-size:.75rem;font-weight:700;font-family:var(--font-mono)}
.badge-CRITICAL{background:#450a0a;color:#ef4444}
.badge-HIGH{background:#431407;color:#f97316}
.badge-MEDIUM{background:#422006;color:#eab308}
.badge-LOW{background:#052e16;color:#22c55e}
.badge-TODAY{background:#450a0a;color:#fca5a5}
.badge-THIS_SPRINT{background:#1c1917;color:#d97706}
.badge-NEXT_SPRINT{background:#0f172a;color:#818cf8}
.health-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:2rem;display:flex;align-items:center;gap:2rem;flex-wrap:wrap;margin-bottom:1.5rem}
.health-score{font-size:3.5rem;font-weight:800;font-family:var(--font-mono)}
.health-grade{font-size:1.8rem;font-weight:700;padding:.4rem 1rem;border-radius:8px}
.grade-A{background:#052e16;color:#22c55e}.grade-B{background:#0d3320;color:#4ade80}
.grade-C{background:#422006;color:#fbbf24}.grade-D{background:#431407;color:#fb923c}
.grade-F{background:#450a0a;color:#ef4444}
.bar-track{background:var(--surface2);border-radius:9999px;height:8px;width:180px}
.bar-fill{height:8px;border-radius:9999px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:1rem;margin:1.5rem 0}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1rem;text-align:center}
.stat-val{font-size:2rem;font-weight:700;font-family:var(--font-mono)}
.stat-lbl{font-size:.75rem;color:var(--muted);margin-top:.2rem}
.c-red{color:var(--red)}.c-orange{color:var(--orange)}.c-yellow{color:var(--yellow)}.c-green{color:var(--green)}
.risk-grid{display:grid;grid-template-columns:2rem repeat(3,1fr);grid-template-rows:repeat(4,1fr);gap:3px;margin:1.5rem 0}
.rg-head{font-size:.65rem;font-family:var(--font-mono);color:var(--muted);display:flex;align-items:center;justify-content:center}
.rg-cell{background:var(--surface2);border-radius:4px;padding:.6rem;min-height:64px;font-size:.75rem;font-family:var(--font-mono);color:var(--muted)}
.rg-hot{background:rgba(239,68,68,.15)}.rg-warm{background:rgba(249,115,22,.1)}.rg-cool{background:rgba(34,197,94,.05)}
.rg-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;vertical-align:middle}
.theme-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:1.2rem;overflow:hidden}
.theme-hdr{padding:1.1rem 1.4rem;cursor:pointer;display:flex;align-items:center;gap:.8rem}
.theme-hdr:hover{background:var(--surface2)}
.theme-body{padding:1.4rem;border-top:1px solid var(--border);display:none}
.theme-body.open{display:block}
.t-section{margin-bottom:1.2rem}
.t-label{font-size:.68rem;font-family:var(--font-mono);color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem}
.t-label.danger{color:var(--red)}.t-label.action{color:var(--orange)}.t-label.good{color:var(--green)}
pre.code{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:1rem;font-family:var(--font-mono);font-size:.8rem;white-space:pre-wrap;overflow:auto}
.timeline{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem;margin:1.5rem 0}
.tl-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1.1rem}
.tl-tier{font-size:.68rem;font-family:var(--font-mono);font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem}
.tl-tier.today{color:var(--red)}.tl-tier.sprint{color:var(--orange)}.tl-tier.next{color:var(--purple)}.tl-tier.ongoing{color:var(--green)}
.tl-items{list-style:none}.tl-items li{font-size:.85rem;padding:.25rem 0;border-bottom:1px solid var(--border);color:var(--muted)}
.tl-items li:last-child{border-bottom:none}
.signal{background:var(--surface);border:1px solid rgba(34,197,94,.2);border-left:4px solid var(--green);border-radius:8px;padding:1rem 1.2rem;margin-bottom:.8rem}
.signal h3{color:var(--green);font-size:.95rem}
.file-entry{font-family:var(--font-mono);font-size:.78rem;color:var(--muted);padding:.15rem 0}
.file-line{color:var(--blue)}
.cover{padding:5rem 0 3rem;background:radial-gradient(ellipse at 30% 50%,rgba(59,130,246,.05) 0%,transparent 60%)}
.confidential{display:inline-block;border:1px solid var(--red);color:var(--red);font-family:var(--font-mono);font-size:.7rem;padding:.15rem .7rem;border-radius:4px;margin-bottom:1.5rem}
.cover-meta{font-family:var(--font-mono);font-size:.8rem;color:var(--muted);margin-top:.4rem}
.toc{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1.3rem 1.8rem;margin:2rem 0}
.toc ol{padding-left:1.4rem}.toc li{padding:.25rem 0}
.toc a{text-decoration:none;color:var(--text)}.toc a:hover{color:var(--blue)}
.meta-table{width:100%;border-collapse:collapse;font-family:var(--font-mono);font-size:.8rem}
.meta-table td{padding:.5rem .8rem;border:1px solid var(--border);color:var(--muted)}
.meta-table td:first-child{color:var(--text);white-space:nowrap}
footer{padding:2rem 0;text-align:center;font-family:var(--font-mono);font-size:.78rem;color:var(--muted);border-top:1px solid var(--border);margin-top:3rem}
@media print{
  body{background:#fff;color:#111}
  .theme-body{display:block!important}
  .cover{padding:2rem 0;background:none}
  .theme-card,.stat,.tl-card,.signal,.toc{border-color:#ccc;background:#f9f9f9}
  .badge-CRITICAL{background:#fee2e2;color:#dc2626}.badge-HIGH{background:#ffedd5;color:#ea580c}
  .badge-MEDIUM{background:#fef9c3;color:#ca8a04}.badge-LOW{background:#dcfce7;color:#16a34a}
  p,.muted,code{color:#555}
  .confidential{border-color:#dc2626;color:#dc2626}
  pre.code{background:#f5f5f5;border-color:#ccc;color:#333}
}
@media(max-width:768px){h1{font-size:1.8rem}.health-card{flex-direction:column;align-items:flex-start}.stats{grid-template-columns:repeat(2,1fr)}}
`
