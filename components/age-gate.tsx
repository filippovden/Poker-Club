"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { LogoMark } from "@/components/logo-mark";
import { SITE_CONTENT } from "@/lib/content";

function confirmAge() {
  try {
    localStorage.setItem("lp-age-confirmed", "yes");
  } catch {}
  document.documentElement.setAttribute("data-age-gate", "confirmed");
}

function leaveSite() {
  window.location.href = "https://www.google.com";
}

export function AgeGate() {
  const [checked, setChecked] = useState(false);

  return (
    <div
      className="age-gate fixed inset-0 z-[300] flex items-center justify-center bg-black/92 p-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#15120f] p-7 text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/5">
          <LogoMark className="h-6 w-6 text-white" />
        </div>

        <h2 id="age-gate-title" className="font-display mt-4 text-lg font-medium text-white">
          Подтверждение возраста
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          {`Этот сайт и участие в турнирах ${SITE_CONTENT.clubName} доступны только лицам, достигшим 18 лет.`}
        </p>

        <label className="mt-6 flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/5 p-3 text-left text-sm text-white/80">
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
            className="mt-0.5"
          />
          Подтверждаю, что мне есть 18 лет
        </label>

        <button
          type="button"
          disabled={!checked}
          onClick={confirmAge}
          className="mt-4 flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
        >
          Подтвердить и войти
        </button>

        <button
          type="button"
          onClick={leaveSite}
          className="mt-3 text-xs text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
        >
          Мне нет 18 лет
        </button>
      </div>
    </div>
  );
}
