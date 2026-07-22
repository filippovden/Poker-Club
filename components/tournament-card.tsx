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
import type { Tournament } from "@/lib/db/schema";
import type { SeatAssignment } from "@/lib/db/seat-assignments";

const FORMAT_LABELS: Record<string, string> = {
  NLH: "No-Limit Hold'em",
  PLO: "Pot-Limit Omaha",
  MTT: "Многостоловый турнир",
};

const STATUS_LABELS: Record<Tournament["status"], string> = {
  upcoming: "Скоро",
  live: "Идёт сейчас",
  completed: "Завершён",
};

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", {
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
}: {
  tournament: Tournament;
  registeredCount?: number;
  occupiedSeats?: SeatAssignment[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [seatsOpen, setSeatsOpen] = useState(false);
  const isPast = tournament.status === "completed";
  const spotsLeft =
    tournament.maxPlayers != null ? tournament.maxPlayers - registeredCount : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const hasTables = tournament.tableCount != null && tournament.seatsPerTable != null;

  return (
    <div
      className={`group relative flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md transition-all duration-300 hover:border-[var(--accent)]/40 hover:-translate-y-0.5 ${isPast ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <Badge variant={tournament.status === "live" ? "live" : "default"}>
          {tournament.status === "live" && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          )}
          {STATUS_LABELS[tournament.status]}
        </Badge>
        <span className="text-xs text-[var(--muted-foreground)]">
          {formatDate(tournament.startsAt)}
        </span>
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
            disabled={isFull}
            onClick={() => setDialogOpen(true)}
            className="w-full"
          >
            {isFull ? "Мест нет" : "Подать заявку"}
          </Button>
          {!isFull && (
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
