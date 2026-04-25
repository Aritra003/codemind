"use client";
import { useState } from "react";
import { Key, Plus, Trash2, Copy, Check, Loader2, Eye, EyeOff } from "lucide-react";

type ApiKeyRecord = { id: string; name: string; prefix: string; lastUsed: Date | null; createdAt: Date };

export function ApiKeysClient({ keys: initial }: { keys: ApiKeyRecord[] }) {
  const [keys, setKeys] = useState(initial);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/apikeys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setNewKey(json.key);
      setKeys(prev => [json.record, ...prev]);
      setName("");
    } catch { /* noop */ }
    finally { setCreating(false); }
  };

  const deleteKey = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/apikeys?id=${id}`, { method: "DELETE" });
      setKeys(prev => prev.filter(k => k.id !== id));
    } catch { /* noop */ }
    finally { setDeleting(null); }
  };

  const copy = () => {
    if (newKey) { navigator.clipboard?.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-neon/12 border border-neon/25 flex items-center justify-center">
          <Key size={16} className="text-neon" />
        </div>
        <h1 className="font-display text-xl font-bold text-ink">API Keys</h1>
      </div>
      <p className="font-body text-sm text-ink-muted mb-8 pl-12">
        Create API keys for AI agents (e.g. Claude Code, Cursor) to authenticate with CodeMind&apos;s HTTP API.
      </p>

      {/* New key alert */}
      {newKey && (
        <div className="glass rounded-xl p-5 border border-neon/30 mb-6 space-y-3">
          <div className="flex items-center gap-2 text-neon font-body text-sm font-medium">
            <Check size={15} /> Key created — copy it now, it won&apos;t be shown again.
          </div>
          <div className="flex items-center gap-3 bg-surface rounded-lg p-3 border border-border">
            <code className="font-mono text-sm text-ink flex-1 truncate">
              {showKey ? newKey : newKey.slice(0, 10) + "•".repeat(24)}
            </code>
            <button onClick={() => setShowKey(!showKey)} className="p-1 text-ink-muted hover:text-ink transition-colors">
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-medium bg-neon/12 text-neon rounded-lg border border-neon/25 hover:bg-neon/20 transition-colors">
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <p className="font-body text-xs text-ink-dim">Use as: <code className="font-mono text-ink-muted">Authorization: Bearer {newKey.slice(0, 12)}…</code> or <code className="font-mono text-ink-muted">x-api-key</code> header.</p>
        </div>
      )}

      {/* Create form */}
      <div className="glass rounded-2xl p-5 mb-6">
        <p className="font-mono text-xs text-ink-muted mb-3">CREATE NEW KEY</p>
        <div className="flex gap-3">
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && create()}
            placeholder="Claude Code agent" maxLength={64}
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 font-body text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-brand/60 transition-colors" />
          <button onClick={create} disabled={creating || !name.trim()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-body font-medium text-white bg-brand hover:bg-brand/90 rounded-xl transition-all disabled:opacity-50">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create
          </button>
        </div>
      </div>

      {/* Keys list */}
      <div className="space-y-2">
        {keys.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center border border-dashed border-border">
            <Key size={32} className="text-ink-dim mx-auto mb-3" />
            <p className="font-body text-sm text-ink-muted">No API keys yet. Create one above for agent authentication.</p>
          </div>
        ) : keys.map(key => (
          <div key={key.id} className="glass rounded-xl p-4 border border-border flex items-center gap-3 card-hover-effect">
            <Key size={14} className="text-neon flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm font-medium text-ink">{key.name}</p>
              <p className="font-mono text-xs text-ink-dim">{key.prefix}… · {key.lastUsed ? `Last used ${new Date(key.lastUsed).toLocaleDateString()}` : "Never used"}</p>
            </div>
            <button onClick={() => deleteKey(key.id)} disabled={deleting === key.id}
              className="p-2 text-ink-dim hover:text-heat transition-colors rounded-lg hover:bg-heat/8">
              {deleting === key.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
