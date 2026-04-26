"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Github, User, Mail, Lock, AlertCircle, ArrowRight, Loader2, Zap, Eye, Bot } from "lucide-react";

const PERKS = [
  { Icon: Zap,  color: "#4361EE", text: "Connect GitHub repos for web-based analysis" },
  { Icon: Eye,  color: "#A78BFA", text: "Full dashboard: check, graph, trace, see diagrams" },
  { Icon: Bot,  color: "#00F5D4", text: "API keys for AI agent authentication (MCP over HTTP)" },
];

export default function SignupPage() {
  const [oauthLoading, setOauthLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGitHub = async () => {
    setOauthLoading(true);
    setError(null);
    await signIn("github", { callbackUrl: "/dashboard" });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setFormLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Registration failed.");
      setFormLoading(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Account created but sign-in failed. Try logging in.");
      setFormLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  };

  const busy = oauthLoading || formLoading;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-65px)] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neon/10 border border-neon/20 rounded-full mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse-slow" />
            <span className="font-mono text-xs text-neon">Free forever</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink mb-2">Create your account</h1>
          <p className="font-body text-sm text-ink-muted">Get full web access to StinKit in seconds</p>
        </div>

        <div className="glass rounded-2xl p-7 space-y-4 mb-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl border text-sm font-body"
              style={{ background: "var(--heat-dim)", borderColor: "rgba(255,107,107,0.25)", color: "var(--heat)" }}>
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* GitHub OAuth */}
          <button onClick={handleGitHub} disabled={busy}
            className="w-full flex items-center justify-center gap-3 p-3.5 bg-[#21262D] hover:bg-[#2d333b] text-white rounded-xl font-body font-medium text-sm transition-all duration-200 disabled:opacity-50 border border-[#30363d] hover:border-[#8b949e]">
            {oauthLoading ? <Loader2 size={16} className="animate-spin" /> : <Github size={17} />}
            {oauthLoading ? "Connecting..." : "Sign up with GitHub"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="font-mono text-xs text-ink-muted">or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Registration form */}
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-body text-ink placeholder:text-ink-dim outline-none transition-all"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-body text-ink placeholder:text-ink-dim outline-none transition-all"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password (min 8 chars)"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-body text-ink placeholder:text-ink-dim outline-none transition-all"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>
            <button type="submit" disabled={busy}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl font-body font-semibold text-sm text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--brand)" }}>
              {formLoading ? <Loader2 size={15} className="animate-spin" /> : null}
              {formLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="font-mono text-xs text-ink-muted text-center leading-relaxed pt-1">
            No credit card. No trial period. Free forever for open source.
          </p>
        </div>

        {/* Perks */}
        <div className="glass rounded-xl p-4 space-y-3 mb-5">
          {PERKS.map(({ Icon, color, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon size={13} style={{ color }} />
              </div>
              <span className="font-body text-xs text-ink-muted">{text}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-sm font-body text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline font-medium">Sign in <ArrowRight size={12} className="inline" /></Link>
        </p>
      </div>
    </div>
  );
}
