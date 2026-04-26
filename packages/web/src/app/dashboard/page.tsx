import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { GitBranch, Zap, Key, ArrowRight, Network, GitFork, AlertTriangle } from "lucide-react";

export default async function DashboardHome() {
  const session = await auth();
  const userId = (session?.user as { id: string })?.id;

  const [repos, keys, checks] = await Promise.all([
    db.repo.count({ where: { userId } }),
    db.apiKey.count({ where: { userId } }),
    db.check.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const name = session?.user?.name?.split(" ")[0] ?? "there";

  const QUICK_ACTIONS = [
    {
      href: "/dashboard/repos",
      Icon: GitBranch,
      colorClass: "text-brand",
      bgClass: "bg-brand/10 border-brand/20",
      label: "Connect repo",
      desc: "Link a GitHub repository to index",
    },
    {
      href: "/dashboard/check",
      Icon: Zap,
      colorClass: "text-heat",
      bgClass: "bg-heat/10 border-heat/20",
      label: "Scan a file",
      desc: "Paste a path and get blast radius",
    },
    {
      href: "/dashboard/graph",
      Icon: Network,
      colorClass: "text-violet",
      bgClass: "bg-violet/10 border-violet/20",
      label: "Explore graph",
      desc: "Visual dependency explorer",
    },
    {
      href: "/dashboard/diagram",
      Icon: GitFork,
      colorClass: "text-accent",
      bgClass: "bg-accent/10 border-accent/20",
      label: "Generate diagram",
      desc: "Export a Mermaid dependency map",
    },
  ];

  const riskColor = (level: string) => {
    if (level === "CRITICAL") return "text-heat";
    if (level === "HIGH")     return "text-heat";
    if (level === "MEDIUM")   return "text-solar";
    return "text-neon";
  };

  const riskDot = (level: string) => {
    if (level === "CRITICAL" || level === "HIGH") return "bg-heat";
    if (level === "MEDIUM") return "bg-solar";
    return "bg-neon";
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[800] text-[var(--ink-primary)] mb-2 tracking-tight" style={{ fontSize: "32px" }}>
          Welcome back, {name}.
        </h1>
        <p style={{ fontSize: "16px", color: "var(--ink-secondary)" }}>Your codebase, in focus.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Repos connected", value: repos,         color: "var(--accent)" },
          { label: "API keys",        value: keys,          color: "var(--cyan)"   },
          { label: "Checks run",      value: checks.length, color: "var(--orange)" },
          { label: "MCP tools",       value: 6,             color: "var(--purple)" },
        ].map(s => (
          <div key={s.label} className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] p-5">
            <div className="font-mono font-[700] leading-none mb-2" style={{ fontSize: "32px", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "15px", color: "var(--ink-secondary)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <p className="font-mono font-[600] uppercase tracking-[3px] mb-4 text-[var(--ink-muted)]" style={{ fontSize: "11px" }}>Quick actions</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {QUICK_ACTIONS.map(a => (
          <Link key={a.href} href={a.href}
            className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] p-5 hover:border-[var(--border-hover)] hover:bg-[var(--bg-glass-hover)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all duration-300 group">
            <div className={`w-10 h-10 rounded-[12px] border flex items-center justify-center mb-4 ${a.bgClass}`}>
              <a.Icon size={18} className={a.colorClass} />
            </div>
            <p className="font-[600] text-[var(--ink-primary)] mb-1 group-hover:text-[var(--accent)] transition-colors" style={{ fontSize: "16px" }}>{a.label}</p>
            <p style={{ fontSize: "14px", color: "var(--ink-tertiary)", lineHeight: "1.5" }}>{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent checks */}
      {checks.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono font-[600] uppercase tracking-[3px] text-[var(--ink-muted)]" style={{ fontSize: "11px" }}>Recent scans</p>
            <Link href="/dashboard/check"
              className="font-mono flex items-center gap-1 transition-colors text-[var(--accent)] hover:text-[var(--accent-hover)]"
              style={{ fontSize: "14px" }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] overflow-hidden">
            {checks.map((c, i) => (
              <div key={c.id}
                className={`flex items-center gap-3 px-5 py-4 ${i < checks.length - 1 ? "border-b border-[var(--border-subtle)]" : ""} hover:bg-[var(--bg-elevated)] transition-colors`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${riskDot(c.riskLevel ?? "")}`} />
                <code className="font-mono flex-1 truncate text-[var(--ink-primary)]" style={{ fontSize: "14px" }}>{c.filePath}</code>
                <span className={`font-mono font-[700] flex-shrink-0 ${riskColor(c.riskLevel ?? "")}`} style={{ fontSize: "14px" }}>
                  {c.riskLevel}
                </span>
                <span className="flex-shrink-0 text-[var(--ink-tertiary)]" style={{ fontSize: "14px" }}>{c.dependents} deps</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state ────────────────────────────────── */}
      {repos === 0 && (
        <div className="border border-dashed border-border rounded-2xl p-10 text-center mt-4">
          <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-4">
            <GitBranch size={18} className="text-brand" />
          </div>
          <h3 className="font-display font-semibold text-ink mb-2">Connect your first repository</h3>
          <p className="font-body text-sm text-ink-muted mb-6 max-w-sm mx-auto">
            Link a GitHub repository to index it and start running blast-radius checks, ask questions, and generate diagrams.
          </p>
          <Link href="/dashboard/repos"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-body font-medium text-white bg-brand rounded-xl hover:bg-brand/90 transition-colors">
            Connect a repository <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* No checks yet nudge ────────────────────────── */}
      {repos > 0 && checks.length === 0 && (
        <div className="flex items-start gap-3 mt-4 p-4 bg-solar/5 border border-solar/20 rounded-xl">
          <AlertTriangle size={14} className="text-solar flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-body text-sm text-ink font-medium mb-0.5">No scans yet</p>
            <p className="font-body text-xs text-ink-muted">
              Run your first blast-radius scan — paste a file path in{" "}
              <Link href="/dashboard/check" className="text-brand hover:underline">Scan</Link>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
