"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelRegistrationAction } from "@/lib/actions/registrations";
import type { Registration, Tournament } from "@/lib/db/schema";

const STATUS_LABELS: Record<string, string> = {
  pending: "Заявка на рассмотрении",
  approved: "Заявка одобрена",
  rejected: "Заявка отклонена",
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

export function CancelRegistrationView({
  token,
  registration,
  tournament,
}: {
  token: string;
  registration: Registration | null;
  tournament: Tournament | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Once we know cancellation succeeded, this wins over whatever the
  // server re-sends — deleting the row makes the next server render see
  // "not found", which would otherwise silently replace this success
  // message with a confusing "заявка не найдена" right after the click.
  const [cancelled, setCancelled] = useState(false);

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelRegistrationAction(token);
      if (res.error) {
        setError(res.error);
        return;
      }
      setCancelled(true);
    });
  }

  if (cancelled) {
    return (
      <p className="mt-6 text-sm text-[var(--muted-foreground)]">
        Заявка отозвана. Если передумаете — вы всегда можете подать заявку
        заново на странице турниров.
      </p>
    );
  }

  if (!registration || !tournament) {
    return (
      <p className="mt-6 text-sm text-[var(--muted-foreground)]">
        Заявка не найдена — возможно, она уже была отозвана.
      </p>
    );
  }

  return (
    <>
      <p className="mt-6 text-[var(--muted-foreground)]">
        {registration.name}, вы подавали заявку на турнир
      </p>
      <p className="font-display mt-2 text-xl font-medium">{tournament.title}</p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        {formatDate(tournament.startsAt)}
      </p>
      <p className="mt-3 text-sm font-medium text-[var(--accent)]">
        {STATUS_LABELS[registration.status] ?? registration.status}
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Button variant="secondary" disabled={pending} onClick={handleCancel}>
          {pending ? "Отзываем…" : "Отозвать заявку"}
        </Button>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      </div>
    </>
  );
}
