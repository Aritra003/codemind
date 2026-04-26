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
          className="w-full bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] px-4 py-3 font-mono text-sm text-ink focus:outline-none focus:border-brand/60 appearance-none transition-colors">
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
    <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] border border-[var(--accent)]/20 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-[var(--accent)]" />
          <span className="font-mono text-[var(--ink-tertiary)]" style={{ fontSize: "14px" }}>{meta.repoName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[var(--ink-tertiary)]" style={{ fontSize: "13px" }}>{meta.nodesMatched} nodes matched</span>
          <span className="font-mono bg-[var(--accent-glow)] text-[var(--accent)] px-2 py-0.5 rounded border border-[var(--accent)]/20"
            style={{ fontSize: "13px" }}>{meta.model}</span>
        </div>
      </div>
      <div className="p-5 space-y-1 max-h-[60vh] overflow-y-auto">
        {lines.map((line, i) => {
          const isList = line.startsWith('- ') || line.startsWith('* ');
          const clean  = stripMd(isList ? line.replace(/^[-*]\s+/, '') : line);
          if (isList) return (
            <div key={i} className="flex gap-2 py-0.5">
              <span className="text-[var(--accent)]/60 font-mono flex-shrink-0 mt-0.5" style={{ fontSize: "13px" }}>·</span>
              <p className="font-mono text-[var(--ink-secondary)] leading-relaxed" style={{ fontSize: "15px" }}>{clean}</p>
            </div>
          );
          if (line.trim() === '') return <div key={i} className="h-2" />;
          return <p key={i} className="font-mono text-[var(--ink-secondary)] leading-relaxed" style={{ fontSize: "15px" }}>{clean}</p>;
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
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-[14px] bg-[var(--accent-glow)] border border-[var(--accent)]/25 flex items-center justify-center">
            <MessageSquare size={18} className="text-[var(--accent)]" />
          </div>
          <h1 className="font-[800] text-[var(--ink-primary)] tracking-tight" style={{ fontSize: "32px" }}>Ask Codebase</h1>
        </div>
        <p className="pl-[52px]" style={{ fontSize: "16px", color: "var(--ink-secondary)" }}>
          Ask anything about your architecture in plain English — file names, call chains, blast radius, and more.
        </p>
      </div>

      {!hasApiKey && (
        <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--orange)]/25 rounded-[16px] p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={16} className="text-[var(--orange)] flex-shrink-0 mt-0.5" />
          <p style={{ fontSize: "15px", color: "var(--ink-secondary)" }}>
            Add <code className="font-mono text-[var(--accent)]">ANTHROPIC_API_KEY</code> to your <code className="font-mono text-[var(--accent)]">.env</code> to enable Ask.
          </p>
        </div>
      )}

      <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] p-6 mb-6 space-y-5">
        <RepoPicker repos={repos} value={repoId} onChange={v => { setRepoId(v); setAnswer(null); }} />

        {repos.length === 0 && (
          <div className="flex items-center gap-2 p-4 rounded-[12px] border border-[var(--border-default)]"
            style={{ fontSize: "15px", color: "var(--ink-tertiary)" }}>
            <Info size={14} /> No indexed repos. Index a repo from the <span className="text-[var(--accent)] ml-1">Repos</span> page first.
          </div>
        )}

        <div>
          <label className="font-[500] block mb-2" style={{ fontSize: "15px", color: "var(--ink-tertiary)" }}>
            Your question <span className="text-[var(--ink-muted)] ml-1" style={{ fontSize: "13px" }}>⌘↵ to submit</span>
          </label>
          <textarea ref={textRef} value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={handleKey}
            rows={3} placeholder="How does authentication work in this codebase?"
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] px-4 py-3 font-mono text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)] transition-all resize-none"
            style={{ fontSize: "15px" }} />
        </div>

        {!question && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => { setQuestion(ex); textRef.current?.focus(); }}
                className="font-mono text-[var(--ink-tertiary)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[8px] px-3 py-1.5 hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors min-h-0"
                style={{ fontSize: "13px" }}>
                {ex}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => void ask()} disabled={loading || !question.trim() || !hasApiKey}
          className="w-full flex items-center justify-center gap-2 font-[600] text-white rounded-[12px] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          style={{ height: "48px", fontSize: "15px", background: "var(--grad-brand)" }}>
          {loading ? <><Loader2 size={16} className="animate-spin" /> Asking StinKit…</> : <><Send size={16} /> Ask</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--red)]/25 rounded-[16px] mb-6 text-[var(--red)]"
          style={{ fontSize: "15px" }}>
          <AlertTriangle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {answer && <AnswerBlock answer={answer.answer} meta={{ nodesMatched: answer.nodesMatched, model: answer.model, repoName: answer.repoName }} />}
    </div>
  );
}
