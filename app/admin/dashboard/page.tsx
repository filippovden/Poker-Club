import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tournaments, news } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getRegistrationStatusCounts } from "@/lib/db/registration-status-counts";
import { getTournamentStats, getPlayerStats, getTournamentLedger } from "@/lib/db/stats";
import { DashboardShell } from "@/components/admin/dashboard-shell";

export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const [allTournaments, allNews, statusCounts, tournamentStats, playerStats, ledger] = await Promise.all([
    db.select().from(tournaments).orderBy(desc(tournaments.startsAt)),
    db.select().from(news).orderBy(desc(news.publishedAt)),
    getRegistrationStatusCounts(),
    getTournamentStats(),
    getPlayerStats(),
    getTournamentLedger(),
  ]);

  return (
    <DashboardShell
      tournaments={allTournaments}
      news={allNews}
      username={session.username}
      statusCounts={statusCounts}
      tournamentStats={tournamentStats}
      playerStats={playerStats}
      ledger={ledger}
    />
  );
}
