"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Github, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [oauthLoading, setOauthLoading] = useState(false);
  const [credLoading, setCredLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGitHub = async () => {
    setOauthLoading(true);
    setError(null);
    await signIn("github", { callbackUrl: "/dashboard" });
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredLoading(true);
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Invalid email or password.");
      setCredLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  };

  const busy = oauthLoading || credLoading;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-65px)] p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-[800] text-[var(--ink-primary)] mb-2 tracking-tight" style={{ fontSize: "32px" }}>Welcome back</h1>
          <p style={{ fontSize: "16px", color: "var(--ink-secondary)" }}>Sign in to access your code graph dashboard</p>
        </div>

        <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[20px] p-7 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl border text-sm font-body"
              style={{ background: "var(--heat-dim)", borderColor: "rgba(255,107,107,0.25)", color: "var(--heat)" }}>
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* GitHub OAuth */}
          <button onClick={handleGitHub} disabled={busy}
            className="w-full flex items-center justify-center gap-3 bg-[#21262D] hover:bg-[#2d333b] text-white rounded-[12px] font-[600] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-[#30363d] hover:border-[#8b949e]"
            style={{ height: "48px", fontSize: "15px" }}>
            {oauthLoading ? <Loader2 size={16} className="animate-spin" /> : <Github size={17} />}
            {oauthLoading ? "Connecting to GitHub..." : "Continue with GitHub"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="font-mono text-xs text-ink-muted">or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleCredentials} className="space-y-3">
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
                placeholder="Password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-body text-ink placeholder:text-ink-dim outline-none transition-all"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--brand)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>
            <button type="submit" disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-[12px] font-[600] text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ height: "48px", fontSize: "15px", background: "var(--grad-brand)" }}>
              {credLoading ? <Loader2 size={15} className="animate-spin" /> : null}
              {credLoading ? "Signing in..." : "Sign in with email"}
            </button>
          </form>

          <p className="font-mono text-xs text-ink-muted text-center leading-relaxed">
            GitHub OAuth requests <code className="text-brand">repo</code> scope to analyze your repositories.
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-5 bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[16px] p-4 space-y-2.5">
          {["Connect any GitHub repo for web analysis", "Full dashboard: check, graph, trace, see", "API keys for agent authentication"].map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-[var(--ink-secondary)]" style={{ fontSize: "14px" }}>
              <span className="text-[var(--green)] font-[700]">✓</span> {b}
            </div>
          ))}
        </div>

        <p className="text-center mt-5 text-[var(--ink-secondary)]" style={{ fontSize: "15px" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[var(--accent)] hover:underline font-[500]">Sign up free <ArrowRight size={12} className="inline" /></Link>
        </p>
      </div>
    </div>
  );
}
