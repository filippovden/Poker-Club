import type { Metadata } from "next";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { TournamentsClient } from "@/components/tournaments/tournaments-client";
import { Reveal } from "@/components/reveal";
import { getRegistrationCounts } from "@/lib/db/registration-counts";
import { getSeatAssignments } from "@/lib/db/seat-assignments";
import { SITE_CONTENT } from "@/lib/content";

export const metadata: Metadata = {
  title: "Турниры",
  description: `Расписание турниров ${SITE_CONTENT.clubName}: No-Limit Hold'em, Pot-Limit Omaha и многостоловые турниры.`,
};

export const revalidate = 0;

export default async function TournamentsPage() {
  const [all, registrationCounts, seatAssignments] = await Promise.all([
    db.select().from(tournaments).orderBy(desc(tournaments.startsAt)),
    getRegistrationCounts(),
    getSeatAssignments(),
  ]);

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
      />
    </div>
  );
}
