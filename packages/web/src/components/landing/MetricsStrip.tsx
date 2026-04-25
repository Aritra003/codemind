"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

type Metric = { icon: string; value: string | number; suffix?: string; label: string; sub: string; color: string };

const METRICS: Metric[] = [
  { icon: "🎯", value: 74, suffix: "%", label: "Local completeness", sub: "on 18K-node monorepo",   color: "#00F5D4" },
  { icon: "⚡", value: "0.48s",        label: "Check latency",       sub: "fully offline, always",  color: "#FFB347" },
  { icon: "✓",  value: 360,            label: "Tests passing",       sub: "7 repos validated",      color: "#4361EE" },
  { icon: "💰", value: "$0",           label: "Cost to run",         sub: "forever — no cloud",     color: "#A78BFA" },
  { icon: "🤖", value: 6,              label: "MCP tools",           sub: "agent-ready, zero setup", color: "#00F5D4" },
];

function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const dur = 1600;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      setVal(Math.round((1 - Math.pow(1 - t, 3)) * end));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, end]);

  return <span ref={ref}>{val}{suffix}</span>;
}

export function MetricsStrip() {
  return (
    <section className="py-8 border-y border-border bg-surface-raised/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {METRICS.map((m, i) => (
            <motion.div key={m.label}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
              className="text-center p-4">
              <div className="text-xl mb-2">{m.icon}</div>
              <div className="font-mono text-2xl font-bold mb-1" style={{ color: m.color }}>
                {typeof m.value === "number"
                  ? <Counter end={m.value} suffix={m.suffix} />
                  : m.value}
              </div>
              <div className="font-body text-xs font-medium text-ink-muted mb-1">{m.label}</div>
              <div className="font-mono text-[10px] text-ink-dim">{m.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
