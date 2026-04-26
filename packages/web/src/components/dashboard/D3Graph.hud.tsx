"use client";
import { Search, ZoomIn, ZoomOut, RotateCcw, Maximize2, X, ChevronRight, Activity } from "lucide-react";
import { KIND_COLORS, SEVERITY_COLORS, rgba, type RenderNode } from "./D3Graph.render";

// ── Hover tooltip ─────────────────────────────────────────────────────────

function NodeTooltip({ node, pos }: { node: RenderNode; pos: { x: number; y: number } }) {
  const sev = node.severity;
  const sevColor = sev ? SEVERITY_COLORS[sev]! : "#6366F1";
  // Keep tooltip inside the canvas horizontally: offset right by default, flip if close to right edge
  const style: React.CSSProperties = {
    position: "absolute",
    left: pos.x + 14,
    top: Math.max(4, pos.y - 8),
    background: "rgba(5,5,15,0.97)",
    border: `1px solid ${rgba(sevColor, 0.5)}`,
    borderRadius: 10,
    padding: "8px 12px",
    maxWidth: 240,
    pointerEvents: "none",
    zIndex: 20,
    backdropFilter: "blur(8px)",
  };
  return (
    <div style={style} role="tooltip">
      <div className="font-mono text-xs font-bold text-white truncate mb-0.5">
        {node.name ?? node.id.split("/").pop()}
      </div>
      <div className="font-mono text-xs text-slate-500 truncate mb-1.5">{node.id}</div>
      {sev && (
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sevColor }} />
          <span className="font-mono text-xs font-bold" style={{ color: sevColor }}>{sev}</span>
          {!!node.errorCount && (
            <span className="font-mono text-xs text-slate-500">{node.errorCount} issue{node.errorCount !== 1 ? "s" : ""}</span>
          )}
        </div>
      )}
      {node.hasCircularDep && (
        <div className="font-mono text-xs text-amber-400 mb-1">↺ Circular dependency</div>
      )}
      <div className="font-mono text-xs text-slate-600 pt-1 border-t border-white/5">
        {node.inDeg} dependents · {node.outDeg} imports
      </div>
    </div>
  );
}

// ── Risk / severity tag ───────────────────────────────────────────────────

function RiskTag({ inDeg, severity }: { inDeg: number; severity?: string }) {
  const label = severity ?? (inDeg >= 20 ? "HOTSPOT" : inDeg >= 10 ? "HIGH-DEP" : inDeg >= 4 ? "MED-DEP" : "LOW");
  const c = severity ? SEVERITY_COLORS[severity]! : (inDeg >= 20 ? "#EF4444" : inDeg >= 10 ? "#F97316" : inDeg >= 4 ? "#EAB308" : "#6366F1");
  return (
    <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: rgba(c, 0.15), color: c, border: `1px solid ${rgba(c, 0.35)}` }}>
      {label}
    </span>
  );
}

// ── Node inspector ────────────────────────────────────────────────────────

