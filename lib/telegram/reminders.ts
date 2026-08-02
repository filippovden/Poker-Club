import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrations, tournaments } from "@/lib/db/schema";
import { sendTelegramMessage } from "./client";
import { buildReminderMessage, buildReminderButtons } from "./messages";

// Ordered largest-first so a registration that's gone quiet for a while
// (e.g. the bot was down) catches up through each unsent reminder in one
// pass rather than skipping straight to the most urgent one.
const REMINDER_THRESHOLDS = [
  { hours: 24, field: "reminded24h", phrase: "завтра" },
  { hours: 2, field: "reminded2h", phrase: "совсем скоро" },
] as const;

export async function checkReminders() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;

  const approved = await db
    .select()
    .from(registrations)
    .where(and(eq(registrations.status, "approved"), isNotNull(registrations.telegramChatId)));

  const now = Date.now();

  for (const registration of approved) {
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, registration.tournamentId))
      .limit(1);
    if (!tournament || tournament.status === "completed" || tournament.isHidden) continue;

    const hoursUntil = (new Date(tournament.startsAt).getTime() - now) / 3_600_000;
    if (hoursUntil <= 0) continue;

    for (const threshold of REMINDER_THRESHOLDS) {
      if (hoursUntil > threshold.hours) continue;
      if (registration[threshold.field]) continue;

      await sendTelegramMessage(
        registration.telegramChatId!,
        buildReminderMessage(tournament, threshold.phrase),
        { buttons: buildReminderButtons(registration.id) },
      );
      await db
        .update(registrations)
        .set({ [threshold.field]: true })
        .where(eq(registrations.id, registration.id));
    }
  }
}
