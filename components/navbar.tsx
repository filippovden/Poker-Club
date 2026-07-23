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
import { SITE_CONTENT } from "@/lib/content";

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
            ? "mt-3 rounded-full border border-white/15 bg-[#18140f]/85 py-2.5 px-5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.07)] backdrop-blur-xl"
            : "mt-0 bg-gradient-to-b from-black/55 via-black/15 to-transparent py-5",
        )}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="h-6 w-6 text-white" />
          <span className="font-display text-sm font-medium tracking-tight text-white">
            {SITE_CONTENT.clubName}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium text-white/70 transition-colors hover:text-white",
                pathname.startsWith(link.href) && "text-white",
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
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 md:hidden"
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
            className="mx-4 mt-2 flex flex-col gap-1 rounded-2xl border border-white/15 bg-[#18140f]/95 p-3 shadow-[0_20px_40px_-8px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.07)] backdrop-blur-xl md:hidden"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-1 flex items-center justify-between px-4 py-1 sm:hidden">
              <span className="text-xs text-white/50">Тема и звук</span>
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
