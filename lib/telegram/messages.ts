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
