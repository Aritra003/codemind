import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { GitBranch, Zap, Key, ArrowRight, Network } from "lucide-react";

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
    { href: "/dashboard/repos",   Icon: GitBranch, color: "#4361EE", label: "Connect repo",    desc: "Link a GitHub repository" },
    { href: "/dashboard/check",   Icon: Zap,       color: "#FF6B6B", label: "Run a check",     desc: "Paste a file path to analyze" },
    { href: "/dashboard/graph",   Icon: Network,   color: "#A78BFA", label: "Explore graph",   desc: "Visual graph explorer" },
    { href: "/dashboard/apikeys", Icon: Key,       color: "#00F5D4", label: "Create API key",  desc: "For agent authentication" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Good day, {name} 👋</h1>
        <p className="font-body text-sm text-ink-muted">Your CodeMind command centre.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Repos connected", value: repos, color: "#4361EE" },
          { label: "API keys", value: keys, color: "#00F5D4" },
          { label: "Checks run", value: checks.length, color: "#FFB347" },
          { label: "MCP tools", value: 6, color: "#A78BFA" },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 border border-border">
            <div className="font-mono text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="font-body text-xs text-ink-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="font-display font-semibold text-ink mb-4 text-sm tracking-wide">QUICK ACTIONS</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {QUICK_ACTIONS.map(a => (
          <Link key={a.href} href={a.href}
            className="glass rounded-xl p-4 border border-border hover:border-border-light card-hover-effect group">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `${a.color}12`, border: `1px solid ${a.color}25` }}>
              <a.Icon size={16} style={{ color: a.color }} />
            </div>
            <p className="font-body font-medium text-sm text-ink mb-1 group-hover:text-brand transition-colors">{a.label}</p>
            <p className="font-body text-xs text-ink-muted">{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent checks */}
      {checks.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-ink text-sm tracking-wide">RECENT CHECKS</h2>
            <Link href="/dashboard/check" className="text-xs text-brand hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="glass rounded-xl border border-border overflow-hidden">
            {checks.map((c, i) => (
              <div key={c.id} className={`flex items-center gap-4 px-4 py-3 ${i < checks.length - 1 ? "border-b border-border" : ""}`}>
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL" ? "#FF6B6B" : c.riskLevel === "MEDIUM" ? "#FFB347" : "#00F5D4" }} />
                <code className="font-mono text-xs text-ink flex-1 truncate">{c.filePath}</code>
                <span className="font-mono text-xs font-bold flex-shrink-0"
                  style={{ color: c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL" ? "#FF6B6B" : c.riskLevel === "MEDIUM" ? "#FFB347" : "#00F5D4" }}>
                  {c.riskLevel}
                </span>
                <span className="font-body text-[11px] text-ink-dim flex-shrink-0">{c.dependents} deps</span>
              </div>
            ))}
          </div>
        </>
      )}

      {repos === 0 && (
        <div className="glass rounded-2xl p-8 text-center border border-dashed border-border mt-2">
          <div className="text-3xl mb-4">🔗</div>
          <h3 className="font-display font-semibold text-ink mb-2">Connect your first repo</h3>
          <p className="font-body text-sm text-ink-muted mb-5 max-w-sm mx-auto">Link a GitHub repository to index it and start running blast radius checks from the web.</p>
          <Link href="/dashboard/repos"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-body font-medium text-white bg-brand rounded-xl hover:bg-brand/90 transition-colors">
            Connect GitHub repo <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
