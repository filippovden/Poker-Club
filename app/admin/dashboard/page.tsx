import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tournaments, news } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { getRegistrationStatusCounts } from "@/lib/db/registration-status-counts";
import { getTournamentStats, getPlayerStats, getTournamentLedger } from "@/lib/db/stats";
import { DashboardShell } from "@/components/admin/dashboard-shell";

export const revalidate = 0;

export default async function DashboardPage() {
  const [allTournaments, allNews, session, statusCounts, tournamentStats, playerStats, ledger] = await Promise.all([
    db.select().from(tournaments).orderBy(desc(tournaments.startsAt)),
    db.select().from(news).orderBy(desc(news.publishedAt)),
    getSession(),
    getRegistrationStatusCounts(),
    getTournamentStats(),
    getPlayerStats(),
    getTournamentLedger(),
  ]);

  return (
    <DashboardShell
      tournaments={allTournaments}
      news={allNews}
      username={session?.username ?? "admin"}
      statusCounts={statusCounts}
      tournamentStats={tournamentStats}
      playerStats={playerStats}
      ledger={ledger}
    />
  );
}
