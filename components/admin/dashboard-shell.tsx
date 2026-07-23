"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Users, Command as CommandIcon, Copy } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CommandPalette } from "./command-palette";
import { TournamentFormDialog } from "./tournament-form-dialog";
import { NewsFormDialog } from "./news-form-dialog";
import { RegistrationsDialog } from "./registrations-dialog";
import {
  createTournamentAction,
  updateTournamentAction,
  deleteTournamentAction,
} from "@/lib/actions/tournaments";
import { createNewsAction, updateNewsAction, deleteNewsAction } from "@/lib/actions/news";
import { logoutAction } from "@/lib/actions/auth";
import { playClick } from "@/lib/sound";
import type { Tournament, NewsArticle } from "@/lib/db/schema";

type OptimisticAction<T> =
  | { type: "add"; item: T }
  | { type: "update"; item: T }
  | { type: "remove"; id: number };

function reducer<T extends { id: number }>(state: T[], action: OptimisticAction<T>): T[] {
  if (action.type === "add") return [action.item, ...state];
  if (action.type === "update")
    return state.map((i) => (i.id === action.item.id ? action.item : i));
  return state.filter((i) => i.id !== action.id);
}

export function DashboardShell({
  tournaments,
  news,
  username,
  statusCounts = {},
}: {
  tournaments: Tournament[];
  news: NewsArticle[];
  username: string;
  statusCounts?: Record<number, { pending: number; approved: number; rejected: number }>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"tournaments" | "news">("tournaments");
  const [, startTransition] = useTransition();

  const [optimisticTournaments, dispatchTournaments] = useOptimistic(
    tournaments,
    reducer<Tournament>,
  );
  const [optimisticNews, dispatchNews] = useOptimistic(news, reducer<NewsArticle>);

  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [duplicateSeed, setDuplicateSeed] = useState<Tournament | null>(null);
  const [tournamentFormKey, setTournamentFormKey] = useState(0);
  const [tournamentError, setTournamentError] = useState<string>();
  const [tournamentPending, setTournamentPending] = useState(false);

  const [registrationsDialogOpen, setRegistrationsDialogOpen] = useState(false);
  const [registrationsTournament, setRegistrationsTournament] = useState<Tournament | null>(
    null,
  );

  const [newsDialogOpen, setNewsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsArticle | null>(null);
  const [newsError, setNewsError] = useState<string>();
  const [newsPending, setNewsPending] = useState(false);

  function openNewTournament() {
    setEditingTournament(null);
    setDuplicateSeed(null);
    setTournamentError(undefined);
    setTournamentFormKey((k) => k + 1);
    setTournamentDialogOpen(true);
  }

  function duplicateTournament(t: Tournament) {
    playClick();
    setEditingTournament(null);
    setDuplicateSeed({
      ...t,
      title: `${t.title} (копия)`,
      startsAt: new Date(new Date(t.startsAt).getTime() + 7 * 24 * 3_600_000).toISOString(),
      status: "upcoming",
    });
    setTournamentError(undefined);
    setTournamentFormKey((k) => k + 1);
    setTournamentDialogOpen(true);
  }

  function openNewNews() {
    setEditingNews(null);
    setNewsError(undefined);
    setNewsDialogOpen(true);
  }

  function submitTournament(formData: FormData) {
    playClick();
    setTournamentError(undefined);
    setTournamentPending(true);
    const tableCount = formData.get("tableCount") ? Number(formData.get("tableCount")) : null;
    const seatsPerTable = formData.get("seatsPerTable")
      ? Number(formData.get("seatsPerTable"))
      : null;
    const optimisticItem: Tournament = {
      id: editingTournament?.id ?? -Date.now(),
      title: String(formData.get("title")),
      format: String(formData.get("format")) as Tournament["format"],
      startsAt: new Date(String(formData.get("startsAt"))).toISOString(),
      buyIn: formData.get("buyIn") ? Number(formData.get("buyIn")) : null,
      maxPlayers:
        tableCount != null && seatsPerTable != null
          ? tableCount * seatsPerTable
          : formData.get("maxPlayers")
            ? Number(formData.get("maxPlayers"))
            : null,
      tableCount,
      seatsPerTable,
      description: String(formData.get("description") || "") || null,
      status: String(formData.get("status")) as Tournament["status"],
      createdAt: editingTournament?.createdAt ?? new Date().toISOString(),
    };

    startTransition(async () => {
      dispatchTournaments(
        editingTournament ? { type: "update", item: optimisticItem } : { type: "add", item: optimisticItem },
      );
      const result = editingTournament
        ? await updateTournamentAction(editingTournament.id, {}, formData)
        : await createTournamentAction({}, formData);

      setTournamentPending(false);
      if (result.error) {
        setTournamentError(result.error);
        return;
      }
      setTournamentDialogOpen(false);
      router.refresh();
    });
  }

  function submitNews(formData: FormData) {
    playClick();
    setNewsError(undefined);
    setNewsPending(true);
    const optimisticItem: NewsArticle = {
      id: editingNews?.id ?? -Date.now(),
      title: String(formData.get("title")),
      slug: editingNews?.slug ?? "…",
      excerpt: String(formData.get("excerpt") || "") || null,
      content: String(formData.get("content")),
      coverImage: editingNews?.coverImage ?? null,
      publishedAt: editingNews?.publishedAt ?? new Date().toISOString(),
    };

    startTransition(async () => {
      dispatchNews(editingNews ? { type: "update", item: optimisticItem } : { type: "add", item: optimisticItem });
      const result = editingNews
        ? await updateNewsAction(editingNews.id, {}, formData)
        : await createNewsAction({}, formData);

      setNewsPending(false);
      if (result.error) {
        setNewsError(result.error);
        return;
      }
      setNewsDialogOpen(false);
      router.refresh();
    });
  }

  function removeTournament(t: Tournament) {
    if (!confirm(`Удалить турнир «${t.title}»?`)) return;
    startTransition(async () => {
      dispatchTournaments({ type: "remove", id: t.id });
      await deleteTournamentAction(t.id);
      router.refresh();
    });
  }

  function removeNews(item: NewsArticle) {
    if (!confirm(`Удалить новость «${item.title}»?`)) return;
    startTransition(async () => {
      dispatchNews({ type: "remove", id: item.id });
      await deleteNewsAction(item.id);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <CommandPalette
        onNewTournament={openNewTournament}
        onNewNews={openNewNews}
        onTabChange={setTab}
      />

      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-6 w-6 text-[var(--foreground)]" />
          <span className="font-display text-sm font-medium">Панель организатора</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-[var(--muted-foreground)] sm:inline">
            {username}
          </span>
          <button
            className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] sm:flex"
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          >
            <CommandIcon className="h-3 w-3" /> K
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => startTransition(async () => { await logoutAction(); })}
          >
            Выйти
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="mb-6 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="tournaments">Турниры</TabsTrigger>
            <TabsTrigger value="news">Новости</TabsTrigger>
          </TabsList>
          <Button
            size="sm"
            data-testid="add-item-button"
            onClick={tab === "tournaments" ? openNewTournament : openNewNews}
          >
            <Plus className="h-4 w-4" />
            {tab === "tournaments" ? "Турнир" : "Новость"}
          </Button>
        </div>

        <TabsContent value="tournaments">
          {(() => {
            const totals = Object.values(statusCounts).reduce(
              (acc, c) => ({
                pending: acc.pending + c.pending,
                approved: acc.approved + c.approved,
                rejected: acc.rejected + c.rejected,
              }),
              { pending: 0, approved: 0, rejected: 0 },
            );
            const total = totals.pending + totals.approved + totals.rejected;
            if (total === 0) return null;
            return (
              <div className="mb-4 flex flex-wrap gap-4 rounded-xl border border-[var(--border)] p-4 text-sm">
                <span>
                  <span className="font-semibold">{totals.pending}</span>{" "}
                  <span className="text-[var(--muted-foreground)]">на рассмотрении</span>
                </span>
                <span>
                  <span className="font-semibold text-[var(--live)]">{totals.approved}</span>{" "}
                  <span className="text-[var(--muted-foreground)]">одобрено всего</span>
                </span>
                <span>
                  <span className="font-semibold text-[var(--danger)]">{totals.rejected}</span>{" "}
                  <span className="text-[var(--muted-foreground)]">отклонено</span>
                </span>
              </div>
            );
          })()}
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            {optimisticTournaments.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">
                Турниров пока нет.
              </p>
            ) : (
              optimisticTournaments.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-3.5 last:border-0 hover:bg-[var(--surface-2)]/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge variant={t.status === "live" ? "live" : "outline"} className="shrink-0">
                      {t.status === "upcoming" ? "Скоро" : t.status === "live" ? "Live" : "Завершён"}
                    </Badge>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" title={t.title}>{t.title}</p>
                      <p className="truncate text-xs text-[var(--muted-foreground)]">
                        {t.format} ·{" "}
                        {new Date(t.startsAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}
                        {statusCounts[t.id] && (
                          <>
                            {" · "}
                            <span className="text-[var(--live)]">
                              {statusCounts[t.id].approved} одобр.
                            </span>
                            {statusCounts[t.id].pending > 0 && (
                              <> · {statusCounts[t.id].pending} ожид.</>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => {
                        setRegistrationsTournament(t);
                        setRegistrationsDialogOpen(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                      aria-label="Заявки"
                      title="Заявки"
                    >
                      <Users className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingTournament(t);
                        setDuplicateSeed(null);
                        setTournamentError(undefined);
                        setTournamentFormKey((k) => k + 1);
                        setTournamentDialogOpen(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                      aria-label="Изменить"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => duplicateTournament(t)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                      aria-label="Дублировать (на неделю позже)"
                      title="Дублировать (на неделю позже)"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeTournament(t)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="news">
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            {optimisticNews.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">
                Новостей пока нет.
              </p>
            ) : (
              optimisticNews.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-3.5 last:border-0 hover:bg-[var(--surface-2)]/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={item.title}>{item.title}</p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">
                      {new Date(item.publishedAt).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => {
                        setEditingNews(item);
                        setNewsError(undefined);
                        setNewsDialogOpen(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                      aria-label="Изменить"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeNews(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <TournamentFormDialog
        key={tournamentFormKey}
        open={tournamentDialogOpen}
        onOpenChange={setTournamentDialogOpen}
        tournament={editingTournament}
        defaults={duplicateSeed}
        onSubmit={submitTournament}
        error={tournamentError}
        pending={tournamentPending}
      />
      <NewsFormDialog
        open={newsDialogOpen}
        onOpenChange={setNewsDialogOpen}
        article={editingNews}
        onSubmit={submitNews}
        error={newsError}
        pending={newsPending}
      />
      {registrationsTournament && (
        <RegistrationsDialog
          open={registrationsDialogOpen}
          onOpenChange={setRegistrationsDialogOpen}
          tournamentId={registrationsTournament.id}
          tournamentTitle={registrationsTournament.title}
          tableCount={registrationsTournament.tableCount}
          seatsPerTable={registrationsTournament.seatsPerTable}
        />
      )}
    </div>
  );
}
