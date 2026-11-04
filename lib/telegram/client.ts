import { ProxyAgent } from "undici";

// Overridable so a lightweight passthrough relay (e.g. a Cloudflare Worker
// that forwards byte-for-byte to api.telegram.org) can stand in when
// Telegram's own IPs are blocked outbound from this host's network — see
// the TELEGRAM_PROXY_URL comment below for why that's needed at all.
const API_BASE = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";

function apiUrl(method: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return `${API_BASE}/bot${token}/${method}`;
}

// Telegram's own API IP ranges are blocked outbound from some Russian
// hosting networks (confirmed via direct curl — both IPv4 and IPv6 time
// out), independent of the bot token or app code. Routing just these
// requests through an external HTTP(S) proxy works around that without
// moving player data (the DB) off the Russian server, so it stays
// 152-FZ-compliant. No-op (direct connection) when the env var is unset.
const proxyUrl = process.env.TELEGRAM_PROXY_URL;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

function fetchOptions(init: RequestInit): RequestInit {
  return dispatcher ? ({ ...init, dispatcher } as RequestInit) : init;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number; type?: string };
    text?: string;
    from?: { id?: number; username?: string; first_name?: string };
    contact?: { phone_number: string; user_id?: number };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { first_name?: string; username?: string };
    message?: {
      chat: { id: number; type?: string };
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
    const res = await fetch(
      apiUrl(method),
      fetchOptions({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      }),
    );
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
  options?: { buttons?: TelegramInlineKeyboardButton[][]; replyKeyboard?: string[][]; requestContact?: boolean },
) {
  let replyMarkup: unknown;
  if (options?.requestContact) {
    replyMarkup = { keyboard: [[{ text: "📱 Поделиться своим номером", request_contact: true }], ["↩️ В меню"]], resize_keyboard: true, one_time_keyboard: true };
  } else if (options?.buttons) {
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

export async function configureMiniAppMenu() {
  const url = process.env.TELEGRAM_MINI_APP_URL;
  if (!url) return;
  if (!/^https:\/\//.test(url)) throw new Error("TELEGRAM_MINI_APP_URL must be HTTPS");
  await callApi("setChatMenuButton", {
    menu_button: { type: "web_app", text: "Открыть клуб", web_app: { url } },
  });
}

export async function sendTelegramPhoto(
  chatId: string | number,
  photoUrl: string,
  caption: string,
  options?: { buttons?: TelegramInlineKeyboardButton[][] },
) {
  const result = (await callApi("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: "HTML",
    reply_markup: options?.buttons ? { inline_keyboard: options.buttons } : undefined,
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
    fetchOptions({ signal: AbortSignal.timeout((timeoutSeconds + 10) * 1000) }),
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
