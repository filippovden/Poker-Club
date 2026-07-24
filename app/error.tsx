"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[100svh] max-w-lg flex-col items-center justify-center px-6 py-28 text-center">
      <LogoMark className="h-10 w-10 text-[var(--accent)]" />
      <p className="font-display mt-6 text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
        Что-то пошло не так
      </p>
      <h1 className="font-display mt-3 text-[clamp(1.75rem,5vw,2.75rem)] font-medium tracking-tight">
        Не удалось загрузить страницу
      </h1>
      <p className="mt-4 max-w-sm text-[var(--muted-foreground)]">
        Попробуйте обновить страницу — если ошибка повторится, напишите нам в{" "}
        Telegram.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={() => reset()}>
          Попробовать снова
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="border-white/25 hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </div>
  );
}
