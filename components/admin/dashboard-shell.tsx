"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Users, Command as CommandIcon } from "lucide-react";
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
}: {
  tournaments: Tournament[];
  news: NewsArticle[];
  username: string;
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
    setTournamentError(undefined);
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
    const optimisticItem: Tournament = {
      id: editingTournament?.id ?? -Date.now(),
      title: String(formData.get("title")),
      format: String(formData.get("format")) as Tournament["format"],
      startsAt: new Date(String(formData.get("startsAt"))).toISOString(),
      buyIn: formData.get("buyIn") ? Number(formData.get("buyIn")) : null,
      maxPlayers: formData.get("maxPlayers") ? Number(formData.get("maxPlayers")) : null,
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
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="truncate text-xs text-[var(--muted-foreground)]">
                        {t.format} · {new Date(t.startsAt).toLocaleString("ru-RU")}
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
                      aria-label="Участники"
                    >
                      <Users className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingTournament(t);
                        setTournamentError(undefined);
                        setTournamentDialogOpen(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                      aria-label="Изменить"
                    >
                      <Pencil className="h-3.5 w-3.5" />
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
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">
                      {new Date(item.publishedAt).toLocaleDateString("ru-RU")}
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
        open={tournamentDialogOpen}
        onOpenChange={setTournamentDialogOpen}
        tournament={editingTournament}
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
        />
      )}
    </div>
  );
}
