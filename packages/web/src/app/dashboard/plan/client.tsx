"use client";
import { useState, useEffect } from "react";
import { ListOrdered, Loader2, AlertTriangle, Info, ChevronDown, Sparkles } from "lucide-react";

type Repo   = { id: string; fullName: string; graphData: unknown };
type Result = { plan: string; tiers: number; affected: number; model: string; repoName: string };

function stripMd(text: string): string {
  return text.replace(/#{1,6}\s*/g, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/_(.+?)_/g, "$1");
}

function StepCard({ line }: { line: string }) {
  const clean   = stripMd(line);
  const isStep  = /^STEP\s+\d+:/i.test(clean);
  const isPR    = /^PR BOUNDARY/i.test(clean);
  const isRisk  = clean.trim().startsWith("Risk:");
  const riskColor = clean.includes("HIGH") ? "text-heat" : clean.includes("MEDIUM") ? "text-solar" : "text-neon";

  if (isStep) return <p className="font-mono text-base font-bold text-brand mt-5 mb-1">{clean}</p>;
  if (isPR)   return <div className="my-4 px-4 py-2.5 rounded-xl border border-brand/30 bg-brand/5"><p className="font-mono text-sm font-bold text-brand">{clean}</p></div>;
  if (isRisk) return <p className={`font-mono text-sm ${riskColor} ml-4`}>{clean}</p>;
  if (clean.trim().startsWith("Rollback:")) return <p className="font-mono text-sm text-solar ml-4">{clean}</p>;
  if (clean.trim().startsWith("Files:") || clean.trim().startsWith("Effort:") || clean.trim().startsWith("Test:"))
    return <p className="font-mono text-sm text-ink-muted ml-4">{clean}</p>;
  if (clean.trim() === "") return <div className="h-1" />;
  return <p className="font-mono text-sm text-ink leading-relaxed ml-4">{clean}</p>;
}

function PlanOutput({ result }: { result: Result }) {
  const lines = result.plan.split('\n');
  return (
    <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] border border-[var(--accent)]/20 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2">
          <ListOrdered size={14} className="text-[var(--accent)]" />
          <span className="font-mono text-[var(--ink-tertiary)]" style={{ fontSize: "14px" }}>{result.repoName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[var(--ink-tertiary)]" style={{ fontSize: "13px" }}>{result.affected} files · {result.tiers} tiers</span>
          <span className="font-mono bg-[var(--accent-glow)] text-[var(--accent)] px-2 py-0.5 rounded border border-[var(--accent)]/20"
            style={{ fontSize: "13px" }}>{result.model}</span>
        </div>
      </div>
      <div className="p-5 max-h-[65vh] overflow-y-auto">
        {lines.map((line, i) => <StepCard key={i} line={line} />)}
      </div>
    </div>
  );
}

export default function PlanClient({ hasApiKey }: { hasApiKey: boolean }) {
  const [repos,   setRepos]   = useState<Repo[]>([]);
  const [repoId,  setRepoId]  = useState("");
  const [goal,    setGoal]    = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<Result | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/repos").then(r => r.json()).then((data: unknown) => {
      if (!Array.isArray(data)) return;
      const indexed = (data as Repo[]).filter(r => r.graphData);
      setRepos(indexed);
      if (indexed[0]) setRepoId(indexed[0].id);
    }).catch(() => {});
  }, []);

  const generate = async () => {
    if (!goal.trim() || loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res  = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: goal.trim(), repoId: repoId || undefined }) });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) throw new Error((json.error as string) ?? "Plan failed");
      setResult(json as unknown as Result);
    } catch (e) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  };

  const EXAMPLES = ["Migrate auth from JWT to session tokens", "Replace fetch with axios across the codebase", "Add OpenTelemetry tracing to all API routes", "Extract shared validation logic into a shared lib"];

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-accent/12 border border-accent/25 flex items-center justify-center">
            <ListOrdered size={16} className="text-accent" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">Refactor Plan</h1>
        </div>
        <p className="font-body text-sm text-ink-muted pl-12">Describe your goal — get a sequenced, PR-by-PR migration plan with risk levels, effort estimates, and rollback points.</p>
      </div>

      {!hasApiKey && (
        <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[16px] p-4 border border-solar/25 mb-6 flex items-start gap-3">
          <AlertTriangle size={15} className="text-solar flex-shrink-0 mt-0.5" />
          <p className="font-body text-xs text-ink-muted">Add <code className="font-mono text-brand">ANTHROPIC_API_KEY</code> to your <code className="font-mono text-brand">.env</code> to enable Plan.</p>
        </div>
      )}

      <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-6 mb-6 space-y-4">
        {repos.length > 0 ? (
          <div>
            <label className="font-mono text-xs text-ink-muted block mb-2">Repository</label>
            <div className="relative">
              <select value={repoId} onChange={e => { setRepoId(e.target.value); setResult(null); }}
                className="w-full bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] px-4 py-3 font-mono text-sm text-ink focus:outline-none focus:border-brand/60 appearance-none transition-colors">
                {repos.map(r => <option key={r.id} value={r.id}>{r.fullName}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border text-xs font-body text-ink-muted">
            <Info size={12} /> No indexed repos. Index a repo from the <span className="text-brand ml-1">Repos</span> page first.
          </div>
        )}

        <div>
          <label className="font-mono text-sm text-ink-muted block mb-2">Refactor goal <span className="text-ink-muted/60 ml-1">⌘↵ to submit</span></label>
          <textarea value={goal} onChange={e => setGoal(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void generate(); }}
            rows={3} placeholder="Migrate authentication from JWT to session-based cookies"
            className="w-full bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-brand/60 transition-colors resize-none" />
        </div>

        {!goal && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setGoal(ex)}
                className="font-mono text-xs text-ink-muted bg-surface-raised border border-border rounded-lg px-2.5 py-1.5 hover:border-brand/40 hover:text-brand transition-colors">
                {ex}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => void generate()} disabled={loading || !goal.trim() || !hasApiKey}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-body font-semibold text-white bg-brand hover:bg-brand/90 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <><Loader2 size={15} className="animate-spin" /> Planning with StinKit…</> : <><Sparkles size={15} /> Generate Plan</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-[var(--bg-glass)] backdrop-blur-xl rounded-[16px] border border-heat/25 mb-6 text-sm font-body text-heat">
          <AlertTriangle size={15} className="flex-shrink-0" /> {error}
        </div>
      )}

      {result && <PlanOutput result={result} />}
    </div>
  );
}
