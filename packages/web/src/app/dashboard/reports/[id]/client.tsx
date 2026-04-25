"use client";
import type { ReportData, Severity, ActionItem, ActionPriority } from "@/lib/reporter";
import { Download, Shield, Zap, GitBranch, AlertTriangle, CheckCircle, Info, RefreshCw, ChevronDown, ChevronRight, Wrench, Star } from "lucide-react";
import { useState } from "react";

const SEV_COLOR: Record<Severity, string> = { CRITICAL: "#FF6B6B", HIGH: "#FF8C42", MEDIUM: "#FFB347", LOW: "#00F5D4" };
const SEV_BG: Record<Severity, string> = { CRITICAL: "rgba(255,107,107,0.10)", HIGH: "rgba(255,140,66,0.10)", MEDIUM: "rgba(255,179,71,0.10)", LOW: "rgba(0,245,212,0.10)" };
const PRI_COLOR: Record<ActionPriority, string> = { P0: "#FF6B6B", P1: "#FF8C42", P2: "#A78BFA" };
const PRI_LABEL: Record<ActionPriority, string> = { P0: "Fix Now", P1: "Fix Soon", P2: "Improve Later" };
const CAT_ICON: Record<string, React.ElementType> = { security: Shield, architecture: GitBranch, coupling: Zap, testing: Info, cleanup: AlertTriangle };

function Badge({ sev }: { sev: Severity }) {
  return <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: SEV_COLOR[sev], background: SEV_BG[sev] }}>{sev}</span>;
}

function Section({ title, icon: Icon, count, children }: { title: string; icon: React.ElementType; count?: number; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6 mb-5 print:border print:border-gray-200 print:rounded-none print:mb-8">
      <div className="flex items-center gap-3 mb-5">
        <Icon size={16} className="text-brand" />
        <h2 className="font-display text-base font-bold text-ink">{title}</h2>
        {count !== undefined && <span className="font-mono text-xs text-ink-dim ml-auto">{count} item{count !== 1 ? "s" : ""}</span>}
      </div>
      {children}
    </div>
  );
}

