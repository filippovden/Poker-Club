"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  cancelRegistrationAction,
  lookupRegistrationsAction,
  type LookupResultItem,
} from "@/lib/actions/registrations";

const STATUS_LABELS: Record<string, string> = {
  pending: "На рассмотрении",
  approved: "Одобрена",
  rejected: "Отклонена",
  playing: "В игре",
  eliminated: "Турнир завершён для вас",
};

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

function ResultCard({ item }: { item: LookupResultItem }) {
  const { registration: r, tournament: t } = item;
  const [cancelled, setCancelled] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancellable = r.status === "pending" || r.status === "approved";

  async function handleCancel() {
    setPending(true);
    const res = await cancelRegistrationAction(r.cancelToken);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCancelled(true);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="font-display text-base font-medium">{t.title}</p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{formatDate(t.startsAt)}</p>
      <p className="mt-3 text-sm font-medium text-[var(--accent)]">
        {STATUS_LABELS[r.status] ?? r.status}
      </p>
      {(r.status === "approved" || r.status === "playing") && r.tableNumber != null && (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Стол {r.tableNumber}, место {r.seatNumber}
        </p>
      )}
      {r.status === "eliminated" && r.place != null && (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Итоговое место: {r.place}</p>
      )}

      {cancelled ? (
        <p className="mt-4 text-xs text-[var(--muted-foreground)]">Заявка отозвана.</p>
      ) : (
        cancellable && (
          <div className="mt-4">
            <Button size="sm" variant="secondary" disabled={pending} onClick={handleCancel}>
              {pending ? "Отзываем…" : "Отозвать заявку"}
            </Button>
            {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
          </div>
        )
      )}
    </div>
  );
}

export function LookupRegistrationsView() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LookupResultItem[] | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await lookupRegistrationsAction(phone, name);
    setPending(false);
    if (result.error) {
      setError(result.error);
      setItems(null);
      return;
    }
    setItems(result.items ?? []);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="lookup-name">Имя</Label>
          <Input
            id="lookup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lookup-phone">Телефон</Label>
          <Input
            id="lookup-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="+7 900 000-00-00"
          />
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Введите так же, как указывали при подаче заявки.
        </p>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button type="submit" disabled={pending} className="mt-2">
          {pending ? "Ищем…" : "Найти заявки"}
        </Button>
      </form>

      {items && items.length > 0 && (
        <div className="mt-8 flex flex-col gap-4">
          {items.map((item) => (
            <ResultCard key={item.registration.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
