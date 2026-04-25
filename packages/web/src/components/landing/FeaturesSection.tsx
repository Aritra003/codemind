"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Feature = { key: string; label: string; icon: string; color: string; title: string; desc: string; cmd: string; output: string[] };

const FEATURES: Feature[] = [
  { key: "check", label: "Check", icon: "⚡", color: "#FF6B6B",
    title: "Know the blast radius before you commit",
    desc: "Graph traversal reveals every direct and transitive dependent of your change. Risk classified as LOW / MEDIUM / HIGH / CRITICAL — transparent rules, no fake scores.",
    cmd: "codemind check src/auth.ts",
    output: ["━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "  Risk: ██████████████████ HIGH", "  38 direct · 127 transitive dependents", "  2 coverage gaps detected", "  Latency: 0.48s", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"] },
  { key: "see", label: "See", icon: "🔮", color: "#A78BFA",
    title: "Verify your architecture diagrams are real",
    desc: "Upload any whiteboard photo, Lucidchart export, or Miro screenshot. Opus 4.7 extracts every service and connection, then diffs against your actual code graph.",
    cmd: "codemind see architecture.png",
    output: ["  Extracting diagram entities...", "  ✓ 14 services · 22 connections found", "  Comparing against live graph...", "  Accuracy: 58%", "  ● 2 phantom connections (removed)", "  ● 3 missing connections (added)", "  ✓ Corrected diagram saved"] },
  { key: "watch", label: "Watch", icon: "👁", color: "#F87171",
    title: "Live blast radius on every file save",
    desc: "File watcher with 2-second debounce. Every save triggers instant analysis. LOW changes get a one-liner. HIGH/CRITICAL expand with full reports and terminal bell.",
    cmd: "codemind watch",
    output: ["  Watching /src for changes...", "  [14:32:01] src/api/users.ts saved", "  → Risk: LOW · 3 dependents · 0.1s", "  [14:32:44] src/auth/index.ts saved", "  → Risk: HIGH · 38 dependents · 0.48s", "  ♪ High-risk change detected"] },
  { key: "trace", label: "Trace", icon: "🔍", color: "#22D3EE",
    title: "Forensic analysis from any stack trace",
    desc: "Paste any error or stack trace. CodeMind classifies the origin (code/infra/config/dependency), traces backward through the graph, and ranks commits by probability.",
    cmd: 'codemind trace "TypeError: Cannot read..."',
    output: ["  Classifying error origin...", "  → Type: CODE · Confidence: HIGH", "  Backward graph traversal: 4 hops", "  ─────────────────────────────────", "  Top suspect: a3f2c1b (2 days ago)", "    auth/middleware.ts:47", "  Probability: 78%"] },
  { key: "graph", label: "Graph", icon: "📊", color: "#34D399",
    title: "Find hotspots and export your graph",
    desc: "Identify the highest blast-radius files — the ones where a single bug causes maximum damage. Export the full graph to Mermaid, DOT, or JSON.",
    cmd: "codemind graph --hotspots",
    output: ["  Top 5 hotspot files by blast radius:", "  1. src/auth/index.ts       → 127", "  2. src/api/client.ts       → 89", "  3. src/utils/errors.ts     → 71", "  4. src/config/env.ts       → 63", "  5. src/db/prisma.ts        → 58"] },
  { key: "serve", label: "MCP", icon: "🤖", color: "#4361EE",
    title: "Give your AI agent X-ray vision too",
    desc: "MCP server exposing 6 tools. Claude Code or any MCP-compatible agent checks blast radius before editing shared code. Skill file auto-generated on first index.",
    cmd: "codemind serve",
    output: ["  ✓ MCP server started (stdio)", "  Skill file → .claude/skills/codemind.md", "  6 tools registered:", "    codemind_check", "    codemind_see · codemind_trace", "    codemind_graph · codemind_status", "    codemind_watch_status"] },
];

const COL = { heat: "#FF6B6B", solar: "#FFB347", neon: "#00F5D4", dim: "#3A3A5A" };

export function FeaturesSection() {
  const [active, setActive] = useState(0);
  const feat = FEATURES[active];

  return (
    <section id="features" className="py-24 lg:py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center mb-12">
          <p className="font-mono text-xs text-brand tracking-[0.2em] mb-4">KNOWLEDGE MAP</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ink mb-5 leading-tight">
            Six commands. <span className="text-gradient">Complete visibility.</span>
          </h2>
          <p className="font-body text-lg text-ink-muted max-w-xl mx-auto">
            Each command adds a layer of understanding. Together they give you X-ray vision into your codebase.
          </p>
        </motion.div>

        <div className="flex gap-2 flex-wrap justify-center mb-8">
          {FEATURES.map((f, i) => (
            <button key={f.key} onClick={() => setActive(i)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300"
              style={{
                background: active === i ? `${f.color}15` : "transparent",
                border: `1px solid ${active === i ? f.color + "45" : "var(--border)"}`,
                color: active === i ? f.color : "var(--ink-muted)",
              }}>
              <span className="text-base">{f.icon}</span> {f.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={feat.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28 }}
            className="glass rounded-2xl p-6 lg:p-8 grid lg:grid-cols-2 gap-8"
            style={{ borderColor: `${feat.color}22` }}>
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: `${feat.color}15`, border: `1px solid ${feat.color}30` }}>
                  {feat.icon}
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-ink leading-tight">{feat.title}</h3>
                  <code className="font-mono text-xs" style={{ color: feat.color }}>{feat.cmd}</code>
                </div>
              </div>
              <p className="font-body text-ink-muted leading-relaxed text-sm">{feat.desc}</p>
            </div>

            <div className="bg-[#05050B] rounded-xl p-4 font-mono text-xs leading-[1.8] border border-border overflow-x-auto">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                {[COL.heat, COL.solar, COL.neon].map(c => (
                  <div key={c} className="w-2.5 h-2.5 rounded-full opacity-70" style={{ background: c }} />
                ))}
                <code className="ml-2 text-ink-dim text-[11px] truncate">▸ {feat.cmd}</code>
              </div>
              {feat.output.map((line, i) => (
                <div key={i} style={{
                  color: line.includes("Risk:") ? COL.solar : line.startsWith("  ✓") || line.includes("✓") ? COL.neon
                    : line.includes("●") || line.includes("HIGH") ? COL.heat
                    : line.startsWith("━") ? COL.dim : "var(--ink-muted)"
                }}>{line}</div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
