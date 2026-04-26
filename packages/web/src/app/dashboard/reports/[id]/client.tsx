"use client";
import type { ReportData, Severity, SecurityFinding, HealthArea } from "@/lib/reporter";
import { Download, CheckCircle, RefreshCw, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { useState } from "react";

// ─── Severity palette (matches StinKit design tokens) ───────────────────────
const SEV: Record<Severity, { c: string; bg: string; bd: string; name: string; prob: string; impact: string }> = {
  CRITICAL: { c: "#FF6B6B", bg: "rgba(255,107,107,0.08)", bd: "rgba(255,107,107,0.22)", name: "Critical", prob: "Very Likely", impact: "Critical" },
  HIGH:     { c: "#FF8C42", bg: "rgba(255,140,66,0.08)",  bd: "rgba(255,140,66,0.22)",  name: "High",     prob: "Likely",      impact: "High"     },
  MEDIUM:   { c: "#FFB347", bg: "rgba(255,179,71,0.08)",  bd: "rgba(255,179,71,0.22)",  name: "Medium",   prob: "Unlikely",    impact: "Medium"   },
  LOW:      { c: "#00F5D4", bg: "rgba(0,245,212,0.08)",   bd: "rgba(0,245,212,0.22)",   name: "Low",      prob: "Rare",        impact: "Low"      },
};

// ─── Utility components ───────────────────────────────────────────────────────
function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="font-mono text-sm font-bold text-ink-dim">{n}.</span>
      <h2 className="font-display text-base font-bold text-ink">{title}</h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function Lbl({ children, neon }: { children: React.ReactNode; neon?: boolean }) {
  return <p className={`font-mono text-xs uppercase tracking-[0.1em] mb-2 ${neon ? "text-neon" : "text-ink-dim"}`}>{children}</p>;
}

// ─── SVG Donut chart ─────────────────────────────────────────────────────────
function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(cx: number, cy: number, R: number, w: number, a1: number, a2: number) {
  if (a2 - a1 >= 360) a2 = a1 + 359.99;
  const ir = R - w, lg = a2 - a1 > 180 ? 1 : 0;
  const p = polarXY(cx, cy, R, a1), q = polarXY(cx, cy, R, a2);
  const s = polarXY(cx, cy, ir, a2), t = polarXY(cx, cy, ir, a1);
  return `M${p.x},${p.y}A${R},${R},0,${lg},1,${q.x},${q.y}L${s.x},${s.y}A${ir},${ir},0,${lg},0,${t.x},${t.y}Z`;
}

function Donut({ segs, total, size = 132, ring = 24 }: {
  segs: { value: number; color: string; label: string }[];
  total: number; size?: number; ring?: number;
}) {
  const cx = size / 2, cy = size / 2, R = (size - ring) / 2;
  let angle = 0;
  return (
    <div className="flex items-center gap-6 flex-shrink-0">
      <div className="relative">
        <svg width={size} height={size}>
          {total === 0
            ? <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={ring} />
            : segs.filter(s => s.value > 0).map((seg, i) => {
              const sweep = (seg.value / total) * 360;
              const d = donutArc(cx, cy, R, ring, angle, angle + sweep);
              angle += sweep;
              return <path key={i} d={d} fill={seg.color} opacity={0.9} />;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono text-xl font-bold text-ink leading-none">{total}</span>
          <span className="font-mono text-xs text-ink-dim mt-0.5">findings</span>
        </div>
      </div>
      <div className="space-y-2">
        {segs.map((seg, i) => (
          <div key={i} className="flex items-center gap-2.5 min-w-[130px]">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
            <span className="font-mono text-xs text-ink-muted flex-1">{seg.label}</span>
            <span className="font-mono text-xs font-bold text-ink">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Individual finding card (ANQ-style) ─────────────────────────────────────
function FindingCard({ f, num }: { f: SecurityFinding; num: number }) {
  const [open, setOpen] = useState(false);
  const m = SEV[f.severity];
  const id = `CM-${String(num).padStart(3, "0")}`;

  return (
    <div id={`f-${num}`} className="rounded-2xl border overflow-hidden mb-3 last:mb-0" style={{ borderColor: m.bd, background: m.bg }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="font-mono text-xs font-semibold text-ink-dim mt-[3px] flex-shrink-0 pt-px">{id}</span>
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-semibold text-ink leading-snug">{f.issue}</p>
            <code className="font-mono text-xs text-ink-dim mt-0.5 block truncate">{f.file}</code>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full"
              style={{ color: m.c, background: m.bg, border: `1px solid ${m.bd}` }}>
              {m.name}
            </span>
            {open ? <ChevronDown size={13} className="text-ink-dim" /> : <ChevronRight size={13} className="text-ink-dim" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: m.bd }}>
          {/* Severity / Probability / Impact */}
          <div className="grid grid-cols-3 gap-2">
            {([
              ["Severity",    m.name,   m.c      ],
              ["Probability", m.prob,   undefined ],
              ["Impact",      m.impact, undefined ],
            ] as [string, string, string | undefined][]).map(([label, val, color]) => (
              <div key={label} className="rounded-xl border border-border bg-surface/40 px-3 py-3 text-center">
                <div className="font-mono text-xs text-ink-dim uppercase tracking-[0.1em] mb-1.5">{label}</div>
                <div className="font-mono text-xs font-bold" style={color ? { color } : undefined}>{val}</div>
              </div>
            ))}
          </div>

          {/* Path */}
          <div>
            <Lbl>Path</Lbl>
            <code className="font-mono text-xs text-ink-muted bg-[#05050B]/60 rounded-lg px-3 py-2 block border border-border break-all leading-relaxed">{f.file}</code>
          </div>

          {/* Description */}
          {f.description && (
            <div>
              <Lbl>Description</Lbl>
              <p className="font-body text-sm text-ink-muted leading-relaxed">{f.description}</p>
            </div>
          )}

          {/* Code snippet */}
          {f.snippet && (
            <div>
              <Lbl>Code</Lbl>
              <pre className="font-mono text-xs text-[#93C5FD] bg-[#05050B]/80 rounded-lg px-3 py-2.5 border border-border overflow-x-auto whitespace-pre-wrap break-all">
                <code>{f.snippet}</code>
              </pre>
            </div>
          )}

          {/* Remediation */}
          {f.remediation && (
            <div className="rounded-xl px-4 py-3 border" style={{ background: "rgba(0,245,212,0.04)", borderColor: "rgba(0,245,212,0.15)" }}>
              <Lbl neon>Remediation</Lbl>
              <p className="font-body text-sm text-ink-muted leading-relaxed">{f.remediation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Executive summary narrative ─────────────────────────────────────────────
function buildNarrative(data: ReportData, p0: number, p1: number): string {
  const { totalFiles, totalEdges, languages, criticalCount: crit, highCount: high, mediumCount: med, lowCount: low } = data.summary;
  const total = crit + high + med + low;
  const langStr = languages.slice(0, 3).join(", ") + (languages.length > 3 ? ` and ${languages.length - 3} more` : "");
  const issueStr = total === 0
    ? "No security vulnerabilities were detected."
    : [crit > 0 && `${crit} critical`, high > 0 && `${high} high`, med > 0 && `${med} medium`, low > 0 && `${low} low`]
        .filter(Boolean).join(", ") + ` severit${total === 1 ? "y" : "ies"} finding${total > 1 ? "s" : ""} identified.`;
  const cycles = data.dataFlow.circularDependencies.length;
  const archStr = cycles > 0 ? `${cycles} circular dependenc${cycles > 1 ? "ies" : "y"} detected.` : "No circular dependencies detected.";
  const verdict = p0 > 0
    ? "Immediate action is required on critical findings before the next deployment."
    : p1 > 0 ? "Improvements should be addressed before the next release." : "The codebase demonstrates a strong security posture.";
  return `This audit covers ${data.repoName}, analyzed across ${totalFiles} files with ${totalEdges} import edges spanning ${langStr || "multiple languages"}. ${issueStr} ${archStr} ${verdict}`;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function ReportClient({ data, createdAt }: { data: ReportData; createdAt: string }) {
  const { summary, security, actions, healthyAreas, performance, dataFlow, inefficiencies, coverage } = data;
  const acts = actions ?? [];
  const score = summary.securityScore;
  const scoreColor = score >= 80 ? "#00F5D4" : score >= 60 ? "#FFB347" : "#FF6B6B";
  const verdict = score >= 80 ? "Healthy" : score >= 60 ? "Needs Attention" : score >= 40 ? "At Risk" : "Critical Issues";
  const p0 = acts.filter(a => a.priority === "P0").length;
  const p1 = acts.filter(a => a.priority === "P1").length;
  const { criticalCount: crit, highCount: high, mediumCount: med, lowCount: low } = summary;
  const total = crit + high + med + low;
  const narrative = buildNarrative(data, p0, p1);
  const healthy: HealthArea[] = healthyAreas ?? [];

  const TOC = [
    { n: "1", label: "Executive Summary",     href: "#s1" },
    { n: "2", label: "Review Scope",          href: "#s2" },
    { n: "3", label: "Findings Summary",      href: "#s3" },
    { n: "4", label: "Security Findings",     href: "#s4" },
    { n: "5", label: "Architecture Analysis", href: "#s5" },
    { n: "6", label: "Test Coverage",         href: "#s6" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl">

      {/* ── Report header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-10 pb-8 border-b border-border">
        <div>
          <span className="font-mono text-xs tracking-[0.18em] text-ink-dim uppercase">Codebase Audit Report</span>
          <h1 className="font-display text-2xl font-bold text-ink mt-1.5 mb-2 leading-tight">{data.repoName}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs text-ink-dim">Generated {new Date(createdAt).toLocaleString()}</span>
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ color: scoreColor, background: `${scoreColor}15` }}>
              {verdict}
            </span>
          </div>
        </div>
        <button type="button" onClick={() => window.print()}
          className="print:hidden flex items-center gap-2 px-4 py-2.5 text-sm font-body font-medium rounded-xl border border-border hover:border-brand/60 text-ink-muted hover:text-ink transition-all flex-shrink-0 whitespace-nowrap">
          <Download size={14} /> Export PDF
        </button>
      </div>

      {/* ── Table of Contents ─────────────────────────────────────────── */}
      <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] px-6 py-5 mb-8 print:hidden">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-dim mb-3">Table of Contents</p>
        <ul>
          {TOC.map(t => (
            <li key={t.href}>
              <a href={t.href} className="flex items-center gap-3 py-1.5 group">
                <span className="font-mono text-xs text-ink-dim w-5 flex-shrink-0">{t.n}.</span>
                <span className="font-body text-sm text-ink-muted group-hover:text-brand transition-colors">{t.label}</span>
                <span className="flex-1 border-b border-dashed border-border/60 mx-2" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* ── 1. Executive Summary ────────────────────────────────────────── */}
      <section id="s1" className="mb-8">
        <SectionHead n="1" title="Executive Summary" />
        <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-6">
          <p className="font-body text-sm text-ink-muted leading-relaxed mb-6">{narrative}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([["Critical", crit, "#FF6B6B"], ["High", high, "#FF8C42"], ["Medium", med, "#FFB347"], ["Low", low, "#00F5D4"]] as [string, number, string][]).map(([label, count, color]) => (
              <div key={label} className="rounded-xl border py-3.5 text-center" style={{ borderColor: `${color}25`, background: `${color}08` }}>
                <div className="font-mono text-2xl font-bold leading-none mb-1" style={{ color }}>{count}</div>
                <div className="font-mono text-xs text-ink-dim">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. Review Scope ─────────────────────────────────────────────── */}
      <section id="s2" className="mb-8">
        <SectionHead n="2" title="Review Scope" />
        <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Files Analyzed", value: summary.totalFiles,  color: "#4361EE" },
              { label: "Import Edges",   value: summary.totalEdges,  color: "#A78BFA" },
              { label: "Security Score", value: `${score}/100`,      color: scoreColor },
              { label: "Action Items",   value: acts.length,         color: p0 > 0 ? "#FF6B6B" : "#FFB347" },
            ].map(s => (
              <div key={s.label} className="bg-surface rounded-xl p-4 text-center border border-border">
                <div className="font-mono text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="font-body text-xs text-ink-muted">{s.label}</div>
              </div>
            ))}
          </div>
          {summary.languages.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              <span className="font-mono text-xs text-ink-dim self-center">Languages:</span>
              {summary.languages.map(l => (
                <span key={l} className="font-mono text-xs px-2.5 py-1 rounded-lg bg-brand/10 border border-brand/20 text-brand">{l}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 3. Findings Summary ─────────────────────────────────────────── */}
      <section id="s3" className="mb-8">
        <SectionHead n="3" title="Findings Summary" />
        <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-6">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <Donut
              segs={[
                { value: crit, color: "#FF6B6B", label: "Critical" },
                { value: high, color: "#FF8C42", label: "High" },
                { value: med,  color: "#FFB347", label: "Medium" },
                { value: low,  color: "#00F5D4", label: "Low" },
              ]}
              total={total}
            />
            <div className="flex-1 w-full">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Severity", "Count", "Share"].map(h => (
                      <th key={h} className={`font-mono text-xs text-ink-dim pb-2.5 font-medium ${h === "Count" ? "text-center" : h === "Share" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Severity[]).map(sev => {
                    const count = sev === "CRITICAL" ? crit : sev === "HIGH" ? high : sev === "MEDIUM" ? med : low;
                    return (
                      <tr key={sev} className="border-b border-border/40 last:border-0">
                        <td className="py-2.5 pr-4">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ color: SEV[sev].c, background: SEV[sev].bg }}>{SEV[sev].name}</span>
                        </td>
                        <td className="text-center font-mono text-sm font-bold" style={{ color: SEV[sev].c }}>{count}</td>
                        <td className="py-2.5 pl-4">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-20 h-1.5 rounded-full bg-surface overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%", background: SEV[sev].c }} />
                            </div>
                            <span className="font-mono text-xs text-ink-dim w-8 text-right">{total > 0 ? Math.round((count / total) * 100) : 0}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Healthy areas */}
          {healthy.length > 0 && (
            <div className="mt-6 pt-5 border-t border-border">
              <Lbl>What&apos;s Healthy — {healthy.length} items</Lbl>
              <div className="space-y-0 mt-2">
                {healthy.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
                    <CheckCircle size={13} className="text-neon flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-body text-sm font-medium text-ink">{a.label}</p>
                      <p className="font-body text-xs text-ink-muted">{a.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Security Findings ─────────────────────────────────────────── */}
      <section id="s4" className="mb-8">
        <SectionHead n="4" title={`Security Findings — ${security.findings.length} item${security.findings.length !== 1 ? "s" : ""}`} />
        {security.findings.length === 0 ? (
          <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-8 flex items-center gap-3">
            <CheckCircle size={16} className="text-neon" />
            <span className="font-body text-sm text-ink-muted">No security vulnerabilities detected across all scanned files.</span>
          </div>
        ) : (
          <div>
            {security.findings.map((f, i) => <FindingCard key={i} f={f} num={i + 1} />)}
          </div>
        )}
      </section>

      {/* ── 5. Architecture Analysis ─────────────────────────────────────── */}
      <section id="s5" className="mb-8">
        <SectionHead n="5" title="Architecture Analysis" />
        <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-6 space-y-6">

          <div>
            <Lbl>Circular Dependencies</Lbl>
            {dataFlow.circularDependencies.length === 0 ? (
              <div className="flex items-center gap-2 text-neon font-body text-sm"><CheckCircle size={13} /> None detected — the graph is acyclic.</div>
            ) : dataFlow.circularDependencies.map((cycle, i) => (
              <div key={i} className="font-mono text-xs rounded-lg px-3 py-2.5 mb-2 text-[#FF9393] break-all"
                style={{ background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.2)" }}>
                {cycle.join(" → ")} → (cycle)
              </div>
            ))}
          </div>

          <div>
            <Lbl>Blast Radius Hotspots</Lbl>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Avg Blast Radius", value: performance.avgBlastRadius,          color: "#4361EE" },
                { label: "Max Blast Radius", value: performance.maxBlastRadius,          color: "#FF6B6B" },
                { label: "Orphaned Files",   value: performance.orphanedFiles.length,    color: "#FFB347" },
              ].map(s => (
                <div key={s.label} className="bg-surface rounded-xl p-3 text-center border border-border">
                  <div className="font-mono text-xl font-bold mb-0.5" style={{ color: s.color }}>{s.value}</div>
                  <div className="font-body text-xs text-ink-muted">{s.label}</div>
                </div>
              ))}
            </div>
            <div>
              {performance.hotspots.slice(0, 10).map((h, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-mono font-bold flex-shrink-0"
                    style={{ background: SEV[h.riskLevel].bg, color: SEV[h.riskLevel].c }}>{i + 1}</div>
                  <code className="font-mono text-xs text-ink flex-1 truncate min-w-0">{h.file}</code>
                  <span className="font-mono text-xs text-ink-dim flex-shrink-0">{h.dependents} dependents</span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0"
                    style={{ color: SEV[h.riskLevel].c, background: SEV[h.riskLevel].bg }}>{SEV[h.riskLevel].name}</span>
                </div>
              ))}
            </div>
          </div>

          {inefficiencies.overCoupled.length > 0 && (
            <div>
              <Lbl>Over-Coupled Files</Lbl>
              {inefficiencies.overCoupled.map((f, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                  <code className="font-mono text-xs text-ink flex-1 truncate min-w-0">{f.file}</code>
                  <span className="font-mono text-xs font-bold flex-shrink-0" style={{ color: "#FFB347" }}>{f.connections} connections</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 6. Test Coverage ─────────────────────────────────────────────── */}
      <section id="s6" className="mb-8">
        <SectionHead n="6" title="Test Coverage Estimate" />
        <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-6">
          <div className="flex items-center gap-5 mb-5">
            <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2 flex-shrink-0"
              style={{
                borderColor: coverage.estimatedScore >= 80 ? "#00F5D4" : coverage.estimatedScore >= 60 ? "#FFB347" : "#FF6B6B",
                background:  `${coverage.estimatedScore >= 80 ? "#00F5D4" : coverage.estimatedScore >= 60 ? "#FFB347" : "#FF6B6B"}10`,
              }}>
              <span className="font-mono text-2xl font-bold leading-none"
                style={{ color: coverage.estimatedScore >= 80 ? "#00F5D4" : coverage.estimatedScore >= 60 ? "#FFB347" : "#FF6B6B" }}>
                {coverage.estimatedScore}%
              </span>
            </div>
            <div>
              <p className="font-body text-sm font-semibold text-ink mb-1">Estimated coverage health</p>
              <p className="font-body text-xs text-ink-muted leading-relaxed">Based on blast-radius hotspots without detected test files. Lower = more untested high-risk code.</p>
            </div>
          </div>
          {coverage.highRiskUncovered.length > 0 && (
            <div className="border-t border-border pt-4">
              <Lbl>High-risk files without detected tests</Lbl>
              <div className="mt-2">
                {coverage.highRiskUncovered.slice(0, 10).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 border-b border-border/40 last:border-0">
                    <AlertTriangle size={11} className="text-solar flex-shrink-0" />
                    <code className="font-mono text-xs text-ink-muted truncate">{f}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center gap-2 font-mono text-xs text-ink-dim mt-2 print:mt-8">
        <RefreshCw size={11} /> Re-index your repo to regenerate this report with the latest data.
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: #1a1a1a !important; }
          .glass { background: white !important; backdrop-filter: none !important; border: 1px solid #e5e7eb !important; }
          .print\\:hidden { display: none !important; }
          nav, aside { display: none !important; }
          section { break-inside: avoid; page-break-inside: avoid; }
          h1, h2 { color: #1a1a1a !important; }
          code, pre { background: #f3f4f6 !important; color: #1e40af !important; }
        }
      `}</style>
    </div>
  );
}
