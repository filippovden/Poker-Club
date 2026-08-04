import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { Badge } from "@/components/ui/badge";
import { getPlayerProfile } from "@/lib/db/stats";
import { SITE_CONTENT } from "@/lib/content";

export const revalidate = 0;

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPlayerProfile(Number(id));
  if (!profile) return { title: "Игрок не найден" };
  return {
    title: `${profile.name} — рейтинг`,
    description: `Профиль игрока ${profile.name} в ${SITE_CONTENT.clubName}: рейтинг, история турниров, места.`,
  };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getPlayerProfile(Number(id));
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-28 sm:py-32">
      <Reveal className="mb-6">
        <Link
          href="/rating"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Рейтинг
        </Link>
      </Reveal>

      <Reveal delay={0.05}>
        {profile.rank && <Badge variant="accent">#{profile.rank} в рейтинге</Badge>}
        <h1 className="font-display mt-4 text-[clamp(1.75rem,5vw,3rem)] font-medium tracking-tight">
          {profile.name}
        </h1>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-8 grid grid-cols-3 gap-3 rounded-xl border border-[var(--border)] p-5">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Рейтинг</p>
            <p className="font-display mt-1 text-2xl font-medium text-[var(--accent)]">
              {Math.round(profile.rating)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Турниров</p>
            <p className="font-display mt-1 text-2xl font-medium">{profile.tournamentsPlayed}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Лучшее место</p>
            <p className="font-display mt-1 text-2xl font-medium">
              {profile.bestPlace ?? "—"}
            </p>
          </div>
        </div>
      </Reveal>

      <section className="mt-12">
        <Reveal>
          <h2 className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            <Trophy className="h-3.5 w-3.5" /> История турниров
          </h2>
        </Reveal>
        {profile.history.length === 0 ? (
          <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            Пока нет завершённых турниров.
          </p>
        ) : (
          <RevealGroup className="overflow-hidden rounded-xl border border-[var(--border)]">
            {profile.history.map((h) => (
              <RevealItem key={h.tournamentId}>
                <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{h.tournamentTitle}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatDate(h.startsAt)} · {h.place} место
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-display text-sm font-medium ${
                      h.pointsEarned > 0
                        ? "text-[var(--live)]"
                        : h.pointsEarned < 0
                          ? "text-[var(--danger)]"
                          : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {h.pointsEarned > 0 ? "+" : ""}
                    {Math.round(h.pointsEarned)}
                  </span>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </section>
    </div>
  );
}
