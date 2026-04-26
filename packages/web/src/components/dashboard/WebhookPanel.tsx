"use client";
import { useState } from "react";
import { Webhook, Loader2, Copy, Check, Trash2, RefreshCw } from "lucide-react";

type Props = { repoId: string; hasWebhook: boolean };

export function WebhookPanel({ repoId, hasWebhook: initialHasWebhook }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasWebhook, setHasWebhook] = useState(initialHasWebhook);
  const [secret, setSecret] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "secret" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true); setError(null); setSecret(null);
    try {
      const res = await fetch(`/api/repos/${repoId}/webhook`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setSecret(json.secret);
      setWebhookUrl(json.webhookUrl);
      setHasWebhook(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };

  const remove = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/repos/${repoId}/webhook`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
      setHasWebhook(false); setSecret(null); setWebhookUrl(null); setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };

  const copy = (text: string, which: "url" | "secret") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div className="border-t border-border/50 mt-3 pt-3">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-body text-ink-muted hover:text-ink transition-colors">
        <Webhook size={11} />
        {hasWebhook ? "Webhook active" : "Set up webhook"}
        {hasWebhook && <span className="w-1.5 h-1.5 rounded-full bg-neon ml-1" />}
      </button>

      {open && (
        <div className="mt-3 bg-surface rounded-xl p-3 border border-border space-y-2">
          <p className="font-body text-xs text-ink-muted">Auto re-index on every push to the default branch.</p>

          {error && <p className="font-mono text-xs text-heat">{error}</p>}

          {webhookUrl && secret && (
            <div className="space-y-1.5">
              <CopyRow label="Webhook URL" value={webhookUrl} which="url" copied={copied} onCopy={copy} />
              <CopyRow label="Secret" value={secret} which="secret" copied={copied} onCopy={copy} />
              <p className="font-body text-xs text-solar">Copy the secret now — it won{"'"}t be shown again.</p>
            </div>
          )}

          {!webhookUrl && hasWebhook && (
            <p className="font-body text-xs text-ink-muted">Webhook configured. Regenerate to see a new secret.</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button onClick={generate} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-medium text-white bg-brand/90 hover:bg-brand rounded-lg transition-all disabled:opacity-50">
              {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              {hasWebhook ? "Regenerate" : "Generate"}
            </button>
            {hasWebhook && (
              <button onClick={remove} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body text-heat/80 hover:text-heat rounded-lg hover:bg-heat/8 transition-all disabled:opacity-50">
                <Trash2 size={11} /> Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CopyRow({ label, value, which, copied, onCopy }: {
  label: string; value: string; which: "url" | "secret";
  copied: "url" | "secret" | null; onCopy: (v: string, w: "url" | "secret") => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-body text-xs text-ink-muted w-16 flex-shrink-0">{label}</span>
      <code className="font-mono text-xs text-ink bg-[#05050B] rounded px-2 py-1 flex-1 truncate">{value}</code>
      <button onClick={() => onCopy(value, which)}
        className="p-1 text-ink-dim hover:text-ink transition-colors flex-shrink-0">
        {copied === which ? <Check size={11} className="text-neon" /> : <Copy size={11} />}
      </button>
    </div>
  );
}
