"use client";

import { useActionState, useState } from "react";
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
              <DialogTitle>Вы зарегистрированы</DialogTitle>
              <DialogDescription>
                Ждём вас на турнире «{tournamentTitle}».
              </DialogDescription>
            </DialogHeader>
            {cancelUrl && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Сохраните ссылку, если понадобится отменить регистрацию:
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
              <DialogTitle>Регистрация на турнир</DialogTitle>
              <DialogDescription>«{tournamentTitle}»</DialogDescription>
            </DialogHeader>

            <form
              action={(fd) => {
                playClick();
                formAction(fd);
              }}
              className="flex flex-col gap-4"
            >
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
                <Input id="reg-name" name="name" required autoComplete="name" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-phone">Телефон</Label>
                <Input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="+7 900 000-00-00"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-email">Email (необязательно)</Label>
                <Input id="reg-email" name="email" type="email" autoComplete="email" />
              </div>

              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
                <input type="checkbox" name="consent" required className="mt-0.5" />
                <span>
                  Даю согласие на обработку персональных данных в соответствии с{" "}
                  <Link href="/legal" target="_blank" className="underline hover:text-[var(--foreground)]">
                    Политикой обработки персональных данных
                  </Link>
                  .
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
                <input type="checkbox" name="age" required className="mt-0.5" />
                <span>Подтверждаю, что мне исполнилось 18 лет.</span>
              </label>

              {state.error && <p className="text-sm text-[var(--danger)]">{state.error}</p>}

              <Button type="submit" disabled={pending} className="mt-2">
                {pending ? "Отправляем…" : "Зарегистрироваться"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
