import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Network, ArrowRight } from "lucide-react";
import { GraphExplorer } from "./client";

export default async function GraphPage() {
  const session = await auth();
  const userId = (session?.user as { id: string })?.id;
  const repos = await db.repo.findMany({
    where: { userId, indexedAt: { not: null } },
    select: { id: true, fullName: true, nodeCount: true, edgeCount: true, completeness: true, indexedAt: true },
    orderBy: { indexedAt: "desc" },
  });

  return (
    <div className="flex flex-col h-full p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-accent/12 border border-accent/25 flex items-center justify-center">
          <Network size={16} className="text-accent" />
        </div>
        <h1 className="font-display text-xl font-bold text-ink">Graph Explorer</h1>
      </div>
      <p className="font-body text-sm text-ink-muted mb-6 pl-12">Interactive force-directed visualization of your code dependency graph.</p>

      {repos.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center border border-dashed border-border">
          <Network size={36} className="text-ink-dim mx-auto mb-4" />
          <h3 className="font-display font-semibold text-ink mb-2">No indexed repos</h3>
          <p className="font-body text-sm text-ink-muted mb-5 max-w-sm mx-auto">Connect and index a GitHub repo first to explore its graph here.</p>
          <Link href="/dashboard/repos" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-body font-medium text-white bg-brand rounded-xl hover:bg-brand/90 transition-colors">
            Go to Repos <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <GraphExplorer repos={repos} />
      )}
    </div>
  );
}
