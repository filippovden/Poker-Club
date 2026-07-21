"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { LogoMark } from "./logo-mark";
import { ThemeToggle } from "./theme-toggle";
import { SoundToggle } from "./sound-toggle";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/tournaments", label: "Турниры" },
  { href: "/news", label: "Новости" },
  { href: "/about", label: "О клубе" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (open) setOpen(false);
  }

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between px-4 transition-all duration-500 sm:px-6",
          scrolled
            ? "mt-3 rounded-full border border-[var(--border)] bg-[var(--surface)]/70 py-2.5 px-5 backdrop-blur-xl shadow-lg shadow-black/20"
            : "mt-0 py-5",
        )}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="h-6 w-6 text-[var(--foreground)]" />
          <span className="font-display text-sm font-medium tracking-tight">
            Lockdown Poker
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]",
                pathname.startsWith(link.href) && "text-[var(--foreground)]",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <SoundToggle />
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)] md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mx-4 mt-2 flex flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl md:hidden"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-1 flex items-center justify-between px-4 py-1 sm:hidden">
              <span className="text-xs text-[var(--muted-foreground)]">Тема и звук</span>
              <div className="flex gap-2">
                <SoundToggle />
                <ThemeToggle />
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
