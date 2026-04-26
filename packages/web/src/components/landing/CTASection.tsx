"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Copy, ArrowRight } from "lucide-react";

export function CTASection() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText("npx stinkit");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 lg:py-32 border-t border-border relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/4 to-transparent pointer-events-none" aria-hidden />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-brand/6 rounded-full blur-[80px] pointer-events-none" aria-hidden />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <p className="font-mono text-xs text-brand tracking-[0.2em] mb-6">START NOW</p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold text-ink mb-6 leading-tight">
            See your codebase&apos;s
            <br />
            <span className="text-gradient">hidden structure.</span>
          </h2>
          <p className="font-body text-lg text-ink-muted mb-12 max-w-xl mx-auto leading-relaxed">
            One command. No signup for CLI. No cloud. Open source forever.
            Create a free account for the web dashboard and agent authentication.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button onClick={copy}
              className="group inline-flex items-center gap-3 bg-surface-raised border border-border hover:border-brand/40 rounded-2xl px-6 py-4 transition-all duration-300 hover:shadow-brand-glow/20 w-full sm:w-auto justify-center">
              <span className="font-mono text-lg text-neon">▸</span>
              <code className="font-mono text-base text-ink">npx stinkit</code>
              <span className="font-mono text-xs text-ink-dim bg-surface px-2 py-0.5 rounded ml-1 group-hover:text-brand transition-colors">
                {copied ? <><Check size={11} className="inline" /> copied</> : <><Copy size={11} className="inline" /> copy</>}
              </span>
            </button>

            <span className="text-ink-dim text-sm font-body hidden sm:block">or</span>

            <Link href="/signup"
              className="inline-flex items-center gap-2 px-6 py-4 font-body font-semibold text-white bg-brand hover:bg-brand/90 rounded-2xl shadow-sm hover:shadow-brand-glow transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto justify-center">
              Create free account <ArrowRight size={16} />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-body text-ink-dim">
            <span>No account needed for CLI</span>
            <span className="hidden sm:block">·</span>
            <span>MIT License</span>
            <span className="hidden sm:block">·</span>
            <a href="https://github.com/Aritra003/stinkit" target="_blank" rel="noreferrer"
              className="hover:text-ink-muted transition-colors">⭐ Star on GitHub</a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
