"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { CalendarPlus, Newspaper, LogOut, LayoutList } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

export function CommandPalette({
  onNewTournament,
  onNewNews,
  onTabChange,
}: {
  onNewTournament: () => void;
  onNewNews: () => void;
  onTabChange: (tab: "tournaments" | "news") => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Командная палитра"
      className="fixed left-1/2 top-32 z-[100] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
    >
      <Command.Input
        placeholder="Введите команду или найдите действие…"
        className="w-full border-b border-[var(--border)] bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-[var(--muted-foreground)]"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
          Ничего не найдено.
        </Command.Empty>

        <Command.Group heading="Действия" className="px-1 py-1 text-xs text-[var(--muted-foreground)]">
          <Command.Item
            onSelect={() => run(onNewTournament)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] data-[selected=true]:bg-[var(--surface-2)]"
          >
            <CalendarPlus className="h-4 w-4" /> Новый турнир
          </Command.Item>
          <Command.Item
            onSelect={() => run(onNewNews)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] data-[selected=true]:bg-[var(--surface-2)]"
          >
            <Newspaper className="h-4 w-4" /> Новая новость
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Навигация" className="px-1 py-1 text-xs text-[var(--muted-foreground)]">
          <Command.Item
            onSelect={() => run(() => onTabChange("tournaments"))}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] data-[selected=true]:bg-[var(--surface-2)]"
          >
            <LayoutList className="h-4 w-4" /> Перейти к турнирам
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => onTabChange("news"))}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] data-[selected=true]:bg-[var(--surface-2)]"
          >
            <Newspaper className="h-4 w-4" /> Перейти к новостям
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Сессия" className="px-1 py-1 text-xs text-[var(--muted-foreground)]">
          <Command.Item
            onSelect={() => run(() => { logoutAction(); })}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[var(--danger)] data-[selected=true]:bg-[var(--surface-2)]"
          >
            <LogOut className="h-4 w-4" /> Выйти
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
