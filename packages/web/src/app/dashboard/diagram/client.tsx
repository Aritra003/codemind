"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { GitFork, Loader2, Copy, Check, Download, ChevronDown, Info, AlertTriangle, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { useTask } from "@/lib/task-manager";
type Repo   = { id: string; fullName: string; graphData: unknown };
type Result = { diagram: string; nodeCount: number; edgeCount: number; totalCount: number; warning?: string; repoName: string };

// Initialize mermaid once per page load — calling initialize() on every render
// causes a race condition when multiple renders fire in quick succession.
let mermaidReady = false;

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return { copied, copy };
}

let renderSeq = 0;

function DiagramPreview({ diagram }: { diagram: string }) {
  const wrapRef    = useRef<HTMLDivElement>(null);  // outer overflow:hidden shell
  const canvasRef  = useRef<HTMLDivElement>(null);  // inner div that holds the SVG
  const svgRef     = useRef<SVGSVGElement | null>(null);
  const xf         = useRef({ scale: 1, tx: 0, ty: 0 });
  const drag       = useRef({ active: false, x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const applyXf = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const { scale, tx, ty } = xf.current;
    svg.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
    // SVGSVGElement.style is CSSStyleDeclaration — no cast needed
  }, []);

  const fitToView = useCallback(() => {
    const wrap = wrapRef.current;
    const svg  = svgRef.current;
    if (!wrap || !svg) return;
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    const vb = svg.viewBox.baseVal;
    const sw = vb.width  > 0 ? vb.width  : svg.getBoundingClientRect().width;
    const sh = vb.height > 0 ? vb.height : svg.getBoundingClientRect().height;
    if (!sw || !sh) return;
    const k = Math.min(cw / sw, ch / sh) * 0.9;
    xf.current = { scale: k, tx: (cw - sw * k) / 2, ty: Math.max(16, (ch - sh * k) / 2) };
    applyXf();
  }, [applyXf]);

  // Render Mermaid whenever diagram string changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !diagram) return;
    setError(null); setReady(false);
    canvas.innerHTML = "";
    svgRef.current = null;
    const id = `mmd-${++renderSeq}`;
    import("mermaid").then(({ default: mermaid }) => {
      if (!mermaidReady) {
        mermaid.initialize({
          startOnLoad: false, theme: "dark", maxTextSize: 1_000_000,
          themeVariables: {
            background: "#05050F", primaryColor: "#6366F1", primaryTextColor: "#E2E8F0",
            primaryBorderColor: "#4F46E5", lineColor: "#6366F1", secondaryColor: "#10B981",
            tertiaryColor: "#1E293B", edgeLabelBackground: "#0F0F1A",
            fontFamily: "'JetBrains Mono', monospace", fontSize: "12px",
            nodeBorder: "#4F46E5", clusterBkg: "#0F0F1A", clusterBorder: "#1E1E35",
          },
          flowchart: { curve: "basis", padding: 24, nodeSpacing: 40, rankSpacing: 56 },
          securityLevel: "loose",
        });
        mermaidReady = true;
      }
      return mermaid.render(id, diagram);
    })
      .then(({ svg: svgStr }) => {
        if (!canvasRef.current) return;
        canvasRef.current.innerHTML = svgStr;
        const svgEl = canvasRef.current.querySelector("svg");
        if (!svgEl) return;
        // Remove Mermaid's inline size constraints so we control transforms
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
        svgEl.style.maxWidth        = "none";
        svgEl.style.overflow        = "visible";
        svgEl.style.position        = "absolute";
        svgEl.style.top             = "0";
        svgEl.style.left            = "0";
        svgEl.style.transformOrigin = "0 0";
        svgRef.current = svgEl;
        setReady(true);
        requestAnimationFrame(fitToView);
      })
      .catch((e: unknown) => {
        const msg = String(e);
        const friendly = msg.includes("Maximum text size") || msg.includes("maxTextSize")
          ? "Diagram too large to preview — use the Scope field to filter by directory."
          : "Diagram render error — switch to Source tab to inspect the generated Mermaid.";
        setError(friendly);
        if (canvasRef.current) canvasRef.current.innerHTML = "";
      });
  }, [diagram, fitToView]);

  // Native SVG pan + zoom — wheel zooms toward cursor, pointer-drag pans
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect   = el.getBoundingClientRect();
      const cx     = e.clientX - rect.left, cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const { scale, tx, ty } = xf.current;
      const ns = Math.min(8, Math.max(0.08, scale * factor));
      xf.current = { scale: ns, tx: cx - (cx - tx) * (ns / scale), ty: cy - (cy - ty) * (ns / scale) };
      applyXf();
    };
    const onDown = (e: PointerEvent) => {
      drag.current = { active: true, x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!drag.current.active) return;
      xf.current.tx += e.clientX - drag.current.x;
      xf.current.ty += e.clientY - drag.current.y;
      drag.current = { active: true, x: e.clientX, y: e.clientY };
      applyXf();
    };
    const onUp = () => { drag.current.active = false; el.style.cursor = "grab"; };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onUp);
    };
  }, [applyXf]);

  const zoomBtn = (factor: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cx = wrap.clientWidth / 2, cy = wrap.clientHeight / 2;
    const { scale, tx, ty } = xf.current;
    const ns = Math.min(8, Math.max(0.08, scale * factor));
    xf.current = { scale: ns, tx: cx - (cx - tx) * (ns / scale), ty: cy - (cy - ty) * (ns / scale) };
    applyXf();
  };

  const btnStyle: React.CSSProperties = { background: "rgba(8,8,18,0.88)", border: "1px solid rgba(255,255,255,0.09)" };

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
      <AlertTriangle size={20} className="text-heat opacity-70" />
      <p className="font-mono text-xs text-heat text-center max-w-sm">{error}</p>
    </div>
  );

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        {([["in", () => zoomBtn(1.25)], ["out", () => zoomBtn(0.8)], ["fit", fitToView], ["reset", () => { xf.current={scale:1,tx:0,ty:0}; applyXf(); }]] as [string, ()=>void][]).map(([k,fn]) => (
          <button key={k} onClick={fn} aria-label={k}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink transition-colors" style={btnStyle}>
            {k==="in"?<ZoomIn size={12}/>:k==="out"?<ZoomOut size={12}/>:k==="fit"?<Maximize2 size={12}/>:<RotateCcw size={12}/>}
          </button>
        ))}
      </div>
      {/* Hint */}
      {ready && (
        <div className="absolute bottom-3 left-3 z-10 font-mono text-xs text-ink-dim pointer-events-none">
          scroll to zoom · drag to pan
        </div>
      )}
      {/* Pan/zoom shell */}
      <div ref={wrapRef} className="w-full h-full overflow-hidden select-none" style={{ cursor: "grab", position: "relative" }}>
        <div ref={canvasRef} style={{ position: "absolute", top: 0, left: 0 }} />
      </div>
    </div>
  );
}

