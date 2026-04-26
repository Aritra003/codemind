"use client";
import { useState } from "react";
import { useToast } from "@/lib/toast";

function timeAgo(date: Date | string): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function FreshnessTag({ indexedAt }: { indexedAt: Date | string }) {
  const secs = Math.floor((Date.now() - new Date(indexedAt).getTime()) / 1000);
  const color = secs < 3600 ? "text-neon" : secs < 86400 ? "text-solar" : "text-ink-dim";
  return <span className={`font-mono text-xs ${color}`}>· indexed {timeAgo(indexedAt)}</span>;
}
import { GitBranch, Plus, Loader2, RefreshCw, CheckCircle, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, Lock, Globe } from "lucide-react";
import type { Repo } from "@prisma/client";
import { WebhookPanel } from "@/components/dashboard/WebhookPanel";

type GithubRepo = { fullName: string; description: string | null; isPrivate: boolean; language: string | null };
type Props = { repos: Repo[]; hasGithubToken: boolean };

export function ReposClient({ repos: initial, hasGithubToken }: Props) {
  const [repos, setRepos] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [repoInput, setRepoInput] = useState("");
  const [indexing, setIndexing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const [browsing, setBrowsing] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [addingRepo, setAddingRepo] = useState<string | null>(null);

  const addedFullNames = new Set(repos.map(r => r.fullName));

  const addRepo = async (fullName: string) => {
    setAdding(true); setError(null); setSuccess(null);
    try {
      const res = await fetch("/api/repos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: fullName.trim() }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add repo");
      setRepos(prev => [json, ...prev]);
      setRepoInput("");
      setSuccess(`${fullName} added! Click Index to analyze it.`);
      toast(`${fullName} added!`, "success");
    } catch (e) { setError(e instanceof Error ? e.message : "Error adding repo"); toast(e instanceof Error ? e.message : "Error", "error"); }
    finally { setAdding(false); }
  };

  const quickAdd = async (fullName: string) => {
    setAddingRepo(fullName); setError(null); setSuccess(null);
    try {
      const res = await fetch("/api/repos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add repo");
      setRepos(prev => [json, ...prev]);
      setSuccess(`${fullName} added! Click Index to analyze it.`);
      toast(`${fullName} added!`, "success");
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); toast(e instanceof Error ? e.message : "Error", "error"); }
    finally { setAddingRepo(null); }
  };

  const indexRepo = async (id: string, name: string) => {
    setIndexing(id); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/repos/${id}/index`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Indexing failed");
      setRepos(prev => prev.map(r => r.id === id ? { ...r, ...json } : r));
      setSuccess(`${name} indexed successfully!`);
      toast(`${name} indexed — ${json.nodeCount ?? 0} nodes found`, "success");
    } catch (e) { setError(e instanceof Error ? e.message : "Indexing error"); toast(e instanceof Error ? e.message : "Error", "error"); }
    finally { setIndexing(null); }
  };

  const toggleBrowse = async () => {
    if (browsing) { setBrowsing(false); return; }
    setBrowsing(true);
    if (githubRepos.length > 0) return;
    setBrowseLoading(true);
    try {
      const res = await fetch("/api/repos/list-github");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch repos");
      setGithubRepos(json);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); setBrowsing(false); }
    finally { setBrowseLoading(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-brand/12 border border-brand/25 flex items-center justify-center">
          <GitBranch size={16} className="text-brand" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Repositories</h1>
      </div>
      <p className="font-body text-sm text-ink-muted mb-8 pl-12">Connect GitHub repos to analyze blast radius and run web-based checks.</p>

      {!hasGithubToken && (
        <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[16px] p-4 border border-solar/25 mb-6 flex items-start gap-3">
          <AlertTriangle size={16} className="text-solar flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-body text-sm font-medium text-ink mb-1">GitHub not connected</p>
            <p className="font-body text-xs text-ink-muted">Sign in with GitHub to browse and connect repositories. Email/password accounts need a GitHub login to index repos.</p>
          </div>
        </div>
      )}

      {(error || success) && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-body mb-4 ${success ? "border-neon/25 text-neon bg-neon/8" : "border-heat/25 text-heat bg-heat/8"}`}>
          {success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {success ?? error}
        </div>
      )}

      {/* Browse GitHub Repos */}
      {hasGithubToken && (
        <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] mb-4 overflow-hidden">
          <button onClick={toggleBrowse}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-raised transition-colors">
            <div className="flex items-center gap-3">
              <GitBranch size={15} className="text-brand" />
              <span className="font-body text-sm font-medium text-ink">Browse my GitHub repos</span>
              {githubRepos.length > 0 && (
                <span className="font-mono text-xs text-ink-muted bg-surface px-2 py-0.5 rounded">{githubRepos.length} repos</span>
              )}
            </div>
            {browseLoading ? <Loader2 size={14} className="animate-spin text-ink-dim" /> : browsing ? <ChevronUp size={14} className="text-ink-dim" /> : <ChevronDown size={14} className="text-ink-dim" />}
          </button>

          {browsing && !browseLoading && (
            <div className="border-t border-border max-h-72 overflow-y-auto">
              {githubRepos.length === 0 ? (
                <p className="p-5 text-sm font-body text-ink-muted text-center">No repos found.</p>
              ) : githubRepos.map(repo => {
                const alreadyAdded = addedFullNames.has(repo.fullName);
                return (
                  <div key={repo.fullName} className="flex items-center gap-3 px-5 py-3 border-b border-border/50 last:border-0 hover:bg-surface-raised transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {repo.isPrivate ? <Lock size={11} className="text-ink-dim flex-shrink-0" /> : <Globe size={11} className="text-ink-dim flex-shrink-0" />}
                        <span className="font-mono text-sm text-ink truncate">{repo.fullName}</span>
                      </div>
                      {repo.description && <p className="font-body text-xs text-ink-muted truncate">{repo.description}</p>}
                    </div>
                    {repo.language && (
                      <span className="font-mono text-xs text-ink-muted bg-surface px-1.5 py-0.5 rounded flex-shrink-0">{repo.language}</span>
                    )}
                    <button onClick={() => quickAdd(repo.fullName)}
                      disabled={alreadyAdded || addingRepo === repo.fullName}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-medium rounded-lg transition-all flex-shrink-0 disabled:opacity-50"
                      style={alreadyAdded
                        ? { background: "var(--surface-raised)", color: "var(--ink-dim)", border: "1px solid var(--border)" }
                        : { background: "rgba(91,110,255,0.12)", color: "#5B6EFF", border: "1px solid rgba(91,110,255,0.25)" }}>
                      {addingRepo === repo.fullName ? <Loader2 size={11} className="animate-spin" /> : alreadyAdded ? <CheckCircle size={11} /> : <Plus size={11} />}
                      {alreadyAdded ? "Added" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Manual add */}
      <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-5 mb-6">
        <p className="font-mono text-xs text-ink-muted mb-3">ADD BY NAME</p>
        <div className="flex gap-3">
          <input value={repoInput} onChange={e => setRepoInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addRepo(repoInput)}
            placeholder="owner/repo-name"
            className="flex-1 bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] px-4 py-2.5 font-mono text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-brand/60 transition-colors" />
          <button onClick={() => addRepo(repoInput)} disabled={adding || !repoInput.trim() || !hasGithubToken}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-body font-medium text-white bg-brand hover:bg-brand/90 rounded-xl transition-all disabled:opacity-50">
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>
      </div>

      {/* Repos list */}
      <div className="space-y-3">
        {repos.length === 0 ? (
          <div className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[20px] p-10 text-center border border-dashed border-border">
            <GitBranch size={32} className="text-ink-dim mx-auto mb-3" />
            <p className="font-body text-sm text-ink-muted">No repos connected yet. Browse your GitHub repos above.</p>
          </div>
        ) : repos.map(repo => (
          <div key={repo.id} className="bg-[var(--bg-glass)] backdrop-blur-xl rounded-[16px] p-4 border border-border flex items-center gap-4 card-hover-effect">
            <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
              <GitBranch size={15} className="text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-sm font-medium text-ink">{repo.fullName}</span>
                {repo.isPrivate && <span className="font-mono text-xs text-ink-muted bg-surface px-1.5 py-0.5 rounded">private</span>}
              </div>
              {repo.indexedAt ? (
                <p className="font-body text-xs text-ink-muted flex items-center gap-1 flex-wrap">
                  {repo.nodeCount?.toLocaleString()} nodes · {repo.edgeCount?.toLocaleString()} edges · {repo.completeness?.toFixed(0)}% complete
                  <FreshnessTag indexedAt={repo.indexedAt} />
                </p>
              ) : <p className="font-body text-xs text-ink-dim">Not indexed yet — click Index to analyze</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a href={`https://github.com/${repo.fullName}`} target="_blank" rel="noreferrer"
                className="p-2 text-ink-dim hover:text-ink rounded-lg hover:bg-surface-raised transition-colors">
                <ExternalLink size={13} />
              </a>
              <button onClick={() => indexRepo(repo.id, repo.fullName)} disabled={indexing === repo.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-medium rounded-lg transition-all"
                style={repo.indexedAt
                  ? { background: "var(--surface-raised)", color: "var(--ink-muted)", border: "1px solid var(--border)" }
                  : { background: "rgba(91,110,255,0.12)", color: "#5B6EFF", border: "1px solid rgba(91,110,255,0.25)" }}>
                {indexing === repo.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {repo.indexedAt ? "Re-index" : "Index"}
              </button>
            </div>
            <WebhookPanel repoId={repo.id} hasWebhook={!!repo.webhookSecret} />
          </div>
        ))}
      </div>
    </div>
  );
}
