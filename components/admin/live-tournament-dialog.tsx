"use client";

import { useEffect, useState } from "react";
import { CheckSquare, Coins, LayoutGrid, List, PlusCircle, Shuffle, Skull, Square, Trophy, X } from "lucide-react";
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
  adminListTournamentActions,
  adminRebalanceTables,
  adminRebuyOrAddon,
  adminRecalculateRating,
  adminStartTournament,
  type TournamentActionRow,
} from "@/lib/actions/registrations";
import type { Registration, Tournament } from "@/lib/db/schema";

const ACTION_LABELS: Record<string, string> = {
  rebuy: "Ребай",
  addon: "Аддон",
  eliminate: "Выбыл",
  manual_seat_change: "Пересадка",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Наличные",
  transfer: "Перевод",
  qr: "QR-оплата",
  terminal: "Терминал",
  unset: "Не указано",
};

// Positions seat `index` (0-based) evenly around an ellipse, starting at
// the top and going clockwise — the same layout convention as a real
// table's seat numbering, so seat 1 always reads as "closest to 12
// o'clock" no matter how many seats the table has.
function seatPosition(index: number, total: number) {
  const angle = (-90 + (360 / total) * index) * (Math.PI / 180);
  const rx = 44;
  const ry = 40;
  return {
    left: `${50 + rx * Math.cos(angle)}%`,
    top: `${50 + ry * Math.sin(angle)}%`,
  };
}

