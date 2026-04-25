"use client";
import { useState, useEffect, useRef } from "react";
import { Zap, Loader2, AlertTriangle, Info, Search, ChevronDown } from "lucide-react";

type Repo     = { id: string; fullName: string; graphData: unknown };
type FileNode = { id: string; deps: number };
type Result   = { filePath: string; riskLevel: string; dependents: number; transitiveDeps: number; gaps: number; latency: number; topDeps: string[] };

function basename(p: string) { return p.split("/").pop() ?? p; }
function dirname(p: string)  { const parts = p.split("/"); return parts.length > 1 ? parts.slice(0, -1).join("/") : ""; }

function depColor(n: number) {
  if (n >= 10) return { bg: "rgba(255,58,94,0.12)",  fg: "#FF3A5E" };
  if (n >= 4)  return { bg: "rgba(255,179,0,0.12)",  fg: "#FFB300" };
  return        { bg: "rgba(91,110,255,0.12)", fg: "#5B6EFF" };
}

function FilePicker({ nodes, value, onChange }: { nodes: FileNode[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q,    setQ]    = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const filtered = q.trim()
    ? nodes.filter(n => n.id.toLowerCase().includes(q.toLowerCase()))
    : nodes;

  const selected = nodes.find(n => n.id === value);
  const { fg, bg } = selected ? depColor(selected.deps) : { fg: "#5B6EFF", bg: "rgba(91,110,255,0.12)" };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3 text-left hover:border-brand/40 focus:outline-none focus:border-brand/60 transition-colors">
        <div className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="font-mono text-sm text-ink block truncate">{basename(selected.id)}</span>
              <span className="font-mono text-[10px] text-ink-dim block truncate">{dirname(selected.id)}</span>
            </>
          ) : (
            <span className="font-mono text-sm text-ink-dim">Select a file…</span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {selected && selected.deps > 0 && (
            <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold" style={{ background: bg, color: fg }}>
              {selected.deps} dep{selected.deps !== 1 ? "s" : ""}
            </span>
          )}
          <ChevronDown size={13} className="text-ink-dim" />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl z-20 flex flex-col" style={{ maxHeight: 340 }}>
          <div className="p-2 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-dim" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === "Escape" && setOpen(false)}
                placeholder={`Filter ${nodes.length} files…`}
                className="w-full bg-surface-raised rounded-lg pl-7 pr-3 py-2 font-mono text-xs text-ink placeholder:text-ink-dim focus:outline-none" />
            </div>
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0
              ? <div className="px-4 py-3 font-mono text-xs text-ink-dim">No files match</div>
              : filtered.map(n => {
                  const c = depColor(n.deps);
                  return (
                    <button key={n.id} onMouseDown={() => { onChange(n.id); setOpen(false); setQ(""); }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-raised transition-colors border-b border-border/40 last:border-0 ${n.id === value ? "bg-brand/8" : ""}`}>
                      <div className="min-w-0 text-left">
                        <div className="font-mono text-xs text-ink truncate">{basename(n.id)}</div>
                        <div className="font-mono text-[10px] text-ink-dim truncate">{dirname(n.id)}</div>
                      </div>
                      {n.deps > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold flex-shrink-0" style={{ background: c.bg, color: c.fg }}>
                          {n.deps}
                        </span>
                      )}
                    </button>
                  );
                })
            }
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckPage() {
  const [filePath, setFilePath] = useState("");
  const [repoId,   setRepoId]   = useState("");
  const [repos,    setRepos]    = useState<Repo[]>([]);
  const [nodes,    setNodes]    = useState<FileNode[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<Result | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/repos").then(r => r.json()).then((data: unknown) => {
      if (!Array.isArray(data)) return;
      const indexed = (data as Repo[]).filter(r => r.graphData);
      setRepos(indexed);
      if (indexed.length > 0 && indexed[0]) setRepoId(indexed[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!repoId) { setNodes([]); setFilePath(""); return; }
    fetch(`/api/repos/${repoId}/graph`).then(r => r.json()).then(d => {
      if (!d.nodes) return;
      const edges: { from: string; to: string }[] = d.edges ?? [];
      const inCount = new Map<string, number>();
      for (const e of edges) inCount.set(e.to, (inCount.get(e.to) ?? 0) + 1);
      const sorted: FileNode[] = (d.nodes as { id: string }[])
        .map(n => ({ id: n.id, deps: inCount.get(n.id) ?? 0 }))
        .sort((a, b) => b.deps - a.deps || a.id.localeCompare(b.id));
      setNodes(sorted);
      setFilePath(sorted[0]?.id ?? "");
      setResult(null);
    }).catch(() => {});
  }, [repoId]);

  const run = async () => {
    if (!filePath.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res  = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filePath: filePath.trim(), repoId: repoId || undefined }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Check failed");
      setResult(json);
    } catch (e) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  };

  const RISK_COLOR = { CRITICAL: "#FF3A5E", HIGH: "#FF3A5E", MEDIUM: "#FFB300", LOW: "#39FF82" } as Record<string, string>;
  const RISK_WIDTH = { CRITICAL: 100, HIGH: 82, MEDIUM: 55, LOW: 25 } as Record<string, number>;

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-heat/12 border border-heat/25 flex items-center justify-center">
            <Zap size={16} className="text-heat" />
          </div>
          <h1 className="font-display text-xl font-bold text-ink">Blast Radius Check</h1>
        </div>
        <p className="font-body text-sm text-ink-muted pl-12">Select a file to see how many modules depend on it and the overall change risk.</p>
      </div>

      <div className="glass rounded-2xl p-6 mb-6 space-y-4">
        {repos.length > 0 ? (
          <div>
            <label className="font-mono text-xs text-ink-muted block mb-2">Repository</label>
            <div className="relative">
              <select value={repoId} onChange={e => { setRepoId(e.target.value); setFilePath(""); setResult(null); }}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 font-mono text-sm text-ink focus:outline-none focus:border-brand/60 appearance-none transition-colors">
                {repos.map(r => <option key={r.id} value={r.id}>{r.fullName}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
            </div>
            {nodes.length > 0 && <p className="font-mono text-[11px] text-ink-dim mt-1.5">{nodes.length} files indexed</p>}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border text-xs font-body text-ink-muted">
            <Info size={12} /> No indexed repos found. Index a repo from the <span className="text-brand">Repos</span> page first.
          </div>
        )}

        <div>
          <label className="font-mono text-xs text-ink-muted block mb-2">
            File path
            {nodes.length > 0 && <span className="ml-2 text-ink-dim">— sorted by blast radius, highest first</span>}
          </label>
          {nodes.length > 0
            ? <FilePicker nodes={nodes} value={filePath} onChange={v => { setFilePath(v); setResult(null); }} />
            : <input value={filePath} onChange={e => setFilePath(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
                placeholder="src/auth/middleware.ts"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-brand/60 transition-colors" />
          }
        </div>

        <button onClick={run} disabled={loading || !filePath.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-body font-semibold text-white bg-brand hover:bg-brand/90 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <><Loader2 size={15} className="animate-spin" /> Scanning…</> : <><Zap size={15} /> Scan</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 glass rounded-xl border border-heat/25 mb-6 text-sm font-body text-heat">
          <AlertTriangle size={15} className="flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="glass rounded-2xl p-6 space-y-5" style={{ borderColor: `${RISK_COLOR[result.riskLevel] ?? "#5B6EFF"}25` }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <code className="font-mono text-sm text-ink">{result.filePath}</code>
              <div className="font-body text-xs text-ink-muted mt-0.5">{result.latency}ms analysis time</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg font-mono text-sm font-bold flex-shrink-0"
              style={{ background: `${RISK_COLOR[result.riskLevel] ?? "#5B6EFF"}15`, color: RISK_COLOR[result.riskLevel] ?? "#5B6EFF" }}>
              {result.riskLevel}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-body text-ink-muted mb-2">
              <span>Blast radius</span>
              <span>{result.dependents} direct · {result.transitiveDeps} transitive</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-solar to-heat"
                style={{ width: `${RISK_WIDTH[result.riskLevel] ?? 50}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Direct deps",   value: result.dependents,    color: "#5B6EFF" },
              { label: "Coverage gaps", value: result.gaps,           color: result.gaps > 0 ? "#FFB300" : "#39FF82" },
              { label: "Transitive",    value: result.transitiveDeps, color: "#B06EFF" },
            ].map(s => (
              <div key={s.label} className="bg-surface rounded-xl p-3 text-center">
                <div className="font-mono text-xl font-bold mb-0.5" style={{ color: s.color }}>{s.value}</div>
                <div className="font-body text-[11px] text-ink-muted">{s.label}</div>
              </div>
            ))}
          </div>

          {result.topDeps.length > 0 && (
            <div>
              <p className="font-mono text-xs text-ink-muted mb-2">TOP DEPENDENTS</p>
              {result.topDeps.slice(0, 5).map(dep => (
                <div key={dep} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand/60 flex-shrink-0" />
                  <code className="font-mono text-xs text-ink-muted truncate">{dep}</code>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-body text-ink-dim">
            <Info size={12} className="flex-shrink-0" />
            Results based on your indexed repo graph. Re-index for latest data.
          </div>
        </div>
      )}
    </div>
  );
}
