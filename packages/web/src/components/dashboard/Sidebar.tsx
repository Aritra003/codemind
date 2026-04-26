"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Zap, Network, GitBranch, Key, Settings,
  LogOut, Menu, X, FileText, Eye, Keyboard, MessageSquare,
  ListOrdered, GitFork,
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
  { keys: "g h", label: "Overview"  },
  { keys: "g c", label: "Check"     },
  { keys: "g a", label: "Ask"       },
  { keys: "g p", label: "Plan"      },
  { keys: "g r", label: "Repos"     },
  { keys: "g g", label: "Graph"     },
  { keys: "g d", label: "Diagram"   },
  { keys: "g s", label: "Settings"  },
  { keys: "?",   label: "Shortcuts" },
];

function NavSection({ label, items }: { label?: string; items: typeof NAV_PRIMARY }) {
  const path = usePathname();
  return (
    <div className="mb-1">
      {label && (
        <p className="font-mono font-[600] uppercase tracking-[3px] px-4 mb-2 mt-6"
          style={{ fontSize: "11px", color: "var(--ink-muted)", letterSpacing: "3px" }}>
          {label}
        </p>
      )}
      {items.map(({ href, label: itemLabel, Icon }) => {
        const active = path === href || (href !== "/dashboard" && path.startsWith(href));
        return (
          <Link key={href} href={href}
            className={cn(
              "relative flex items-center gap-3 mx-2 rounded-[10px] transition-all duration-150",
              active
                ? "nav-active-bar bg-[var(--bg-elevated)] text-[var(--ink-primary)]"
                : "text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)]"
            )}
            style={{ height: "44px", padding: "0 16px", fontSize: "15px", fontWeight: 500 }}>
            <Icon size={18} className="flex-shrink-0" style={{ color: "inherit" }} />
            <span>{itemLabel}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar({ user }: { user: { name?: string | null; email?: string | null; image?: string | null } }) {
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const router     = useRouter();
  const pendingKey = useRef<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?") { setShowShortcuts(s => !s); return; }
      if (e.key === "Escape") { setShowShortcuts(false); setMobileOpen(false); return; }
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
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 border-b border-[var(--border-subtle)]"
        style={{ height: "64px", minHeight: "64px" }}>
        <Image src="/logo.svg" alt="StinKit" width={32} height={32} className="rounded-[8px] flex-shrink-0" />
        <span className="font-[800] text-[var(--ink-primary)] tracking-tight" style={{ fontSize: "20px" }}>
          StinKit
        </span>
        <span className="ml-auto font-[600] text-[var(--accent)] bg-[var(--accent-glow)] rounded-full px-2 py-0.5 border border-[var(--accent)]/20"
          style={{ fontSize: "11px" }}>
          v5.0
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <NavSection items={NAV_PRIMARY} />
        <NavSection label="Explore" items={NAV_EXPLORE} />
        <NavSection label="System"  items={NAV_SYSTEM}  />
      </nav>

      {/* User area */}
      <div className="border-t border-[var(--border-subtle)] p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-[10px] mb-1">
          {user.image
            ? <img src={user.image} alt="" className="w-9 h-9 rounded-full flex-shrink-0 ring-1 ring-[var(--accent)]/30" />
            : <div className="w-9 h-9 rounded-full flex items-center justify-center font-[700] flex-shrink-0 ring-1 ring-[var(--accent)]/30"
                style={{ background: "var(--grad-brand)", color: "#fff", fontSize: "14px" }}>
                {(user.name ?? user.email ?? "U")[0]!.toUpperCase()}
              </div>
          }
          <div className="min-w-0 flex-1">
            <p className="font-[600] text-[var(--ink-primary)] truncate leading-none mb-0.5"
              style={{ fontSize: "15px" }}>{user.name ?? "User"}</p>
            <p className="text-[var(--ink-tertiary)] truncate leading-none"
              style={{ fontSize: "13px" }}>{user.email}</p>
          </div>
        </div>

        <button onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2.5 px-3 rounded-[8px] text-[var(--ink-tertiary)] hover:text-[var(--red)] hover:bg-[var(--red)]/8 transition-all duration-150 min-h-0"
          style={{ height: "36px", fontSize: "14px", fontWeight: 500 }}>
          <LogOut size={15} /> Sign out
        </button>
        <button onClick={() => setShowShortcuts(s => !s)}
          className="w-full flex items-center gap-2.5 px-3 rounded-[8px] text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] transition-all duration-150 min-h-0"
          style={{ height: "36px", fontSize: "14px", fontWeight: 500 }}>
          <Keyboard size={14} />
          <span>Shortcuts</span>
          <kbd className="ml-auto font-mono bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5"
            style={{ fontSize: "12px" }}>?</kbd>
        </button>
      </div>
    </div>
  );

  const shortcutsModal = showShortcuts && (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative rounded-[20px] p-5 w-72 shadow-overlay border border-[var(--border-default)] bg-[var(--bg-surface)]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono font-[600] uppercase tracking-[3px] text-[var(--ink-muted)]"
            style={{ fontSize: "11px" }}>Shortcuts</span>
          <button onClick={() => setShowShortcuts(false)}
            className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] min-h-0 p-1">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-1.5">
          {SHORTCUTS.map(s => (
            <div key={s.keys} className="flex items-center justify-between py-1">
              <span style={{ fontSize: "15px", color: "var(--ink-secondary)" }}>{s.label}</span>
              <kbd className="font-mono bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded px-2 py-0.5 text-[var(--ink-primary)]"
                style={{ fontSize: "13px" }}>{s.keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors min-h-0">
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col bg-[var(--bg-base)] border-r border-[var(--border-subtle)] h-screen sticky top-0 overflow-hidden"
        style={{ width: "248px" }}>
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 bottom-0 bg-[var(--bg-base)] border-r border-[var(--border-subtle)]"
            style={{ width: "248px" }}
            onClick={e => e.stopPropagation()}>
            {content}
          </aside>
        </div>
      )}

      {shortcutsModal}
    </>
  );
}
