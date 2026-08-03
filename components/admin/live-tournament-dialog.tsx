"use client";

import { useEffect, useState } from "react";
import { Coins, PlusCircle, Shuffle, Skull, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  adminEliminatePlayers,
  adminFinishTournament,
  adminListRegistrations,
  adminRebalanceTables,
  adminRebuyOrAddon,
  adminStartTournament,
} from "@/lib/actions/registrations";
import type { Registration, Tournament } from "@/lib/db/schema";

interface PendingStackAction {
  reg: Registration;
  type: "rebuy" | "addon";
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
  const [pendingStackAction, setPendingStackAction] = useState<PendingStackAction | null>(null);
  const [amountInput, setAmountInput] = useState("");
  // Players about to be marked out together — a real hand can eliminate
  // more than one player at once, and they should share the same place
  // rather than get sequential ones just because of click order.
  const [tieSelection, setTieSelection] = useState<Set<number>>(new Set());

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

  // Everyone who actually got a stack at some point — rebuy/addon counts
  // and totalSpent are only ever nonzero for these, so summing over the
  // full list would just add a bunch of zeros from unseated applicants.
  const everPlayed = list.filter((r) => r.status === "playing" || r.status === "eliminated");
  const totalRebuys = everPlayed.reduce((sum, r) => sum + r.rebuyCount, 0);
  const totalAddons = everPlayed.reduce((sum, r) => sum + r.addonCount, 0);
  // totalSpent only tracks rebuy/addon money — the original buy-in isn't a
  // logged "action", so it's added back in here from the player count for
  // the overall-cash figure.
  const rebuyAddonMoney = everPlayed.reduce((sum, r) => sum + r.totalSpent, 0);
  const buyInMoney = tournament.buyIn != null ? everPlayed.length * tournament.buyIn : null;
  const totalMoney = buyInMoney != null ? buyInMoney + rebuyAddonMoney : null;

  async function start() {
    const wasLive = tournament.status === "live";
    setBusy(true);
    setNote(null);
    const result = await adminStartTournament(tournament.id);
    setBusy(false);
    setNote(result.error ?? (wasLive ? "Игроки заведены в игру." : "Турнир запущен."));
    await refresh();
    onChanged();
  }

  function openStackAction(reg: Registration, type: "rebuy" | "addon") {
    setNote(null);
    setPendingStackAction({ reg, type });
    setAmountInput(tournament.buyIn != null ? String(tournament.buyIn) : "");
  }

  async function confirmStackAction() {
    if (!pendingStackAction) return;
    const money = Number(amountInput);
    if (!Number.isFinite(money) || money < 0) {
      setNote("Некорректная сумма");
      return;
    }
    const { reg, type } = pendingStackAction;
    const chips = type === "rebuy" ? (tournament.rebuyChips ?? 0) : (tournament.addonChips ?? 0);
    setBusy(true);
    const result = await adminRebuyOrAddon(reg.id, type, chips, money);
    setBusy(false);
    setPendingStackAction(null);
    setNote(result.error ?? null);
    await refresh();
  }

  function toggleTie(id: number) {
    setTieSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function eliminate(ids: number[]) {
    const names = (list ?? [])
      .filter((r) => ids.includes(r.id))
      .map((r) => r.name)
      .join(", ");
    const question = ids.length > 1 ? `Выбыли одновременно: ${names}?` : `Выбыл: ${names}?`;
    if (!confirm(question)) return;
    setBusy(true);
    const result = await adminEliminatePlayers(ids);
    setBusy(false);
    if (result.error) {
      setNote(result.error);
    } else {
      setNote(
        result.tournamentFinished
          ? `${names} — турнир доигран, остался победитель.`
          : `${names} — ${result.place} место${ids.length > 1 ? " (тай)" : ""}.`,
      );
      setTieSelection(new Set());
    }
    await refresh();
  }

  async function rebalance() {
    if (!confirm("Пересадить всех играющих по столам заново?")) return;
    setBusy(true);
    const result = await adminRebalanceTables(tournament.id);
    setBusy(false);
    setNote(result.error ?? `Пересажено на ${result.tableCount} стол(ов).`);
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

      {pendingStackAction && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--accent)]/40 bg-[var(--surface-2)] p-3">
          <p className="min-w-0 flex-1 truncate text-xs">
            {pendingStackAction.type === "rebuy" ? "Ребай" : "Аддон"}: {pendingStackAction.reg.name} — сумма, ₽
          </p>
          <input
            type="number"
            min={0}
            autoFocus
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmStackAction();
              if (e.key === "Escape") setPendingStackAction(null);
            }}
            className="h-8 w-24 shrink-0 rounded-lg border border-[var(--border)] bg-transparent px-2 text-xs"
          />
          <Button size="sm" onClick={confirmStackAction} disabled={busy} className="shrink-0">
            OK
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPendingStackAction(null)}
            className="shrink-0"
          >
            Отмена
          </Button>
        </div>
      )}

      {tieSelection.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--danger)]/40 bg-[var(--surface-2)] p-3">
          <p className="min-w-0 flex-1 truncate text-xs">
            Отмечено на одновременный вылет ({tieSelection.size}):{" "}
            {list
              .filter((r) => tieSelection.has(r.id))
              .map((r) => r.name)
              .join(", ")}
          </p>
          <Button size="sm" onClick={() => eliminate([...tieSelection])} disabled={busy} className="shrink-0">
            Подтвердить вылет
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setTieSelection(new Set())}
            className="shrink-0"
          >
            Отмена
          </Button>
        </div>
      )}

      {everPlayed.length > 0 && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Ребаев</p>
            <p className="font-display text-lg font-medium">{totalRebuys}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Аддонов</p>
            <p className="font-display text-lg font-medium">{totalAddons}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">От ребаев/аддонов</p>
            <p className="font-display text-lg font-medium">{rebuyAddonMoney} ₽</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Общая касса</p>
            <p className="font-display text-lg font-medium">
              {totalMoney != null ? `${totalMoney} ₽` : "—"}
            </p>
          </div>
        </div>
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
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="secondary" onClick={rebalance} disabled={busy || playing.length === 0}>
                <Shuffle className="h-3.5 w-3.5" />
                Пересадить столы
              </Button>
              <Button size="sm" variant="secondary" onClick={finish} disabled={busy}>
                Завершить турнир
              </Button>
            </div>
          </div>

          {seatedApproved.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--accent)]/40 bg-[var(--surface-2)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">
                Рассажены, но ещё не в игре: {seatedApproved.length}
              </p>
              <Button size="sm" onClick={start} disabled={busy}>
                Завести в игру
              </Button>
            </div>
          )}

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
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Checkbox
                            checked={tieSelection.has(r.id)}
                            onCheckedChange={() => toggleTie(r.id)}
                            title="Отметить для одновременного вылета (тай)"
                          />
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
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => openStackAction(r, "rebuy")}
                            disabled={busy}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                            aria-label="Ребай"
                            title="Ребай"
                          >
                            <Coins className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openStackAction(r, "addon")}
                            disabled={busy}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                            aria-label="Аддон"
                            title="Аддон"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => eliminate([r.id])}
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

      {tournament.status === "completed" && eliminated.length === 0 && (
        <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
          Турнир завершён без записанных результатов live-игры.
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
