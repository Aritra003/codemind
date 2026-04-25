"use client";
// NOVA — CodeMind Graph Explorer
// Dual-canvas bloom architecture: blurred glow layer + crisp sharp layer
// D3 force simulation · curved bezier edges · animated particles · convex hull clusters
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { GraphHUD } from "./D3Graph.hud";
import {
  generateStars, drawBackground, drawClusters, drawEdges,
  drawNodeGlow, drawNodeSharp, drawParticles, nodeR,
  type RenderNode, type RenderLink, type Star, type Particle,
} from "./D3Graph.render";

type GNode = { id: string; name?: string; kind?: string; type?: string; language?: string };
type GEdge = { from: string; to: string; type?: string; kind?: string };
type GraphData = { nodes: GNode[]; edges: GEdge[]; meta?: { fullName: string; nodeCount: number; edgeCount: number; completeness: number } };

const MAX_NODES     = 800;
const MAX_PARTICLES = 90;

// Mutable simulation state — lives outside React to avoid stale closures in RAF
type SimState = {
  nodes: RenderNode[]; links: RenderLink[]; stars: Star[]; particles: Particle[];
  transform: d3.ZoomTransform; simAlpha: number; t: number;
  selectedId: string | null; highlight: Set<string>;
  zoom: d3.ZoomBehavior<HTMLCanvasElement, unknown> | null;
  sim: d3.Simulation<RenderNode, RenderLink> | null;
  raf: number | null; running: boolean;
};

function buildHighlight(sel: string | null, links: RenderLink[]): Set<string> {
  if (!sel) return new Set();
  const s = new Set<string>([sel]);
  for (const lk of links) {
    const a = (lk.source as RenderNode).id, b = (lk.target as RenderNode).id;
    if (a === sel) s.add(b);
    if (b === sel) s.add(a);
  }
  return s;
}

