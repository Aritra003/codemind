"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Eye, Upload, Loader2, AlertTriangle, ChevronDown, ChevronRight, X, FileText, Sparkles, Copy, Check } from "lucide-react";
import { ACCEPTED_TYPES, DIRECT_PREVIEW_TYPES, MAX_UPLOAD_BYTES, getEffectiveType, rasterizeSVG } from "@/lib/see-utils";
import { ReportViewer } from "./report-viewer";

type HistoryItem = { id: string; filename: string; analysisText: string; createdAt: Date };
type Repo = { id: string; fullName: string; graphData: unknown };

function GenerateTab() {
  const [repos,    setRepos]    = useState<Repo[]>([]);
  const [repoId,   setRepoId]   = useState("");
  const [scope,    setScope]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [diagram,  setDiagram]  = useState<string | null>(null);
  const [meta,     setMeta]     = useState<{ nodeCount: number; edgeCount: number; warning?: string; repoName: string } | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [copied,   setCopied]   = useState(false);

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
    setLoading(true); setError(null); setDiagram(null); setMeta(null);
    try {
      const res  = await fetch("/api/see/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoId: repoId || undefined, scope: scope.trim() || undefined }) });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) throw new Error((json.error as string) ?? "Generate failed");
      setDiagram(json.diagram as string);
      setMeta({ nodeCount: json.nodeCount as number, edgeCount: json.edgeCount as number, warning: json.warning as string | undefined, repoName: json.repoName as string });
    } catch (e) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  };

  const copy = () => {
    if (!diagram) return;
    void navigator.clipboard.writeText(diagram);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-6 space-y-4">
        {repos.length > 0 ? (
          <div>
            <label className="font-mono text-xs text-ink-muted block mb-2">Repository</label>
            <div className="relative">
              <select value={repoId} onChange={e => { setRepoId(e.target.value); setDiagram(null); }}
                className="w-full bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] px-4 py-3 font-mono text-sm text-ink focus:outline-none focus:border-brand/60 appearance-none transition-colors">
                {repos.map(r => <option key={r.id} value={r.id}>{r.fullName}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border text-xs font-body text-ink-muted">
            No indexed repos found. Index a repo from the Repos page first.
          </div>
        )}
        <div>
          <label className="font-mono text-xs text-ink-muted block mb-2">Scope <span className="text-ink-dim">(optional path prefix, e.g. src/auth)</span></label>
          <input value={scope} onChange={e => setScope(e.target.value)} placeholder="src/auth"
            className="w-full bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-brand/60 transition-colors" />
        </div>
        <button onClick={() => void generate()} disabled={loading || repos.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-body font-semibold text-white bg-brand hover:bg-brand/90 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Sparkles size={15} /> Generate Mermaid</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-heat/25 text-heat bg-heat/8 text-sm font-body">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {diagram && meta && (
        <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] border border-brand/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-ink-muted">{meta.repoName}</span>
              <span className="font-mono text-xs text-ink-muted">{meta.nodeCount} nodes · {meta.edgeCount} edges</span>
            </div>
            <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs text-ink-muted hover:text-ink bg-surface hover:bg-surface-raised border border-border transition-all">
              {copied ? <><Check size={11} className="text-neon" /> Copied</> : <><Copy size={11} /> Copy</>}
            </button>
          </div>
          {meta.warning && (
            <div className="px-4 py-2 border-b border-border bg-solar/5 flex items-center gap-2">
              <AlertTriangle size={11} className="text-solar flex-shrink-0" />
              <span className="font-mono text-xs text-solar">{meta.warning}</span>
            </div>
          )}
          <pre className="p-4 font-mono text-xs text-ink leading-relaxed overflow-x-auto max-h-[50vh] overflow-y-auto bg-surface/50">{diagram}</pre>
        </div>
      )}
    </div>
  );
}

