import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrations, tournaments } from "@/lib/db/schema";
import { getTelegramUpdates, sendTelegramMessage, type TelegramUpdate } from "./client";

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function handleUpdate(update: TelegramUpdate) {
  const text = update.message?.text;
  const chatId = update.message?.chat.id;
  if (!text || !chatId) return;

  const match = /^\/start(?:\s+(\S+))?/.exec(text);
  if (!match) return;

  const token = match[1];
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

  await sendTelegramMessage(
    chatId,
    `Вы записаны на «${tournament?.title ?? "турнир"}» (${tournament ? formatDate(tournament.startsAt) : ""}).\n` +
      "Здесь пришлём подтверждение от организаторов и напомним перед началом.",
  );
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
