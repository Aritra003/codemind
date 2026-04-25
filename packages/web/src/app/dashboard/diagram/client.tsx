"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { GitFork, Loader2, Copy, Check, Download, ChevronDown, Info, AlertTriangle, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
type Repo   = { id: string; fullName: string; graphData: unknown };
type Result = { diagram: string; nodeCount: number; edgeCount: number; warning?: string; repoName: string };

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale]   = useState(1);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !diagram) return;
    setError(null);
    const el = containerRef.current;
    el.innerHTML = "";
    const id = `mermaid-render-${++renderSeq}`;
    import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false, theme: "dark",
        themeVariables: { background: "#05050F", primaryColor: "#6366F1", primaryTextColor: "#E2E8F0", primaryBorderColor: "#4F46E5", lineColor: "#475569", secondaryColor: "#10B981", tertiaryColor: "#1E293B", edgeLabelBackground: "#0F172A", fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" },
        flowchart: { curve: "basis", padding: 20 }, securityLevel: "loose",
      });
      return mermaid.render(id, diagram);
    })
      .then(({ svg }) => { if (containerRef.current) containerRef.current.innerHTML = svg; })
      .catch(e => { setError(String(e)); if (containerRef.current) containerRef.current.innerHTML = ""; });
  }, [diagram]);

  const zoom = (delta: number) => setScale(s => Math.min(3, Math.max(0.3, s + delta)));
  const reset = () => setScale(1);

  if (error) return (
    <div className="flex items-center gap-2 p-4 text-xs font-mono text-heat">
      <AlertTriangle size={13} /> Diagram render error — check Mermaid syntax in the source tab.
    </div>
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        {([["in", () => zoom(0.2)], ["out", () => zoom(-0.2)], ["reset", reset]] as [string, () => void][]).map(([k, fn]) => (
          <button key={k} onClick={fn}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink transition-colors"
            style={{ background: "rgba(8,8,18,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {k === "in" ? <ZoomIn size={12} /> : k === "out" ? <ZoomOut size={12} /> : <RotateCcw size={12} />}
          </button>
        ))}
      </div>
      <div className="w-full h-full overflow-auto flex items-start justify-center p-6">
        <div ref={containerRef} style={{ transform: `scale(${scale})`, transformOrigin: "top center", transition: "transform 0.2s" }} />
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

  const { copied, copy } = useCopy(result?.diagram ?? "");

  useEffect(() => {
    fetch("/api/repos").then(r => r.json()).then((data: unknown) => {
      if (!Array.isArray(data)) return;
      const indexed = (data as Repo[]).filter(r => r.graphData);
      setRepos(indexed);
      if (indexed[0]) setRepoId(indexed[0].id);
    }).catch(() => {});
  }, []);

  const generate = async () => {
    if (loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res  = await fetch("/api/see/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoId: repoId || undefined, scope: scope.trim() || undefined }) });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) throw new Error((json.error as string) ?? "Generation failed");
      setResult(json as unknown as Result);
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
          <h1 className="font-display text-xl font-bold text-ink">Diagram</h1>
          <p className="font-body text-xs text-ink-muted">Generate and visualise your codebase as a live dependency diagram.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-xs text-ink-muted block mb-2">Repository</label>
            {repos.length > 0 ? (
              <div className="relative">
                <select value={repoId} onChange={e => { setRepoId(e.target.value); setResult(null); }}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 font-mono text-sm text-ink focus:outline-none focus:border-brand/60 appearance-none transition-colors">
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
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-brand/60 transition-colors" />
          </div>
        </div>

        <button onClick={() => void generate()} disabled={loading || repos.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-body font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><GitFork size={15} /> Generate Diagram</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 glass rounded-xl border border-heat/25 text-sm font-body text-heat">
          <AlertTriangle size={15} className="flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="flex-1 glass rounded-2xl border border-emerald-500/20 overflow-hidden flex flex-col min-h-[500px]">
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
              <span className="font-mono text-[10px] text-ink-dim">{result.nodeCount} nodes · {result.edgeCount} edges</span>
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