export function D3Graph({ repoId }: { repoId: string }) {
  const glowRef  = useRef<HTMLCanvasElement>(null);
  const sharpRef = useRef<HTMLCanvasElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const st       = useRef<SimState>({
    nodes: [], links: [], stars: [], particles: [], transform: d3.zoomIdentity,
    simAlpha: 1, t: 0, selectedId: null, highlight: new Set(),
    zoom: null, sim: null, raf: null, running: false,
  });

  const [graphData,  setGraphData] = useState<GraphData | null>(null);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState<string | null>(null);
  const [search,     setSearch]    = useState("");
  const [debouncedQ, setDQ]        = useState("");
  const [filterLang, setFilterLang]= useState("all");
  const [selNode,    setSelNode]   = useState<RenderNode | null>(null);
  const [simRunning, setSimRun]    = useState(true);

  // Debounce search so typing doesn't restart sim every keystroke
  useEffect(() => { const id = setTimeout(() => setDQ(search), 320); return () => clearTimeout(id); }, [search]);

  // Fetch
  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/repos/${repoId}/graph`)
      .then(r => r.json() as Promise<GraphData & { error?: string }>)
      .then(d => { if (d.error) throw new Error(d.error); setGraphData(d); })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [repoId]);

  // Build simulation + RAF loop
  useEffect(() => {
    if (!graphData || !glowRef.current || !sharpRef.current || !wrapRef.current) return;
    const s = st.current;
    if (s.raf) cancelAnimationFrame(s.raf);
    s.sim?.stop();

    const W = wrapRef.current.clientWidth, H = wrapRef.current.clientHeight;
    for (const cv of [glowRef.current, sharpRef.current]) { cv.width = W; cv.height = H; }
    s.stars = generateStars(W, H);

    // Filter + degree
    const q = debouncedQ.toLowerCase();
    const rawNodes = graphData.nodes
      .filter(n => (filterLang === "all" || n.language === filterLang) && (!q || n.id.toLowerCase().includes(q)))
      .slice(0, MAX_NODES);
    const nodeIds  = new Set(rawNodes.map(n => n.id));
    const rawEdges = graphData.edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));

    const inDeg = new Map<string, number>(), outDeg = new Map<string, number>();
    for (const e of rawEdges) {
      inDeg.set(e.to,   (inDeg.get(e.to)   ?? 0) + 1);
      outDeg.set(e.from,(outDeg.get(e.from) ?? 0) + 1);
    }

    // Radial seed by directory
    const dirs = new Map<string, number>();
    for (const n of rawNodes) { const d = n.id.split("/")[0] ?? ""; if (!dirs.has(d)) dirs.set(d, dirs.size); }
    const dc = dirs.size || 1;

    s.nodes = rawNodes.map(n => {
      const di = dirs.get(n.id.split("/")[0] ?? "") ?? 0;
      const ang = (di / dc) * Math.PI * 2, spread = Math.min(W, H) * 0.33;
      return { ...n, inDeg: inDeg.get(n.id) ?? 0, outDeg: outDeg.get(n.id) ?? 0,
        x: W/2 + Math.cos(ang)*spread + (Math.random()-0.5)*spread*0.55,
        y: H/2 + Math.sin(ang)*spread + (Math.random()-0.5)*spread*0.55 };
    });
    s.links = rawEdges.map(e => ({ source: e.from, target: e.to, edgeType: e.kind ?? e.type ?? "imports" }));
    s.particles = rawEdges
      .map((_, i) => i).filter(i => i % 3 === 0).slice(0, MAX_PARTICLES)
      .map(i => ({ linkIdx: i, t: Math.random(), speed: 0.0012 + Math.random() * 0.001 }));
    s.simAlpha = 1; s.running = true; setSimRun(true);

    s.sim = d3.forceSimulation<RenderNode>(s.nodes)
      .force("link", d3.forceLink<RenderNode, RenderLink>(s.links).id(d => d.id).distance(72).strength(0.18))
      .force("charge", d3.forceManyBody<RenderNode>().strength(d => -170 - d.inDeg * 5).distanceMax(380))
      .force("center", d3.forceCenter(W/2, H/2))
      .force("collide", d3.forceCollide<RenderNode>(d => nodeR(d.inDeg) + 9))
      .alphaDecay(0.022)
      .on("tick", () => { s.simAlpha = s.sim!.alpha(); if (s.sim!.alpha() < 0.01) { s.running = false; setSimRun(false); } });

    // Zoom on sharp canvas
    const zoom = d3.zoom<HTMLCanvasElement, unknown>().scaleExtent([0.04, 8])
      .on("zoom", ev => { s.transform = ev.transform as d3.ZoomTransform; });
    d3.select(sharpRef.current).call(zoom);
    s.zoom = zoom;

    // Hit test on click
    const canvas = sharpRef.current;
    const onClick = (ev: MouseEvent) => {
      const [mx, my] = s.transform.invert([ev.offsetX, ev.offsetY]);
      let best: RenderNode | null = null, bestD = Infinity;
      for (const n of s.nodes) {
        const dist = Math.hypot((n.x??0)-mx, (n.y??0)-my);
        if (dist < nodeR(n.inDeg) + 6 && dist < bestD) { bestD = dist; best = n; }
      }
      s.selectedId = best && best.id !== s.selectedId ? best.id : null;
      s.highlight  = buildHighlight(s.selectedId, s.links);
      setSelNode(s.selectedId ? (s.nodes.find(n => n.id === s.selectedId) ?? null) : null);
    };
    canvas.addEventListener("click", onClick);

    // Drag
    // Canvas drag — track dragged node via closure
    let dragging: RenderNode | null = null;
    canvas.addEventListener("pointerdown", (ev) => {
      const [mx, my] = s.transform.invert([ev.offsetX, ev.offsetY]);
      dragging = s.nodes.reduce((best: RenderNode | null, n) => {
        const dist = Math.hypot((n.x??0)-mx,(n.y??0)-my);
        const prev = best ? Math.hypot((best.x??0)-mx,(best.y??0)-my) : Infinity;
        return dist < nodeR(n.inDeg)+10 && dist < prev ? n : best;
      }, null);
      if (dragging && s.sim) { s.sim.alphaTarget(0.25).restart(); dragging.fx = dragging.x; dragging.fy = dragging.y; }
    });
    canvas.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      const [mx, my] = s.transform.invert([ev.offsetX, ev.offsetY]);
      dragging.fx = mx; dragging.fy = my;
    });
    const onPointerUp = () => {
      if (dragging && s.sim) { s.sim.alphaTarget(0); dragging.fx = null; dragging.fy = null; }
      dragging = null;
    };
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    // Capture contexts once for the loop
    const gctx = glowRef.current!.getContext("2d")!;
    const sctx = sharpRef.current!.getContext("2d")!;

    const loop = () => {
      s.t += 0.018;
      for (const p of s.particles) { p.t += p.speed; if (p.t > 1) p.t -= 1; }

      drawBackground(gctx, W, H, s.stars);
      gctx.save(); gctx.translate(s.transform.x, s.transform.y); gctx.scale(s.transform.k, s.transform.k);
      drawClusters(gctx, s.nodes, s.simAlpha);
      drawNodeGlow(gctx, s.nodes, s.selectedId, s.highlight, s.t);
      gctx.restore();

      sctx.clearRect(0, 0, W, H);
      sctx.save(); sctx.translate(s.transform.x, s.transform.y); sctx.scale(s.transform.k, s.transform.k);
      drawEdges(sctx, s.links, s.selectedId, s.highlight);
      drawParticles(sctx, s.links, s.particles);
      drawNodeSharp(sctx, s.nodes, s.selectedId, s.highlight, s.t);
      sctx.restore();

      s.raf = requestAnimationFrame(loop);
    };
    s.raf = requestAnimationFrame(loop);

    return () => {
      if (s.raf) cancelAnimationFrame(s.raf);
      s.sim?.stop();
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, [graphData, debouncedQ, filterLang]);

  // HUD actions
  const zoomBy = (f: number) => { if (sharpRef.current && st.current.zoom) d3.select(sharpRef.current).transition().duration(300).call(st.current.zoom.scaleBy, f); };
  const resetView = () => { if (sharpRef.current && st.current.zoom) d3.select(sharpRef.current).transition().duration(400).call(st.current.zoom.transform, d3.zoomIdentity); };
  const fitView = () => {
    const s = st.current; if (!sharpRef.current || !s.zoom || !s.nodes.length || !wrapRef.current) return;
    const xs = s.nodes.map(n => n.x ?? 0), ys = s.nodes.map(n => n.y ?? 0);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const W = wrapRef.current.clientWidth, H = wrapRef.current.clientHeight;
    const k = Math.min(0.9, 0.9 / Math.max((maxX - minX) / W, (maxY - minY) / H));
    const tx = d3.zoomIdentity.translate(W/2 - k*(minX+maxX)/2, H/2 - k*(minY+maxY)/2).scale(k);
    d3.select(sharpRef.current).transition().duration(600).call(s.zoom.transform, tx);
  };
  const deselect = () => { st.current.selectedId = null; st.current.highlight = new Set(); setSelNode(null); };

  const langs = graphData ? [...new Set(graphData.nodes.map(n => n.language ?? "").filter(Boolean))].sort() : [];
  const meta  = graphData?.meta ? { nodeCount: graphData.meta.nodeCount, edgeCount: graphData.meta.edgeCount, completeness: graphData.meta.completeness, repoName: graphData.meta.fullName } : null;
  const gEdges= graphData?.edges.map(e => ({ from: e.from, to: e.to })) ?? [];

  if (loading) return (
    <div className="flex items-center justify-center h-full rounded-2xl" style={{ background: "#05050F" }}>
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border border-indigo-500/15 animate-ping" />
          <div className="absolute inset-2 rounded-full border border-indigo-500/25 animate-ping" style={{ animationDelay: "180ms" }} />
          <div className="absolute inset-4 rounded-full border border-indigo-500/45 animate-ping" style={{ animationDelay: "360ms" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          </div>
        </div>
        <p className="font-mono text-xs text-slate-500 tracking-widest uppercase">Initialising graph engine</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-full rounded-2xl" style={{ background: "#05050F" }}>
      <p className="font-mono text-sm text-red-400">{error}</p>
    </div>
  );

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden rounded-2xl" style={{ background: "#05050F" }}>
      {/* Glow bloom layer — CSS blur creates the nebula effect */}
      <canvas ref={glowRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ filter: "blur(7px)", opacity: 0.62 }} />
      {/* Sharp layer — receives all mouse events */}
      <canvas ref={sharpRef} className="absolute inset-0 w-full h-full" style={{ cursor: "crosshair" }} />
      {/* React HUD */}
      <GraphHUD
        stats={meta} search={search} setSearch={setSearch}
        filterLang={filterLang} setFilterLang={setFilterLang} langs={langs}
        selectedNode={selNode} onDeselect={deselect}
        onZoomIn={() => zoomBy(1.45)} onZoomOut={() => zoomBy(0.68)}
        onReset={resetView} onFitView={fitView}
        graphEdges={gEdges} simRunning={simRunning}
      />
    </div>
  );
}
