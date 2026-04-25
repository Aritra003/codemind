import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}…` : str;
}

export function riskColor(level: string): string {
  const map: Record<string, string> = {
    CRITICAL: "var(--heat)",
    HIGH:     "var(--heat)",
    MEDIUM:   "var(--solar)",
    LOW:      "var(--neon)",
  };
  return map[level] ?? "var(--ink-muted)";
}

export function riskBg(level: string): string {
  const map: Record<string, string> = {
    CRITICAL: "var(--heat-dim)",
    HIGH:     "var(--heat-dim)",
    MEDIUM:   "var(--solar-dim)",
    LOW:      "var(--neon-dim)",
  };
  return map[level] ?? "var(--brand-dim)";
}
