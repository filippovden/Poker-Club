import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tournaments, news } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/admin/dashboard-shell";

export const revalidate = 0;

export default async function DashboardPage() {
  const [allTournaments, allNews, session] = await Promise.all([
    db.select().from(tournaments).orderBy(desc(tournaments.startsAt)),
    db.select().from(news).orderBy(desc(news.publishedAt)),
    getSession(),
  ]);

  return (
    <DashboardShell
      tournaments={allTournaments}
      news={allNews}
      username={session?.username ?? "admin"}
    />
  );
}
