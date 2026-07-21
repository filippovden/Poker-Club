import Link from "next/link";
import { LogoMark } from "./logo-mark";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-6 w-6 text-[var(--foreground)]" />
          <span className="font-display text-sm font-medium">Lockdown Poker</span>
        </div>

        <nav className="flex flex-wrap gap-6 text-sm text-[var(--muted-foreground)]">
          <Link href="/tournaments" className="hover:text-[var(--foreground)]">
            Турниры
          </Link>
          <Link href="/news" className="hover:text-[var(--foreground)]">
            Новости
          </Link>
          <Link href="/about" className="hover:text-[var(--foreground)]">
            О клубе
          </Link>
          <a href="mailto:info@lockdownpoker.club" className="hover:text-[var(--foreground)]">
            info@lockdownpoker.club
          </a>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted-foreground)]">
          <span>© {year} Lockdown Poker. Только 18+.</span>
          <div className="flex gap-6">
            <Link href="/legal" className="hover:text-[var(--foreground)]">
              Правовая информация
            </Link>
            <Link href="/admin/login" className="hover:text-[var(--foreground)]">
              Панель организатора
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
