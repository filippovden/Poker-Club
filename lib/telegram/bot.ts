import { and, asc, count, eq, inArray, not } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrations, tournaments, type Tournament } from "@/lib/db/schema";
import { setRegistrationStatus } from "@/lib/registrations/set-status";
import { createRegistration } from "@/lib/registrations/create";
import {
  answerCallbackQuery,
  editMessageText,
  getTelegramUpdates,
  sendTelegramMessage,
  type TelegramUpdate,
} from "./client";
import {
  buildApplicationSummaryMessage,
  buildMyRegistrationsMessage,
  buildNextTournamentMessage,
  buildRegisteredMessage,
  MAIN_MENU_KEYBOARD,
  MENU_LABELS,
} from "./messages";

// --- helpers -----------------------------------------------------------

async function getNextTournament(): Promise<Tournament | null> {
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(not(eq(tournaments.status, "completed")))
    .orderBy(asc(tournaments.startsAt))
    .limit(1);
  return tournament ?? null;
}

async function buildCancelButtons(rows: { id: number; tournamentId: number }[]) {
  return Promise.all(
    rows.map(async (r) => {
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, r.tournamentId))
        .limit(1);
      return [
        { text: `❌ Отменить: ${tournament?.title ?? `заявка #${r.id}`}`, callback_data: `cancel:${r.id}` },
      ];
    }),
  );
}

async function getSpotsLeft(tournament: Tournament): Promise<number | null> {
  if (tournament.maxPlayers == null) return null;
  const [{ value: approvedCount }] = await db
    .select({ value: count() })
    .from(registrations)
    .where(and(eq(registrations.tournamentId, tournament.id), eq(registrations.status, "approved")));
  return tournament.maxPlayers - approvedCount;
}

// --- multi-step "Подать заявку" conversation ----------------------------

interface PendingApplication {
  step: "name" | "phone" | "email" | "consent";
  tournamentId: number;
  name?: string;
  phone?: string;
  email?: string | null;
}

// Kept in memory only — if the server restarts mid-conversation the user
// just needs to tap "✍️ Подать заявку" again, which is an acceptable
// trade-off for not needing a DB table just to track a few in-flight steps.
const pendingApplications = new Map<number, PendingApplication>();

const ABORT_BUTTON = [[{ text: "Отмена", callback_data: "apply_abort" }]];

async function startApplication(chatId: number, tournamentId?: number) {
  const tournament = tournamentId
    ? await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1).then((r) => r[0])
    : await getNextTournament();
  if (!tournament) {
    await sendTelegramMessage(
      chatId,
      tournamentId ? "Этот турнир больше недоступен." : "Сейчас нет турниров, на которые можно записаться.",
    );
    return;
  }
  pendingApplications.set(chatId, { step: "name", tournamentId: tournament.id });
  await sendTelegramMessage(chatId, "Как вас зовут?", { buttons: ABORT_BUTTON });
}

async function continueApplication(chatId: number, text: string) {
  const state = pendingApplications.get(chatId);
  if (!state) return;

  if (state.step === "name") {
    if (text.trim().length < 2) {
      await sendTelegramMessage(chatId, "Имя слишком короткое, попробуйте ещё раз:", {
        buttons: ABORT_BUTTON,
      });
      return;
    }
    state.name = text.trim();
    state.step = "phone";
    await sendTelegramMessage(chatId, "Ваш номер телефона?", { buttons: ABORT_BUTTON });
    return;
  }

  if (state.step === "phone") {
    const phone = text.trim();
    if (phone.length < 5 || !/^[\d\s()+-]+$/.test(phone)) {
      await sendTelegramMessage(
        chatId,
        "Похоже на некорректный номер телефона, попробуйте ещё раз:",
        { buttons: ABORT_BUTTON },
      );
      return;
    }
    state.phone = phone;
    state.step = "email";
    await sendTelegramMessage(
      chatId,
      'Email (необязательно) — отправьте "-", чтобы пропустить:',
      { buttons: ABORT_BUTTON },
    );
    return;
  }

  if (state.step === "email") {
    const email = text.trim();
    if (email !== "-" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await sendTelegramMessage(chatId, "Похоже на некорректный email, попробуйте ещё раз:", {
        buttons: ABORT_BUTTON,
      });
      return;
    }
    state.email = email === "-" ? null : email;
    state.step = "consent";

    const tournament = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, state.tournamentId))
      .limit(1)
      .then((rows) => rows[0]);
    if (!tournament) {
      pendingApplications.delete(chatId);
      await sendTelegramMessage(chatId, "Этот турнир больше недоступен.");
      return;
    }

    await sendTelegramMessage(
      chatId,
      buildApplicationSummaryMessage({
        name: state.name!,
        phone: state.phone!,
        email: state.email,
        tournament,
      }),
      {
        buttons: [
          [{ text: "✅ Отправить заявку", callback_data: "apply_confirm" }],
          [{ text: "Отмена", callback_data: "apply_abort" }],
        ],
      },
    );
  }
}

