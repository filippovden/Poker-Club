"use client";

import { useEffect, useState } from "react";
import { Armchair, Check, Shuffle, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  adminAssignSeats,
  adminListRegistrations,
  adminRemoveRegistration,
  adminSetPlace,
  adminSetRegistrationStatus,
  adminSetSeat,
} from "@/lib/actions/registrations";
import type { Registration } from "@/lib/db/schema";

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

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Ожидает", className: "text-[var(--muted-foreground)]" },
  approved: { label: "Одобрена", className: "text-[var(--live)]" },
  rejected: { label: "Отклонена", className: "text-[var(--danger)]" },
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

  useEffect(() => {
    adminListRegistrations(tournamentId).then(setList);
  }, [tournamentId]);

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

  return (
    <div className="flex flex-col gap-3">
      {statusError && (
        <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
          {statusError}
        </p>
      )}
      {hasTables && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3">
          <div className="min-w-0 text-xs text-[var(--muted-foreground)]">
            {seatingNote ?? "Случайно распределяет одобренные заявки по столам."}
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
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--surface-2)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    {r.phone}
                    {r.email ? ` · ${r.email}` : ""} · {formatDate(r.createdAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-medium ${badge.className}`}>{badge.label}</p>
                    {r.status === "approved" && r.tableNumber != null && (
                      <p className="text-xs text-[var(--accent)]">
                        Стол {r.tableNumber}, место {r.seatNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {r.status === "approved" && (
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
                  {r.status !== "approved" && (
                    <button
                      onClick={() => setStatus(r.id, "approved")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--live)]/10 hover:text-[var(--live)]"
                      aria-label="Одобрить заявку"
                      title="Одобрить заявку"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button
                      onClick={() => setStatus(r.id, "rejected")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                      aria-label="Отклонить заявку"
                      title="Отклонить заявку"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(r.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                    aria-label="Удалить заявку"
                    title="Удалить заявку"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
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
