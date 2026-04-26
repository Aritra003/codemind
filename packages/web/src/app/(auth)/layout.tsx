import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[--bg] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-dot-grid bg-dot-grid opacity-60 pointer-events-none" aria-hidden />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-brand/5 rounded-full blur-[80px] pointer-events-none" aria-hidden />

      {/* Nav strip */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-accent flex items-center justify-center">
            <span className="font-mono font-bold text-white text-sm">C</span>
          </div>
          <span className="font-display font-bold text-ink text-lg">StinKit</span>
        </Link>
        <Link href="/" className="text-xs font-body text-ink-dim hover:text-ink-muted transition-colors">
          ← Back to home
        </Link>
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
