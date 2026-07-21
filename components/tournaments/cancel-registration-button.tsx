"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelRegistrationAction } from "@/lib/actions/registrations";

export function CancelRegistrationButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null);

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelRegistrationAction(token);
      setResult(res);
    });
  }

  if (result?.success) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        Регистрация отменена. Если передумаете — вы всегда можете
        зарегистрироваться заново на странице турниров.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" disabled={pending} onClick={handleCancel}>
        {pending ? "Отменяем…" : "Отменить регистрацию"}
      </Button>
      {result?.error && <p className="text-sm text-[var(--danger)]">{result.error}</p>}
    </div>
  );
}
