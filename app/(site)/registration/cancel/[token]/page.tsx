import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrations, tournaments } from "@/lib/db/schema";
import { Reveal } from "@/components/reveal";
import { CancelRegistrationView } from "@/components/tournaments/cancel-registration-view";

export const metadata: Metadata = {
  title: "Отмена заявки",
};

export const revalidate = 0;

export default async function CancelRegistrationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [registration] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.cancelToken, token))
    .limit(1);

  const tournament = registration
    ? (
        await db
          .select()
          .from(tournaments)
          .where(eq(tournaments.id, registration.tournamentId))
          .limit(1)
      )[0]
    : null;

  return (
    <div className="mx-auto max-w-md px-6 py-28 sm:py-32">
      <Reveal>
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Отмена заявки
        </h1>

        <CancelRegistrationView
          token={token}
          registration={registration ?? null}
          tournament={tournament ?? null}
        />
      </Reveal>
    </div>
  );
}
