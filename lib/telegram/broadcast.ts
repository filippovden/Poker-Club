import { isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrations } from "@/lib/db/schema";
import type { Tournament } from "@/lib/db/schema";
import { sendTelegramMessage } from "./client";
import { buildNewTournamentAnnouncementMessage } from "./messages";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Tells everyone who has ever linked their Telegram chat (by applying to
// any past tournament) about a brand new one, with a button that starts
// the in-bot application for it directly — no need to dig up the site.
export async function announceNewTournament(tournament: Tournament) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;

  const rows = await db
    .selectDistinct({ chatId: registrations.telegramChatId })
    .from(registrations)
    .where(isNotNull(registrations.telegramChatId));

  const text = buildNewTournamentAnnouncementMessage(tournament);
  const buttons = [[{ text: "✍️ Подать заявку", callback_data: `apply_start:${tournament.id}` }]];

  // Sent one at a time with a small stagger rather than all at once —
  // polite to Telegram's per-bot rate limits, and this only ever runs for
  // a small club's worth of past applicants, so there's no throughput need
  // to parallelize.
  for (const { chatId } of rows) {
    if (!chatId) continue;
    await sendTelegramMessage(chatId, text, { buttons }).catch((err) =>
      console.error("[telegram] new-tournament announcement failed:", err),
    );
    await sleep(50);
  }
}
