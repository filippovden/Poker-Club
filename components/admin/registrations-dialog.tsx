"use client";

import { useEffect, useState } from "react";
import { Armchair, Check, CheckCheck, Pencil, Shuffle, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  adminApproveAllPending,
  adminAssignSeats,
  adminListRegistrations,
  adminRemoveRegistration,
  adminSetPlace,
  adminSetRegistrationStatus,
  adminSetSeat,
  adminUpdateRegistrationContact,
} from "@/lib/actions/registrations";
import type { Registration } from "@/lib/db/schema";

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", {
    timeZone: "Europe/Samara",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Ожидает", className: "text-[var(--muted-foreground)]" },
  approved: { label: "Одобрена", className: "text-[var(--live)]" },
  rejected: { label: "Отклонена", className: "text-[var(--danger)]" },
  playing: { label: "В игре", className: "text-[var(--live)]" },
  eliminated: { label: "Выбыл", className: "text-[var(--muted-foreground)]" },
};

function RegistrationsList({
  tournamentId,
  hasTables,
}: {
  tournamentId: number;
  hasTables: boolean;
}) {
  const [list, setList] = useState<Registration[] | null>(null);
  const [seating, setSeating] = useState(false);
  const [seatingNote, setSeatingNote] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  useEffect(() => {
    adminListRegistrations(tournamentId).then(setList);
  }, [tournamentId]);

  async function approveAll() {
    setApprovingAll(true);
    setStatusError(null);
    const result = await adminApproveAllPending(tournamentId);
    setApprovingAll(false);
    setStatusError(
      result.failed > 0
        ? `Одобрено: ${result.approved}. Не поместилось (нет мест): ${result.failed}.`
        : null,
    );
    const fresh = await adminListRegistrations(tournamentId);
    setList(fresh);
  }

  function startEdit(r: Registration) {
    setEditingId(r.id);
    setEditName(r.name);
    setEditPhone(r.phone);
  }

  async function saveEdit(id: number) {
    const result = await adminUpdateRegistrationContact(id, editName, editPhone);
    if (result.error) {
      setStatusError(result.error);
      return;
    }
    setEditingId(null);
    const fresh = await adminListRegistrations(tournamentId);
    setList(fresh);
  }

  async function remove(id: number) {
    await adminRemoveRegistration(id);
    setList((prev) => prev?.filter((r) => r.id !== id) ?? null);
  }

  async function setStatus(id: number, status: "approved" | "rejected" | "pending") {
    const result = await adminSetRegistrationStatus(id, status);
    setStatusError(result?.error ?? null);
    const fresh = await adminListRegistrations(tournamentId);
    setList(fresh);
  }

  async function setPlace(id: number, value: string) {
    const place = value.trim() === "" ? null : Number(value);
    await adminSetPlace(id, Number.isFinite(place) ? place : null);
    setList((prev) => prev?.map((r) => (r.id === id ? { ...r, place } : r)) ?? null);
  }

  async function unseat(id: number) {
    await adminSetSeat(id, null, null);
    setList((prev) =>
      prev?.map((r) => (r.id === id ? { ...r, tableNumber: null, seatNumber: null } : r)) ?? null,
    );
  }

  async function assignSeats() {
    setSeating(true);
    setSeatingNote(null);
    const result = await adminAssignSeats(tournamentId);
    setSeating(false);
    if (result.error) {
      setSeatingNote(result.error);
      return;
    }
    setSeatingNote(
      result.unseated
        ? `Рассажено: ${result.seated}. Не поместились: ${result.unseated}.`
        : `Рассажено: ${result.seated}.`,
    );
    const fresh = await adminListRegistrations(tournamentId);
    setList(fresh);
  }

  if (list === null) {
    return (
      <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">Загрузка…</p>
    );
  }

  const pendingCount = list?.filter((r) => r.status === "pending").length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {statusError && (
        <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
          {statusError}
        </p>
      )}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3">
          <p className="text-xs text-[var(--muted-foreground)]">На рассмотрении: {pendingCount}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={approveAll}
            disabled={approvingAll}
            className="shrink-0"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {approvingAll ? "Одобряем…" : "Одобрить все"}
          </Button>
        </div>
      )}
      {hasTables && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3">
          <div className="min-w-0 text-xs text-[var(--muted-foreground)]">
            {seatingNote ??
              "Случайно распределяет одобренные заявки по столам и пишет каждому в Telegram, если бот подключён."}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={assignSeats}
            disabled={seating}
            className="shrink-0"
          >
            <Shuffle className="h-3.5 w-3.5" />
            {seating ? "Рассаживаем…" : "Рассадить"}
          </Button>
        </div>
      )}

      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
          Пока нет заявок.
        </p>
      ) : (
        <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
          {list.map((r) => {
            const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending;
            return (
              <div
                key={r.id}
                className="flex flex-col gap-2 rounded-lg px-3 py-2.5 hover:bg-[var(--surface-2)] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  {editingId === r.id ? (
                    <div className="flex flex-col gap-1.5 pr-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Имя"
                        className="h-8 rounded-lg border border-[var(--border)] bg-transparent px-2 text-sm"
                      />
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Телефон"
                        className="h-8 rounded-lg border border-[var(--border)] bg-transparent px-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(r.id)}>
                          Сохранить
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="truncate text-xs text-[var(--muted-foreground)]">
                        {r.phone}
                        {r.email ? ` · ${r.email}` : ""} · {formatDate(r.createdAt)}
                      </p>
                    </>
                  )}
                  {r.comment && (
                    <p className="truncate text-xs italic text-[var(--muted-foreground)]">
                      💬 {r.comment}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-medium ${badge.className}`}>{badge.label}</p>
                    {r.status === "approved" && r.tableNumber != null && (
                      <p className="text-xs text-[var(--accent)]">
                        Стол {r.tableNumber}, место {r.seatNumber}
                      </p>
                    )}
                    {r.status === "playing" && r.tableNumber != null && (
                      <p className="text-xs text-[var(--accent)]">
                        Стол {r.tableNumber}, место {r.seatNumber} · стек {r.currentStack ?? "—"}
                      </p>
                    )}
                    {r.status === "eliminated" && r.place != null && (
                      <p className="text-xs text-[var(--accent)]">{r.place} место</p>
                    )}
                  </div>
                </div>
                {editingId !== r.id && (
                  <div className="flex shrink-0 flex-wrap items-center gap-1 self-end sm:self-auto">
                    {(r.status === "approved" || r.status === "eliminated") && (
                      <input
                        type="number"
                        min={1}
                        placeholder="Место"
                        defaultValue={r.place ?? ""}
                        onBlur={(e) => setPlace(r.id, e.target.value)}
                        title="Итоговое место в турнире"
                        className="h-8 w-16 rounded-lg border border-[var(--border)] bg-transparent px-2 text-xs"
                      />
                    )}
                    {r.status === "approved" && hasTables && r.tableNumber != null && (
                      <button
                        onClick={() => unseat(r.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                        aria-label="Снять с места"
                        title="Снять с места"
                      >
                        <Armchair className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {r.status !== "playing" && (
                      <button
                        onClick={() => startEdit(r)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                        aria-label="Изменить имя/телефон"
                        title="Изменить имя/телефон"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {(r.status === "pending" || r.status === "rejected") && (
                      <button
                        onClick={() => setStatus(r.id, "approved")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--live)]/10 hover:text-[var(--live)]"
                        aria-label="Одобрить заявку"
                        title="Одобрить заявку"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {(r.status === "pending" || r.status === "approved") && (
                      <button
                        onClick={() => setStatus(r.id, "rejected")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                        aria-label="Отклонить заявку"
                        title="Отклонить заявку"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {r.status !== "playing" && (
                      <button
                        onClick={() => remove(r.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                        aria-label="Удалить заявку"
                        title="Удалить заявку"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RegistrationsDialog({
  open,
  onOpenChange,
  tournamentId,
  tournamentTitle,
  tableCount,
  seatsPerTable,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: number;
  tournamentTitle: string;
  tableCount?: number | null;
  seatsPerTable?: number | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Заявки</DialogTitle>
          <DialogDescription>«{tournamentTitle}»</DialogDescription>
        </DialogHeader>

        {open && (
          <RegistrationsList
            key={tournamentId}
            tournamentId={tournamentId}
            hasTables={tableCount != null && seatsPerTable != null}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
