"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerForTournamentAction,
  type RegisterResult,
} from "@/lib/actions/registrations";
import { playClick } from "@/lib/sound";

const initialState: RegisterResult = {};

export function RegistrationDialog({
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
  const action = registerForTournamentAction.bind(null, tournamentId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [copied, setCopied] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // Controlled fields — React's form-action API resets uncontrolled inputs
  // after every submission (success or error), which was wiping the name/
  // email/checkboxes the moment the server returned a validation error
  // (e.g. "already applied"), forcing people to retype everything.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    // Always take over submission manually (rather than letting the form's
    // `action` prop submit natively) — React calls the underlying DOM
    // form.reset() after any action-backed submission settles, which wipes
    // out these controlled fields' visual state even though our own React
    // state still holds the values. Dispatching by hand avoids that reset.
    e.preventDefault();

    if (name.trim().length < 2) {
      setClientError("Введите имя");
      return;
    }
    if (phone.trim().length < 5 || !/^[\d\s()+-]+$/.test(phone.trim())) {
      setClientError("Похоже на некорректный номер телефона");
      return;
    }
    if (!consent) {
      setClientError("Нужно согласие на обработку персональных данных");
      return;
    }
    if (!ageConfirmed) {
      setClientError("Нужно подтверждение возраста 18+");
      return;
    }
    setClientError(null);
    playClick();
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      formAction(formData);
    });
  }

  const cancelUrl =
    state.success && state.cancelToken
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/registration/cancel/${state.cancelToken}`
      : null;

  function copyLink() {
    if (!cancelUrl) return;
    navigator.clipboard.writeText(cancelUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleClose(next: boolean) {
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {state.success ? (
          <>
            <DialogHeader>
              <DialogTitle>Заявка отправлена</DialogTitle>
              <DialogDescription>
                Организаторы рассмотрят заявку и свяжутся с вами, чтобы подтвердить
                участие в «{tournamentTitle}».
              </DialogDescription>
            </DialogHeader>
            {state.telegramLink && (
              <div className="flex flex-col gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-3">
                <p className="text-sm">
                  Откройте нашего Telegram-бота — пришлём подтверждение от
                  организаторов и напомним перед началом турнира.
                </p>
                <Button asChild size="sm">
                  <a href={state.telegramLink} target="_blank" rel="noopener noreferrer">
                    Открыть Telegram-бота
                  </a>
                </Button>
              </div>
            )}
            {cancelUrl && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Сохраните ссылку, если понадобится отозвать заявку:
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2">
                  <code className="flex-1 truncate text-xs">{cancelUrl}</code>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                    aria-label="Скопировать ссылку"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}
            <Button onClick={() => handleClose(false)} className="mt-2">
              Готово
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Заявка на турнир</DialogTitle>
              <DialogDescription>«{tournamentTitle}»</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />

              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-name">Имя</Label>
                <Input
                  id="reg-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-phone">Телефон</Label>
                <Input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+7 900 000-00-00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-email">Email (необязательно)</Label>
                <Input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
                <Checkbox
                  name="consent"
                  className="mt-0.5"
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                />
                <span>
                  Даю согласие на обработку персональных данных в соответствии с{" "}
                  <Link href="/legal" target="_blank" className="underline hover:text-[var(--foreground)]">
                    Политикой обработки персональных данных
                  </Link>
                  .
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
                <Checkbox
                  name="age"
                  className="mt-0.5"
                  checked={ageConfirmed}
                  onCheckedChange={(v) => setAgeConfirmed(v === true)}
                />
                <span>Подтверждаю, что мне исполнилось 18 лет.</span>
              </label>

              {(clientError || state.error) && (
                <p className="text-sm text-[var(--danger)]">{clientError || state.error}</p>
              )}

              <Button type="submit" disabled={pending} className="mt-2">
                {pending ? "Отправляем…" : "Отправить заявку"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
