"use client";

import { useEffect, useState } from "react";
import { Coins, PlusCircle, Skull, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  adminEliminatePlayer,
  adminFinishTournament,
  adminListRegistrations,
  adminRebuyOrAddon,
  adminStartTournament,
} from "@/lib/actions/registrations";
import type { Registration, Tournament } from "@/lib/db/schema";

function askMoney(defaultValue: number | null): number | null {
  const raw = window.prompt(
    "Сумма (₽), внесённая игроком:",
    defaultValue != null ? String(defaultValue) : "",
  );
  if (raw === null) return null;
  const value = Number(raw.trim());
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function LiveTournamentBody({
  tournament,
  onChanged,
}: {
  tournament: Tournament;
  onChanged: () => void;
}) {
  const [list, setList] = useState<Registration[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function refresh() {
    setList(await adminListRegistrations(tournament.id));
  }

  useEffect(() => {
    adminListRegistrations(tournament.id).then(setList);
  }, [tournament.id]);

  if (list === null) {
    return <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">Загрузка…</p>;
  }

  const seatedApproved = list.filter(
    (r) => r.status === "approved" && r.tableNumber != null && r.seatNumber != null,
  );
  const playing = list.filter((r) => r.status === "playing");
  const eliminated = list
    .filter((r) => r.status === "eliminated" && r.place != null)
    .sort((a, b) => (a.place ?? 0) - (b.place ?? 0));

  const tables = new Map<number, Registration[]>();
  for (const r of playing) {
    const t = r.tableNumber ?? 0;
    if (!tables.has(t)) tables.set(t, []);
    tables.get(t)!.push(r);
  }
  for (const seats of tables.values()) seats.sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));

  async function start() {
    setBusy(true);
    setNote(null);
    const result = await adminStartTournament(tournament.id);
    setBusy(false);
    setNote(result.error ?? "Турнир запущен.");
    await refresh();
    onChanged();
  }

  async function rebuy(reg: Registration) {
    const money = askMoney(tournament.buyIn);
    if (money === null) return;
    setBusy(true);
    const result = await adminRebuyOrAddon(reg.id, "rebuy", tournament.rebuyChips ?? 0, money);
    setBusy(false);
    setNote(result.error ?? null);
    await refresh();
  }

  async function addon(reg: Registration) {
    const money = askMoney(tournament.buyIn);
    if (money === null) return;
    setBusy(true);
    const result = await adminRebuyOrAddon(reg.id, "addon", tournament.addonChips ?? 0, money);
    setBusy(false);
    setNote(result.error ?? null);
    await refresh();
  }

  async function eliminate(reg: Registration) {
    if (!confirm(`Выбыл: ${reg.name}?`)) return;
    setBusy(true);
    const result = await adminEliminatePlayer(reg.id);
    setBusy(false);
    if (result.error) {
      setNote(result.error);
    } else {
      setNote(
        result.tournamentFinished
          ? `${reg.name} выбыл — турнир доигран, остался победитель.`
          : `${reg.name} выбыл — ${result.place} место.`,
      );
    }
    await refresh();
  }

  async function finish() {
    setBusy(true);
    const result = await adminFinishTournament(tournament.id);
    setBusy(false);
    setNote(result.error ?? `Рейтинг обновлён для ${result.ratingsUpdated} игроков.`);
    await refresh();
    onChanged();
  }

  return (
    <div className="flex flex-col gap-4">
      {note && (
        <p className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
          {note}
        </p>
      )}

      {tournament.status === "upcoming" && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3">
          <p className="text-xs text-[var(--muted-foreground)]">
            Рассажено и готово к игре: {seatedApproved.length}
          </p>
          <Button size="sm" onClick={start} disabled={busy || seatedApproved.length === 0}>
            Начать турнир
          </Button>
        </div>
      )}

      {tournament.status === "live" && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              В игре: {playing.length} · выбыло: {eliminated.length}
            </p>
            <Button size="sm" variant="secondary" onClick={finish} disabled={busy}>
              Завершить турнир
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {[...tables.entries()]
              .sort(([a], [b]) => a - b)
              .map(([tableNumber, seats]) => (
                <div key={tableNumber} className="rounded-lg border border-[var(--border)] p-3">
                  <p className="mb-2 text-xs font-medium text-[var(--accent)]">Стол {tableNumber}</p>
                  <div className="flex flex-col gap-1">
                    {seats.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-2)]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {r.seatNumber}. {r.name}
                          </p>
                          <p className="truncate text-xs text-[var(--muted-foreground)]">
                            Стек: {r.currentStack ?? "—"}
                            {r.rebuyCount > 0 && ` · ребаев: ${r.rebuyCount}`}
                            {r.addonCount > 0 && ` · аддонов: ${r.addonCount}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => rebuy(r)}
                            disabled={busy}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                            aria-label="Ребай"
                            title="Ребай"
                          >
                            <Coins className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => addon(r)}
                            disabled={busy}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                            aria-label="Аддон"
                            title="Аддон"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => eliminate(r)}
                            disabled={busy}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                            aria-label="Выбыл"
                            title="Выбыл"
                          >
                            <Skull className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            {playing.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
                Все игроки выбыли — можно завершить турнир.
              </p>
            )}
          </div>
        </>
      )}

      {eliminated.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium">
            <Trophy className="h-3.5 w-3.5 text-[var(--accent)]" /> Результаты
          </p>
          <div className="flex flex-col gap-1">
            {eliminated.map((r) => (
              <p key={r.id} className="text-xs text-[var(--muted-foreground)]">
                {r.place}. {r.name}
              </p>
            ))}
          </div>
        </div>
      )}

      {tournament.status === "upcoming" && seatedApproved.length === 0 && (
        <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
          Сначала одобрите заявки и рассадите игроков по столам.
        </p>
      )}
    </div>
  );
}

export function LiveTournamentDialog({
  open,
  onOpenChange,
  tournament,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: Tournament | null;
  onChanged: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ход турнира</DialogTitle>
          <DialogDescription>«{tournament?.title}»</DialogDescription>
        </DialogHeader>

        {open && tournament && (
          <LiveTournamentBody key={tournament.id} tournament={tournament} onChanged={onChanged} />
        )}
      </DialogContent>
    </Dialog>
  );
}
