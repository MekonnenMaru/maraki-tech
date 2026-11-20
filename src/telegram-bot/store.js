// Saved Telegram settings, in the feature's own database table "telegram_bot" (one row).
// The bot token is stored here (never in the code or in git) and changed in the admin.
const { query, queryOne, execute } = require("../db/connection");

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS telegram_bot (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      token VARCHAR(200) NOT NULL DEFAULT '',
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      recipients TEXT NOT NULL,
      last_update_id BIGINT NOT NULL DEFAULT 0,
      last_error VARCHAR(500) NOT NULL DEFAULT '',
      last_sent_at VARCHAR(40) NOT NULL DEFAULT ''
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await execute("INSERT IGNORE INTO telegram_bot (id, recipients) VALUES (1, '[]')");
  tableReady = true;
}

// { token, enabled, recipients: [{ chatId, name }], lastUpdateId, lastError, lastSentAt }
async function getConfig() {
  await ensureTable();
  const row = await queryOne("SELECT * FROM telegram_bot WHERE id = 1");
  let recipients = [];
  try {
    recipients = JSON.parse(row.recipients || "[]");
  } catch {
    recipients = [];
  }
  return {
    token: row.token || "",
    enabled: !!row.enabled,
    recipients: Array.isArray(recipients) ? recipients : [],
    lastUpdateId: Number(row.last_update_id) || 0,
    lastError: row.last_error || "",
    lastSentAt: row.last_sent_at || "",
  };
}

const COLUMNS = {
  token: "token",
  enabled: "enabled",
  recipients: "recipients",
  lastUpdateId: "last_update_id",
  lastError: "last_error",
  lastSentAt: "last_sent_at",
};

// saveConfig({ enabled: false }) — only the given fields change.
async function saveConfig(changes) {
  await ensureTable();
  const keys = Object.keys(changes).filter((key) => COLUMNS[key]);
  if (!keys.length) return getConfig();
  const values = keys.map((key) => {
    if (key === "recipients") return JSON.stringify(changes.recipients);
    if (key === "enabled") return changes.enabled ? 1 : 0;
    if (key === "lastError") return String(changes.lastError || "").slice(0, 500);
    return changes[key];
  });
  await execute(`UPDATE telegram_bot SET ${keys.map((key) => `${COLUMNS[key]} = ?`).join(", ")} WHERE id = 1`, values);
  return getConfig();
}

module.exports = { getConfig, saveConfig };
