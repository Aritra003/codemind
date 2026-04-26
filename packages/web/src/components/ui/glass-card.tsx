"use client";

import { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = { sm: "p-4", md: "p-6", lg: "p-7" };

export function GlassCard({
  children,
  className = "",
  hover = true,
  glow,
  padding = "lg",
  style,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={[
        "bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-subtle)]",
        "rounded-[20px] transition-all duration-300 ease-out",
        paddingMap[padding],
        hover
          ? "hover:bg-[var(--bg-glass-hover)] hover:border-[var(--border-hover)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={glow ? { boxShadow: `0 0 40px ${glow}`, ...style } : style}
      {...props}
    >
      {children}
    </div>
  );
}
