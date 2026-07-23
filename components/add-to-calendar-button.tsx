"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { buildGoogleCalendarUrl, buildIcsContent } from "@/lib/ics";

export function AddToCalendarButton({
  tournament,
  className,
}: {
  tournament: {
    id: number;
    title: string;
    startsAt: string;
    description?: string | null;
  };
  className?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [menuOpen]);

  function downloadIcs(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const blob = new Blob([buildIcsContent(tournament)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tournament.title.replace(/[^\p{L}\p{N}]+/gu, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        aria-label="Добавить в календарь"
        title="Добавить в календарь"
        className={
          className ??
          "flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        }
      >
        <CalendarPlus className="h-4 w-4" />
      </button>

      {menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-20 mt-1 flex w-48 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 text-sm shadow-lg"
        >
          <a
            href={buildGoogleCalendarUrl(tournament)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="px-3 py-2 text-left hover:bg-[var(--surface-2)]"
          >
            Google Календарь
          </a>
          <button
            type="button"
            onClick={downloadIcs}
            className="px-3 py-2 text-left hover:bg-[var(--surface-2)]"
          >
            Скачать .ics (Apple/Outlook)
          </button>
        </div>
      )}
    </div>
  );
}
