// Connecting a Telegram account safely.
//
// 1. The admin clicks "Connect" → we make a one-time code and a link t.me/<bot>?start=<code>.
// 2. The admin opens the link in Telegram and presses Start → the bot receives "/start <code>".
// 3. The dashboard asks us to check → we read the bot's new messages (getUpdates) and add the chat
//    that sent the right code. Anyone else who writes to the bot gets a polite "not for you" reply.
const crypto = require("crypto");
const api = require("./telegram-api");
const { getConfig, saveConfig } = require("./store");

const CODE_MINUTES = 10;
let pending = null; // { code, expires }

function newCode() {
  pending = { code: crypto.randomBytes(6).toString("hex"), expires: Date.now() + CODE_MINUTES * 60 * 1000 };
  return pending.code;
}

function nameOf(chat) {
  return [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.title || (chat.username ? `@${chat.username}` : `Chat ${chat.id}`);
}

// Reads new messages sent to the bot. Returns the newly connected account, or null.
async function checkForCode(companyName) {
  const config = await getConfig();
  const updates = await api.getUpdates(config.token, config.lastUpdateId + 1);
  let connected = null;
  let lastUpdateId = config.lastUpdateId;
  const recipients = [...config.recipients];

  for (const update of updates) {
    lastUpdateId = Math.max(lastUpdateId, update.update_id);
    const message = update.message;
    if (!message || !message.chat) continue;
    const text = String(message.text || "").trim();
    const code = (text.match(/^\/start\s+([a-f0-9]+)$/) || [])[1];
    const valid = pending && code === pending.code && Date.now() < pending.expires;

    if (valid) {
      const chatId = message.chat.id;
      if (!recipients.some((item) => item.chatId === chatId)) recipients.push({ chatId, name: nameOf(message.chat) });
      connected = { chatId, name: nameOf(message.chat) };
      pending = null;
      await api.sendMessage(config.token, chatId, `✅ Connected. You'll get a message here for every new enquiry on ${companyName}.`).catch(() => {});
    } else if (text.startsWith("/start") && !recipients.some((item) => item.chatId === message.chat.id)) {
      await api.sendMessage(config.token, message.chat.id, "This bot only sends notifications to the website's team.").catch(() => {});
    }
  }

  await saveConfig({ lastUpdateId, recipients });
  return connected;
}

module.exports = { newCode, checkForCode };
