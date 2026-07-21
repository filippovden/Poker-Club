import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrations, tournaments } from "@/lib/db/schema";
import { Reveal } from "@/components/reveal";
import { CancelRegistrationButton } from "@/components/tournaments/cancel-registration-button";

export const metadata: Metadata = {
  title: "Отмена заявки",
};

export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
  pending: "Заявка на рассмотрении",
  approved: "Заявка одобрена",
  rejected: "Заявка отклонена",
};

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
          Отмена заявки
        </h1>

        {!registration || !tournament ? (
          <p className="mt-6 text-sm text-[var(--muted-foreground)]">
            Заявка не найдена — возможно, она уже была отозвана.
          </p>
        ) : (
          <>
            <p className="mt-6 text-[var(--muted-foreground)]">
              {registration.name}, вы подавали заявку на турнир
            </p>
            <p className="font-display mt-2 text-xl font-medium">{tournament.title}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {formatDate(tournament.startsAt)}
            </p>
            <p className="mt-3 text-sm font-medium text-[var(--accent)]">
              {STATUS_LABELS[registration.status] ?? registration.status}
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
