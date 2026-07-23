import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrations, tournaments } from "@/lib/db/schema";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { buildApprovedMessage, buildRejectedMessage } from "@/lib/telegram/messages";

export interface SetStatusResult {
  error?: string;
  status?: "pending" | "approved" | "rejected";
}

// Shared by the admin dashboard's server action (auth: session cookie) and
// the Telegram bot's inline approve/reject buttons (auth: being a member of
// the private admin chat) — the DB write and client notification should
// behave identically regardless of who triggered it.
export async function setRegistrationStatus(
  id: number,
  status: "pending" | "approved" | "rejected",
): Promise<SetStatusResult> {
  const [registration] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, id))
    .limit(1);
  if (!registration) return { error: "Заявка не найдена — возможно, уже отозвана" };

  const patch: Partial<typeof registrations.$inferInsert> = { status };
  if (status !== "approved") {
    patch.tableNumber = null;
    patch.seatNumber = null;
  }
  await db.update(registrations).set(patch).where(eq(registrations.id, id));

  if ((status === "approved" || status === "rejected") && registration.telegramChatId) {
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, registration.tournamentId))
      .limit(1);
    if (tournament) {
      const text =
        status === "approved" ? buildApprovedMessage(tournament) : buildRejectedMessage(tournament);
      sendTelegramMessage(registration.telegramChatId, text).catch((err) =>
        console.error("[telegram] status notify failed:", err),
      );
    }
  }

  return { status };
}
