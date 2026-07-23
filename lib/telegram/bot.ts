import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrations, tournaments } from "@/lib/db/schema";
import { setRegistrationStatus } from "@/lib/registrations/set-status";
import {
  answerCallbackQuery,
  editMessageText,
  getTelegramUpdates,
  sendTelegramMessage,
  type TelegramUpdate,
} from "./client";
import { buildRegisteredMessage } from "./messages";

async function handleStart(chatId: number, token: string | undefined) {
  if (!token) {
    await sendTelegramMessage(
      chatId,
      "Привет! Чтобы получать уведомления о заявке на турнир, перейдите по ссылке, которая появляется на сайте сразу после записи.",
    );
    return;
  }

  const [registration] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.cancelToken, token))
    .limit(1);

  if (!registration) {
    await sendTelegramMessage(
      chatId,
      "Не нашли вашу заявку — возможно, ссылка устарела или заявка уже отозвана.",
    );
    return;
  }

  await db
    .update(registrations)
    .set({ telegramChatId: String(chatId) })
    .where(eq(registrations.id, registration.id));

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, registration.tournamentId))
    .limit(1);

  if (tournament) {
    await sendTelegramMessage(chatId, buildRegisteredMessage(registration.name, tournament));
  }
}

async function handleMessage(update: TelegramUpdate) {
  const text = update.message?.text;
  const chatId = update.message?.chat.id;
  if (!text || !chatId) return;

  const match = /^\/start(?:\s+(\S+))?/.exec(text);
  if (!match) return;
  await handleStart(chatId, match[1]);
}

// Approve/reject buttons only ever appear on messages posted to the admin
// chat, so a callback coming from that same chat id is authorization enough
// — there's no separate login for the bot side of the admin flow.
async function handleCallbackQuery(update: TelegramUpdate) {
  const query = update.callback_query;
  if (!query?.data || !query.message) return;

  const match = /^(approve|reject):(\d+)$/.exec(query.data);
  if (!match) return;

  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChatId || String(query.message.chat.id) !== String(adminChatId)) {
    await answerCallbackQuery(query.id, "Недостаточно прав");
    return;
  }

  const [, action, idStr] = match;
  const id = Number(idStr);
  const status = action === "approve" ? "approved" : "rejected";

  const result = await setRegistrationStatus(id, status);
  if (result.error) {
    await answerCallbackQuery(query.id, result.error);
    return;
  }

  await answerCallbackQuery(query.id, status === "approved" ? "Одобрено" : "Отклонено");

  const decisionLabel = status === "approved" ? "✅ Подтверждено" : "❌ Отклонено";
  const decidedBy = query.from.first_name ?? query.from.username ?? "";
  const originalText = query.message.text ?? "";
  await editMessageText(
    query.message.chat.id,
    query.message.message_id,
    `${originalText}\n\n${decisionLabel}${decidedBy ? ` — ${decidedBy}` : ""}`,
    { removeButtons: true },
  );
}

async function handleUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    await handleCallbackQuery(update);
    return;
  }
  await handleMessage(update);
}

let running = false;

export function startTelegramBot() {
  if (running || !process.env.TELEGRAM_BOT_TOKEN) return;
  running = true;

  let offset = 0;
  (async function poll() {
    while (running) {
      try {
        const updates = await getTelegramUpdates(offset, 30);
        for (const update of updates) {
          offset = update.update_id + 1;
          await handleUpdate(update).catch((err) =>
            console.error("[telegram] failed to handle update:", err),
          );
        }
      } catch (err) {
        console.error("[telegram] polling error, retrying in 3s:", err);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  })();
}