function ActionCard({ item }: { item: ActionItem }) {
  const [open, setOpen] = useState(item.priority === "P0");
  const Icon = CAT_ICON[item.category] ?? Info;
  return (
    <div className="rounded-xl border overflow-hidden mb-3 last:mb-0" style={{ borderColor: `${PRI_COLOR[item.priority]}30`, background: `${PRI_COLOR[item.priority]}06` }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-start gap-3 px-4 py-3 text-left">
        <div className="flex items-center gap-2 pt-0.5 flex-shrink-0">
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: PRI_COLOR[item.priority], background: `${PRI_COLOR[item.priority]}18` }}>
            {item.priority} · {PRI_LABEL[item.priority]}
          </span>
          <span className="font-mono text-[10px] text-ink-dim capitalize px-1.5 py-0.5 rounded bg-surface/60">{item.category}</span>
        </div>
        <p className="font-body text-sm font-medium text-ink flex-1 mt-0.5">{item.title}</p>
        <div className="flex-shrink-0 mt-0.5">{open ? <ChevronDown size={13} className="text-ink-dim" /> : <ChevronRight size={13} className="text-ink-dim" />}</div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: `${PRI_COLOR[item.priority]}20` }}>
          <div className="grid grid-cols-1 gap-3 mt-3">
            <Row icon="🔴" label="What is wrong" text={item.whatIsWrong} />
            <Row icon="⚠️" label="Why it matters" text={item.whyItMatters} />
            <Row icon="✅" label="How to fix" text={item.howToFix} highlight />
          </div>

          {item.files.length > 0 && (
            <div className="mt-3">
              <p className="font-mono text-[10px] text-ink-dim mb-1.5">AFFECTED FILES ({item.files.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {item.files.slice(0, 8).map((f, i) => (
                  <code key={i} className="font-mono text-[10px] text-ink-muted bg-surface px-2 py-0.5 rounded border border-border truncate max-w-xs">{f}</code>
                ))}
                {item.files.length > 8 && <span className="font-mono text-[10px] text-ink-dim py-0.5">+{item.files.length - 8} more</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, text, highlight }: { icon: string; label: string; text: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2.5 ${highlight ? "bg-neon/6 border border-neon/15" : "bg-surface/60"}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[12px]">{icon}</span>
        <span className="font-mono text-[10px] font-semibold text-ink-dim uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-body text-sm text-ink-muted leading-relaxed">{text}</p>
    </div>
  );
}

export function ReportClient({ data, createdAt }: { data: ReportData; createdAt: string }) {
  const score = data.summary.securityScore;
  const scoreColor = score >= 80 ? "#00F5D4" : score >= 60 ? "#FFB347" : "#FF6B6B";
  const verdict = score >= 80 ? "Healthy" : score >= 60 ? "Needs Attention" : score >= 40 ? "At Risk" : "Critical Issues";
  const p0 = data.actions?.filter(a => a.priority === "P0") ?? [];
  const p1 = data.actions?.filter(a => a.priority === "P1") ?? [];
  const p2 = data.actions?.filter(a => a.priority === "P2") ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 print:mb-6">
        <div>
          <span className="font-mono text-xs text-ink-dim">CODEBASE AUDIT REPORT</span>
          <h1 className="font-display text-xl font-bold text-ink mt-1 mb-1">{data.repoName}</h1>
          <p className="font-body text-sm text-ink-muted">Generated {new Date(createdAt).toLocaleString()}</p>
        </div>
        <button onClick={() => window.print()}
          className="print:hidden flex items-center gap-2 px-4 py-2.5 text-sm font-body font-medium text-white bg-brand rounded-xl hover:bg-brand/90 transition-all flex-shrink-0">
          <Download size={14} /> Download PDF
        </button>
      </div>

      {/* Health Summary */}
      <Section title="Overall Health" icon={Shield}>
        <div className="flex items-center gap-5 mb-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2" style={{ borderColor: scoreColor, background: `${scoreColor}10` }}>
              <span className="font-mono text-2xl font-bold" style={{ color: scoreColor }}>{score}</span>
              <span className="font-mono text-[10px] text-ink-dim">/100</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display text-lg font-bold" style={{ color: scoreColor }}>{verdict}</span>
            </div>
            <p className="font-body text-sm text-ink-muted mb-2">
              {p0.length > 0
                ? `${p0.length} critical issue${p0.length > 1 ? "s" : ""} require immediate attention.`
                : p1.length > 0
                  ? `No critical issues. ${p1.length} improvement${p1.length > 1 ? "s" : ""} recommended before next release.`
                  : "No critical or high-priority issues found. Good baseline security posture."}
            </p>
            <div className="flex flex-wrap gap-2">
              {data.summary.languages.map(l => (
                <span key={l} className="font-mono text-xs px-2 py-0.5 rounded bg-brand/10 border border-brand/20 text-brand">{l}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Files Analyzed", value: data.summary.totalFiles, color: "#4361EE" },
            { label: "Import Edges", value: data.summary.totalEdges, color: "#A78BFA" },
            { label: "Security Score", value: `${score}/100`, color: scoreColor },
            { label: "Action Items", value: (data.actions?.length ?? 0), color: p0.length > 0 ? "#FF6B6B" : "#FFB347" },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-xl p-3 text-center">
              <div className="font-mono text-xl font-bold mb-0.5" style={{ color: s.color }}>{s.value}</div>
              <div className="font-body text-xs text-ink-muted">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {([["CRITICAL", data.summary.criticalCount], ["HIGH", data.summary.highCount], ["MEDIUM", data.summary.mediumCount], ["LOW", data.summary.lowCount]] as [Severity, number][]).map(([sev, count]) => (
            <div key={sev} className="rounded-xl p-3 text-center" style={{ background: SEV_BG[sev], border: `1px solid ${SEV_COLOR[sev]}30` }}>
              <div className="font-mono text-xl font-bold" style={{ color: SEV_COLOR[sev] }}>{count}</div>
              <div className="font-mono text-[10px] text-ink-muted mt-0.5">{sev}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Action Plan */}
      {(data.actions?.length ?? 0) > 0 && (
        <Section title="Action Plan" icon={Wrench} count={data.actions.length}>
          {p0.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#FF6B6B] animate-pulse" />
                <span className="font-mono text-xs font-bold text-[#FF6B6B]">P0 — FIX NOW ({p0.length})</span>
              </div>
              {p0.map((a, i) => <ActionCard key={i} item={a} />)}
            </div>
          )}
          {p1.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#FF8C42]" />
                <span className="font-mono text-xs font-bold text-[#FF8C42]">P1 — FIX BEFORE NEXT RELEASE ({p1.length})</span>
              </div>
              {p1.map((a, i) => <ActionCard key={i} item={a} />)}
            </div>
          )}
          {p2.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#A78BFA]" />
                <span className="font-mono text-xs font-bold text-[#A78BFA]">P2 — IMPROVE ({p2.length})</span>
              </div>
              {p2.map((a, i) => <ActionCard key={i} item={a} />)}
            </div>
          )}
        </Section>
      )}

      {/* What's Healthy */}
      {(data.healthyAreas?.length ?? 0) > 0 && (
        <Section title="What&apos;s Healthy" icon={Star} count={data.healthyAreas.length}>
          <div className="space-y-2">
            {data.healthyAreas.map((area, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 px-3 rounded-xl bg-neon/6 border border-neon/15">
                <CheckCircle size={14} className="text-neon flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-body text-sm font-medium text-ink">{area.label}</p>
                  <p className="font-body text-xs text-ink-muted">{area.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Security Findings Detail */}
      <Section title="Security Findings — Full Detail" icon={Shield} count={data.security.findings.length}>
        {data.security.findings.length === 0 ? (
          <div className="flex items-center gap-2 text-neon font-body text-sm">
            <CheckCircle size={15} /> No security issues detected.
          </div>
        ) : (
          <div className="space-y-2">
            {data.security.findings.map((f, i) => (
              <div key={i} className="rounded-xl p-3 border" style={{ background: SEV_BG[f.severity], borderColor: `${SEV_COLOR[f.severity]}25` }}>
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <code className="font-mono text-xs text-ink-muted break-all">{f.file}</code>
                  <Badge sev={f.severity} />
                </div>
                <p className="font-body text-sm text-ink font-medium mb-1">{f.issue}</p>
                {f.snippet && (
                  <code className="font-mono text-[11px] text-ink-dim block bg-[#05050B] rounded px-2 py-1 mt-1 truncate">{f.snippet}</code>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Architecture Detail */}
      <Section title="Architecture Analysis" icon={GitBranch}>
        <div className="mb-5">
          <p className="font-mono text-xs text-ink-dim mb-2">CIRCULAR DEPENDENCIES</p>
          {data.dataFlow.circularDependencies.length === 0 ? (
            <div className="flex items-center gap-2 text-neon font-body text-sm"><CheckCircle size={14} /> None detected — the graph is acyclic.</div>
          ) : data.dataFlow.circularDependencies.map((cycle, i) => (
            <div key={i} className="font-mono text-xs text-heat bg-heat/8 border border-heat/20 rounded-lg p-2.5 mb-2">
              {cycle.join(" → ")} → (cycle)
            </div>
          ))}
        </div>

        <div className="mb-5">
          <p className="font-mono text-xs text-ink-dim mb-2">BLAST RADIUS HOTSPOTS</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Avg Blast Radius", value: data.performance.avgBlastRadius, color: "#4361EE" },
              { label: "Max Blast Radius", value: data.performance.maxBlastRadius, color: "#FF6B6B" },
              { label: "Orphaned Files", value: data.performance.orphanedFiles.length, color: "#FFB347" },
            ].map(s => (
              <div key={s.label} className="bg-surface rounded-xl p-3 text-center">
                <div className="font-mono text-xl font-bold mb-0.5" style={{ color: s.color }}>{s.value}</div>
                <div className="font-body text-[11px] text-ink-muted">{s.label}</div>
              </div>
            ))}
          </div>
          {data.performance.hotspots.slice(0, 10).map((h, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                style={{ background: SEV_BG[h.riskLevel], color: SEV_COLOR[h.riskLevel] }}>{i + 1}</div>
              <code className="font-mono text-xs text-ink flex-1 truncate">{h.file}</code>
              <span className="font-mono text-xs text-ink-muted flex-shrink-0">{h.dependents} dependents</span>
              <Badge sev={h.riskLevel} />
            </div>
          ))}
        </div>

        <div>
          <p className="font-mono text-xs text-ink-dim mb-2">OVER-COUPLED FILES</p>
          {data.inefficiencies.overCoupled.length === 0 ? (
            <div className="flex items-center gap-2 text-neon font-body text-sm"><CheckCircle size={14} /> None detected.</div>
          ) : data.inefficiencies.overCoupled.map((f, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
              <code className="font-mono text-xs text-ink flex-1 truncate">{f.file}</code>
              <span className="font-mono text-xs text-solar flex-shrink-0">{f.connections} connections</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Coverage */}
      <Section title="Test Coverage Estimate" icon={Info}>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-4xl font-mono font-bold flex-shrink-0"
            style={{ color: data.coverage.estimatedScore >= 80 ? "#00F5D4" : data.coverage.estimatedScore >= 60 ? "#FFB347" : "#FF6B6B" }}>
            {data.coverage.estimatedScore}%
          </div>
          <div>
            <p className="font-body text-sm text-ink font-medium">Estimated coverage health</p>
            <p className="font-body text-xs text-ink-muted">Based on blast-radius hotspots without detected test files. Lower = more untested high-risk code.</p>
          </div>
        </div>
        {data.coverage.highRiskUncovered.length > 0 && (
          <div className="space-y-1">
            {data.coverage.highRiskUncovered.slice(0, 10).map((f, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                <AlertTriangle size={11} className="text-solar flex-shrink-0" />
                <code className="font-mono text-xs text-ink-muted truncate">{f}</code>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="flex items-center gap-2 text-xs font-mono text-ink-dim mt-4 print:mt-8">
        <RefreshCw size={11} /> Re-index your repo to regenerate this report with the latest data.
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .glass { background: white !important; backdrop-filter: none !important; }
          nav, aside { display: none !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
