import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-accent flex items-center justify-center">
              <span className="font-mono font-bold text-white text-xs">C</span>
            </div>
            <span className="font-display font-bold text-ink">CodeMind</span>
            <span className="text-ink-dim text-xs font-body hidden sm:block">· by Atnia Solutions Pvt Limited</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-body text-ink-dim">
            <a href="https://github.com/Aritra003/codemind" target="_blank" rel="noreferrer"
              className="hover:text-ink-muted transition-colors">GitHub ↗</a>
            <Link href="/dashboard" className="hover:text-ink-muted transition-colors">Dashboard</Link>
            <Link href="/login" className="hover:text-ink-muted transition-colors">Log in</Link>
            <Link href="/signup" className="hover:text-ink-muted transition-colors">Sign up</Link>
          </div>

          <p className="text-xs font-body text-ink-dim text-center sm:text-right">
            © 2026 Atnia Solutions Pvt Limited · MIT License
          </p>
        </div>
      </div>
    </footer>
  );
}
