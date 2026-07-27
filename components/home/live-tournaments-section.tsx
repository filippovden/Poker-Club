import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { TournamentCard } from "@/components/tournament-card";
import { Button } from "@/components/ui/button";
import { Countdown } from "./countdown";
import { getRegistrationCounts } from "@/lib/db/registration-counts";
import { getSeatAssignments } from "@/lib/db/seat-assignments";

export async function LiveTournamentsSection() {
  const [upcoming, registrationCounts, seatAssignments] = await Promise.all([
    // Soonest first — this is a "coming up next" teaser, so the furthest-out
    // events (what `desc` used to surface here) aren't what belongs on top.
    db
      .select()
      .from(tournaments)
      .where(eq(tournaments.status, "upcoming"))
      .orderBy(asc(tournaments.startsAt))
      .limit(3),
    getRegistrationCounts(),
    getSeatAssignments(),
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
              Ближайшие турниры
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/tournaments">Всё расписание →</Link>
          </Button>
        </Reveal>

        {upcoming.length > 0 && (
          <Reveal className="mb-8">
            <Countdown targetIso={upcoming[0].startsAt} />
          </Reveal>
        )}

        {upcoming.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Новые турниры скоро появятся — следите за обновлениями.
          </p>
        ) : (
          <RevealGroup className="grid gap-5 md:grid-cols-3">
            {upcoming.map((t) => (
              <RevealItem key={t.id}>
                  <TournamentCard
                  tournament={t}
                  registeredCount={registrationCounts[t.id]}
                  occupiedSeats={seatAssignments[t.id]}
                />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  );
}
