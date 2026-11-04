import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { getClockSnapshot } from "@/lib/actions/tournament-clock";
import { TournamentConsole } from "@/components/admin/tournament-console";

export const dynamic = "force-dynamic";

export default async function TournamentConsolePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ screen?: string }>;
}) {
  if (!(await getSession())) redirect("/admin/login");
  const { id } = await params;
  const tournamentId = Number(id);
  if (!Number.isSafeInteger(tournamentId) || tournamentId < 1) notFound();
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!tournament) notFound();
  const snapshot = await getClockSnapshot(tournamentId);
  const screenMode = (await searchParams).screen === "1";
  return <TournamentConsole tournamentId={tournamentId} title={tournament.title} format={tournament.format} initial={snapshot} screenMode={screenMode} />;
}
