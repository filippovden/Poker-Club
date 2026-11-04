import type { Metadata } from "next";
import Script from "next/script";
import { asc, eq, ne, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { MiniApp } from "@/components/miniapp/mini-app";

export const metadata: Metadata = {
  title: "Клуб в Telegram",
  description: "Турниры, заявки и рейтинг Royal63 в Telegram",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MiniAppPage() {
  const rows = await db.select({
    id: tournaments.id, title: tournaments.title, format: tournaments.format,
    startsAt: tournaments.startsAt, buyIn: tournaments.buyIn,
    maxPlayers: tournaments.maxPlayers, status: tournaments.status,
    description: tournaments.description,
  }).from(tournaments).where(and(eq(tournaments.isHidden, false), ne(tournaments.status, "completed")))
    .orderBy(asc(tournaments.startsAt));
  return <>
    <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
    <MiniApp tournaments={rows} />
  </>;
}