async function confirmApplication(chatId: number) {
  const state = pendingApplications.get(chatId);
  pendingApplications.delete(chatId);
  if (!state || !state.name || !state.phone) {
    await sendTelegramMessage(chatId, "Сессия заявки истекла, начните заново.");
    return;
  }

  const result = await createRegistration({
    tournamentId: state.tournamentId,
    name: state.name,
    phone: state.phone,
    email: state.email,
    telegramChatId: String(chatId),
  });

  if (result.error) {
    await sendTelegramMessage(chatId, `❌ ${result.error}`);
    return;
  }

  if (result.tournament) {
    await sendTelegramMessage(chatId, buildRegisteredMessage(state.name, result.tournament), {
      replyKeyboard: MAIN_MENU_KEYBOARD,
    });
  }
}

// --- menu actions --------------------------------------------------------

async function handleMyRegistrations(chatId: number) {
  const rows = await db
    .select()
    .from(registrations)
    .where(eq(registrations.telegramChatId, String(chatId)));

  const withTournaments = await Promise.all(
    rows.map(async (r) => {
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, r.tournamentId))
        .limit(1);
      return tournament ? { tournament, status: r.status } : null;
    }),
  );

  await sendTelegramMessage(
    chatId,
    buildMyRegistrationsMessage(withTournaments.filter((r) => r !== null)),
    { replyKeyboard: MAIN_MENU_KEYBOARD },
  );

  // Only pending/approved registrations can still be cancelled — offer a
  // button per one, same cancel:<id> callback the /cancel command uses.
  const cancellable = rows.filter((r) => r.status === "pending" || r.status === "approved");
  if (cancellable.length === 0) return;

  await sendTelegramMessage(chatId, "Отменить одну из заявок:", {
    buttons: await buildCancelButtons(cancellable),
  });
}

async function handleNextTournamentInfo(chatId: number) {
  const tournament = await getNextTournament();
  if (!tournament) {
    await sendTelegramMessage(chatId, "Сейчас нет предстоящих турниров.", {
      replyKeyboard: MAIN_MENU_KEYBOARD,
    });
    return;
  }
  const spotsLeft = await getSpotsLeft(tournament);
  await sendTelegramMessage(chatId, buildNextTournamentMessage(tournament, spotsLeft), {
    replyKeyboard: MAIN_MENU_KEYBOARD,
  });
}

async function handleCancelCommand(chatId: number) {
  const active = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.telegramChatId, String(chatId)),
        inArray(registrations.status, ["pending", "approved"]),
      ),
    );

  if (active.length === 0) {
    await sendTelegramMessage(chatId, "У вас нет активных заявок для отмены.");
    return;
  }

  if (active.length === 1) {
    await db.delete(registrations).where(eq(registrations.id, active[0].id));
    await sendTelegramMessage(
      chatId,
      "Заявка отозвана. Если передумаете — можно подать новую на странице турниров.",
    );
    return;
  }

  await sendTelegramMessage(chatId, "У вас несколько активных заявок. Какую отменить?", {
    buttons: await buildCancelButtons(active),
  });
}

// --- /start --------------------------------------------------------------

