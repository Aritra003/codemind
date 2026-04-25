"use client";
import { Search, ZoomIn, ZoomOut, RotateCcw, Maximize2, X, ChevronRight, Activity } from "lucide-react";
import { KIND_COLORS, riskGlow, rgba, type RenderNode } from "./D3Graph.render";

// ── Node inspector ────────────────────────────────────────────────────────

function RiskTag({ inDeg }: { inDeg: number }) {
  const label = inDeg >= 20 ? "CRITICAL" : inDeg >= 10 ? "HIGH" : inDeg >= 4 ? "MEDIUM" : "LOW";
  const c = riskGlow(inDeg);
  return <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: rgba(c, 0.15), color: c, border: `1px solid ${rgba(c, 0.35)}` }}>{label}</span>;
}

function NodeInspector({ node, graphEdges, onClose }: { node: RenderNode; graphEdges: Array<{ from: string; to: string }>; onClose: () => void }) {
  const usedBy  = graphEdges.filter(e => e.to === node.id).slice(0, 14);
  const imports = graphEdges.filter(e => e.from === node.id).slice(0, 14);
  const kc      = KIND_COLORS[node.kind ?? node.type ?? ""] ?? "#6B7280";
  return (
    <div className="absolute right-3 top-3 bottom-3 w-72 z-10 flex flex-col overflow-hidden rounded-2xl border backdrop-blur-sm"
      style={{ background: "rgba(10,10,20,0.92)", borderColor: rgba(kc, 0.4) }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: rgba(kc, 0.25), background: rgba(kc, 0.08) }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: kc, boxShadow: `0 0 6px ${kc}` }} />
          <span className="font-mono text-xs font-bold text-white truncate">{node.kind ?? node.type ?? "node"}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RiskTag inDeg={node.inDeg} />
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors ml-1"><X size={13} /></button>
        </div>
      </div>
      {/* Path */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="font-mono text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Path</p>
        <p className="font-mono text-xs text-slate-300 break-all leading-relaxed">{node.id}</p>
      </div>
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 p-4 flex-shrink-0">
        <div className="rounded-xl p-3 text-center" style={{ background: rgba(kc, 0.1), border: `1px solid ${rgba(kc, 0.2)}` }}>
          <div className="font-mono text-xl font-bold" style={{ color: kc }}>{node.inDeg}</div>
          <div className="font-mono text-[10px] text-slate-500 mt-0.5">used by</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="font-mono text-xl font-bold text-slate-200">{node.outDeg}</div>
          <div className="font-mono text-[10px] text-slate-500 mt-0.5">imports</div>
        </div>
      </div>
      {/* Dependency lists */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {usedBy.length > 0 && (
          <div>
            <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2">Used by ({graphEdges.filter(e => e.to === node.id).length})</p>
            {usedBy.map(e => (
              <div key={e.from} className="flex items-center gap-1.5 py-1.5 border-b border-white/5">
                <ChevronRight size={9} className="text-slate-600 flex-shrink-0" />
                <span className="font-mono text-[11px] text-slate-400 truncate">{e.from.split("/").pop()}</span>
              </div>
            ))}
          </div>
        )}
        {imports.length > 0 && (
          <div>
            <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2">Imports ({graphEdges.filter(e => e.from === node.id).length})</p>
            {imports.map(e => (
              <div key={e.to} className="flex items-center gap-1.5 py-1.5 border-b border-white/5">
                <ChevronRight size={9} className="text-slate-600 flex-shrink-0" />
                <span className="font-mono text-[11px] text-slate-400 truncate">{e.to.split("/").pop()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main HUD ─────────────────────────────────────────────────────────────

interface HudProps {
  stats:        { nodeCount: number; edgeCount: number; completeness: number; repoName: string } | null;
  search:       string;
  setSearch:    (v: string) => void;
  filterLang:   string;
  setFilterLang:(v: string) => void;
  langs:        string[];
  selectedNode: RenderNode | null;
  onDeselect:   () => void;
  onZoomIn:     () => void;
  onZoomOut:    () => void;
  onReset:      () => void;
  onFitView:    () => void;
  graphEdges:   Array<{ from: string; to: string }>;
  simRunning:   boolean;
}

export function GraphHUD({ stats, search, setSearch, filterLang, setFilterLang, langs, selectedNode, onDeselect, onZoomIn, onZoomOut, onReset, onFitView, graphEdges, simRunning }: HudProps) {
  const hasInspector = !!selectedNode;
  return (
    <>
      {/* Stats bar */}
      {stats && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-1.5 rounded-xl font-mono text-[11px] whitespace-nowrap" style={{ background: "rgba(8,8,18,0.85)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
          {simRunning && <span className="flex items-center gap-1 text-brand animate-pulse"><Activity size={9} />LIVE</span>}
          <span><span className="text-brand font-medium">{stats.nodeCount.toLocaleString()}</span> <span className="text-slate-500">nodes</span></span>
          <span className="text-slate-700">·</span>
          <span><span className="text-accent font-medium">{stats.edgeCount.toLocaleString()}</span> <span className="text-slate-500">edges</span></span>
          <span className="text-slate-700">·</span>
          <span className={stats.completeness >= 80 ? "text-emerald-400" : "text-yellow-400"}>{stats.completeness}%</span>
          <span className="text-slate-700">·</span>
          <span className="text-slate-300">{stats.repoName}</span>
        </div>
      )}

      {/* Controls — top left */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search nodes…"
            className="pl-7 pr-3 py-1.5 font-mono text-xs text-slate-200 placeholder:text-slate-600 w-48 focus:outline-none rounded-lg"
            style={{ background: "rgba(8,8,18,0.85)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }} />
        </div>
        <select value={filterLang} onChange={e => setFilterLang(e.target.value)}
          className="px-3 py-1.5 font-mono text-xs text-slate-300 focus:outline-none rounded-lg w-48 appearance-none"
          style={{ background: "rgba(8,8,18,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <option value="all">All languages</option>
          {langs.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Zoom controls — top right (hidden when inspector open) */}
      {!hasInspector && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          {([["zoomin", onZoomIn], ["zoomout", onZoomOut], ["reset", onReset], ["fit", onFitView]] as [string, () => void][]).map(([k, fn]) => (
            <button key={k} onClick={fn} className="p-2 rounded-lg text-slate-500 hover:text-white transition-colors"
              style={{ background: "rgba(8,8,18,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {k === "zoomin" ? <ZoomIn size={13} /> : k === "zoomout" ? <ZoomOut size={13} /> : k === "reset" ? <RotateCcw size={13} /> : <Maximize2 size={13} />}
            </button>
          ))}
        </div>
      )}

      {/* Legend — bottom left (hidden when inspector open) */}
      {!hasInspector && (
        <div className="absolute bottom-10 left-3 z-10 p-3 rounded-xl font-mono text-[10px]" style={{ background: "rgba(8,8,18,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-slate-600 mb-2 uppercase tracking-wider">Kind</p>
          {(["function", "class", "module", "interface"] as const).map(k => (
            <div key={k} className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: KIND_COLORS[k], boxShadow: `0 0 4px ${KIND_COLORS[k]}` }} />
              <span className="text-slate-500 capitalize">{k}</span>
            </div>
          ))}
          <p className="text-slate-600 mt-2 mb-2 uppercase tracking-wider">Risk ring</p>
          {(["#EF4444", "#F97316", "#EAB308", "#6366F1"] as const).map((c, i) => (
            <div key={c} className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full border-2 bg-transparent" style={{ borderColor: c }} />
              <span className="text-slate-500">{["≥20 critical", "≥10 high", "≥4 medium", "low"][i]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="absolute bottom-3 left-3 z-10 flex gap-3 font-mono text-[10px] text-slate-700">
        <span>drag nodes</span><span>·</span><span>scroll to zoom</span><span>·</span><span>click to inspect</span>
      </div>

      {/* Node inspector */}
      {selectedNode && <NodeInspector node={selectedNode} graphEdges={graphEdges} onClose={onDeselect} />}
    </>
  );
}