function HistoryCard({ item }: { item: HistoryItem }) {
  const [open, setOpen] = useState(false);
  const snippet = item.analysisText.replace(/^#+\s*/gm, "").replace(/\*\*/g, "").replace(/`/g, "").slice(0, 110).trim();
  return (
    <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[16px] border border-border overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-raised transition-colors">
        <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
          <Eye size={12} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm text-ink truncate">{item.filename}</p>
          <p className="font-body text-xs text-ink-dim truncate">{snippet}…</p>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <span className="font-mono text-xs text-ink-muted whitespace-nowrap">
            {new Date(item.createdAt).toLocaleTimeString()}
          </span>
          {open ? <ChevronDown size={13} className="text-ink-dim" /> : <ChevronRight size={13} className="text-ink-dim" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-border">
          <ReportViewer raw={item.analysisText} filename={item.filename} onReset={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

export function SeeClient({ history: initialHistory, hasApiKey }: { history: HistoryItem[]; hasApiKey: boolean }) {
  const [tab,     setTab]     = useState<"analyse" | "generate">("analyse");
  const [history, setHistory] = useState(initialHistory);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    const type = getEffectiveType(f);
    if (!ACCEPTED_TYPES.has(type)) { setError("Unsupported format. Use PNG, JPG, SVG, WebP, BMP, TIFF, PDF, or Mermaid."); return; }
    if (f.size > MAX_UPLOAD_BYTES) { setError(`File too large. Max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`); return; }
    setError(null); setResult(null);
    if (type === 'image/svg+xml') {
      try { const { preview: p, uploadFile } = await rasterizeSVG(f); setFile(uploadFile); setPreview(p); }
      catch { setError("SVG rasterization failed. Convert to PNG and try again."); }
      return;
    }
    setFile(f);
    if (DIRECT_PREVIEW_TYPES.has(type)) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string ?? null);
      reader.readAsDataURL(f);
    } else { setPreview(null); }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) void handleFile(f);
  }, [handleFile]);

  const analyse = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch("/api/see", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      setResult(json.analysis);
      setHistory(prev => [{ id: Date.now().toString(), filename: file.name, analysisText: json.analysis, createdAt: new Date() }, ...prev]);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };

  const clear = () => { setFile(null); setPreview(null); setResult(null); setError(null); };

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-accent/12 border border-accent/25 flex items-center justify-center">
          <Eye size={16} className="text-accent" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">StinKit See</h1>
      </div>
      <p className="font-body text-sm text-ink-muted mb-6 pl-12">Upload an architecture diagram for AI analysis, or generate a Mermaid diagram from your indexed code graph.</p>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface-raised rounded-xl border border-border mb-6 w-fit">
        {(["analyse", "generate"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-medium transition-all capitalize ${tab === t ? "bg-surface text-ink border border-border shadow-sm" : "text-ink-muted hover:text-ink"}`}>
            {t === "analyse" ? "Analyse Diagram" : "Generate Mermaid"}
          </button>
        ))}
      </div>

      {!hasApiKey && tab === "analyse" && (
        <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[16px] p-4 border border-solar/25 mb-6 flex items-start gap-3">
          <AlertTriangle size={15} className="text-solar flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-body text-sm font-medium text-ink mb-1">ANTHROPIC_API_KEY not set</p>
            <p className="font-body text-xs text-ink-muted">Add <code className="font-mono text-brand">ANTHROPIC_API_KEY</code> to your <code className="font-mono text-brand">.env</code> file to enable vision analysis.</p>
          </div>
        </div>
      )}

      {tab === "generate" && <GenerateTab />}

      {tab === "analyse" && result ? (
        <ReportViewer raw={result} filename={file?.name ?? "diagram"} onReset={clear} />
      ) : tab === "analyse" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {!file ? (
              <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                onDrop={onDrop} onClick={() => inputRef.current?.click()}
                className={`bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-10 flex flex-col items-center justify-center gap-3 border-2 border-dashed cursor-pointer transition-all ${dragging ? "border-brand/60 bg-brand/5" : "border-border hover:border-border/80 hover:bg-surface-raised/40"}`}>
                <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                  <Upload size={20} className="text-brand" />
                </div>
                <div className="text-center">
                  <p className="font-body text-sm font-medium text-ink mb-1">Drop diagram here</p>
                  <p className="font-body text-xs text-ink-muted">PNG · JPG · SVG · PDF · WebP · TIFF · Mermaid · max 20 MB</p>
                </div>
                <input ref={inputRef} type="file"
                  accept=".png,.jpg,.jpeg,.svg,.webp,.bmp,.tiff,.tif,.pdf,.mermaid,.mmd,image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/bmp,image/tiff,application/pdf"
                  className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
              </div>
            ) : preview ? (
              <div className="relative bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] overflow-hidden border border-border">
                <img src={preview} alt="Preview" className="w-full object-contain max-h-72" />
                <button onClick={clear} className="absolute top-2 right-2 p-1.5 bg-surface/80 rounded-lg text-ink-muted hover:text-ink transition-colors"><X size={13} /></button>
                <div className="p-3 border-t border-border flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs text-ink">{file.name}</p>
                    <p className="font-body text-xs text-ink-muted">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={analyse} disabled={loading || !hasApiKey}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-body font-medium text-white bg-brand hover:bg-brand/90 rounded-xl transition-all disabled:opacity-50">
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                    {loading ? "Analysing…" : "Analyse"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-5 border border-border flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-ink truncate">{file.name}</p>
                  <p className="font-body text-xs text-ink-dim">{(file.size / 1024).toFixed(1)} KB · ready to analyse</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={clear} className="p-1.5 text-ink-muted hover:text-ink transition-colors"><X size={13} /></button>
                  <button onClick={analyse} disabled={loading || !hasApiKey}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-body font-medium text-white bg-brand hover:bg-brand/90 rounded-xl transition-all disabled:opacity-50">
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                    {loading ? "Analysing…" : "Analyse"}
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-heat/25 text-heat bg-heat/8 text-sm font-body">
                <AlertTriangle size={13} /> {error}
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] border border-border min-h-48 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full p-8 gap-3">
                <Loader2 size={24} className="animate-spin text-brand" />
                <p className="font-mono text-sm text-ink-muted">Claude is analysing your diagram…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Eye size={28} className="text-ink-dim mb-3" />
                <p className="font-body text-sm text-ink-muted">Analysis results will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "analyse" && history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-xs text-ink-muted uppercase tracking-widest">Recent analyses</p>
            <span className="font-mono text-xs text-ink-muted">{history.length}</span>
          </div>
          <div className="space-y-2">
            {history.map(item => <HistoryCard key={item.id} item={item} />)}
          </div>
        </div>
      )}
    </div>
  );
}
