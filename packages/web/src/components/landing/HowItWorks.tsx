"use client";
import { motion } from "framer-motion";
import { Download, Search, Rocket } from "lucide-react";

const STEPS = [
  { num: "01", Icon: Download, color: "#4361EE",
    title: "Install in 30 seconds",
    body: "Run npx stinkit in any git repo. tree-sitter parses TypeScript, JavaScript, and more. No API key. No account. No cloud. Your data never leaves your machine.",
    cmd: "npx stinkit",
    note: "✓ Indexed 12,847 nodes in 1.2s",
  },
  { num: "02", Icon: Search, color: "#7B2FBE",
    title: "Explore your graph",
    body: "Your codebase is now a queryable structural graph. Check blast radius before any commit. Upload architecture diagrams to verify they're real. Trace production errors to their cause.",
    cmd: "stinkit check src/auth.ts",
    note: "⚡ 38 dependents · Risk: HIGH",
  },
  { num: "03", Icon: Rocket, color: "#00F5D4",
    title: "Ship with confidence",
    body: "Run stinkit watch for real-time blast radius on every save. Add stinkit serve to your Claude Code MCP settings and your AI agent will check before every edit.",
    cmd: "stinkit serve",
    note: "🤖 MCP server started · 6 tools ready",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 border-t border-border relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/2 to-transparent pointer-events-none" aria-hidden />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center mb-16">
          <p className="font-mono text-xs text-brand tracking-[0.2em] mb-4">HOW IT WORKS</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ink mb-5 leading-tight">
            From zero to <span className="text-gradient">X-ray vision</span> in minutes.
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 relative">
          {/* Connector */}
          <div className="hidden lg:block absolute top-10 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px"
            style={{ background: "linear-gradient(90deg, rgba(67,97,238,0.3), rgba(123,47,190,0.3), rgba(0,245,212,0.3))" }}
            aria-hidden />

          {STEPS.map((step, i) => (
            <motion.div key={step.num}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15 }}
              className="glass rounded-2xl p-6 lg:p-8 card-hover-effect relative">
              {/* Step marker */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center font-mono text-sm font-bold z-10 bg-surface flex-shrink-0"
                  style={{ border: `1px solid ${step.color}35`, color: step.color }}>
                  {step.num}
                </div>
                <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${step.color}35, transparent)` }} />
              </div>

              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                style={{ background: `${step.color}12`, border: `1px solid ${step.color}25` }}>
                <step.Icon size={18} style={{ color: step.color }} />
              </div>

              <h3 className="font-display font-bold text-xl text-ink mb-3">{step.title}</h3>
              <p className="font-body text-ink-muted text-sm leading-relaxed mb-6">{step.body}</p>

              <div className="bg-[#05050B] rounded-xl p-3 border border-border font-mono text-xs leading-relaxed">
                <div className="mb-1.5">
                  <span className="text-neon">▸ </span>
                  <span className="text-ink">{step.cmd}</span>
                </div>
                <div style={{ color: step.color }}>{step.note}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
