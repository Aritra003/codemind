"use client";
import { useEffect, useState } from "react";

type LineKind = "cmd" | "out" | "sep" | "risk" | "blank";
type Line = { kind: LineKind; text: string; delay: number; color?: string };

const LINES: Line[] = [
  { kind: "cmd",   text: "npx stinkit",                                        delay: 0 },
  { kind: "out",   text: "✓ Indexed 12,847 nodes · 31,204 edges in 1.2s",      delay: 900,  color: "green" },
  { kind: "out",   text: "  Local completeness: 74%",                           delay: 1200, color: "muted" },
  { kind: "blank", text: "",                                                     delay: 1700 },
  { kind: "cmd",   text: "stinkit check src/auth/middleware.ts",                delay: 2100 },
  { kind: "sep",   text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",             delay: 2900 },
  { kind: "risk",  text: "Risk: HIGH",                                           delay: 3050 },
  { kind: "out",   text: "  38 dependents · 2 coverage gaps · 0.48s",           delay: 3550, color: "muted" },
  { kind: "sep",   text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",             delay: 3900 },
  { kind: "blank", text: "",                                                     delay: 4300 },
  { kind: "cmd",   text: "stinkit see architecture.png",                        delay: 4600 },
  { kind: "out",   text: "  Accuracy: 58% · 2 phantoms · 3 missing",            delay: 5500, color: "orange" },
  { kind: "out",   text: "  ✓ Corrected diagram saved",                          delay: 5850, color: "green" },
];

const C = {
  green:  "var(--green)",
  muted:  "var(--ink-tertiary)",
  dim:    "var(--border-default)",
  orange: "var(--orange)",
  red:    "var(--red)",
  accent: "var(--accent)",
};

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
    <div className="hud-corner rounded-[20px] overflow-hidden font-mono border border-[var(--border-subtle)] bg-[var(--bg-void)] shadow-card">
      {/* Titlebar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-base)] border-b border-[var(--border-subtle)]">
        {[C.red, C.orange, C.green].map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-full opacity-75" style={{ background: c }} />
        ))}
        <span className="ml-3 text-[14px] text-[var(--ink-tertiary)] flex-1 text-center">
          ~/my-project — bash
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse-slow" />
          <span className="text-[13px] text-[var(--ink-tertiary)]">live</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 min-h-[340px] leading-[1.8]" style={{ fontSize: "15px" }}>
        {shown.length === 0 && (
          <div>
            <span style={{ color: C.green }}>▸ </span>
            <span style={{ color: "var(--ink-primary)" }} className="cursor-blink" />
          </div>
        )}
        {LINES.map((line, i) => {
          if (!shown.includes(i)) return null;
          const col = line.color ? C[line.color as keyof typeof C] : undefined;
          const isLast = shown[shown.length - 1] === i;

          if (line.kind === "cmd") return (
            <div key={i} className="mb-0.5">
              <span style={{ color: C.green }}>▸ </span>
              <span style={{ color: "var(--ink-primary)" }}>{line.text}</span>
              {isLast && <span style={{ color: C.accent }} className="animate-blink ml-0.5">▋</span>}
            </div>
          );
          if (line.kind === "blank") return <div key={i} className="mb-2" />;
          if (line.kind === "sep") return (
            <div key={i} className="mb-0.5" style={{ fontSize: "13px", color: C.dim }}>{line.text}</div>
          );
          if (line.kind === "risk") return (
            <div key={i} className="mb-2">
              <div className="mb-1.5">
                <span style={{ color: C.orange }}>  Risk: </span>
                <span style={{ color: C.red, fontWeight: 700 }}>HIGH</span>
              </div>
              <div className="ml-4 h-2 w-44 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-[1400ms] ease-out"
                  style={{ width: `${barW}%`, background: "linear-gradient(90deg, var(--orange), var(--red))" }} />
              </div>
            </div>
          );
          return <div key={i} className="mb-0.5" style={{ color: col ?? C.muted }}>{line.text}</div>;
        })}
      </div>
    </div>
  );
}
