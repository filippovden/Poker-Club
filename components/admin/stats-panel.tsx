"use client";

import { useState, type FormEvent } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminSearchParticipants, type ParticipantSearchRow } from "@/lib/actions/registrations";
import type { TournamentStatsRow, PlayerStatsRow } from "@/lib/db/stats";

const SEARCH_STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  approved: "Одобрена",
  rejected: "Отклонена",
  playing: "В игре",
  eliminated: "Выбыл",
};

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("ru-RU", {
    timeZone: "Europe/Samara",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Escapes a value for a CSV cell (quotes anything containing a comma, quote,
// or newline, doubling internal quotes) — commas/quotes are common in free
// text like tournament titles, so a naive join(",") would corrupt columns.
function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  // Leading BOM so Excel/Google Sheets read Cyrillic as UTF-8 instead of
  // guessing a different encoding and mangling the text.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function StatsPanel({
  tournamentStats,
  playerStats,
}: {
  tournamentStats: TournamentStatsRow[];
  playerStats: PlayerStatsRow[];
}) {
  function exportTournaments() {
    downloadCsv(
      "royal63-tournaments.csv",
      ["Турнир", "Дата", "Формат", "Статус", "Бай-ин", "Игроков", "Ребаев", "Аддонов", "Деньги от ребаев/аддонов", "Общая касса"],
      tournamentStats.map((t) => [
        t.title,
        formatDate(t.startsAt),
        t.format,
        t.status,
        t.buyIn ?? "",
        t.playersCount,
        t.totalRebuys,
        t.totalAddons,
        t.rebuyAddonMoney,
        t.totalCash ?? "",
      ]),
    );
  }

  function exportPlayers() {
    downloadCsv(
      "royal63-players.csv",
      ["Игрок", "Телефон", "Рейтинг", "Турниров сыграно", "Ребаев всего", "Аддонов всего", "Деньги от ребаев/аддонов", "Бай-ины всего", "Места"],
      playerStats.map((p) => [
        p.name,
        p.phone,
        Math.round(p.rating),
        p.tournamentsPlayed,
        p.totalRebuys,
        p.totalAddons,
        p.rebuyAddonMoney,
        p.totalBuyIns,
        p.finishes.map((f) => `${f.tournamentTitle}: ${f.place}`).join("; "),
      ]),
    );
  }

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ParticipantSearchRow[] | null>(null);

  async function runSearch(e: FormEvent) {
    e.preventDefault();
    setSearching(true);
    const results = await adminSearchParticipants(query);
    setSearching(false);
    setSearchResults(results);
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="mb-4 font-display text-sm font-medium">Поиск участника</h2>
        <form onSubmit={runSearch} className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Имя или телефон"
            className="max-w-xs"
          />
          <Button type="submit" size="sm" disabled={searching || !query.trim()}>
            <Search className="h-3.5 w-3.5" />
            {searching ? "Ищем…" : "Найти"}
          </Button>
        </form>
        {searchResults !== null && (
          <div className="mt-4">
            {searchResults.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">Ничего не найдено.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                {searchResults.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="truncate text-xs text-[var(--muted-foreground)]">
                        {r.phone} · {r.tournamentTitle}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                      {SEARCH_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-medium">По турнирам</h2>
          <Button size="sm" variant="secondary" onClick={exportTournaments} disabled={tournamentStats.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Скачать CSV
          </Button>
        </div>
        {tournamentStats.length === 0 ? (
          <p className="rounded-xl border border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            Пока нет турниров для статистики.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                  <th className="px-4 py-3 font-medium">Турнир</th>
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium">Игроков</th>
                  <th className="px-4 py-3 font-medium">Ребаев</th>
                  <th className="px-4 py-3 font-medium">Аддонов</th>
                  <th className="px-4 py-3 font-medium">От ребаев/аддонов</th>
                  <th className="px-4 py-3 font-medium">Общая касса</th>
                </tr>
              </thead>
              <tbody>
                {tournamentStats.map((t) => (
                  <tr key={t.tournamentId} className="border-b border-[var(--border)] last:border-0">
                    <td className="max-w-56 truncate px-4 py-3 font-medium" title={t.title}>
                      {t.title}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDate(t.startsAt)}</td>
                    <td className="px-4 py-3">{t.playersCount}</td>
                    <td className="px-4 py-3">{t.totalRebuys}</td>
                    <td className="px-4 py-3">{t.totalAddons}</td>
                    <td className="px-4 py-3">{t.rebuyAddonMoney} ₽</td>
                    <td className="px-4 py-3 font-medium">{t.totalCash != null ? `${t.totalCash} ₽` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-medium">По игрокам</h2>
          <Button size="sm" variant="secondary" onClick={exportPlayers} disabled={playerStats.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Скачать CSV
          </Button>
        </div>
        {playerStats.length === 0 ? (
          <p className="rounded-xl border border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            Пока нет завершённых турниров с посчитанным рейтингом.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                  <th className="px-4 py-3 font-medium">Игрок</th>
                  <th className="px-4 py-3 font-medium">Рейтинг</th>
                  <th className="px-4 py-3 font-medium">Турниров</th>
                  <th className="px-4 py-3 font-medium">Ребаев</th>
                  <th className="px-4 py-3 font-medium">Аддонов</th>
                  <th className="px-4 py-3 font-medium">От ребаев/аддонов</th>
                  <th className="px-4 py-3 font-medium">Места</th>
                </tr>
              </thead>
              <tbody>
                {playerStats.map((p) => (
                  <tr key={p.playerId} className="border-b border-[var(--border)] last:border-0">
                    <td className="max-w-48 truncate px-4 py-3 font-medium" title={p.name}>
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--accent)]">{Math.round(p.rating)}</td>
                    <td className="px-4 py-3">{p.tournamentsPlayed}</td>
                    <td className="px-4 py-3">{p.totalRebuys}</td>
                    <td className="px-4 py-3">{p.totalAddons}</td>
                    <td className="px-4 py-3">{p.rebuyAddonMoney} ₽</td>
                    <td className="max-w-64 truncate px-4 py-3 text-xs text-[var(--muted-foreground)]" title={p.finishes.map((f) => `${f.tournamentTitle}: ${f.place}`).join("; ")}>
                      {p.finishes.map((f) => `${f.place}`).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
