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
    navigator.clipboard?.writeText("npx stinkit");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative min-h-screen flex items-center pt-[68px] overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-dot-grid bg-dot-grid pointer-events-none opacity-60" aria-hidden />
      <div className="absolute inset-0 bg-glow-top pointer-events-none" aria-hidden />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-[var(--accent-glow)] rounded-full blur-[120px] pointer-events-none" aria-hidden />
      <div className="absolute bottom-1/4 left-1/6 w-[400px] h-[400px] bg-[rgba(167,139,250,0.05)] rounded-full blur-[100px] pointer-events-none" aria-hidden />
      <div className="absolute inset-0 scan-lines pointer-events-none opacity-25" aria-hidden />

      <div className="max-w-7xl mx-auto px-6 w-full py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left — content */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            {/* Pre-headline badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2.5 mb-10">
              <span className="text-[13px] font-[600] tracking-[4px] uppercase text-[var(--accent)]">
                Open Source · MIT Licensed · 11 Languages
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={fadeUp}
              className="font-[800] leading-[1.1] mb-6 tracking-tight"
              style={{ fontSize: "clamp(40px, 5vw, 56px)", color: "var(--ink-primary)" }}>
              See what{" "}
              <span className="gradient-text">breaks.</span>
              <br />
              Ship what{" "}
              <span className="gradient-text">works.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p variants={fadeUp}
              className="mb-10 max-w-[480px]"
              style={{ fontSize: "18px", color: "var(--ink-secondary)", lineHeight: "1.8" }}>
              StinKit indexes your codebase, reads your architecture diagrams with AI vision,
              and gives you a professional audit report — in seconds.
            </motion.p>

            {/* Install block + CTA */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <button onClick={copy}
                className="group flex items-center gap-3 bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-hover)] rounded-[14px] px-5 transition-all duration-200 cursor-pointer min-h-[52px]"
                style={{ minWidth: "200px" }}>
                <span className="text-[var(--green)] font-mono text-lg">❯</span>
                <code className="font-mono text-[18px] text-[var(--ink-primary)] flex-1">npx stinkit</code>
                <span className="text-[13px] font-[500] text-[var(--ink-muted)] bg-[var(--bg-elevated)] px-2 py-1 rounded-[6px] group-hover:text-[var(--accent)] transition-colors">
                  {copied ? <><Check size={11} className="inline mr-1" />copied</> : <><Copy size={11} className="inline mr-1" />copy</>}
                </span>
              </button>

              <Link href="/signup"
                className="text-[16px] font-[600] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors whitespace-nowrap">
                Create free account →
              </Link>
            </motion.div>

            <motion.p variants={fadeUp}
              style={{ fontSize: "14px", color: "var(--ink-muted)" }}>
              No account needed for CLI · MIT License · ★ Star on GitHub
            </motion.p>

            {/* CTA buttons row */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mt-8">
              <Link href="/signup"
                className="inline-flex items-center gap-2 px-6 h-[48px] font-[600] text-[15px] text-white rounded-[12px] transition-all duration-200 hover:opacity-90 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(99,102,241,0.35)]"
                style={{ background: "var(--grad-brand)" }}>
                Get started free <ArrowRight size={15} />
              </Link>
              <a href="https://github.com/Aritra003/stinkit" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 h-[48px] font-[500] text-[15px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border border-[var(--border-default)] hover:border-[var(--border-hover)] rounded-[12px] hover:bg-[var(--bg-elevated)] transition-all duration-200">
                <Github size={15} /> GitHub ↗
              </a>
            </motion.div>
          </motion.div>

          {/* Right: terminal demo */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block">
            <TerminalDemo />
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 pointer-events-none" aria-hidden>
        <div className="w-px h-10 bg-gradient-to-b from-transparent to-[var(--border-default)]" />
        <div className="font-mono text-[13px] text-[var(--ink-muted)] tracking-[4px]">SCROLL</div>
      </div>
    </section>
  );
}
