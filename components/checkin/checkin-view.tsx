"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  checkinFindRegistrationAction,
  checkinRegisterAndConfirmAction,
  confirmCheckinAction,
  type CheckinMatch,
} from "@/lib/actions/checkin";

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("ru-RU", { timeZone: "Europe/Samara", hour: "2-digit", minute: "2-digit" });
}

function MatchCard({ token, match }: { token: string; match: CheckinMatch }) {
  const [checkedIn, setCheckedIn] = useState(match.checkedIn);
  const [checkedInAt, setCheckedInAt] = useState(match.checkedInAt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const res = await confirmCheckinAction(token, match.registrationId);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCheckedIn(true);
    setCheckedInAt(res.checkedInAt ?? null);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="font-display text-base font-medium">{match.name}</p>
      {match.tableNumber != null && (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Стол {match.tableNumber}, место {match.seatNumber}
        </p>
      )}

      {checkedIn ? (
        <p className="mt-4 text-sm font-medium text-[var(--accent)]">
          Вы отмечены{checkedInAt ? ` в ${formatTime(checkedInAt)}` : ""} ✓
        </p>
      ) : (
        <div className="mt-4">
          <Button disabled={pending} onClick={handleConfirm}>
            {pending ? "Отмечаем…" : "Я на месте"}
          </Button>
          {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
        </div>
      )}
    </div>
  );
}

// Shown when phone+name don't match any application — a real walk-in who
// never applied online. Registers them and marks them checked-in in one
// step rather than sending them to the full site form at the door.
function NewGuestForm({ token, name, phone }: { token: string; name: string; phone: string }) {
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);

  async function handleRegister() {
    setPending(true);
    setError(null);
    const res = await checkinRegisterAndConfirmAction(token, phone, name, consent);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCheckedInAt(res.checkedInAt ?? new Date().toISOString());
  }

  if (checkedInAt) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="font-display text-base font-medium">{name}</p>
        <p className="mt-4 text-sm font-medium text-[var(--accent)]">
          Вы зарегистрированы и отмечены в {formatTime(checkedInAt)} ✓
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="font-display text-base font-medium">{name}</p>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Заявки с таким именем и телефоном нет — похоже, вы не подавали заявку заранее. Отметим вас
        прямо сейчас.
      </p>
      <label className="mt-4 flex items-start gap-2.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
        <span>
          Даю согласие на обработку персональных данных в соответствии с{" "}
          <Link href="/legal" target="_blank" className="underline hover:text-[var(--foreground)]">
            Политикой обработки персональных данных
          </Link>{" "}
          и подтверждаю, что мне исполнилось 18 лет.
        </span>
      </label>
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      <Button disabled={pending} onClick={handleRegister} className="mt-4">
        {pending ? "Регистрируем…" : "Зарегистрироваться и отметиться"}
      </Button>
    </div>
  );
}

export function CheckinView({ token }: { token: string }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<CheckinMatch[] | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await checkinFindRegistrationAction(token, phone, name);
    setPending(false);
    if (result.error) {
      setError(result.error);
      setMatches(null);
      setNotFound(false);
      return;
    }
    setNotFound(result.notFound ?? false);
    setMatches(result.matches ?? null);
  }

  if (matches && matches.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        {matches.map((m) => (
          <MatchCard key={m.registrationId} token={token} match={m} />
        ))}
      </div>
    );
  }

  if (notFound) {
    return <NewGuestForm token={token} name={name.trim()} phone={phone.trim()} />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="checkin-name">Имя</Label>
        <Input
          id="checkin-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="checkin-phone">Телефон</Label>
        <Input
          id="checkin-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          placeholder="+7 900 000-00-00"
        />
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Ищем…" : "Найти заявку"}
      </Button>
    </form>
  );
}
