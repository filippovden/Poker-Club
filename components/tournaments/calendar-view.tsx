"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TournamentCard } from "@/components/tournament-card";
import { cn } from "@/lib/utils";
import type { Tournament } from "@/lib/db/schema";
import type { SeatAssignment } from "@/lib/db/seat-assignments";
import type { TournamentResultRow } from "@/lib/db/tournament-results";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function dayKey(date: Date) {
  // Local calendar day, not UTC — using toISOString() here shifted every
  // tournament by a day for users east of UTC (e.g. Moscow, UTC+3), since
  // local midnight for a calendar cell converts to the previous day in UTC.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CalendarView({
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
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, Tournament[]>();
    for (const t of tournaments) {
      const key = dayKey(new Date(t.startsAt));
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return map;
  }, [tournaments]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const result: (Date | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      result.push(new Date(year, month, d));
    }
    return result;
  }, [cursor]);

  const selectedTournaments = selectedDay ? byDay.get(selectedDay) ?? [] : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--surface-2)]"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-display text-lg font-medium">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </span>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] hover:bg-[var(--surface-2)]"
          aria-label="Следующий месяц"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--muted-foreground)]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2">
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = dayKey(date);
          const dayTournaments = byDay.get(key);
          const dayCount = dayTournaments?.length ?? 0;
          const isSelected = selectedDay === key;
          const isToday = key === dayKey(new Date());

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(isSelected ? null : key)}
              title={dayCount > 0 ? `Турниров в этот день: ${dayCount}` : undefined}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
                isSelected
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : isToday
                    ? "border border-[var(--accent)]/50 text-[var(--foreground)]"
                    : "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
              )}
            >
              {date.getDate()}
              {dayCount > 0 && (
                <span
                  className={cn(
                    "absolute bottom-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-semibold leading-none",
                    isSelected
                      ? "bg-[var(--accent-foreground)] text-[var(--accent)]"
                      : "bg-[var(--accent)] text-[var(--accent-foreground)]",
                  )}
                >
                  {dayCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedTournaments.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {selectedTournaments.map((t) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              registeredCount={registrationCounts[t.id]}
              occupiedSeats={seatAssignments[t.id]}
              results={results[t.id]}
            />
          ))}
        </div>
      )}
      {selectedDay && selectedTournaments.length === 0 && (
        <p className="mt-8 text-sm text-[var(--muted-foreground)]">
          В этот день турниров нет.
        </p>
      )}
    </div>
  );
}
