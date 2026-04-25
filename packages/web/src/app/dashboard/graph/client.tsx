"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";

const D3Graph = dynamic(
  () => import("@/components/dashboard/D3Graph").then(m => ({ default: m.D3Graph })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-ink-muted font-mono text-sm">Loading graph engine…</div> }
);

type Repo = { id: string; fullName: string; nodeCount: number | null; edgeCount: number | null; completeness: number | null; indexedAt: Date | null };

export function GraphExplorer({ repos }: { repos: Repo[] }) {
  const [activeId, setActiveId] = useState(repos[0]?.id ?? "");
  const active = repos.find(r => r.id === activeId);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* Repo selector */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={activeId}
            onChange={e => setActiveId(e.target.value)}
            className="appearance-none bg-surface border border-border rounded-xl px-4 py-2.5 pr-10 font-mono text-sm text-ink focus:outline-none focus:border-brand/60 transition-colors"
          >
            {repos.map(r => (
              <option key={r.id} value={r.id}>{r.fullName}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
        </div>
        {active && (
          <div className="flex items-center gap-3 font-mono text-xs text-ink-muted">
            <span className="text-brand font-medium">{active.nodeCount?.toLocaleString()}</span> nodes
            <span className="text-accent font-medium">{active.edgeCount?.toLocaleString()}</span> edges
            <span className="text-neon font-medium">{active.completeness?.toFixed(0)}%</span> complete
          </div>
        )}
      </div>

      {/* Graph canvas */}
      <div className="flex-1 min-h-0" style={{ height: "calc(100vh - 220px)" }}>
        {activeId && <D3Graph key={activeId} repoId={activeId} />}
      </div>

      {/* Tips */}
      <div className="flex items-center gap-4 font-mono text-[11px] text-ink-dim py-1">
        <span>🖱 Drag nodes</span>
        <span>⚲ Scroll to zoom</span>
        <span>🖱 Click node to inspect</span>
        <span>🏷 Click legend to filter by language</span>
      </div>
    </div>
  );
}
