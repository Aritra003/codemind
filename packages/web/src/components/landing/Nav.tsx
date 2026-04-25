"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Agents", href: "/#agents" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
      scrolled ? "glass-nav" : "bg-transparent"
    )}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-brand-glow/40">
            <span className="font-mono font-bold text-white text-sm select-none">C</span>
          </div>
          <span className="font-display font-bold text-ink text-lg">CodeMind</span>
          <span className="font-mono text-[10px] text-brand bg-brand/10 px-2 py-0.5 rounded-full hidden sm:block border border-brand/20">v5.0</span>
        </Link>

        <div className="hidden md:flex items-center gap-0.5">
          {navLinks.map(l => (
            <a key={l.href} href={l.href}
              className="px-4 py-2 text-sm font-body text-ink-muted hover:text-ink rounded-lg hover:bg-surface-raised transition-all duration-200">
              {l.label}
            </a>
          ))}
          <a href="https://github.com/Aritra003/codemind" target="_blank" rel="noreferrer"
            className="px-4 py-2 text-sm font-body text-ink-muted hover:text-ink rounded-lg hover:bg-surface-raised transition-all duration-200">
            GitHub ↗
          </a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-body text-ink-muted hover:text-ink transition-colors">
            Log in
          </Link>
          <Link href="/signup"
            className="px-5 py-2 text-sm font-body font-semibold text-white bg-brand hover:bg-brand/90 rounded-xl transition-all duration-200 shadow-sm hover:shadow-brand-glow/60">
            Get started →
          </Link>
        </div>

        <button onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg hover:bg-surface-raised text-ink-muted hover:text-ink transition-colors">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
            className="md:hidden glass-nav border-t border-border overflow-hidden">
            <div className="px-4 pb-4 pt-2 flex flex-col gap-1">
              {navLinks.map(l => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                  className="px-4 py-3 text-sm font-body text-ink-muted hover:text-ink rounded-lg hover:bg-surface-raised transition-all">
                  {l.label}
                </a>
              ))}
              <hr className="border-border my-1" />
              <Link href="/login" onClick={() => setOpen(false)}
                className="px-4 py-3 text-sm font-body text-ink-muted text-center">Log in</Link>
              <Link href="/signup" onClick={() => setOpen(false)}
                className="px-4 py-3 text-sm font-semibold text-white bg-brand rounded-xl text-center">Get started →</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
