// Tiny client for the Telegram Bot API (https://core.telegram.org/bots/api).
// Every call has a 10-second timeout, so a slow Telegram never blocks the website.

const TOKEN_FORMAT = /^\d{5,15}:[A-Za-z0-9_-]{30,60}$/;

function isTokenFormat(token) {
  return TOKEN_FORMAT.test(String(token || "").trim());
}

async function call(token, method, params = {}) {
  if (!isTokenFormat(token)) throw new Error("The bot token is missing or doesn't look right.");
  let response;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new Error(error.name === "TimeoutError" ? "Telegram didn't answer in time." : "Couldn't reach Telegram. Check the server's internet connection.");
  }
  const data = await response.json().catch(() => ({}));
  if (!data.ok) {
    if (response.status === 401) throw new Error("Telegram refused the bot token. Check it, or create a new one with @BotFather.");
    if (response.status === 403) throw new Error("The bot was blocked or removed by this Telegram account.");
    if (response.status === 409) throw new Error("This bot uses a webhook elsewhere, so it can't be connected here. Remove the webhook or use another bot.");
    throw new Error(`Telegram: ${data.description || `error ${response.status}`}`);
  }
  return data.result;
}

module.exports = {
  isTokenFormat,
  getMe: (token) => call(token, "getMe"),
  sendMessage: (token, chatId, text, extra = {}) =>
    call(token, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra }),
  getUpdates: (token, offset) => call(token, "getUpdates", { offset, timeout: 0, allowed_updates: ["message"] }),
};
