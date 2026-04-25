"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Zap, Network, GitBranch, Key, Settings, LogOut, Menu, X, FileText, Eye, Keyboard, MessageSquare, ListOrdered, GitFork } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

const NAV = [
  { href: "/dashboard",          label: "Overview",  Icon: LayoutDashboard },
  { href: "/dashboard/check",    label: "Check",     Icon: Zap },
  { href: "/dashboard/ask",      label: "Ask",       Icon: MessageSquare },
  { href: "/dashboard/plan",     label: "Plan",      Icon: ListOrdered },
  { href: "/dashboard/repos",    label: "Repos",     Icon: GitBranch },
  { href: "/dashboard/graph",    label: "Graph",     Icon: Network },
  { href: "/dashboard/diagram",  label: "Diagram",   Icon: GitFork },
  { href: "/dashboard/see",      label: "See",       Icon: Eye },
  { href: "/dashboard/reports",  label: "Reports",   Icon: FileText },
  { href: "/dashboard/settings", label: "Settings",  Icon: Settings },
  { href: "/dashboard/apikeys",  label: "API Keys",  Icon: Key },
];

function NavItem({ href, label, Icon }: { href: string; label: string; Icon: React.ElementType }) {
  const path = usePathname();
  const active = path === href || (href !== "/dashboard" && path.startsWith(href));
  return (
    <Link href={href} className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-200",
      active
        ? "bg-brand/12 text-brand border border-brand/20"
        : "text-ink-muted hover:text-ink hover:bg-surface-raised"
    )}>
      <Icon size={16} className="flex-shrink-0" />
      {label}
    </Link>
  );
}

const SHORTCUTS = [
  { keys: "g h", label: "Go to Overview" },
  { keys: "g c", label: "Go to Check" },
  { keys: "g a", label: "Go to Ask" },
  { keys: "g p", label: "Go to Plan" },
  { keys: "g r", label: "Go to Repos" },
  { keys: "g g", label: "Go to Graph" },
  { keys: "g d", label: "Go to Diagram" },
  { keys: "g s", label: "Go to Settings" },
  { keys: "?",   label: "Toggle shortcuts" },
];

export function Sidebar({ user }: { user: { name?: string | null; email?: string | null; image?: string | null } }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const router = useRouter();
  const pendingKey = useRef<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?") { setShowShortcuts(s => !s); return; }
      if (e.key === "Escape") { setShowShortcuts(false); return; }
      if (e.key === "g" && !pendingKey.current) { pendingKey.current = "g"; setTimeout(() => { pendingKey.current = null; }, 800); return; }
      if (pendingKey.current === "g") {
        const map: Record<string, string> = { h: "/dashboard", r: "/dashboard/repos", c: "/dashboard/check", g: "/dashboard/graph", d: "/dashboard/diagram", s: "/dashboard/settings", a: "/dashboard/ask", p: "/dashboard/plan" };
        if (map[e.key]) { router.push(map[e.key]!); }
        pendingKey.current = null;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-accent flex items-center justify-center flex-shrink-0">
          <span className="font-mono font-bold text-white text-sm">C</span>
        </div>
        <span className="font-display font-bold text-ink">CodeMind</span>
        <span className="font-mono text-[10px] text-brand bg-brand/10 px-1.5 py-0.5 rounded border border-brand/20 ml-auto">v5</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(item => <NavItem key={item.href} {...item} />)}
      </nav>

      {/* User + logout */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
          {user.image
            ? <img src={user.image} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
            : <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold flex-shrink-0">
                {(user.name ?? user.email ?? "U")[0].toUpperCase()}
              </div>}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-body font-medium text-ink truncate">{user.name ?? "User"}</p>
            <p className="text-[10px] font-body text-ink-dim truncate">{user.email}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-ink-muted hover:text-heat hover:bg-heat/8 transition-all duration-200">
          <LogOut size={15} /> Sign out
        </button>
        <button onClick={() => setShowShortcuts(s => !s)}
          className="w-full flex items-center gap-3 px-3 py-1.5 rounded-xl text-xs font-mono text-ink-dim hover:text-ink hover:bg-surface-raised transition-all duration-200">
          <Keyboard size={12} /> Shortcuts <span className="ml-auto opacity-50">?</span>
        </button>
      </div>
    </div>
  );

  const shortcutsModal = showShortcuts && (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-surface border border-border rounded-2xl p-6 w-72 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-xs text-ink-muted">KEYBOARD SHORTCUTS</p>
          <button onClick={() => setShowShortcuts(false)} className="text-ink-dim hover:text-ink"><X size={13} /></button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.keys} className="flex items-center justify-between">
              <span className="font-body text-xs text-ink-muted">{s.label}</span>
              <kbd className="font-mono text-[10px] bg-surface-raised border border-border rounded px-2 py-0.5 text-ink">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass rounded-lg text-ink-muted hover:text-ink transition-colors">
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-surface border-r border-border h-screen sticky top-0 overflow-y-auto">
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-surface border-r border-border" onClick={e => e.stopPropagation()}>
            {content}
          </aside>
        </div>
      )}

      {shortcutsModal}
    </>
  );
}