async function handleStart(chatId: number, token: string | undefined) {
  if (!token) {
    await sendTelegramMessage(
      chatId,
      "Привет! Здесь можно записаться на турнир, посмотреть свои заявки и получать уведомления. Выберите пункт в меню ниже 👇",
      { replyKeyboard: MAIN_MENU_KEYBOARD },
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
      { replyKeyboard: MAIN_MENU_KEYBOARD },
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
    await sendTelegramMessage(chatId, buildRegisteredMessage(registration.name, tournament), {
      replyKeyboard: MAIN_MENU_KEYBOARD,
    });
  }
}

// --- routing ---------------------------------------------------------------

function isMenuCommand(text: string) {
  return text.startsWith("/") || (Object.values(MENU_LABELS) as string[]).includes(text);
}

async function handleMessage(update: TelegramUpdate) {
  const text = update.message?.text?.trim();
  const chatId = update.message?.chat.id;
  if (!text || !chatId) return;

  if (pendingApplications.has(chatId) && !isMenuCommand(text)) {
    await continueApplication(chatId, text);
    return;
  }
  pendingApplications.delete(chatId);

  const startMatch = /^\/start(?:\s+(\S+))?/.exec(text);
  if (startMatch) {
    await handleStart(chatId, startMatch[1]);
    return;
  }
  if (/^\/cancel\b/.test(text)) {
    await handleCancelCommand(chatId);
    return;
  }
  if (text === MENU_LABELS.myRegistrations) {
    await handleMyRegistrations(chatId);
    return;
  }
  if (text === MENU_LABELS.nextTournament) {
    await handleNextTournamentInfo(chatId);
    return;
  }
  if (text === MENU_LABELS.apply) {
    await startApplication(chatId);
    return;
  }

  await sendTelegramMessage(chatId, "Не совсем понял — используйте меню ниже 👇", {
    replyKeyboard: MAIN_MENU_KEYBOARD,
  });
}

// Approve/reject buttons only ever appear on messages posted to the admin
// chat, so a callback coming from that same chat id is authorization enough
// — there's no separate login for the bot side of the admin flow.
async function handleApproveRejectCallback(
  query: NonNullable<TelegramUpdate["callback_query"]>,
  action: "approve" | "reject",
  id: number,
) {
  if (!query.message) return;

  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChatId || String(query.message.chat.id) !== String(adminChatId)) {
    await answerCallbackQuery(query.id, "Недостаточно прав");
    return;
  }

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

// Cancel buttons only ever appear on messages sent to the applicant's own
// chat, so the authorization boundary is "this callback came from the same
// chat the registration is linked to" rather than an admin chat check.
async function handleCancelCallback(
  query: NonNullable<TelegramUpdate["callback_query"]>,
  id: number,
) {
  if (!query.message) return;
  const chatId = query.message.chat.id;

  const [registration] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, id))
    .limit(1);

  if (!registration || String(registration.telegramChatId) !== String(chatId)) {
    await answerCallbackQuery(query.id, "Заявка не найдена");
    return;
  }

  await db.delete(registrations).where(eq(registrations.id, id));
  await answerCallbackQuery(query.id, "Отозвано");
  await editMessageText(chatId, query.message.message_id, "✅ Заявка отозвана.", {
    removeButtons: true,
  });
}

async function handleApplyCallback(
  query: NonNullable<TelegramUpdate["callback_query"]>,
  action: "confirm" | "abort",
) {
  if (!query.message) return;
  const chatId = query.message.chat.id;

  if (action === "abort") {
    pendingApplications.delete(chatId);
    await answerCallbackQuery(query.id, "Отменено");
    await editMessageText(chatId, query.message.message_id, "Отменено.", { removeButtons: true });
    return;
  }

  await answerCallbackQuery(query.id, "Отправляем…");
  await editMessageText(chatId, query.message.message_id, query.message.text ?? "", {
    removeButtons: true,
  });
  await confirmApplication(chatId);
}

async function handleCallbackQuery(update: TelegramUpdate) {
  const query = update.callback_query;
  if (!query?.data || !query.message) return;

  const approveRejectMatch = /^(approve|reject):(\d+)$/.exec(query.data);
  if (approveRejectMatch) {
    const [, action, idStr] = approveRejectMatch;
    await handleApproveRejectCallback(query, action as "approve" | "reject", Number(idStr));
    return;
  }

  const cancelMatch = /^cancel:(\d+)$/.exec(query.data);
  if (cancelMatch) {
    await handleCancelCallback(query, Number(cancelMatch[1]));
    return;
  }

  const applyStartMatch = /^apply_start:(\d+)$/.exec(query.data);
  if (applyStartMatch) {
    await answerCallbackQuery(query.id);
    await startApplication(query.message.chat.id, Number(applyStartMatch[1]));
    return;
  }

  if (query.data === "apply_confirm") {
    await handleApplyCallback(query, "confirm");
    return;
  }
  if (query.data === "apply_abort") {
    await handleApplyCallback(query, "abort");
  }
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
