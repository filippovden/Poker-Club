import { randomUUID } from "node:crypto";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrations, tournaments, type Tournament } from "@/lib/db/schema";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { buildAdminNewRegistrationMessage } from "@/lib/telegram/messages";

export interface CreateRegistrationResult {
  error?: string;
  success?: boolean;
  cancelToken?: string;
  tournament?: Tournament;
}

// Shared by the website's registration form (lib/actions/registrations.ts)
// and the Telegram bot's own "Подать заявку" flow — both collect the same
// name/phone/email and must apply identical validation, dedup, and admin
// notification behavior regardless of where the application came from.
export async function createRegistration(params: {
  tournamentId: number;
  name: string;
  phone: string;
  email?: string | null;
  // Free-text note from the applicant (e.g. "первый раз, подскажите как
  // проходит турнир") — shown to organizers alongside the application.
  comment?: string | null;
  // Set when the bot itself collected the application — skips the usual
  // deep-link dance since we already know which chat to notify.
  telegramChatId?: string | null;
  // Only ever known when the bot collected the application — shown in the
  // admin chat's participant list so staff can find someone on Telegram.
  telegramUsername?: string | null;
}): Promise<CreateRegistrationResult> {
  const { tournamentId, name, phone, email, comment, telegramChatId, telegramUsername } = params;

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) return { error: "Турнир не найден" };
  if (tournament.status === "completed") {
    return { error: "Регистрация на этот турнир уже закрыта" };
  }

  // Once approved seats reach the cap, registration closes outright rather
  // than queuing new applications as a waitlist — organizers asked for new
  // signups to stop appearing once a tournament is full, not just capped
  // at approval time. Once the tournament starts, those same players move
  // from "approved" to "playing" and then "eliminated" as they bust — they
  // still occupy the cap, so all three count as taken seats (otherwise a
  // full tournament would silently reopen registration the moment it went
  // live).
  if (tournament.maxPlayers) {
    const [{ value: takenCount }] = await db
      .select({ value: count() })
      .from(registrations)
      .where(
        and(
          eq(registrations.tournamentId, tournamentId),
          inArray(registrations.status, ["approved", "playing", "eliminated"]),
        ),
      );
    if (takenCount >= tournament.maxPlayers) {
      return { error: "Все места заняты — регистрация на этот турнир закрыта." };
    }
  }

  const duplicateConditions = [eq(registrations.phone, phone)];
  if (email) duplicateConditions.push(eq(registrations.email, email));

  const [existing] = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        or(...duplicateConditions),
        // Covers every status that means "already has a live application or
        // is already at the table" — not just pending/approved, since a
        // seated/playing/busted player re-submitting shouldn't create a
        // second application for a tournament they're already part of.
        inArray(registrations.status, ["pending", "approved", "playing", "eliminated"]),
      ),
    )
    .limit(1);

  if (existing) {
    return { error: "Вы уже подавали заявку на этот турнир" };
  }

  const cancelToken = randomUUID();

  await db.insert(registrations).values({
    tournamentId,
    name,
    phone,
    email: email || null,
    comment: comment || null,
    cancelToken,
    status: "pending",
    telegramChatId: telegramChatId || null,
    telegramUsername: telegramUsername || null,
  });

  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (adminChatId) {
    const [inserted] = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(eq(registrations.cancelToken, cancelToken))
      .limit(1);
    sendTelegramMessage(
      adminChatId,
      buildAdminNewRegistrationMessage({ name, phone, email, comment, tournament }),
      inserted
        ? {
            buttons: [
              [
                { text: "✅ Подтвердить", callback_data: `approve:${inserted.id}` },
                { text: "❌ Отклонить", callback_data: `reject:${inserted.id}` },
              ],
            ],
          }
        : undefined,
    ).catch((err) => console.error("[telegram] admin notify failed:", err));
  }

  return { success: true, cancelToken, tournament };
}
