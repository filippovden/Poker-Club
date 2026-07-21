import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { TournamentCard } from "@/components/tournament-card";
import { Button } from "@/components/ui/button";
import { getRegistrationCounts } from "@/lib/db/registration-counts";

export async function LiveTournamentsSection() {
  const [upcoming, registrationCounts] = await Promise.all([
    db
      .select()
      .from(tournaments)
      .where(eq(tournaments.status, "upcoming"))
      .orderBy(desc(tournaments.startsAt))
      .limit(3),
    getRegistrationCounts(),
  ]);

  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface)]/40 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
              Расписание
            </span>
            <h2 className="font-display mt-4 text-[clamp(1.75rem,4vw,3rem)] font-medium tracking-tight">
              Живые турниры
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/tournaments">Всё расписание →</Link>
          </Button>
        </Reveal>

        {upcoming.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Новые турниры скоро появятся — следите за обновлениями.
          </p>
        ) : (
          <RevealGroup className="grid gap-5 md:grid-cols-3">
            {upcoming.map((t) => (
              <RevealItem key={t.id}>
                <TournamentCard tournament={t} registeredCount={registrationCounts[t.id]} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  );
}
