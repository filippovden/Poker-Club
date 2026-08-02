// The club is in Тольятти (Самарская область), which has run a fixed
// UTC+4 (Europe/Samara) since Russia's 2016 timezone reform — one hour
// ahead of Moscow, and with no DST (abolished nationwide in 2014). Since
// the offset never changes, converting to/from it is just fixed-amount
// arithmetic rather than needing a timezone database.
const SAMARA_OFFSET_MS = 4 * 3600_000;

// Converts a <input type="datetime-local"> value (a naive "YYYY-MM-DDTHH:mm"
// string with no timezone of its own) into a real UTC instant, treating the
// naive value as wall-clock time in Тольятти — regardless of the server's
// own system timezone (production runs in UTC).
export function samaraWallClockToUtcIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return new Date(NaN).toISOString();
  const [y, mo, d, h, mi] = match.slice(1).map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - SAMARA_OFFSET_MS).toISOString();
}

// The inverse — for pre-filling a datetime-local input from a stored UTC
// ISO string, showing Тольятти wall-clock time regardless of the browser's
// own local timezone.
export function utcIsoToSamaraWallClock(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const shifted = new Date(d.getTime() + SAMARA_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}