function TableSeatChart({
  tableNumber,
  seatsPerTable,
  seats,
  tieSelection,
  selectedId,
  onSelect,
}: {
  tableNumber: number;
  seatsPerTable: number;
  seats: Registration[];
  tieSelection: Set<number>;
  selectedId: number | null;
  onSelect: (reg: Registration) => void;
}) {
  const bySeat = new Map(seats.filter((r) => r.seatNumber != null).map((r) => [r.seatNumber as number, r]));

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium text-[var(--accent)]">Стол {tableNumber}</p>
      <div className="relative aspect-[2/1] w-full max-w-xs">
        <div className="absolute inset-[14%] rounded-[50%] border-2 border-[var(--accent)]/25 bg-[var(--surface-2)]" />
        {Array.from({ length: seatsPerTable }, (_, i) => i + 1).map((seatNumber) => {
          const reg = bySeat.get(seatNumber);
          const pos = seatPosition(seatNumber - 1, seatsPerTable);
          const isTie = reg ? tieSelection.has(reg.id) : false;
          const isSelected = reg ? reg.id === selectedId : false;
          return (
            <button
              key={seatNumber}
              type="button"
              disabled={!reg}
              onClick={() => reg && onSelect(reg)}
              style={{ left: pos.left, top: pos.top }}
              className={`absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border px-1 text-center text-[9px] leading-tight transition ${
                reg
                  ? isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : isTie
                      ? "border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]"
                  : "border-dashed border-[var(--border)]/50 text-[var(--muted-foreground)]/40"
              }`}
              title={reg ? `${reg.name} — стек ${reg.currentStack ?? "—"}` : `Место ${seatNumber} свободно`}
            >
              {reg ? (
                <>
                  <span className="max-w-[42px] truncate font-medium">{reg.name.split(" ")[0]}</span>
                  <span className="opacity-70">{reg.currentStack ?? "—"}</span>
                </>
              ) : (
                <span>{seatNumber}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatActionTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", {
    timeZone: "Europe/Samara",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [actions, setActions] = useState<TournamentActionRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pendingStackAction, setPendingStackAction] = useState<PendingStackAction | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [paymentInput, setPaymentInput] = useState<"" | "cash" | "transfer" | "qr" | "terminal">("");
  // Players about to be marked out together — a real hand can eliminate
  // more than one player at once, and they should share the same place
  // rather than get sequential ones just because of click order.
  const [tieSelection, setTieSelection] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"tables" | "list">("tables");
  const [selectedRegId, setSelectedRegId] = useState<number | null>(null);

  async function refresh() {
    setList(await adminListRegistrations(tournament.id));
    // Once the action log has been opened once, keep it in sync with every
    // other refresh too, so it doesn't go stale while left open.
    if (actions !== null) setActions(await adminListTournamentActions(tournament.id));
  }

  useEffect(() => {
    adminListRegistrations(tournament.id).then(setList);
  }, [tournament.id]);

  function loadActions() {
    if (actions === null) adminListTournamentActions(tournament.id).then(setActions);
  }

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

  // Итог за вечер по способу оплаты — каждый игрок платит буй-ин плюс всё,
  // что потратил на ребаи/аддоны, одним способом (выбирается в «Заявках»);
  // "unset" копит тех, для кого способ ещё не отмечен.
  const paymentTotals = new Map<string, number>();
  for (const r of everPlayed) {
    const key = r.paymentMethod ?? "unset";
    const spent = (tournament.buyIn ?? 0) + r.totalSpent;
    paymentTotals.set(key, (paymentTotals.get(key) ?? 0) + spent);
  }
  const selectedReg = selectedRegId != null ? (list.find((r) => r.id === selectedRegId) ?? null) : null;

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
    setPaymentInput((reg.paymentMethod as typeof paymentInput) ?? "");
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
    const result = await adminRebuyOrAddon(reg.id, type, chips, money, paymentInput || null);
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
      setSelectedRegId(null);
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

  async function recalculateRating() {
    if (!confirm("Пересчитать рейтинг по текущим местам? Используйте после исправления места вручную.")) {
      return;
    }
    setBusy(true);
    const result = await adminRecalculateRating(tournament.id);
    setBusy(false);
    setNote(result.error ?? `Рейтинг пересчитан для ${result.ratingsUpdated} игроков.`);
    await refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {note && (
        <p className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
          {note}
        </p>
      )}

      {pendingStackAction && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--accent)]/40 bg-[var(--surface-2)] p-3">
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
          <select
            value={paymentInput}
            onChange={(e) => setPaymentInput(e.target.value as typeof paymentInput)}
            title="Способ оплаты"
            className="h-8 shrink-0 rounded-lg border border-[var(--border)] bg-transparent px-1.5 text-xs"
          >
            <option value="">Оплата?</option>
            <option value="cash">Наличные</option>
            <option value="transfer">Перевод</option>
            <option value="qr">QR-оплата</option>
            <option value="terminal">Терминал</option>
          </select>
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

      {paymentTotals.size > 0 && (
        <div className="rounded-lg border border-[var(--border)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">Итог за вечер по оплате</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(["cash", "transfer", "qr", "terminal", "unset"] as const)
              .filter((key) => (paymentTotals.get(key) ?? 0) > 0)
              .map((key) => (
                <div key={key}>
                  <p className="text-xs text-[var(--muted-foreground)]">{PAYMENT_LABELS[key]}</p>
                  <p className="font-display text-base font-medium">{paymentTotals.get(key)} ₽</p>
                </div>
              ))}
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
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--muted-foreground)]">
              В игре: {playing.length} · выбыло: {eliminated.length}
            </p>
            <div className="flex flex-wrap gap-2">
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

          {playing.length > 0 && (
            <div className="flex justify-end gap-1">
              <button
                onClick={() => setViewMode("tables")}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs ${
                  viewMode === "tables"
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Столы
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs ${
                  viewMode === "list"
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <List className="h-3.5 w-3.5" /> Список
              </button>
            </div>
          )}

          {viewMode === "tables" ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[...tables.entries()]
                  .sort(([a], [b]) => a - b)
                  .map(([tableNumber, seats]) => (
                    <TableSeatChart
                      key={tableNumber}
                      tableNumber={tableNumber}
                      seatsPerTable={tournament.seatsPerTable ?? Math.max(...seats.map((r) => r.seatNumber ?? 1))}
                      seats={seats}
                      tieSelection={tieSelection}
                      selectedId={selectedRegId}
                      onSelect={(reg) => setSelectedRegId((prev) => (prev === reg.id ? null : reg.id))}
                    />
                  ))}
              </div>

              {selectedReg && (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--accent)]/40 bg-[var(--surface-2)] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      Стол {selectedReg.tableNumber}, место {selectedReg.seatNumber} — {selectedReg.name}
                    </p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">
                      Стек: {selectedReg.currentStack ?? "—"}
                      {selectedReg.rebuyCount > 0 && ` · ребаев: ${selectedReg.rebuyCount}`}
                      {selectedReg.addonCount > 0 && ` · аддонов: ${selectedReg.addonCount}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => openStackAction(selectedReg, "rebuy")}
                      disabled={busy}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                      aria-label="Ребай"
                      title="Ребай"
                    >
                      <Coins className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openStackAction(selectedReg, "addon")}
                      disabled={busy}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                      aria-label="Аддон"
                      title="Аддон"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleTie(selectedReg.id)}
                      disabled={busy}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        tieSelection.has(selectedReg.id)
                          ? "text-[var(--danger)] hover:bg-[var(--danger)]/10"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                      }`}
                      aria-label="Отметить для одновременного вылета"
                      title="Отметить для одновременного вылета (тай)"
                    >
                      {tieSelection.has(selectedReg.id) ? (
                        <CheckSquare className="h-3.5 w-3.5" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => eliminate([selectedReg.id])}
                      disabled={busy}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                      aria-label="Выбыл"
                      title="Выбыл"
                    >
                      <Skull className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedRegId(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                      aria-label="Закрыть"
                      title="Закрыть"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {playing.length === 0 && (
                <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
                  Все игроки выбыли — можно завершить турнир.
                </p>
              )}
            </div>
          ) : (
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
          )}
        </>
      )}

      {eliminated.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <Trophy className="h-3.5 w-3.5 text-[var(--accent)]" /> Результаты
            </p>
            {tournament.status === "completed" && (
              <button
                onClick={recalculateRating}
                disabled={busy}
                className="text-xs text-[var(--muted-foreground)] underline hover:text-[var(--foreground)]"
                title="Используйте после исправления места вручную в «Заявки»"
              >
                Пересчитать рейтинг
              </button>
            )}
          </div>
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

      {everPlayed.length > 0 && (
        <details className="rounded-lg border border-[var(--border)] p-3" onToggle={loadActions}>
          <summary className="cursor-pointer text-xs font-medium text-[var(--muted-foreground)]">
            История действий
          </summary>
          <div className="mt-3 flex flex-col gap-1">
            {actions === null ? (
              <p className="text-xs text-[var(--muted-foreground)]">Загрузка…</p>
            ) : actions.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">Пока пусто.</p>
            ) : (
              actions.map((a) => (
                <p key={a.id} className="text-xs text-[var(--muted-foreground)]">
                  {formatActionTime(a.createdAt)} · {ACTION_LABELS[a.type] ?? a.type} · {a.playerName}
                  {a.chips != null && ` · ${a.chips} фишек`}
                  {a.money != null && ` · ${a.money} ₽`}
                  {a.adminUsername && ` · ${a.adminUsername}`}
                </p>
              ))
            )}
          </div>
        </details>
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
