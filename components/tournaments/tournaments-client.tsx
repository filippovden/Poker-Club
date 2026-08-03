"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, CalendarDays, Search } from "lucide-react";
import { TournamentCard } from "@/components/tournament-card";
import { Button } from "@/components/ui/button";
import { RevealGroup, RevealItem } from "@/components/reveal";
import { CalendarView } from "./calendar-view";
import { cn } from "@/lib/utils";
import type { Tournament } from "@/lib/db/schema";
import type { SeatAssignment } from "@/lib/db/seat-assignments";
import type { TournamentResultRow } from "@/lib/db/tournament-results";

const PAGE_SIZE = 12;
const FORMATS = ["NLH", "PLO", "MTT"] as const;
const STATUSES = [
  { value: "upcoming", label: "Предстоящие" },
  { value: "live", label: "Идут сейчас" },
  { value: "completed", label: "Завершённые" },
] as const;

export function TournamentsClient({
  tournaments,
  registrationCounts = {},
  seatAssignments = {},
  results = {},
}: {
  tournaments: Tournament[];
  registrationCounts?: Record<number, number>;
  seatAssignments?: Record<number, SeatAssignment[]>;
  results?: Record<number, TournamentResultRow[]>;
}) {
  const [format, setFormat] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      if (format && t.format !== format) return false;
      if (status && t.status !== status) return false;
      return true;
    });
  }, [tournaments, format, status]);

  // Reset how many are shown whenever the filters actually change — a
  // growing tournament history means `filtered` can get long, so the list
  // is paginated rather than rendered all at once.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filterKey, setFilterKey] = useState(`${format}:${status}`);
  const currentFilterKey = `${format}:${status}`;
  if (currentFilterKey !== filterKey) {
    setFilterKey(currentFilterKey);
    setVisibleCount(PAGE_SIZE);
  }
  const visible = filtered.slice(0, visibleCount);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Формат
            </span>
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(format === f ? null : f)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  format === f
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Статус
            </span>
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(status === s.value ? null : s.value)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  status === s.value
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1 rounded-full border border-[var(--border)] p-1">
          <button
            onClick={() => setView("list")}
            aria-label="Список"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              view === "list"
                ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                : "text-[var(--muted-foreground)]",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("calendar")}
            aria-label="Календарь"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              view === "calendar"
                ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                : "text-[var(--muted-foreground)]",
            )}
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] py-20 text-center">
          <Search className="h-6 w-6 text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--muted-foreground)]">
            Турниров с такими фильтрами не найдено.
          </p>
        </div>
      ) : view === "list" ? (
        <>
          <RevealGroup className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((t) => (
              <RevealItem key={t.id}>
                <TournamentCard
                  tournament={t}
                  registeredCount={registrationCounts[t.id]}
                  occupiedSeats={seatAssignments[t.id]}
                  results={results[t.id]}
                />
              </RevealItem>
            ))}
          </RevealGroup>
          {visibleCount < filtered.length && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                Показать ещё
              </Button>
            </div>
          )}
        </>
      ) : (
        <CalendarView
          tournaments={filtered}
          registrationCounts={registrationCounts}
          seatAssignments={seatAssignments}
          results={results}
        />
      )}
    </div>
  );
}
