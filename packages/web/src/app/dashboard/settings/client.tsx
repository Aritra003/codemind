"use client";
import { useState, useTransition } from "react";
import { Save, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/lib/toast";

type Profile = { name: string | null; email: string | null; image: string | null; about: string | null };

export function ProfileEditor({ initial }: { initial: Profile }) {
  const [name,    setName]    = useState(initial.name  ?? "");
  const [about,   setAbout]   = useState(initial.about ?? "");
  const [status,  setStatus]  = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const save = () => {
    startTransition(async () => {
      setStatus("saving");
      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() || undefined, about: about.trim() || undefined }),
        });
        if (!res.ok) throw new Error("Save failed");
        setStatus("saved");
        toast("Profile saved!", "success");
        setTimeout(() => setStatus("idle"), 3000);
      } catch {
        setStatus("error");
        toast("Save failed — try again", "error");
        setTimeout(() => setStatus("idle"), 4000);
      }
    });
  };

  const isDirty = name !== (initial.name ?? "") || about !== (initial.about ?? "");

  return (
    <div className="glass rounded-2xl p-6 mb-5">
      <p className="font-mono text-[10px] text-ink-dim uppercase tracking-widest mb-5">Your profile</p>

      {/* Avatar + identity */}
      <div className="flex items-center gap-4 mb-6">
        {initial.image
          ? <img src={initial.image} alt="" className="w-14 h-14 rounded-2xl border border-border" />
          : <div className="w-14 h-14 rounded-2xl bg-brand/20 flex items-center justify-center text-brand text-2xl font-bold border border-brand/20">
              {(initial.name ?? initial.email ?? "U")[0]?.toUpperCase()}
            </div>}
        <div>
          <p className="font-body text-xs text-ink-muted">{initial.email}</p>
          <p className="font-body text-xs text-ink-dim mt-0.5">Avatar from OAuth provider</p>
        </div>
      </div>

      {/* Name field */}
      <div className="mb-4">
        <label className="font-mono text-xs text-ink-muted block mb-1.5">Display Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={100}
          placeholder="Your name"
          className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 font-body text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-brand/60 transition-colors"
        />
      </div>

      {/* About Me field */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <label className="font-mono text-xs text-ink-muted">About Me</label>
          <span className="font-mono text-xs text-ink-dim">{about.length}/500</span>
        </div>
        <textarea
          value={about}
          onChange={e => setAbout(e.target.value.slice(0, 500))}
          placeholder="Tell us about yourself..."
          rows={4}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 font-body text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-brand/60 transition-colors resize-none leading-relaxed"
        />
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!isDirty || status === "saving"}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-body font-semibold text-white bg-brand hover:bg-brand/90 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === "saving"
            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : status === "saved"
              ? <><CheckCircle size={14} /> Saved</>
              : <><Save size={14} /> Save Changes</>}
        </button>
        {status === "error" && (
          <span className="font-body text-xs text-heat">Save failed — try again</span>
        )}
        {status === "saved" && (
          <span className="font-body text-xs text-neon">Changes saved!</span>
        )}
      </div>
    </div>
  );
}
