"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoMark } from "./logo-mark";
import { SITE_CONTENT } from "@/lib/content";

const LINKS = [
  { href: "/tournaments", label: "Турниры" },
  { href: "/rating", label: "Рейтинг" },
  { href: "/news", label: "Новости" },
  { href: "/about", label: "О клубе" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[#0d0c0b]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${SITE_CONTENT.clubName} — главная`}>
          <LogoMark className="h-7 w-7 text-[var(--accent)]" />
          <span className="font-display text-lg font-semibold tracking-tight">{SITE_CONTENT.clubName}</span>
        </Link>
        <nav aria-label="Основное меню" className="hidden items-center gap-7 md:flex">
          {LINKS.map(link => <Link key={link.href} href={link.href} aria-current={pathname.startsWith(link.href) ? "page" : undefined}
            className={`text-sm font-medium transition-colors hover:text-[var(--accent)] ${pathname.startsWith(link.href) ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}`}>
            {link.label}
          </Link>)}
        </nav>
        <Link href="/registration/status" className="hidden rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-medium hover:border-[var(--accent)] hover:text-[var(--accent)] md:inline-flex">Моя заявка</Link>
        <button type="button" onClick={() => setOpen(v => !v)} aria-label={open ? "Закрыть меню" : "Открыть меню"} aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] md:hidden">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && <nav aria-label="Мобильное меню" className="border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4 md:hidden">
        {[...LINKS, { href: "/registration/status", label: "Моя заявка" }].map(link =>
          <Link key={link.href} href={link.href} className="block rounded-xl px-3 py-3 text-base font-medium hover:bg-[var(--surface-2)]">{link.label}</Link>)}
      </nav>}
    </header>
  );
}
