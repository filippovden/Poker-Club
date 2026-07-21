"use client";

import { useEffect, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  adminListRegistrations,
  adminRemoveRegistration,
  adminSetRegistrationStatus,
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

function RegistrationsList({ tournamentId }: { tournamentId: number }) {
  const [list, setList] = useState<Registration[] | null>(null);

  useEffect(() => {
    adminListRegistrations(tournamentId).then(setList);
  }, [tournamentId]);

  async function remove(id: number) {
    await adminRemoveRegistration(id);
    setList((prev) => prev?.filter((r) => r.id !== id) ?? null);
  }

  async function setStatus(id: number, status: "approved" | "rejected" | "pending") {
    await adminSetRegistrationStatus(id, status);
    setList((prev) => prev?.map((r) => (r.id === id ? { ...r, status } : r)) ?? null);
  }

  if (list === null) {
    return (
      <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">Загрузка…</p>
    );
  }

  if (list.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
        Пока нет заявок.
      </p>
    );
  }

  return (
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
              <p className={`text-xs font-medium ${badge.className}`}>{badge.label}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
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
  );
}

export function RegistrationsDialog({
  open,
  onOpenChange,
  tournamentId,
  tournamentTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: number;
  tournamentTitle: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Заявки</DialogTitle>
          <DialogDescription>«{tournamentTitle}»</DialogDescription>
        </DialogHeader>

        {open && <RegistrationsList key={tournamentId} tournamentId={tournamentId} />}
      </DialogContent>
    </Dialog>
  );
}
