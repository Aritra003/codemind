"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Github, Check, Copy } from "lucide-react";
import { TerminalDemo } from "./TerminalDemo";

const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

export function Hero() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText("npx codemind");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-dot-grid bg-dot-grid pointer-events-none" aria-hidden />
      {/* Glow blobs */}
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[100px] pointer-events-none" aria-hidden />
      <div className="absolute bottom-1/4 left-1/6 w-[350px] h-[350px] bg-accent/4 rounded-full blur-[80px] pointer-events-none" aria-hidden />
      {/* Anime scan lines */}
      <div className="absolute inset-0 scan-lines pointer-events-none opacity-30" aria-hidden />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            {/* Live badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2.5 mb-8 px-4 py-2 bg-surface-raised border border-border rounded-full">
              <div className="w-2 h-2 rounded-full bg-neon animate-pulse-slow flex-shrink-0" />
              <span className="font-mono text-xs text-ink-muted tracking-wide">Built with Claude Opus 4.7 · Open Source · v5.0</span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={fadeUp}
              className="font-display text-5xl sm:text-6xl xl:text-[72px] font-bold text-ink leading-[1.05] mb-6 tracking-tight">
              Ship without
              <br />
              <span className="text-gradient">fear.</span>
            </motion.h1>

            {/* Sub */}
            <motion.p variants={fadeUp} className="font-body text-lg text-ink-muted leading-relaxed mb-10 max-w-lg">
              CodeMind builds a live structural graph of your entire codebase — locally, in seconds. See the blast radius of every change before it ships.
              <span className="block mt-2 text-base text-ink-dim">No cloud. No account. No cost.</span>
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-10">
              <Link href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3.5 font-body font-semibold text-sm text-white bg-brand hover:bg-brand/90 rounded-xl shadow-sm hover:shadow-brand-glow transition-all duration-300 hover:scale-[1.02]">
                Get started free <ArrowRight size={15} />
              </Link>
              <a href="https://github.com/Aritra003/codemind" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 font-body font-medium text-sm text-ink-muted hover:text-ink border border-border hover:border-border-light rounded-xl hover:bg-surface-raised transition-all duration-300">
                <Github size={15} /> GitHub ↗
              </a>
            </motion.div>

            {/* CLI copy */}
            <motion.div variants={fadeUp}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="font-mono text-xs text-ink-dim">or use the CLI directly</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <button onClick={copy}
                className="group flex items-center gap-3 bg-surface-raised border border-border hover:border-border-light rounded-xl px-4 py-3 transition-all duration-300 cursor-pointer">
                <span className="font-mono text-sm text-neon">▸</span>
                <code className="font-mono text-sm text-ink">npx codemind</code>
                <span className="font-mono text-xs text-ink-dim bg-surface px-2 py-0.5 rounded ml-auto group-hover:text-brand transition-colors">
                  {copied ? <><Check size={11} className="inline mr-1" />copied</> : <><Copy size={11} className="inline mr-1" />copy</>}
                </span>
              </button>
            </motion.div>
          </motion.div>

          {/* Right: terminal */}
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block">
            <TerminalDemo />
          </motion.div>
        </div>
      </div>

      {/* Bottom scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 pointer-events-none" aria-hidden>
        <div className="w-px h-10 bg-gradient-to-b from-transparent to-border" />
        <div className="font-mono text-[10px] text-ink-dim tracking-widest">SCROLL</div>
      </div>
    </section>
  );
}
