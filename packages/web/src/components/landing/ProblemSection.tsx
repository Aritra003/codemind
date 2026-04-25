"use client";
import { motion } from "framer-motion";
import { GitBranch, FileWarning, Bug } from "lucide-react";

const PAINS = [
  {
    Icon: GitBranch, color: "#FF6B6B",
    title: "Invisible dependencies",
    body: "Your change looks safe. But 38 other files import from that module. You won't know until staging collapses — or a user files a ticket.",
  },
  {
    Icon: FileWarning, color: "#FFB347",
    title: "Architecture diagrams that lie",
    body: "That Confluence diagram was accurate in 2023. The codebase moved on. Nobody updated it. Nobody knows what's real anymore.",
  },
  {
    Icon: Bug, color: "#FF6B6B",
    title: "Stack traces with no answers",
    body: "You know where it crashed. You don't know which commit introduced it, which services are affected, or whether it has happened before.",
  },
];

export function ProblemSection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Warm tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-heat/3 to-transparent pointer-events-none" aria-hidden />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-16">
          <p className="font-mono text-xs text-heat tracking-[0.2em] mb-4">THE PROBLEM</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ink mb-5 leading-tight">
            You&apos;re shipping <span className="text-gradient-heat">blind.</span>
          </h2>
          <p className="font-body text-lg text-ink-muted max-w-2xl mx-auto leading-relaxed">
            Most developers discover breaking changes from users, not from tools.
            The gap between &quot;looks good&quot; and &quot;production incident&quot; is invisible dependencies.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PAINS.map((p, i) => (
            <motion.div key={p.title}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.12 }}
              className="glass rounded-2xl p-6 card-hover-effect"
              style={{ borderColor: `${p.color}18` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                style={{ background: `${p.color}12`, border: `1px solid ${p.color}28` }}>
                <p.Icon size={20} style={{ color: p.color }} />
              </div>
              <h3 className="font-display font-semibold text-ink mb-3 text-lg">{p.title}</h3>
              <p className="font-body text-ink-muted text-sm leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ delay: 0.4 }}
          className="mt-20 text-center">
          <div className="inline-flex items-center gap-4 text-ink-dim">
            <div className="h-px w-12 bg-border" />
            <span className="font-mono text-xs tracking-[0.3em]">UNTIL NOW</span>
            <div className="h-px w-12 bg-border" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