function NodeInspector({ node, graphEdges, onClose }: {
  node: RenderNode;
  graphEdges: Array<{ from: string; to: string }>;
  onClose: () => void;
}) {
  const usedBy  = graphEdges.filter(e => e.to   === node.id).slice(0, 14);
  const imports = graphEdges.filter(e => e.from  === node.id).slice(0, 14);
  const kc      = KIND_COLORS[node.kind ?? node.type ?? ""] ?? "#6B7280";
  const sev     = node.severity;
  const sevColor = sev ? SEVERITY_COLORS[sev]! : null;
  return (
    <div className="absolute right-3 top-3 bottom-3 w-72 z-10 flex flex-col overflow-hidden rounded-2xl border backdrop-blur-sm"
      style={{ background: "rgba(10,10,20,0.92)", borderColor: rgba(kc, 0.4) }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: rgba(kc, 0.25), background: rgba(kc, 0.08) }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: kc, boxShadow: `0 0 6px ${kc}` }} />
          <span className="font-mono text-xs font-bold text-white truncate">{node.kind ?? node.type ?? "node"}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RiskTag inDeg={node.inDeg} severity={node.severity} />
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors ml-1" aria-label="Close inspector">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Path */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="font-mono text-xs text-slate-500 mb-1 uppercase tracking-wider">Path</p>
        <p className="font-mono text-xs text-slate-300 break-all leading-relaxed">{node.id}</p>
      </div>

      {/* Health section — only when report data is present */}
      {(sev || node.hasCircularDep) && (
        <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="font-mono text-xs text-slate-500 mb-2 uppercase tracking-wider">Health</p>
          {sevColor && (
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sevColor }} />
              <span className="font-mono text-xs font-bold" style={{ color: sevColor }}>{sev}</span>
              {!!node.errorCount && (
                <span className="font-mono text-xs text-slate-400">{node.errorCount} error{node.errorCount !== 1 ? "s" : ""}</span>
              )}
              {!!node.warningCount && (
                <span className="font-mono text-xs text-slate-400">{node.warningCount} warning{node.warningCount !== 1 ? "s" : ""}</span>
              )}
            </div>
          )}
          {node.hasCircularDep && (
            <div className="font-mono text-xs text-amber-400">↺ Part of a circular dependency</div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 p-4 flex-shrink-0">
        <div className="rounded-xl p-3 text-center" style={{ background: rgba(kc, 0.1), border: `1px solid ${rgba(kc, 0.2)}` }}>
          <div className="font-mono text-xl font-bold" style={{ color: kc }}>{node.inDeg}</div>
          <div className="font-mono text-xs text-slate-500 mt-0.5">used by</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="font-mono text-xl font-bold text-slate-200">{node.outDeg}</div>
          <div className="font-mono text-xs text-slate-500 mt-0.5">imports</div>
        </div>
      </div>

      {/* Dependency lists */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {usedBy.length > 0 && (
          <div>
            <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-2">
              Used by ({graphEdges.filter(e => e.to === node.id).length})
            </p>
            {usedBy.map(e => (
              <div key={e.from} className="flex items-center gap-1.5 py-1.5 border-b border-white/5">
                <ChevronRight size={9} className="text-slate-600 flex-shrink-0" />
                <span className="font-mono text-xs text-slate-400 truncate">{e.from.split("/").pop()}</span>
              </div>
            ))}
          </div>
        )}
        {imports.length > 0 && (
          <div>
            <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-2">
              Imports ({graphEdges.filter(e => e.from === node.id).length})
            </p>
            {imports.map(e => (
              <div key={e.to} className="flex items-center gap-1.5 py-1.5 border-b border-white/5">
                <ChevronRight size={9} className="text-slate-600 flex-shrink-0" />
                <span className="font-mono text-xs text-slate-400 truncate">{e.to.split("/").pop()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main HUD ──────────────────────────────────────────────────────────────

interface HudProps {
  stats:          { nodeCount: number; edgeCount: number; completeness: number; repoName: string } | null;
  search:         string;
  setSearch:      (v: string) => void;
  filterLang:     string;
  setFilterLang:  (v: string) => void;
  langs:          string[];
  selectedNode:   RenderNode | null;
  onDeselect:     () => void;
  hoveredNode:    RenderNode | null;
  hoverPos:       { x: number; y: number } | null;
  onZoomIn:       () => void;
  onZoomOut:      () => void;
  onReset:        () => void;
  onFitView:      () => void;
  graphEdges:     Array<{ from: string; to: string }>;
  simRunning:     boolean;
}

export function GraphHUD({
  stats, search, setSearch, filterLang, setFilterLang, langs,
  selectedNode, onDeselect, hoveredNode, hoverPos,
  onZoomIn, onZoomOut, onReset, onFitView, graphEdges, simRunning,
}: HudProps) {
  const hasInspector = !!selectedNode;
  const glassStyle: React.CSSProperties = { background: "rgba(8,8,18,0.88)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" };

  return (
    <>
      {/* Stats bar — centered top */}
      {stats && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-1.5 rounded-xl font-mono text-xs whitespace-nowrap" style={glassStyle}>
          {simRunning && <span className="flex items-center gap-1 text-indigo-400 animate-pulse"><Activity size={9} />LIVE</span>}
          <span><span className="text-indigo-400 font-medium">{stats.nodeCount.toLocaleString()}</span> <span className="text-slate-500">nodes</span></span>
          <span className="text-slate-700">·</span>
          <span><span className="text-purple-400 font-medium">{stats.edgeCount.toLocaleString()}</span> <span className="text-slate-500">edges</span></span>
          <span className="text-slate-700">·</span>
          <span className={stats.completeness >= 80 ? "text-emerald-400" : "text-yellow-400"}>{stats.completeness}%</span>
          <span className="text-slate-700">·</span>
          <span className="text-slate-300">{stats.repoName}</span>
        </div>
      )}

      {/* Search + language filter — top left */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes…"
            className="pl-7 pr-3 py-1.5 font-mono text-xs text-slate-200 placeholder:text-slate-600 w-48 focus:outline-none rounded-lg"
            style={glassStyle}
          />
        </div>
        <select
          value={filterLang} onChange={e => setFilterLang(e.target.value)}
          className="px-3 py-1.5 font-mono text-xs text-slate-300 focus:outline-none rounded-lg w-48 appearance-none"
          style={glassStyle}
        >
          <option value="all">All languages</option>
          {langs.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Zoom controls — top right (hidden when inspector open) */}
      {!hasInspector && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          {([["zoomin", onZoomIn], ["zoomout", onZoomOut], ["reset", onReset], ["fit", onFitView]] as [string, () => void][]).map(([k, fn]) => (
            <button key={k} onClick={fn} aria-label={k}
              className="p-2 rounded-lg text-slate-500 hover:text-white transition-colors" style={glassStyle}>
              {k === "zoomin" ? <ZoomIn size={13} /> : k === "zoomout" ? <ZoomOut size={13} /> : k === "reset" ? <RotateCcw size={13} /> : <Maximize2 size={13} />}
            </button>
          ))}
        </div>
      )}

      {/* Legend — bottom left */}
      {!hasInspector && (
        <div className="absolute bottom-10 left-3 z-10 p-3 rounded-xl font-mono text-xs" style={glassStyle}>
          <p className="text-slate-600 mb-2 uppercase tracking-wider">Node health</p>
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(sev => (
            <div key={sev} className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: SEVERITY_COLORS[sev], boxShadow: `0 0 4px ${SEVERITY_COLORS[sev]}` }} />
              <span className="text-slate-500">{sev === "CRITICAL" ? "Critical error  !" : sev === "HIGH" ? "High error  !" : sev === "MEDIUM" ? "Warning  ▲" : "Low / minor"}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full border border-indigo-400 bg-transparent" />
            <span className="text-slate-500">Healthy / no findings</span>
          </div>
          <p className="text-slate-600 mt-2 mb-2 uppercase tracking-wider">Edges</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 border-t border-slate-600" />
            <span className="text-slate-500">Imports</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 border-t-2 border-dashed border-red-500" />
            <span className="text-slate-500">Circular dep  ↺</span>
          </div>
          <p className="text-slate-600 mt-2 mb-2 uppercase tracking-wider">Node size</p>
          <div className="text-slate-500">Larger = more dependents</div>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="absolute bottom-3 left-3 z-10 flex gap-3 font-mono text-xs text-slate-500">
        <span>drag</span><span>·</span><span>scroll to zoom</span><span>·</span>
        <span>click / Enter to inspect</span><span>·</span><span>↑↓←→ navigate</span>
      </div>

      {/* Hover tooltip */}
      {hoveredNode && hoverPos && !selectedNode && (
        <NodeTooltip node={hoveredNode} pos={hoverPos} />
      )}

      {/* Node inspector (selected) */}
      {selectedNode && <NodeInspector node={selectedNode} graphEdges={graphEdges} onClose={onDeselect} />}
    </>
  );
}
