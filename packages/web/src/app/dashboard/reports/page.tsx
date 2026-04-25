import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { FileText, ArrowRight, GitBranch } from "lucide-react";

export default async function ReportsPage() {
  const session = await auth();
  const userId = (session?.user as { id: string })?.id;

  const reports = await db.report.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { repo: { select: { fullName: true } } },
  });

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-accent/12 border border-accent/25 flex items-center justify-center">
          <FileText size={16} className="text-accent" />
        </div>
        <h1 className="font-display text-xl font-bold text-ink">Reports</h1>
      </div>
      <p className="font-body text-sm text-ink-muted mb-8 pl-12">
        Auto-generated after every index — security audit, performance, data flow, and more.
      </p>

      {reports.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center border border-dashed border-border">
          <FileText size={32} className="text-ink-dim mx-auto mb-3" />
          <p className="font-body text-sm text-ink-muted mb-4">No reports yet. Index a repo to generate your first report.</p>
          <Link href="/dashboard/repos" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-body font-medium text-white bg-brand rounded-xl hover:bg-brand/90 transition-colors">
            Go to Repos <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => {
            const data = JSON.parse(r.data);
            const score = data.summary?.securityScore ?? 0;
            const scoreClass = score >= 80 ? "text-neon" : score >= 60 ? "text-solar" : "text-heat";
            return (
              <Link key={r.id} href={`/dashboard/reports/${r.id}`}
                className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4 hover:border-border-light hover:bg-surface-raised transition-all duration-150 group block">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch size={12} className="text-ink-dim" />
                    <span className="font-mono text-sm font-medium text-ink truncate">{r.repo.fullName}</span>
                  </div>
                  <p className="font-body text-xs text-ink-muted">
                    {data.summary?.totalFiles ?? 0} files · {data.summary?.totalEdges ?? 0} edges · {data.summary?.languages?.join(", ") ?? ""}
                  </p>
                  <p className="font-mono text-[10px] text-ink-dim mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className={`font-mono text-lg font-bold leading-none ${scoreClass}`}>{score}</div>
                  <div className="font-mono text-[10px] text-ink-dim">security</div>
                </div>
                <ArrowRight size={14} className="text-ink-dim group-hover:text-brand transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
