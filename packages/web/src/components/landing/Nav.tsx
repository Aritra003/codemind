"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Features",     href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Agents",       href: "/#agents" },
  { label: "Pricing",      href: "/#pricing" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
      scrolled
        ? "bg-[var(--bg-void)]/90 backdrop-blur-[20px] border-b border-[var(--border-subtle)]"
        : "bg-transparent"
    )}>
      <nav className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <Image src="/logo.svg" alt="StinKit" width={36} height={36} className="rounded-[10px]" />
          <span className="font-display font-[800] text-[var(--ink-primary)] text-[22px] leading-none tracking-tight">
            StinKit
          </span>
          <span className="hidden sm:block text-[13px] font-[600] text-[var(--accent)] bg-[var(--accent-glow)] px-2 py-0.5 rounded-full border border-[var(--accent)]/20">
            v5.0
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5">
          {navLinks.map(l => (
            <a key={l.href} href={l.href}
              className="px-4 py-2 text-[15px] font-[500] text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] rounded-[10px] hover:bg-[var(--bg-elevated)] transition-all duration-150">
              {l.label}
            </a>
          ))}
          <a href="https://github.com/Aritra003/stinkit" target="_blank" rel="noreferrer"
            className="px-4 py-2 text-[15px] font-[500] text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] rounded-[10px] hover:bg-[var(--bg-elevated)] transition-all duration-150">
            GitHub ↗
          </a>
        </div>

        {/* CTA buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login"
            className="px-4 py-2 text-[15px] font-[500] text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors">
            Log in
          </Link>
          <Link href="/signup"
            className="px-5 h-[48px] flex items-center text-[15px] font-[600] text-white rounded-[12px] transition-all duration-200 hover:opacity-90 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(99,102,241,0.35)]"
            style={{ background: "var(--grad-brand)" }}>
            Get started →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-[10px] hover:bg-[var(--bg-elevated)] text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] transition-colors min-h-0">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="md:hidden bg-[var(--bg-base)] border-t border-[var(--border-subtle)] overflow-hidden">
            <div className="px-4 pb-4 pt-2 flex flex-col gap-1">
              {navLinks.map(l => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                  className="px-4 py-3 text-[15px] font-[500] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] rounded-[10px] hover:bg-[var(--bg-elevated)] transition-all">
                  {l.label}
                </a>
              ))}
              <hr className="border-[var(--border-subtle)] my-1" />
              <Link href="/login" onClick={() => setOpen(false)}
                className="px-4 py-3 text-[15px] text-[var(--ink-secondary)] text-center">
                Log in
              </Link>
              <Link href="/signup" onClick={() => setOpen(false)}
                className="px-4 py-3 text-[15px] font-[600] text-white rounded-[12px] text-center"
                style={{ background: "var(--grad-brand)" }}>
                Get started →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
