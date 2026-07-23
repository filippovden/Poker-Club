"use client";

import { useActionState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { SITE_CONTENT } from "@/lib/content";

const initialState: LoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <Link href="/" className="mb-10 flex items-center gap-2.5">
        <LogoMark className="h-7 w-7 text-[var(--foreground)]" />
        <span className="font-display text-base font-medium">{SITE_CONTENT.clubName}</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h1 className="font-display text-xl font-medium">Вход для организаторов</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Доступ к панели управления турнирами и новостями.
        </p>

        <form action={formAction} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Логин</Label>
            <Input id="username" name="username" autoComplete="username" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {state.error && (
            <p className="text-sm text-[var(--danger)]">{state.error}</p>
          )}

          <Button type="submit" size="lg" disabled={pending} className="mt-2">
            {pending ? "Входим…" : "Войти"}
          </Button>
        </form>
      </div>
    </div>
  );
}