export default function DiagramClient() {
  const [repos,   setRepos]   = useState<Repo[]>([]);
  const [repoId,  setRepoId]  = useState("");
  const [scope,   setScope]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<Result | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<"preview" | "source">("preview");
  const { runTask, getResult } = useTask();

  const { copied, copy } = useCopy(result?.diagram ?? "");

  useEffect(() => {
    fetch("/api/repos").then(r => r.json()).then((data: unknown) => {
      if (!Array.isArray(data)) return;
      const indexed = (data as Repo[]).filter(r => r.graphData);
      setRepos(indexed);
      if (indexed[0]) setRepoId(indexed[0].id);
    }).catch(() => {});
  }, []);

  // Restore result if task completed in background
  useEffect(() => {
    const cached = getResult("/dashboard/diagram");
    if (cached) { setResult(cached as Result); setTab("preview"); }
  }, [getResult]);

  const generate = async () => {
    if (loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await runTask("Diagram generation", "/dashboard/diagram", async () => {
        const res  = await fetch("/api/see/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoId: repoId || undefined, scope: scope.trim() || undefined }) });
        const json = await res.json() as Record<string, unknown>;
        if (!res.ok) throw new Error((json.error as string) ?? "Generation failed");
        return json as unknown as Result;
      });
      setResult(data);
      setTab("preview");
    } catch (e) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  };

  const download = () => {
    if (!result) return;
    const blob = new Blob([result.diagram], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${result.repoName.replace("/", "-")}-diagram.mmd`; a.click();
  };

  return (
    <div className="flex flex-col h-full p-6 lg:p-8 gap-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center">
          <GitFork size={16} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Diagram</h1>
          <p className="font-body text-sm text-ink-muted">Generate and visualise your codebase as a live dependency diagram.</p>
        </div>
      </div>

      <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-xs text-ink-muted block mb-2">Repository</label>
            {repos.length > 0 ? (
              <div className="relative">
                <select value={repoId} onChange={e => { setRepoId(e.target.value); setResult(null); }}
                  className="w-full bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] px-4 py-3 font-mono text-sm text-ink focus:outline-none focus:border-brand/60 appearance-none transition-colors">
                  {repos.map(r => <option key={r.id} value={r.id}>{r.fullName}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-border text-xs font-body text-ink-muted">
                <Info size={12} /> No indexed repos. Index a repo first.
              </div>
            )}
          </div>

          <div>
            <label className="font-mono text-xs text-ink-muted block mb-2">Scope <span className="text-ink-dim">(optional path prefix)</span></label>
            <input value={scope} onChange={e => setScope(e.target.value)} placeholder="e.g. src/auth or pydantic_ai"
              className="w-full bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-brand/60 transition-colors" />
          </div>
        </div>

        <button onClick={() => void generate()} disabled={loading || repos.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-body font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><GitFork size={15} /> Generate Diagram</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-[var(--bg-glass)] backdrop-blur-xl rounded-[16px] border border-heat/25 text-sm font-body text-heat">
          <AlertTriangle size={15} className="flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="flex-1 bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] border border-emerald-500/20 overflow-hidden flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {(["preview", "source"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`font-mono text-xs px-3 py-1.5 rounded-lg transition-colors ${tab === t ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "text-ink-muted hover:text-ink"}`}>
                    {t === "preview" ? "Live Preview" : "Source"}
                  </button>
                ))}
              </div>
              <span className="font-mono text-xs text-ink-muted">{result.nodeCount} nodes · {result.edgeCount} edges</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={copy}
                className="flex items-center gap-1.5 font-mono text-xs text-ink-muted hover:text-ink px-2.5 py-1.5 rounded-lg border border-border hover:border-brand/40 transition-colors">
                {copied ? <><Check size={11} className="text-emerald-400" /> Copied</> : <><Copy size={11} /> Copy</>}
              </button>
              <button onClick={download}
                className="flex items-center gap-1.5 font-mono text-xs text-ink-muted hover:text-ink px-2.5 py-1.5 rounded-lg border border-border hover:border-brand/40 transition-colors">
                <Download size={11} /> .mmd
              </button>
            </div>
          </div>

          {result.warning && (
            <div className="px-4 py-2 border-b border-border bg-solar/5 flex items-center gap-2 text-xs font-mono text-solar">
              <AlertTriangle size={11} /> {result.warning}
            </div>
          )}

          <div className="flex-1 overflow-hidden" style={{ background: "#05050F" }}>
            {tab === "preview"
              ? <DiagramPreview diagram={result.diagram} />
              : <pre className="p-5 text-xs font-mono text-ink-muted leading-relaxed overflow-auto h-full whitespace-pre-wrap">{result.diagram}</pre>
            }
          </div>
        </div>
      )}
    </div>
  );
}
