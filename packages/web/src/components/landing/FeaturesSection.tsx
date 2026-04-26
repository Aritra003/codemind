"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Feature = { key: string; label: string; icon: string; color: string; title: string; desc: string; cmd: string; output: string[] };

const FEATURES: Feature[] = [
  { key: "check", label: "check", icon: "⚡", color: "#F87171",
    title: "Know the blast radius before you commit",
    desc: "Graph traversal reveals every direct and transitive dependent of your change. Risk classified as LOW / MEDIUM / HIGH / CRITICAL — transparent rules, no fake scores.",
    cmd: "stinkit check src/auth.ts",
    output: ["━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "  Risk: ██████████████████ HIGH", "  38 direct · 127 transitive dependents", "  2 coverage gaps detected", "  Latency: 0.48s", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"] },
  { key: "see", label: "see", icon: "🔮", color: "#A78BFA",
    title: "Verify your architecture diagrams are real",
    desc: "Upload any whiteboard photo, Lucidchart export, or Miro screenshot. Opus 4.7 extracts every service and connection, then diffs against your actual code graph.",
    cmd: "stinkit see architecture.png",
    output: ["  Extracting diagram entities...", "  ✓ 14 services · 22 connections found", "  Comparing against live graph...", "  Accuracy: 58%", "  ● 2 phantom connections (removed)", "  ● 3 missing connections (added)", "  ✓ Corrected diagram saved"] },
  { key: "watch", label: "watch", icon: "👁", color: "#FB923C",
    title: "Live blast radius on every file save",
    desc: "File watcher with 2-second debounce. Every save triggers instant analysis. LOW changes get a one-liner. HIGH/CRITICAL expand with full reports and terminal bell.",
    cmd: "stinkit watch",
    output: ["  Watching /src for changes...", "  [14:32:01] src/api/users.ts saved", "  → Risk: LOW · 3 dependents · 0.1s", "  [14:32:44] src/auth/index.ts saved", "  → Risk: HIGH · 38 dependents · 0.48s", "  ♪ High-risk change detected"] },
  { key: "trace", label: "trace", icon: "🔍", color: "#22D3EE",
    title: "Forensic analysis from any stack trace",
    desc: "Paste any error or stack trace. StinKit classifies the origin, traces backward through the graph, and ranks commits by probability of being the root cause.",
    cmd: 'stinkit trace "TypeError: Cannot read..."',
    output: ["  Classifying error origin...", "  → Type: CODE · Confidence: HIGH", "  Backward graph traversal: 4 hops", "  ─────────────────────────────────", "  Top suspect: a3f2c1b (2 days ago)", "    auth/middleware.ts:47", "  Probability: 78%"] },
  { key: "graph", label: "graph", icon: "📊", color: "#34D399",
    title: "Find hotspots and export your graph",
    desc: "Identify the highest blast-radius files — the ones where a single bug causes maximum damage. Export the full graph to Mermaid, DOT, or JSON.",
    cmd: "stinkit graph --hotspots",
    output: ["  Top 5 hotspot files by blast radius:", "  1. src/auth/index.ts       → 127", "  2. src/api/client.ts       → 89", "  3. src/utils/errors.ts     → 71", "  4. src/config/env.ts       → 63", "  5. src/db/prisma.ts        → 58"] },
  { key: "serve", label: "MCP", icon: "🤖", color: "#6366F1",
    title: "Give your AI agent X-ray vision too",
    desc: "MCP server exposing 6 tools. Claude Code or any MCP-compatible agent checks blast radius before editing shared code. Skill file auto-generated on first index.",
    cmd: "stinkit serve",
    output: ["  ✓ MCP server started (stdio)", "  Skill file → .claude/skills/stinkit.md", "  6 tools registered:", "    stinkit_check", "    stinkit_see · stinkit_trace", "    stinkit_graph · stinkit_status", "    stinkit_watch_status"] },
];

export function FeaturesSection() {
  const [active, setActive] = useState(0);
  const feat = FEATURES[active];

  return (
    <section id="features" className="py-24 lg:py-32 border-t border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center mb-14">
          <p className="font-mono font-[600] tracking-[3px] uppercase text-[var(--accent)] mb-4"
            style={{ fontSize: "13px" }}>COMMANDS</p>
          <h2 className="font-[700] text-[var(--ink-primary)] mb-5 leading-tight"
            style={{ fontSize: "36px", letterSpacing: "-0.01em" }}>
            Nine commands. <span className="gradient-text">One graph.</span>
          </h2>
          <p style={{ fontSize: "17px", color: "var(--ink-secondary)", maxWidth: "500px", margin: "0 auto" }}>
            Each command adds a layer of understanding. Together they give you X-ray vision.
          </p>
        </motion.div>

        {/* Command tabs */}
        <div className="flex gap-2 flex-wrap justify-center mb-8">
          {FEATURES.map((f, i) => (
            <button key={f.key} onClick={() => setActive(i)}
              className="flex items-center gap-2 px-4 rounded-[10px] font-[500] transition-all duration-200"
              style={{
                height: "44px",
                fontSize: "15px",
                background: active === i ? `${f.color}15` : "transparent",
                border: `1px solid ${active === i ? f.color + "45" : "var(--border-default)"}`,
                color: active === i ? f.color : "var(--ink-tertiary)",
              }}>
              <span className="text-base">{f.icon}</span>
              <span className="font-mono">{f.label}</span>
            </button>
          ))}
        </div>

        {/* Feature panel */}
        <AnimatePresence mode="wait">
          <motion.div key={feat.key}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28 }}
            className="rounded-[20px] p-6 lg:p-8 grid lg:grid-cols-2 gap-8 bg-[var(--bg-glass)] backdrop-blur-xl border"
            style={{ borderColor: `${feat.color}22` }}>
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${feat.color}15`, border: `1px solid ${feat.color}30` }}>
                  {feat.icon}
                </div>
                <div>
                  <h3 className="font-[600] text-[var(--ink-primary)] leading-tight" style={{ fontSize: "20px" }}>
                    {feat.title}
                  </h3>
                  <code className="font-mono" style={{ fontSize: "14px", color: feat.color }}>{feat.cmd}</code>
                </div>
              </div>
              <p style={{ fontSize: "16px", color: "var(--ink-secondary)", lineHeight: "1.7" }}>{feat.desc}</p>
            </div>

            <div className="bg-[var(--bg-void)] rounded-[12px] p-4 font-mono border border-[var(--border-subtle)] overflow-x-auto"
              style={{ fontSize: "15px", lineHeight: "1.8" }}>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-subtle)]">
                {["#F87171", "#FB923C", "#34D399"].map(c => (
                  <div key={c} className="w-3 h-3 rounded-full opacity-70" style={{ background: c }} />
                ))}
                <code className="ml-2 truncate" style={{ fontSize: "14px", color: "var(--ink-muted)" }}>▸ {feat.cmd}</code>
              </div>
              {feat.output.map((line, i) => (
                <div key={i} style={{
                  color: line.includes("Risk:") ? "var(--orange)" : line.includes("✓") ? "var(--green)"
                    : line.includes("●") || line.includes("HIGH") ? "var(--red)"
                    : line.startsWith("━") ? "var(--ink-muted)" : "var(--ink-secondary)"
                }}>{line}</div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
