import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Reveal } from "@/components/reveal";
import { Badge } from "@/components/ui/badge";
import { RatingListClient } from "@/components/rating/rating-list-client";
import { db } from "@/lib/db/client";
import { players } from "@/lib/db/schema";
import { SITE_CONTENT } from "@/lib/content";

const RATING_DESCRIPTION = `Рейтинг игроков ${SITE_CONTENT.clubName} по результатам турниров.`;

export const metadata: Metadata = {
  title: "Рейтинг",
  description: RATING_DESCRIPTION,
  alternates: { canonical: "/rating" },
  openGraph: { title: `Рейтинг — ${SITE_CONTENT.clubName}`, description: RATING_DESCRIPTION },
};

export const revalidate = 0;

export default async function RatingPage() {
  const ranked = await db.select().from(players).orderBy(desc(players.rating));

  return (
    <div className="mx-auto max-w-3xl px-6 py-28 sm:py-32">
      <Reveal className="mb-6">
        <Badge variant="accent">Рейтинг клуба</Badge>
      </Reveal>
      <Reveal delay={0.05}>
        <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] font-medium tracking-tight">
          Рейтинг игроков
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted-foreground)]">
          Рейтинг обновляется после завершения каждого турнира: место в
          верхней половине сетки повышает рейтинг, в нижней — понижает, тем
          сильнее, чем больше был турнир.
        </p>
      </Reveal>

      <section className="mt-14">
        {ranked.length === 0 ? (
          <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            Рейтинг пока пуст — станет доступен после первого завершённого турнира.
          </p>
        ) : (
          <RatingListClient players={ranked} />
        )}
      </section>
    </div>
  );
}
