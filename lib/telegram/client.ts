const API_BASE = "https://api.telegram.org";

function apiUrl(method: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return `${API_BASE}/bot${token}/${method}`;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
}

export async function sendTelegramMessage(chatId: string | number, text: string) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    const res = await fetch(apiUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      console.error("[telegram] sendMessage failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[telegram] sendMessage error:", err);
  }
}

export async function getTelegramUpdates(offset: number, timeoutSeconds: number) {
  const res = await fetch(
    `${apiUrl("getUpdates")}?offset=${offset}&timeout=${timeoutSeconds}`,
    // Long-poll requests wait up to `timeout` seconds on Telegram's side —
    // give fetch a little extra room before it gives up on its own.
    { signal: AbortSignal.timeout((timeoutSeconds + 10) * 1000) },
  );
  if (!res.ok) throw new Error(`getUpdates failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean; result: TelegramUpdate[] };
  return data.result;
}

export function tournamentRegistrationDeepLink(cancelToken: string) {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) return null;
  return `https://t.me/${username}?start=${cancelToken}`;
}
