import { SITE_CONTENT } from "@/lib/content";

// Telegram's HTML parse_mode rejects the whole message on unbalanced/stray
// tags, so anything a user typed (name, tournament title from admin input,
// etc.) must be escaped before going into a template.
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatDateOnly(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  // Fixed to the venue's timezone so the bot always shows the actual local
  // time in Тольятти, regardless of which timezone the server happens to
  // run in once deployed.
  return date.toLocaleDateString("ru-RU", { timeZone: "Europe/Samara", day: "numeric", month: "long" });
}

export function formatTimeOnly(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ru-RU", {
    timeZone: "Europe/Samara",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface TournamentInfo {
  title: string;
  startsAt: string;
}

// A clickable Yandex Maps link rather than a public map embed on the
// website — the exact address is only ever shared with people who've
// actually applied (via the bot), so it stays out of search engines and
// off the public page, but whoever DOES get it can still tap straight
// into navigation.
function venueLine() {
  const url = `https://yandex.ru/maps/?text=${encodeURIComponent(SITE_CONTENT.venue)}`;
  return `📍 <a href="${url}">${escapeHtml(SITE_CONTENT.venue)}</a>`;
}

export function buildRegisteredMessage(name: string, tournament: TournamentInfo) {
  return (
    `🎉 <b>Заявка принята!</b>\n\n` +
    `👤 ${escapeHtml(name)}\n` +
    `🃏 ${escapeHtml(tournament.title)}\n` +
    `📅 ${formatDateOnly(tournament.startsAt)} 🕒 ${formatTimeOnly(tournament.startsAt)}\n` +
    `${venueLine()}\n\n` +
    `Организаторы свяжутся с вами для подтверждения — как только решение будет принято, напишем сюда же.`
  );
}

export function buildApprovedMessage(tournament: TournamentInfo) {
  return (
    `✅ <b>Заявка подтверждена!</b>\n\n` +
    `Ждём вас:\n` +
    `🃏 ${escapeHtml(tournament.title)}\n` +
    `📅 ${formatDateOnly(tournament.startsAt)} 🕒 ${formatTimeOnly(tournament.startsAt)}\n` +
    `${venueLine()}`
  );
}

export function buildSeatAssignedMessage(
  tournament: TournamentInfo,
  tableNumber: number,
  seatNumber: number,
) {
  return (
    `🪑 <b>Ваше место готово!</b>\n\n` +
    `🃏 ${escapeHtml(tournament.title)}\n` +
    `📅 ${formatDateOnly(tournament.startsAt)} 🕒 ${formatTimeOnly(tournament.startsAt)}\n\n` +
    `Стол <b>${tableNumber}</b>, место <b>${seatNumber}</b>.\n` +
    `${venueLine()}`
  );
}

export function buildRejectedMessage(tournament: TournamentInfo) {
  return (
    `❌ К сожалению, заявку на «${escapeHtml(tournament.title)}» отклонили.\n` +
    `Если это неожиданно — напишите нам, разберёмся.`
  );
}

export function buildReminderMessage(tournament: TournamentInfo, phrase: string) {
  return (
    `⏰ Напоминаем: <b>${escapeHtml(tournament.title)}</b> начнётся ${phrase} ` +
    `(${formatDateOnly(tournament.startsAt)} в ${formatTimeOnly(tournament.startsAt)}).\n` +
    `${venueLine()}\n\n` +
    `Вы всё ещё придёте?`
  );
}

// Every reminder asks the player to re-confirm rather than just informing —
// "Отменить" reuses the exact same cancel:<id> callback as the player's own
// /cancel flow (bot.ts's handleCancelCallback), so there's one cancellation
// code path regardless of where the button was clicked from.
export function buildReminderButtons(registrationId: number) {
  return [
    [
      { text: "✅ Подтвердить", callback_data: `confirm_attend:${registrationId}` },
      { text: "❌ Отменить", callback_data: `cancel:${registrationId}` },
    ],
  ];
}

export function buildAdminNewRegistrationMessage(params: {
  name: string;
  phone: string;
  email?: string | null;
  comment?: string | null;
  tournament: TournamentInfo;
}) {
  const { name, phone, email, comment, tournament } = params;
  return (
    `🆕 <b>Новая заявка</b>\n\n` +
    `👤 ${escapeHtml(name)}\n` +
    `📞 ${escapeHtml(phone)}\n` +
    (email ? `✉️ ${escapeHtml(email)}\n` : "") +
    (comment ? `💬 ${escapeHtml(comment)}\n` : "") +
    `🃏 ${escapeHtml(tournament.title)}\n` +
    `📅 ${formatDateOnly(tournament.startsAt)} 🕒 ${formatTimeOnly(tournament.startsAt)}`
  );
}

export const MENU_LABELS = {
  myRegistrations: "📋 Мои заявки",
  nextTournament: "🃏 Ближайший турнир",
  apply: "✍️ Подать заявку",
} as const;

export const MAIN_MENU_KEYBOARD = [
  [MENU_LABELS.nextTournament, MENU_LABELS.apply],
  [MENU_LABELS.myRegistrations],
];

// The admin (staff) chat gets its own menu, entirely separate from the
// player-facing one above — different chat, different job.
export const ADMIN_MENU_LABELS = {
  participants: "👥 Участники ближайшего турнира",
  search: "🔍 Найти игрока",
} as const;

export const ADMIN_MENU_KEYBOARD = [[ADMIN_MENU_LABELS.participants], [ADMIN_MENU_LABELS.search]];

const STATUS_LABELS: Record<string, string> = {
  pending: "⏳ На рассмотрении",
  approved: "✅ Подтверждена",
  rejected: "❌ Отклонена",
};

export function buildMyRegistrationsMessage(
  rows: { tournament: TournamentInfo; status: string }[],
) {
  if (rows.length === 0) {
    return "У вас пока нет заявок. Нажмите «✍️ Подать заявку», чтобы записаться на ближайший турнир.";
  }
  const list = rows
    .map(
      ({ tournament, status }) =>
        `🃏 <b>${escapeHtml(tournament.title)}</b>\n` +
        `📅 ${formatDateOnly(tournament.startsAt)} 🕒 ${formatTimeOnly(tournament.startsAt)}\n` +
        `${STATUS_LABELS[status] ?? status}`,
    )
    .join("\n\n");
  return `<b>Ваши заявки:</b>\n\n${list}`;
}

export function buildNextTournamentMessage(
  tournament: TournamentInfo & { format: string; buyIn: number | null },
  spotsLeft: number | null,
) {
  return (
    `🃏 <b>${escapeHtml(tournament.title)}</b>\n` +
    `📅 ${formatDateOnly(tournament.startsAt)} 🕒 ${formatTimeOnly(tournament.startsAt)}\n` +
    `💰 ${tournament.buyIn ? `${tournament.buyIn.toLocaleString("ru-RU")} ₽` : "Фриролл"} · ${escapeHtml(tournament.format)}\n` +
    (spotsLeft !== null
      ? spotsLeft > 0
        ? `🪑 Осталось мест: ${spotsLeft}`
        : `🪑 Мест нет — регистрация закрыта`
      : "") +
    `\n${venueLine()}`
  );
}

export function buildNewTournamentAnnouncementMessage(
  tournament: TournamentInfo & { format: string; buyIn: number | null },
) {
  return (
    `🆕 <b>Новый турнир!</b>\n\n` +
    `🃏 ${escapeHtml(tournament.title)}\n` +
    `📅 ${formatDateOnly(tournament.startsAt)} 🕒 ${formatTimeOnly(tournament.startsAt)}\n` +
    `💰 ${tournament.buyIn ? `${tournament.buyIn.toLocaleString("ru-RU")} ₽` : "Фриролл"} · ${escapeHtml(tournament.format)}\n\n` +
    `Хотите на этот турнир?`
  );
}

export function buildAdminSearchResultsMessage(
  results: {
    name: string;
    phone: string;
    telegramUsername: string | null;
    status: string;
    tournamentTitle: string;
  }[],
) {
  const list = results
    .map(
      (r, i) =>
        `${i + 1}. ${escapeHtml(r.name)} — ${escapeHtml(r.phone)}${r.telegramUsername ? ` — @${escapeHtml(r.telegramUsername)}` : ""}\n` +
        `   🃏 ${escapeHtml(r.tournamentTitle)} · ${STATUS_LABELS[r.status] ?? r.status}`,
    )
    .join("\n\n");
  return `<b>Найдено (${results.length}):</b>\n\n${list}`;
}

export function buildAdminCancelledMessage(tournament: TournamentInfo) {
  return (
    `❗ Ваша заявка на «${escapeHtml(tournament.title)}» отменена организаторами.\n` +
    `Если это ошибка — напишите нам.`
  );
}

export function buildParticipantsListMessage(
  tournament: TournamentInfo,
  approved: { name: string; phone: string; telegramUsername: string | null }[],
  pending: { name: string; phone: string; telegramUsername: string | null }[],
) {
  function formatRow(r: { name: string; phone: string; telegramUsername: string | null }, i: number) {
    const handle = r.telegramUsername ? ` — @${escapeHtml(r.telegramUsername)}` : "";
    return `${i + 1}. ${escapeHtml(r.name)} — ${escapeHtml(r.phone)}${handle}`;
  }
  const approvedList = approved.length > 0 ? approved.map(formatRow).join("\n") : "—";
  const pendingList = pending.length > 0 ? pending.map(formatRow).join("\n") : "—";
  return (
    `<b>Участники — ${escapeHtml(tournament.title)}</b>\n` +
    `📅 ${formatDateOnly(tournament.startsAt)} 🕒 ${formatTimeOnly(tournament.startsAt)}\n\n` +
    `✅ Подтверждено (${approved.length}):\n${approvedList}\n\n` +
    `🕓 На рассмотрении (${pending.length}):\n${pendingList}`
  );
}

export function buildApplicationSummaryMessage(params: {
  name: string;
  phone: string;
  tournament: TournamentInfo;
}) {
  const { name, phone, tournament } = params;
  return (
    `Проверьте данные перед отправкой:\n\n` +
    `👤 ${escapeHtml(name)}\n` +
    `📞 ${escapeHtml(phone)}\n` +
    `🃏 ${escapeHtml(tournament.title)}\n` +
    `📅 ${formatDateOnly(tournament.startsAt)} 🕒 ${formatTimeOnly(tournament.startsAt)}\n\n` +
    `Отправляя заявку, вы соглашаетесь на обработку персональных данных и подтверждаете, что вам исполнилось 18 лет.`
  );
}
