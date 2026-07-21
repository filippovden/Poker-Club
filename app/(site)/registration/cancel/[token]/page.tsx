import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrations, tournaments } from "@/lib/db/schema";
import { Reveal } from "@/components/reveal";
import { CancelRegistrationButton } from "@/components/tournaments/cancel-registration-button";

export const metadata: Metadata = {
  title: "Отмена регистрации",
};

export const revalidate = 0;

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
          Отмена регистрации
        </h1>

        {!registration || !tournament ? (
          <p className="mt-6 text-sm text-[var(--muted-foreground)]">
            Регистрация не найдена — возможно, она уже была отменена.
          </p>
        ) : (
          <>
            <p className="mt-6 text-[var(--muted-foreground)]">
              {registration.name}, вы записаны на турнир
            </p>
            <p className="font-display mt-2 text-xl font-medium">{tournament.title}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {formatDate(tournament.startsAt)}
            </p>

            <div className="mt-8">
              <CancelRegistrationButton token={token} />
            </div>
          </>
        )}
      </Reveal>
    </div>
  );
}
