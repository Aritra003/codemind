import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)]"
      style={{ padding: "28px 48px" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="StinKit" width={28} height={28} className="rounded-[8px]" />
            <span className="font-[800] text-[var(--ink-primary)]" style={{ fontSize: "15px" }}>StinKit</span>
          </div>

          {/* Center copyright */}
          <p style={{ fontSize: "14px", color: "var(--ink-tertiary)" }}>
            © 2026 Atnia Solutions Pvt Limited
          </p>

          {/* Right links */}
          <div className="flex items-center gap-5">
            <a href="https://github.com/Aritra003/stinkit" target="_blank" rel="noreferrer"
              className="hover:text-[var(--ink-secondary)] transition-colors"
              style={{ fontSize: "14px", color: "var(--ink-tertiary)" }}>
              GitHub ↗
            </a>
            <Link href="/login"
              className="hover:text-[var(--ink-secondary)] transition-colors"
              style={{ fontSize: "14px", color: "var(--ink-tertiary)" }}>
              Log in
            </Link>
            <span style={{ fontSize: "14px", color: "var(--ink-muted)" }}>MIT License</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
