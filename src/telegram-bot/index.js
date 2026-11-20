// Telegram alerts — a standalone feature.
// Sends a Telegram message to the website team for every new contact-form message.
//
// Everything lives in this folder. The rest of the app only has three hooks:
//   src/app.js            app.use(telegramBot.router)                      (API + dashboard page)
//   src/routes/public.js  telegramBot.notifyNewMessage(message, { base })  (after a message is saved)
//   src/routes/pages.js + src/routes/admin.js  telegramBot.privacyShares() (privacy policy mentions Telegram)
// and one line in the dashboard menu (public/admin/js/config/menu.js) + main.js.
// To remove the feature: delete this folder and those lines.
const express = require("express");
const path = require("path");
const db = require("../db");
const api = require("./telegram-api");
const { leadMessage, escapeHtml } = require("./message");
const { getConfig, saveConfig } = require("./store");
const { newCode, checkForCode } = require("./connect");

const companyOf = (settings) => String(settings.company_name || "").trim() || "your website";

/* ---------- Bot details ---------- */
// The bot's username is never stored: it's read from Telegram with the token.
// Opening the dashboard page asks Telegram again (fresh = true), so a renamed bot or a new
// token shows up straight away. The connect link reuses the last answer.

let botCache = { token: "", bot: null };

async function botInfo(token, { fresh = false } = {}) {
  if (!token) return null;
  if (!fresh && botCache.token === token && botCache.bot) return botCache.bot;
  const me = await api.getMe(token);
  botCache = { token, bot: { username: me.username, name: me.first_name } };
  return botCache.bot;
}

/* ---------- Sending ---------- */

async function sendToAll(config, text, extra) {
  const results = await Promise.allSettled(config.recipients.map((item) => api.sendMessage(config.token, item.chatId, text, extra)));
  const failed = results.filter((result) => result.status === "rejected");
  await saveConfig({
    lastError: failed.length ? failed[0].reason.message : "",
    lastSentAt: failed.length === results.length ? config.lastSentAt : new Date().toISOString(),
  });
  if (failed.length === results.length) throw failed[0].reason;
  return results.length - failed.length;
}

// Called after a contact-form message is saved. Never throws: the visitor's message is already safe.
async function notifyNewMessage(message, { base }) {
  try {
    const config = await getConfig();
    if (!config.enabled || !config.token || !config.recipients.length) return;
    const settings = await db.getSettings();
    const { text, extra } = leadMessage(message, { company: companyOf(settings), base });
    await sendToAll(config, text, extra);
  } catch (error) {
    console.error("Telegram alert failed:", error.message);
  }
}

// For the privacy policy: while alerts are on, Telegram receives the details of new messages.
// Returns [] when off, so the policy only mentions Telegram when it's really used.
async function privacyShares() {
  try {
    const config = await getConfig();
    return config.enabled && config.token && config.recipients.length
      ? [{ name: "Telegram", purpose: "which delivers the details of new contact-form messages to our team's phones" }]
      : [];
  } catch {
    return [];
  }
}

/* ---------- Dashboard API: /api/admin/telegram ---------- */

const router = express.Router();

// The dashboard page itself (a browser module that lives in this folder).
router.get("/telegram-bot/admin-page.js", (req, res) => {
  res.type("application/javascript").sendFile(path.join(__dirname, "admin-page.js"));
});

const adminOnly = (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (!req.session || !req.session.adminId) return res.status(401).json({ error: "Please sign in." });
  next();
};

const handle = (work) => async (req, res, next) => {
  try {
    res.json(await work(req));
  } catch (error) {
    if (!error.status) error.status = 400;
    next(error);
  }
};

// "9086…iyM" — enough to recognise the token, without showing it.
const maskToken = (token) => (token ? `${token.slice(0, 4)}…${token.slice(-4)}` : "");

async function status() {
  const config = await getConfig();
  let bot = null;
  let botError = "";
  try {
    bot = await botInfo(config.token, { fresh: true });
  } catch (error) {
    botError = error.message;
  }
  return {
    hasToken: !!config.token,
    tokenHint: maskToken(config.token),
    bot,
    botError,
    enabled: config.enabled,
    recipients: config.recipients,
    lastError: config.lastError,
    lastSentAt: config.lastSentAt,
  };
}

router.use("/api/admin/telegram", adminOnly);

router.get("/api/admin/telegram", handle(() => status()));

router.put("/api/admin/telegram/token", handle(async (req) => {
  const token = String((req.body && req.body.token) || "").trim();
  if (!api.isTokenFormat(token)) throw new Error("That doesn't look like a bot token. It looks like 123456789:ABCdef… (from @BotFather).");
  await api.getMe(token); // checks Telegram accepts it
  const config = await getConfig();
  await saveConfig({ token, lastUpdateId: 0, lastError: "", recipients: token === config.token ? config.recipients : [] });
  return status();
}));

router.put("/api/admin/telegram/enabled", handle(async (req) => {
  await saveConfig({ enabled: !!(req.body && req.body.enabled) });
  return status();
}));

router.post("/api/admin/telegram/connect", handle(async () => {
  const config = await getConfig();
  const bot = await botInfo(config.token);
  if (!bot) throw new Error("Add the bot token first.");
  const code = newCode();
  return { link: `https://t.me/${bot.username}?start=${code}`, bot: bot.username, minutes: 10 };
}));

router.post("/api/admin/telegram/connect/check", handle(async () => {
  const connected = await checkForCode(companyOf(await db.getSettings()));
  return { connected, status: await status() };
}));

router.delete("/api/admin/telegram/recipients/:chatId", handle(async (req) => {
  const config = await getConfig();
  await saveConfig({ recipients: config.recipients.filter((item) => String(item.chatId) !== String(req.params.chatId)) });
  return status();
}));

router.post("/api/admin/telegram/test", handle(async () => {
  const config = await getConfig();
  if (!config.token) throw new Error("Add the bot token first.");
  if (!config.recipients.length) throw new Error("Connect a Telegram account first.");
  const company = escapeHtml(companyOf(await db.getSettings()));
  const sent = await sendToAll(config, `🔔 <b>Test from ${company}</b>\nTelegram alerts work. New website messages will arrive here.`);
  return { sent, status: await status() };
}));

module.exports = { router, notifyNewMessage, privacyShares };
