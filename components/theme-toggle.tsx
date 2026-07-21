"use client";

import { Moon, Sun } from "lucide-react";

function toggle() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("lp-theme", next);
}

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Переключить тему"
      title="Переключить тему"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
    >
      <Sun className="theme-icon-sun h-4 w-4" />
      <Moon className="theme-icon-moon h-4 w-4" />
    </button>
  );
}
