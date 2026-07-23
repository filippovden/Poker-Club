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
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export function formatTimeOnly(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

interface TournamentInfo {
  title: string;
  startsAt: string;
}

export function buildRegisteredMessage(name: string, tournament: TournamentInfo) {
  return (
    `🎉 <b>Заявка принята!</b>\n\n` +
    `👤 ${escapeHtml(name)}\n` +
    `🃏 ${escapeHtml(tournament.title)}\n` +
    `📅 ${formatDateOnly(tournament.startsAt)} 🕒 ${formatTimeOnly(tournament.startsAt)}\n` +
    `📍 ${escapeHtml(SITE_CONTENT.venue)}\n\n` +
    `Организаторы свяжутся с вами для подтверждения — как только решение будет принято, напишем сюда же.`
  );
}

export function buildApprovedMessage(tournament: TournamentInfo) {
  return (
    `✅ <b>Заявка подтверждена!</b>\n\n` +
    `Ждём вас:\n` +
    `🃏 ${escapeHtml(tournament.title)}\n` +
    `📅 ${formatDateOnly(tournament.startsAt)} 🕒 ${formatTimeOnly(tournament.startsAt)}\n` +
    `📍 ${escapeHtml(SITE_CONTENT.venue)}`
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
    `📍 ${escapeHtml(SITE_CONTENT.venue)}`
  );
}

export function buildAdminNewRegistrationMessage(params: {
  name: string;
  phone: string;
  email?: string | null;
  tournament: TournamentInfo;
}) {
  const { name, phone, email, tournament } = params;
  return (
    `🆕 <b>Новая заявка</b>\n\n` +
    `👤 ${escapeHtml(name)}\n` +
    `📞 ${escapeHtml(phone)}\n` +
    (email ? `✉️ ${escapeHtml(email)}\n` : "") +
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
        : `🪑 Мест нет — доступна запись в лист ожидания`
      : "") +
    `\n📍 ${escapeHtml(SITE_CONTENT.venue)}`
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

export function buildApplicationSummaryMessage(params: {
  name: string;
  phone: string;
  email?: string | null;
  tournament: TournamentInfo;
}) {
  const { name, phone, email, tournament } = params;
  return (
    `Проверьте данные перед отправкой:\n\n` +
    `👤 ${escapeHtml(name)}\n` +
    `📞 ${escapeHtml(phone)}\n` +
    `✉️ ${email ? escapeHtml(email) : "—"}\n` +
    `🃏 ${escapeHtml(tournament.title)}\n` +
    `📅 ${formatDateOnly(tournament.startsAt)} 🕒 ${formatTimeOnly(tournament.startsAt)}\n\n` +
    `Отправляя заявку, вы соглашаетесь на обработку персональных данных и подтверждаете, что вам исполнилось 18 лет.`
  );
}
