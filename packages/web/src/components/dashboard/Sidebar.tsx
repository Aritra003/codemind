"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Zap, Network, GitBranch, Key, Settings,
  LogOut, Menu, X, FileText, Eye, Keyboard, MessageSquare,
  ListOrdered, GitFork, ChevronRight,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

const NAV_PRIMARY = [
  { href: "/dashboard",          label: "Overview",  Icon: LayoutDashboard },
  { href: "/dashboard/check",    label: "Check",     Icon: Zap             },
  { href: "/dashboard/ask",      label: "Ask",       Icon: MessageSquare   },
  { href: "/dashboard/plan",     label: "Plan",      Icon: ListOrdered     },
];

const NAV_EXPLORE = [
  { href: "/dashboard/repos",    label: "Repos",     Icon: GitBranch       },
  { href: "/dashboard/graph",    label: "Graph",     Icon: Network         },
  { href: "/dashboard/diagram",  label: "Diagram",   Icon: GitFork         },
  { href: "/dashboard/see",      label: "See",       Icon: Eye             },
  { href: "/dashboard/reports",  label: "Reports",   Icon: FileText        },
];

const NAV_SYSTEM = [
  { href: "/dashboard/settings", label: "Settings",  Icon: Settings        },
  { href: "/dashboard/apikeys",  label: "API Keys",  Icon: Key             },
];

const SHORTCUTS = [
  { keys: "g h", label: "Overview"   },
  { keys: "g c", label: "Check"      },
  { keys: "g a", label: "Ask"        },
  { keys: "g p", label: "Plan"       },
  { keys: "g r", label: "Repos"      },
  { keys: "g g", label: "Graph"      },
  { keys: "g d", label: "Diagram"    },
  { keys: "g s", label: "Settings"   },
  { keys: "?",   label: "Shortcuts"  },
];

function NavSection({ label, items }: { label?: string; items: typeof NAV_PRIMARY }) {
  const path = usePathname();
  return (
    <div className="mb-1">
      {label && (
        <p className="font-mono text-[10px] text-ink-dim uppercase tracking-widest px-3 mb-1.5 mt-3">{label}</p>
      )}
      {items.map(({ href, label: itemLabel, Icon }) => {
        const active = path === href || (href !== "/dashboard" && path.startsWith(href));
        return (
          <Link key={href} href={href}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2 text-sm font-body font-medium transition-all duration-150 rounded-r-lg mx-1",
              active
                ? "nav-active-bar text-ink bg-brand/8 pl-4"
                : "text-ink-muted hover:text-ink hover:bg-surface-raised"
            )}>
            <Icon size={14} className="flex-shrink-0" />
            <span>{itemLabel}</span>
            {active && <ChevronRight size={10} className="ml-auto text-brand opacity-60" />}
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar({ user }: { user: { name?: string | null; email?: string | null; image?: string | null } }) {
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const router      = useRouter();
  const pendingKey  = useRef<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?") { setShowShortcuts(s => !s); return; }
      if (e.key === "Escape") { setShowShortcuts(false); return; }
      if (e.key === "g" && !pendingKey.current) {
        pendingKey.current = "g";
        setTimeout(() => { pendingKey.current = null; }, 800);
        return;
      }
      if (pendingKey.current === "g") {
        const map: Record<string, string> = {
          h: "/dashboard", r: "/dashboard/repos", c: "/dashboard/check",
          g: "/dashboard/graph", d: "/dashboard/diagram", s: "/dashboard/settings",
          a: "/dashboard/ask", p: "/dashboard/plan",
        };
        if (map[e.key]) router.push(map[e.key]!);
        pendingKey.current = null;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #5B6EFF 0%, #00E5FF 100%)" }}>
          <span className="font-mono font-black text-white text-xs tracking-tight">CM</span>
        </div>
        <span className="font-display font-bold text-ink text-sm tracking-tight">CodeMind</span>
        <span className="font-mono text-[9px] text-brand bg-brand/10 px-1.5 py-0.5 rounded border border-brand/20 ml-auto tracking-wider">v6</span>
      </div>

      {/* Nav ────────────────────────────────────────────────────── */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <NavSection items={NAV_PRIMARY} />
        <NavSection label="Explore" items={NAV_EXPLORE} />
        <NavSection label="System"  items={NAV_SYSTEM}  />
      </nav>

      {/* User ───────────────────────────────────────────────────── */}
      <div className="border-t border-border p-2.5">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-0.5 rounded-lg">
          {user.image
            ? <img src={user.image} alt="" className="w-6 h-6 rounded-full flex-shrink-0 ring-1 ring-brand/30" />
            : <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ring-1 ring-brand/30"
                style={{ background: "linear-gradient(135deg, #5B6EFF, #00E5FF)", color: "#fff" }}>
                {(user.name ?? user.email ?? "U")[0]!.toUpperCase()}
              </div>
          }
          <div className="min-w-0 flex-1">
            <p className="text-xs font-body font-medium text-ink truncate leading-none mb-0.5">{user.name ?? "User"}</p>
            <p className="text-[10px] font-body text-ink-dim truncate leading-none">{user.email}</p>
          </div>
        </div>

        <button onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-body text-ink-muted hover:text-heat hover:bg-heat/8 transition-all duration-150">
          <LogOut size={13} /> Sign out
        </button>
        <button onClick={() => setShowShortcuts(s => !s)}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-mono text-ink-dim hover:text-ink-muted hover:bg-surface-raised transition-all duration-150">
          <Keyboard size={11} />
          <span>Shortcuts</span>
          <kbd className="ml-auto font-mono text-[9px] bg-surface-raised border border-border rounded px-1 py-0.5">?</kbd>
        </button>
      </div>
    </div>
  );

  const shortcutsModal = showShortcuts && (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-surface border border-border rounded-xl p-5 w-64 shadow-overlay"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] text-ink-muted uppercase tracking-widest">Shortcuts</span>
          <button onClick={() => setShowShortcuts(false)} className="text-ink-dim hover:text-ink">
            <X size={12} />
          </button>
        </div>
        <div className="space-y-1.5">
          {SHORTCUTS.map(s => (
            <div key={s.keys} className="flex items-center justify-between py-0.5">
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
      <button onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-surface border border-border rounded-lg text-ink-muted hover:text-ink transition-colors">
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <aside className="hidden lg:flex flex-col w-56 bg-surface border-r border-border h-screen sticky top-0 overflow-hidden">
        {content}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-surface border-r border-border"
            onClick={e => e.stopPropagation()}>
            {content}
          </aside>
        </div>
      )}

      {shortcutsModal}
    </>
  );
}
