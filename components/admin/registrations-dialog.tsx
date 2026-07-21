"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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

function RegistrationsList({ tournamentId }: { tournamentId: number }) {
  const [list, setList] = useState<Registration[] | null>(null);

  useEffect(() => {
    adminListRegistrations(tournamentId).then(setList);
  }, [tournamentId]);

  async function remove(id: number) {
    await adminRemoveRegistration(id);
    setList((prev) => prev?.filter((r) => r.id !== id) ?? null);
  }

  if (list === null) {
    return (
      <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">Загрузка…</p>
    );
  }

  if (list.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
        Пока никто не зарегистрировался.
      </p>
    );
  }

  return (
    <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
      {list.map((r) => (
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
          </div>
          <button
            onClick={() => remove(r.id)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
            aria-label="Удалить участника"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
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
          <DialogTitle>Участники</DialogTitle>
          <DialogDescription>«{tournamentTitle}»</DialogDescription>
        </DialogHeader>

        {open && <RegistrationsList key={tournamentId} tournamentId={tournamentId} />}
      </DialogContent>
    </Dialog>
  );
}
