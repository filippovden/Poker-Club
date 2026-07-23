import { SITE_CONTENT } from "@/lib/content";

// No explicit tournament duration is tracked in the schema — 5 hours is a
// reasonable estimate for a live NLH/PLO tournament and only affects the
// calendar event's end time, not anything shown on the site itself.
const DEFAULT_DURATION_MS = 5 * 60 * 60 * 1000;

function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string) {
  return text.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

export function buildIcsContent(tournament: {
  id: number;
  title: string;
  startsAt: string;
  description?: string | null;
}) {
  const start = new Date(tournament.startsAt);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Royal63//Tournaments//RU",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:tournament-${tournament.id}@${SITE_CONTENT.domain}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(tournament.title)} — ${escapeIcsText(SITE_CONTENT.clubName)}`,
    `LOCATION:${escapeIcsText(SITE_CONTENT.venue)}`,
    ...(tournament.description ? [`DESCRIPTION:${escapeIcsText(tournament.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function buildGoogleCalendarUrl(tournament: {
  title: string;
  startsAt: string;
}) {
  const start = new Date(tournament.startsAt);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${tournament.title} — ${SITE_CONTENT.clubName}`,
    dates: `${toIcsDate(start)}/${toIcsDate(end)}`,
    location: SITE_CONTENT.venue,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
