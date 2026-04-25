"use client";
import { motion } from "framer-motion";
import { Zap, Eye, Shield, BarChart2, Activity, Server } from "lucide-react";

const TOOLS = [
  { name: "codemind_check",        Icon: Zap,       color: "#FF6B6B", desc: "Blast radius before any edit" },
  { name: "codemind_see",          Icon: Eye,       color: "#A78BFA", desc: "Verify diagrams against reality" },
  { name: "codemind_trace",        Icon: Shield,    color: "#22D3EE", desc: "Forensic error investigation" },
  { name: "codemind_graph",        Icon: BarChart2, color: "#34D399", desc: "Export graph + find hotspots" },
  { name: "codemind_status",       Icon: Activity,  color: "#4361EE", desc: "Current graph state" },
  { name: "codemind_watch_status", Icon: Server,    color: "#FFB347", desc: "Real-time change feed" },
];

const CONFIG = `"mcpServers": {
  "codemind": {
    "command": "codemind",
    "args": ["serve"]
  }
}`;

export function AgentSection() {
  return (
    <section id="agents" className="py-24 lg:py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center mb-14">
          <p className="font-mono text-xs text-brand tracking-[0.2em] mb-4">MCP INTEGRATION</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ink mb-5 leading-tight">
            Your AI agents see <span className="text-gradient">your graph too.</span>
          </h2>
          <p className="font-body text-lg text-ink-muted max-w-2xl mx-auto leading-relaxed">
            One config line. Claude Code, Cursor, or any MCP-compatible agent will automatically check blast radius before editing shared code.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* MCP tools list */}
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-6">
            <p className="font-mono text-xs text-brand tracking-[0.2em] mb-5">6 MCP TOOLS</p>
            <div className="space-y-2.5">
              {TOOLS.map(t => (
                <div key={t.name} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border hover:border-border-light transition-colors card-hover-effect">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${t.color}12`, border: `1px solid ${t.color}28` }}>
                    <t.Icon size={14} style={{ color: t.color }} />
                  </div>
                  <div className="min-w-0">
                    <code className="font-mono text-xs text-ink block">{t.name}</code>
                    <p className="font-body text-xs text-ink-muted">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Config + steps */}
          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="flex flex-col gap-5">
            <div className="glass rounded-2xl p-6">
              <p className="font-mono text-xs text-neon tracking-[0.2em] mb-4">CLAUDE CODE · settings.json</p>
              <pre className="font-mono text-sm text-ink-muted leading-relaxed bg-[#05050B] rounded-xl p-4 border border-border overflow-x-auto whitespace-pre-wrap">
                <code>{CONFIG}</code>
              </pre>
            </div>

            <div className="glass rounded-2xl p-6">
              <p className="font-mono text-xs text-brand tracking-[0.2em] mb-5">SETUP IN 4 STEPS</p>
              <div className="space-y-3">
                {[
                  "Run codemind serve in your project root",
                  "Add the snippet above to your MCP settings",
                  "Agent checks blast radius before every edit to shared files",
                  "Skill file auto-generated on first index — agent knows when to call what",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm font-body text-ink-muted">
                    <span className="font-mono text-brand mt-0.5 flex-shrink-0 font-bold">0{i + 1}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
