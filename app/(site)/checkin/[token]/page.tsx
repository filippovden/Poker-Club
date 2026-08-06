import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/reveal";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { CheckinView } from "@/components/checkin/checkin-view";

// This page only exists to be reached by scanning a tournament's printed
// QR code — never linked from anywhere else on the site, and kept out of
// search entirely so the only way in is the physical code at the door.
export const metadata: Metadata = {
  title: "Регистрация на входе",
  robots: { index: false, follow: false },
};

export default async function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.checkinToken, token))
    .limit(1);

  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-md px-6 py-28 sm:py-32">
      <Reveal>
        <h1 className="font-display text-2xl font-medium tracking-tight">{tournament.title}</h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          Подтвердите, что вы на месте — введите телефон и имя, как указывали при регистрации.
        </p>
        <div className="mt-8">
          <CheckinView token={token} />
        </div>
      </Reveal>
    </div>
  );
}
