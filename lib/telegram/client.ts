const API_BASE = "https://api.telegram.org";

function apiUrl(method: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return `${API_BASE}/bot${token}/${method}`;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
    from?: { username?: string; first_name?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { first_name?: string; username?: string };
    message?: {
      chat: { id: number };
      message_id: number;
      text?: string;
    };
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Transient network blips between the server and Telegram's API (seen in
// practice on Russian hosting — connect timeouts that clear up on their
// own within seconds) used to silently drop notifications, since callers
// only log-and-swallow errors. Retry a couple of times with backoff before
// giving up, so a momentary blip doesn't cost a player their confirmation.
async function callApi(method: string, body: Record<string, unknown>, attempt = 1): Promise<unknown> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  try {
    const res = await fetch(apiUrl(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if ((res.status >= 500 || res.status === 429) && attempt < 3) {
        await sleep(attempt * 1000);
        return callApi(method, body, attempt + 1);
      }
      console.error(`[telegram] ${method} failed:`, res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    if (attempt < 3) {
      await sleep(attempt * 1000);
      return callApi(method, body, attempt + 1);
    }
    console.error(`[telegram] ${method} error:`, err);
    return null;
  }
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: { buttons?: TelegramInlineKeyboardButton[][]; replyKeyboard?: string[][] },
) {
  let replyMarkup: unknown;
  if (options?.buttons) {
    replyMarkup = { inline_keyboard: options.buttons };
  } else if (options?.replyKeyboard) {
    replyMarkup = { keyboard: options.replyKeyboard, resize_keyboard: true };
  }
  const result = (await callApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  })) as { result?: { message_id: number } } | null;
  return result?.result;
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await callApi("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

export async function editMessageText(
  chatId: string | number,
  messageId: number,
  text: string,
  options?: { removeButtons?: boolean },
) {
  await callApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: options?.removeButtons ? { inline_keyboard: [] } : undefined,
  });
}

export async function getTelegramUpdates(offset: number, timeoutSeconds: number) {
  const res = await fetch(
    `${apiUrl("getUpdates")}?offset=${offset}&timeout=${timeoutSeconds}&allowed_updates=["message","callback_query"]`,
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
