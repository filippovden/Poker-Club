"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RegistrationDialog } from "@/components/tournaments/registration-dialog";
import { SeatingGrid } from "@/components/tournaments/seating-grid";
import { ShareButton } from "@/components/share-button";
import { AddToCalendarButton } from "@/components/add-to-calendar-button";
import { SITE_CONTENT } from "@/lib/content";
import type { Tournament } from "@/lib/db/schema";
import type { SeatAssignment } from "@/lib/db/seat-assignments";
import type { TournamentResultRow } from "@/lib/db/tournament-results";

const FORMAT_LABELS: Record<string, string> = {
  NLH: "No-Limit Hold'em",
  PLO: "Pot-Limit Omaha",
  MTT: "Многостоловый турнир",
};

const PLACE_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const STATUS_LABELS: Record<Tournament["status"], string> = {
  upcoming: "Скоро",
  live: "Идёт сейчас",
  completed: "Завершён",
};

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  // Fixed to the venue's own timezone — without this, the server (SSR) and
  // each visitor's browser (hydration) can disagree on the local offset,
  // producing a hydration mismatch and, worse, showing out-of-town visitors
  // their own local time instead of the actual time in Тольятти.
  return date.toLocaleString("ru-RU", {
    timeZone: "Europe/Samara",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TournamentCard({
  tournament,
  registeredCount = 0,
  occupiedSeats = [],
  results = [],
}: {
  tournament: Tournament;
  registeredCount?: number;
  occupiedSeats?: SeatAssignment[];
  results?: TournamentResultRow[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [seatsOpen, setSeatsOpen] = useState(false);
  const isPast = tournament.status === "completed";
  const hasResults = results.length > 0;
  const spotsLeft =
    tournament.maxPlayers != null ? tournament.maxPlayers - registeredCount : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const hasTables = tournament.tableCount != null && tournament.seatsPerTable != null;

  return (
    <div
      className={`group relative flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md transition-all duration-300 hover:border-[var(--accent)]/40 hover:-translate-y-0.5 ${isPast && !hasResults ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <Badge variant={tournament.status === "live" ? "live" : "default"}>
          {tournament.status === "live" && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          )}
          {STATUS_LABELS[tournament.status]}
        </Badge>
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--muted-foreground)]">
            {formatDate(tournament.startsAt)}
          </span>
          {!isPast && (
            <AddToCalendarButton
              tournament={tournament}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            />
          )}
          <ShareButton
            title={`${tournament.title} — ${SITE_CONTENT.clubName}`}
            url="/tournaments"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          />
        </div>
      </div>

      <div>
        <h3 className="font-display text-xl font-medium tracking-tight">
          {tournament.title}
        </h3>
        {tournament.description && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {tournament.description}
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4 text-sm">
        <span className="font-medium">
          {tournament.buyIn ? `${tournament.buyIn.toLocaleString("ru-RU")} ₽` : "Фриролл"}
        </span>
        <span className="text-[var(--muted-foreground)]">
          {FORMAT_LABELS[tournament.format] ?? tournament.format}
        </span>
      </div>

      {isPast && hasResults && (
        <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
            🏆 Результаты
          </p>
          <ol className="flex flex-col gap-1 text-sm">
            {results.slice(0, 5).map((r) => (
              <li key={r.place} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center">
                  {PLACE_MEDAL[r.place] ?? `${r.place}.`}
                </span>
                <span className="truncate">{r.name}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {hasTables && (
        <button
          type="button"
          onClick={() => setSeatsOpen(true)}
          className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-left transition-colors hover:border-[var(--accent)]/40"
        >
          <SeatingGrid
            tableCount={tournament.tableCount!}
            seatsPerTable={tournament.seatsPerTable!}
            occupied={occupiedSeats}
            size="compact"
          />
          <span className="ml-3 shrink-0 text-xs text-[var(--muted-foreground)]">Места</span>
        </button>
      )}

      {spotsLeft !== null && !isPast && (
        <span className={`text-xs ${isFull ? "text-[var(--danger)]" : "text-[var(--muted-foreground)]"}`}>
          {isFull ? "Все места заняты" : `Осталось мест: ${spotsLeft}`}
        </span>
      )}

      {!isPast && (
        <div className="flex flex-col gap-1.5">
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            disabled={isFull}
            className="w-full"
          >
            {isFull ? "Мест нет" : "Подать заявку"}
          </Button>
          {isFull ? (
            <p className="text-center text-[11px] text-[var(--muted-foreground)]">
              Свободных мест сейчас нет — если кто-то отменит заявку, места может стать больше
            </p>
          ) : (
            <p className="text-center text-[11px] text-[var(--muted-foreground)]">
              Заявка на рассмотрение — организаторы свяжутся с вами для подтверждения
            </p>
          )}
        </div>
      )}

      <RegistrationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tournamentId={tournament.id}
        tournamentTitle={tournament.title}
      />

      {hasTables && (
        <Dialog open={seatsOpen} onOpenChange={setSeatsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Рассадка</DialogTitle>
              <DialogDescription>«{tournament.title}»</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-[var(--accent)] bg-[var(--accent)]" />
                Занято
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)]" />
                Свободно
              </span>
            </div>
            <SeatingGrid
              tableCount={tournament.tableCount!}
              seatsPerTable={tournament.seatsPerTable!}
              occupied={occupiedSeats}
              size="full"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
