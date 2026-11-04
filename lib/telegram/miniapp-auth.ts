import { createHmac, timingSafeEqual } from "node:crypto";

export interface MiniAppUser {
  id: number;
  firstName: string;
  username: string | null;
}

// Telegram's initData is a signed query string. Never authorize from
// initDataUnsafe, a URL user id, or a client-side Telegram object.
export function verifyMiniAppInitData(raw: string): MiniAppUser | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !raw || raw.length > 8192) return null;
  const entries = [...new URLSearchParams(raw).entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length) return null;
  const fields = new Map(entries);
  const hash = fields.get("hash");
  const authDate = Number(fields.get("auth_date"));
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash) || !Number.isSafeInteger(authDate)) return null;
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age < -60 || age > 24 * 60 * 60) return null;

  const checkString = entries
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest();
  const supplied = Buffer.from(hash, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const user = JSON.parse(fields.get("user") ?? "null") as Record<string, unknown> | null;
    if (!user || !Number.isSafeInteger(user.id) || Number(user.id) <= 0) return null;
    return {
      id: Number(user.id),
      firstName: typeof user.first_name === "string" ? user.first_name.slice(0, 80) : "Игрок",
      username: typeof user.username === "string" ? user.username.slice(0, 80) : null,
    };
  } catch {
    return null;
  }
}
