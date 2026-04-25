"use client";
import { useEffect, useState } from "react";

type LineKind = "cmd" | "out" | "sep" | "risk" | "blank";
type Line = { kind: LineKind; text: string; delay: number; color?: string };

const LINES: Line[] = [
  { kind: "cmd",   text: "npx codemind",                                        delay: 0 },
  { kind: "out",   text: "✓ Indexed 12,847 nodes · 31,204 edges in 1.2s",      delay: 900,  color: "neon" },
  { kind: "out",   text: "  Local completeness: 74%",                           delay: 1200, color: "muted" },
  { kind: "blank", text: "",                                                     delay: 1700 },
  { kind: "cmd",   text: "codemind check src/auth/middleware.ts",               delay: 2100 },
  { kind: "sep",   text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",             delay: 2900 },
  { kind: "risk",  text: "Risk: HIGH",                                          delay: 3050 },
  { kind: "out",   text: "  38 dependents · 2 coverage gaps · 0.48s",          delay: 3550, color: "muted" },
  { kind: "sep",   text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",             delay: 3900 },
  { kind: "blank", text: "",                                                     delay: 4300 },
  { kind: "cmd",   text: "codemind see architecture.png",                       delay: 4600 },
  { kind: "out",   text: "  Accuracy: 58% · 2 phantoms · 3 missing",           delay: 5500, color: "solar" },
  { kind: "out",   text: "  ✓ Corrected diagram saved",                         delay: 5850, color: "neon" },
];

const COL = { neon: "#00F5D4", muted: "#7A7A9A", dim: "#3A3A5A", solar: "#FFB347", heat: "#FF6B6B" };

export function TerminalDemo() {
  const [shown, setShown] = useState<number[]>([]);
  const [barW, setBarW] = useState(0);

  useEffect(() => {
    let active = true;

    const run = () => {
      setShown([]);
      setBarW(0);
      const ts = LINES.map((line, i) =>
        setTimeout(() => {
          if (!active) return;
          setShown(prev => [...prev, i]);
          if (line.kind === "risk") setTimeout(() => active && setBarW(82), 250);
        }, line.delay)
      );
      return () => ts.forEach(clearTimeout);
    };

    let cleanup = run();
    const loop = setInterval(() => {
      cleanup();
      cleanup = run();
    }, 13000);

    return () => { active = false; cleanup(); clearInterval(loop); };
  }, []);

  return (
    <div className="hud-corner rounded-2xl overflow-hidden font-mono text-sm border border-border bg-[#06060E] shadow-card">
      {/* Titlebar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-surface border-b border-border">
        {[COL.heat, COL.solar, COL.neon].map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-full opacity-75" style={{ background: c }} />
        ))}
        <span className="ml-3 text-[11px] text-ink-dim flex-1 text-center">~/my-project — bash</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse-slow" />
          <span className="text-[10px] text-ink-dim">live</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 min-h-[340px] text-[12.5px] leading-[1.75]">
        {shown.length === 0 && (
          <div><span style={{ color: COL.neon }}>▸ </span><span className="text-ink cursor-blink" /></div>
        )}
        {LINES.map((line, i) => {
          if (!shown.includes(i)) return null;
          const col = line.color ? COL[line.color as keyof typeof COL] : undefined;
          const isLast = shown[shown.length - 1] === i;

          if (line.kind === "cmd") return (
            <div key={i} className="mb-0.5">
              <span style={{ color: COL.neon }}>▸ </span>
              <span className="text-ink">{line.text}</span>
              {isLast && <span style={{ color: "#4361EE" }} className="animate-blink ml-0.5">▋</span>}
            </div>
          );
          if (line.kind === "blank") return <div key={i} className="mb-2" />;
          if (line.kind === "sep") return (
            <div key={i} className="mb-0.5 text-[11px]" style={{ color: COL.dim }}>{line.text}</div>
          );
          if (line.kind === "risk") return (
            <div key={i} className="mb-2">
              <div className="mb-1">
                <span style={{ color: COL.solar }}>  Risk: </span>
                <span style={{ color: COL.heat, fontWeight: 600 }}>HIGH</span>
              </div>
              <div className="ml-4 h-1.5 w-44 bg-surface rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-solar to-heat transition-all duration-[1400ms] ease-out"
                  style={{ width: `${barW}%` }} />
              </div>
            </div>
          );
          return <div key={i} className="mb-0.5" style={{ color: col ?? COL.muted }}>{line.text}</div>;
        })}
      </div>
    </div>
  );
}
