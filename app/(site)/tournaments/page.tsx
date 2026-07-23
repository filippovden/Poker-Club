import type { Metadata } from "next";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { TournamentsClient } from "@/components/tournaments/tournaments-client";
import { Reveal } from "@/components/reveal";
import { getRegistrationCounts } from "@/lib/db/registration-counts";
import { getSeatAssignments } from "@/lib/db/seat-assignments";
import { getTournamentResults } from "@/lib/db/tournament-results";
import { SITE_CONTENT } from "@/lib/content";

const TOURNAMENTS_DESCRIPTION = `Расписание турниров по покеру в Тольятти — ${SITE_CONTENT.clubName}: No-Limit Hold'em, Pot-Limit Omaha и многостоловые турниры каждую неделю.`;

export const metadata: Metadata = {
  title: "Турниры по покеру в Тольятти",
  description: TOURNAMENTS_DESCRIPTION,
  alternates: { canonical: "/tournaments" },
  openGraph: { title: `Турниры — ${SITE_CONTENT.clubName}`, description: TOURNAMENTS_DESCRIPTION },
};

export const revalidate = 0;

export default async function TournamentsPage() {
  const [fetched, registrationCounts, seatAssignments, results] = await Promise.all([
    db.select().from(tournaments),
    getRegistrationCounts(),
    getSeatAssignments(),
    getTournamentResults(),
  ]);

  // Upcoming/live first (soonest next), completed last (most recent first)
  // — a plain date sort would otherwise mix a far-future tournament in
  // above one starting tomorrow, or bury it under old completed ones.
  const all = [...fetched].sort((a, b) => {
    const aPast = a.status === "completed";
    const bPast = b.status === "completed";
    if (aPast !== bPast) return aPast ? 1 : -1;
    const aTime = new Date(a.startsAt).getTime();
    const bTime = new Date(b.startsAt).getTime();
    return aPast ? bTime - aTime : aTime - bTime;
  });

  const upcomingEvents = all
    .filter((t) => t.status !== "completed")
    .map((t) => ({
      "@type": "Event",
      name: t.title,
      startDate: t.startsAt,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      description: t.description ?? undefined,
      offers: t.buyIn
        ? {
            "@type": "Offer",
            price: t.buyIn,
            priceCurrency: "RUB",
          }
        : undefined,
    }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-28 sm:py-32">
      {upcomingEvents.length > 0 && (
        <script
          type="application/ld+json"
           
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": upcomingEvents,
            }),
          }}
        />
      )}
      <Reveal className="mb-12">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
          Расписание
        </span>
        <h1 className="font-display mt-4 text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-tight">
          Турниры
        </h1>
        <p className="mt-4 max-w-lg text-[var(--muted-foreground)]">
          Живые турниры по No-Limit Hold&apos;em и Pot-Limit Omaha каждую
          неделю. Следите за расписанием и записывайтесь заранее.
        </p>
      </Reveal>

      <TournamentsClient
        tournaments={all}
        registrationCounts={registrationCounts}
        seatAssignments={seatAssignments}
        results={results}
      />
    </div>
  );
}
