"use server";

import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrations, tournaments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { sendTelegramMessage, sendTelegramPhoto } from "@/lib/telegram/client";
import { escapeHtml } from "@/lib/telegram/messages";

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Требуется авторизация");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PHOTO_CAPTION_LIMIT = 1024;
const TEXT_LIMIT = 4096;

export interface AnnounceResult {
  error?: string;
  success?: boolean;
  sentCount?: number;
}

// A hand-written announcement (not the generic auto "Новый турнир!" one
// announceNewTournament sends) — for promo copy that needs its own tone,
// formatting and optionally a picture. Reuses the exact same audience
// (everyone with a linked Telegram chat) and the same "✍️ Подать заявку"
// button/callback as every other broadcast, so applying still works the
// same way regardless of which message got someone there.
export async function adminSendCustomAnnouncement(
  tournamentId: number,
  text: string,
  photoUrl: string | null,
): Promise<AnnounceResult> {
  await requireAdmin();
  if (!process.env.TELEGRAM_BOT_TOKEN) return { error: "Telegram-бот не настроен" };

  const trimmed = text.trim();
  if (!trimmed) return { error: "Введите текст объявления" };
  const limit = photoUrl ? PHOTO_CAPTION_LIMIT : TEXT_LIMIT;
  if (trimmed.length > limit) {
    return { error: `Слишком длинный текст (максимум ${limit} символов${photoUrl ? " для сообщения с фото" : ""})` };
  }

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!tournament) return { error: "Турнир не найден" };

  const rows = await db
    .selectDistinct({ chatId: registrations.telegramChatId })
    .from(registrations)
    .where(isNotNull(registrations.telegramChatId));

  const escaped = escapeHtml(trimmed);
  const buttons = [[{ text: "✍️ Подать заявку", callback_data: `apply_start:${tournament.id}` }]];

  let sentCount = 0;
  // Sent one at a time with a small stagger, same as announceNewTournament —
  // polite to Telegram's per-bot rate limits for what's still a small
  // club-sized audience.
  for (const { chatId } of rows) {
    if (!chatId) continue;
    const sent = photoUrl
      ? await sendTelegramPhoto(chatId, photoUrl, escaped, { buttons }).catch((err) => {
          console.error("[telegram] custom announcement (photo) failed:", err);
          return null;
        })
      : await sendTelegramMessage(chatId, escaped, { buttons }).catch((err) => {
          console.error("[telegram] custom announcement failed:", err);
          return null;
        });
    if (sent) sentCount++;
    await sleep(50);
  }

  return { success: true, sentCount };
}
