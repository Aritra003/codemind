"use client";
import { useState, useEffect, useRef } from "react";
import { MessageSquare, Loader2, AlertTriangle, Info, ChevronDown, Send } from "lucide-react";

type Repo   = { id: string; fullName: string; graphData: unknown };
type Answer = { answer: string; nodesMatched: number; model: string; repoName: string };

function RepoPicker({ repos, value, onChange }: { repos: Repo[]; value: string; onChange: (v: string) => void }) {
  if (repos.length === 0) return null;
  return (
    <div>
      <label className="font-mono text-xs text-ink-muted block mb-2">Repository</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 font-mono text-sm text-ink focus:outline-none focus:border-brand/60 appearance-none transition-colors">
          {repos.map(r => <option key={r.id} value={r.id}>{r.fullName}</option>)}
        </select>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
      </div>
    </div>
  );
}

function stripMd(text: string): string {
  return text.replace(/#{1,6}\s*/g, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/_(.+?)_/g, "$1");
}

function AnswerBlock({ answer, meta }: { answer: string; meta: { nodesMatched: number; model: string; repoName: string } }) {
  const lines = answer.split('\n');
  return (
    <div className="glass rounded-2xl border border-brand/20 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <MessageSquare size={13} className="text-brand" />
          <span className="font-mono text-xs text-ink-muted">{meta.repoName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-ink-dim">{meta.nodesMatched} nodes matched</span>
          <span className="font-mono text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded border border-brand/20">{meta.model}</span>
        </div>
      </div>
      <div className="p-5 space-y-1 max-h-[60vh] overflow-y-auto">
        {lines.map((line, i) => {
          const isList = line.startsWith('- ') || line.startsWith('* ');
          const clean  = stripMd(isList ? line.replace(/^[-*]\s+/, '') : line);
          if (isList) return (
            <div key={i} className="flex gap-2 py-0.5">
              <span className="text-brand/60 font-mono text-xs mt-0.5 flex-shrink-0">·</span>
              <p className="font-mono text-sm text-ink leading-relaxed">{clean}</p>
            </div>
          );
          if (line.trim() === '') return <div key={i} className="h-2" />;
          return <p key={i} className="font-mono text-sm text-ink leading-relaxed">{clean}</p>;
        })}
      </div>
    </div>
  );
}

export default function AskClient({ hasApiKey }: { hasApiKey: boolean }) {
  const [repos,    setRepos]    = useState<Repo[]>([]);
  const [repoId,   setRepoId]   = useState("");
  const [question, setQuestion] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [answer,   setAnswer]   = useState<Answer | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/repos").then(r => r.json()).then((data: unknown) => {
      if (!Array.isArray(data)) return;
      const indexed = (data as Repo[]).filter(r => r.graphData);
      setRepos(indexed);
      if (indexed[0]) setRepoId(indexed[0].id);
    }).catch(() => {});
  }, []);

  const ask = async () => {
    if (!question.trim() || loading) return;
    setLoading(true); setError(null); setAnswer(null);
    try {
      const res  = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: question.trim(), repoId: repoId || undefined }) });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) throw new Error((json.error as string) ?? "Ask failed");
      setAnswer(json as unknown as Answer);
    } catch (e) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void ask(); };

  const EXAMPLES = ["How does authentication work?", "What calls the database layer?", "Where is error handling centralised?", "Which files would break if I removed the auth middleware?"];

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-brand/12 border border-brand/25 flex items-center justify-center">
            <MessageSquare size={16} className="text-brand" />
          </div>
          <h1 className="font-display text-xl font-bold text-ink">Ask Codebase</h1>
        </div>
        <p className="font-body text-sm text-ink-muted pl-12">Ask anything about your architecture in plain English — file names, call chains, blast radius, and more.</p>
      </div>

      {!hasApiKey && (
        <div className="glass rounded-xl p-4 border border-solar/25 mb-6 flex items-start gap-3">
          <AlertTriangle size={15} className="text-solar flex-shrink-0 mt-0.5" />
          <p className="font-body text-xs text-ink-muted">Add <code className="font-mono text-brand">ANTHROPIC_API_KEY</code> to your <code className="font-mono text-brand">.env</code> to enable Ask.</p>
        </div>
      )}

      <div className="glass rounded-2xl p-6 mb-6 space-y-4">
        <RepoPicker repos={repos} value={repoId} onChange={v => { setRepoId(v); setAnswer(null); }} />

        {repos.length === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border text-xs font-body text-ink-muted">
            <Info size={12} /> No indexed repos. Index a repo from the <span className="text-brand ml-1">Repos</span> page first.
          </div>
        )}

        <div>
          <label className="font-mono text-xs text-ink-muted block mb-2">Your question <span className="text-ink-dim ml-1">⌘↵ to submit</span></label>
          <textarea ref={textRef} value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={handleKey}
            rows={3} placeholder="How does authentication work in this codebase?"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-brand/60 transition-colors resize-none" />
        </div>

        {!question && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => { setQuestion(ex); textRef.current?.focus(); }}
                className="font-mono text-[11px] text-ink-muted bg-surface-raised border border-border rounded-lg px-2.5 py-1.5 hover:border-brand/40 hover:text-brand transition-colors">
                {ex}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => void ask()} disabled={loading || !question.trim() || !hasApiKey}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-body font-semibold text-white bg-brand hover:bg-brand/90 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <><Loader2 size={15} className="animate-spin" /> Asking CodeMind…</> : <><Send size={15} /> Ask</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 glass rounded-xl border border-heat/25 mb-6 text-sm font-body text-heat">
          <AlertTriangle size={15} className="flex-shrink-0" /> {error}
        </div>
      )}

      {answer && <AnswerBlock answer={answer.answer} meta={{ nodesMatched: answer.nodesMatched, model: answer.model, repoName: answer.repoName }} />}
    </div>
  );
}
