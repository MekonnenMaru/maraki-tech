const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const { DEFAULT_SETTINGS } = require("./settings");
const { seed } = require("./seed");

const TABLES = new Set([
  "stats",
  "services",
  "products",
  "apps",
  "process_steps",
  "team_members",
  "testimonials",
  "technologies",
  "faqs",
  "pricing_plans",
]);

const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "maraki.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const hadApps = !!db.prepare(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'apps'"
).get();

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    must_change INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value INTEGER NOT NULL,
    suffix TEXT NOT NULL DEFAULT '',
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    icon TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    link TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    photos TEXT NOT NULL DEFAULT '[]',
    video TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    family TEXT NOT NULL DEFAULT 'bingo',
    channel TEXT NOT NULL DEFAULT 'both',
    edition TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS process_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    bio TEXT NOT NULL,
    skills TEXT NOT NULL DEFAULT '[]',
    avatar_letter TEXT NOT NULL DEFAULT '',
    avatar_image TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    avatar_letter TEXT NOT NULL DEFAULT '',
    avatar_image TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS technologies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS pricing_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount TEXT NOT NULL,
    period TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    features TEXT NOT NULL DEFAULT '[]',
    featured INTEGER NOT NULL DEFAULT 0,
    badge TEXT NOT NULL DEFAULT '',
    button_text TEXT NOT NULL DEFAULT 'Get Started',
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    service TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (id);
  CREATE INDEX IF NOT EXISTS idx_visits_day ON visits (day);
`);

seed(db);

const appColumns = new Set(db.prepare("PRAGMA table_info(apps)").all().map((column) => column.name));
const addedAppCatalog = !appColumns.has("family");
if (!appColumns.has("family")) {
  db.exec("ALTER TABLE apps ADD COLUMN family TEXT NOT NULL DEFAULT 'bingo'");
}
if (!appColumns.has("channel")) {
  db.exec("ALTER TABLE apps ADD COLUMN channel TEXT NOT NULL DEFAULT 'both'");
}
if (!appColumns.has("edition")) {
  db.exec("ALTER TABLE apps ADD COLUMN edition TEXT NOT NULL DEFAULT ''");
}

const APP_CATALOG = [
  ["Ethiomark Bingo", "Hall layout", "Online and offline Bingo with the Ethiomark layout.", "bingo", "both", "", 0],
  ["Anbesa Bingo", "Hall layout", "Online and offline Bingo with the Anbesa layout.", "bingo", "both", "", 1],
  ["Telegram Bingo", "Telegram bot", "Bingo through Telegram in the Normal format.", "bingo", "telegram", "Normal", 2],
  ["Telegram Bingo", "Telegram bot", "Bingo through Telegram in the Super format.", "bingo", "telegram", "Super", 3],
  ["Keno", "Online & Offline", "Keno for online play and offline venues.", "keno", "both", "", 4],
  ["Spin", "Online & Offline", "Spin for online play and offline venues.", "spin", "both", "", 5],
];

const insertApp = db.prepare(
  `INSERT INTO apps (name, tagline, description, photos, video, link, family, channel, edition, sort_order, visible)
   VALUES (?, ?, ?, '[]', '', '', ?, ?, ?, ?, 1)`
);

if (!hadApps) {
  APP_CATALOG.forEach((row) => insertApp.run(...row));
}

if (addedAppCatalog) {
  const updateApp = db.prepare(
    `UPDATE apps
     SET name = ?, tagline = ?, description = ?, family = ?, channel = ?, edition = ?, sort_order = ?
     WHERE id = ?`
  );
  for (const row of db.prepare("SELECT id, name, description FROM apps").all()) {
    const key = String(row.name || "").trim().toLowerCase();
    if (key === "bingo") {
      updateApp.run(...APP_CATALOG[0].slice(0, 7), row.id);
    } else if (key === "ethiomark bingo") {
      updateApp.run(...APP_CATALOG[0].slice(0, 7), row.id);
    } else if (key === "anbesa bingo") {
      updateApp.run(...APP_CATALOG[1].slice(0, 7), row.id);
    } else if (key === "keno") {
      updateApp.run(...APP_CATALOG[4].slice(0, 7), row.id);
    } else if (key === "spin") {
      updateApp.run(...APP_CATALOG[5].slice(0, 7), row.id);
    } else {
      const family = /keno/i.test(row.name) ? "keno" : /spin/i.test(row.name) ? "spin" : "bingo";
      const channel = /telegram/i.test(row.name) ? "telegram" : "both";
      db.prepare("UPDATE apps SET family = ?, channel = ? WHERE id = ?").run(family, channel, row.id);
    }
  }
}

const findApp = db.prepare("SELECT id FROM apps WHERE name = ? AND edition = ?");
for (const row of APP_CATALOG) {
  if (!findApp.get(row[0], row[5])) insertApp.run(...row);
}

db.prepare(
  `UPDATE settings SET value = ?
   WHERE key = 'apps_text'
     AND value IN (?, ?, ?)`
).run(
  "Bingo, Keno, and Spin — online and offline. Bingo includes named hall layouts and Telegram Normal and Super.",
  "Bingo, Keno, Spin, and the next one you ship. Each app can carry its own photos and a video.",
  "Live Bingo, Keno, and Spin. Clear rounds, fast draws, and a result people can follow.",
  "Bingo, Keno, and Spin, online and offline. Bingo also runs on Telegram, in Normal and Super."
);

const adminCount = db.prepare("SELECT COUNT(*) AS count FROM admins").get().count;
if (!adminCount) {
  db.prepare(
    "INSERT INTO admins (username, password_hash, must_change, created_at) VALUES (?, ?, 1, ?)"
  ).run("admin", bcrypt.hashSync("admin123", 10), new Date().toISOString());
}

function assertTable(table) {
  if (!TABLES.has(table)) {
    const error = new Error("Not found.");
    error.status = 404;
    throw error;
  }
}

function assertColumn(column) {
  if (!/^[a-z_]+$/.test(column)) {
    const error = new Error("Invalid field.");
    error.status = 400;
    throw error;
  }
}

function getSettings() {
  const merged = { ...DEFAULT_SETTINGS };
  for (const row of db.prepare("SELECT key, value FROM settings").all()) {
    if (Object.prototype.hasOwnProperty.call(merged, row.key)) merged[row.key] = row.value;
  }
  return merged;
}

function saveSettings(values) {
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  const tx = db.transaction((entries) => {
    for (const [key, value] of entries) upsert.run(key, value);
  });
  tx(Object.entries(values));
  return getSettings();
}

function listRows(table, { visibleOnly = false } = {}) {
  assertTable(table);
  const where = visibleOnly ? "WHERE visible = 1" : "";
  return db.prepare(`SELECT * FROM ${table} ${where} ORDER BY sort_order ASC, id ASC`).all();
}

function getRow(table, id) {
  assertTable(table);
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

function insertRow(table, data) {
  assertTable(table);
  const keys = Object.keys(data);
  keys.forEach(assertColumn);
  const sort = db.prepare(`SELECT COALESCE(MAX(sort_order), -1) AS max FROM ${table}`).get().max + 1;
  const columns = [...keys, "sort_order"];
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
  const info = db.prepare(sql).run(...keys.map((key) => data[key]), sort);
  return getRow(table, Number(info.lastInsertRowid));
}

function updateRow(table, id, data) {
  assertTable(table);
  const existing = getRow(table, id);
  if (!existing) return null;
  const keys = Object.keys(data);
  keys.forEach(assertColumn);
  const sql = `UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE id = ?`;
  db.prepare(sql).run(...keys.map((key) => data[key]), id);
  return getRow(table, id);
}

function deleteRow(table, id) {
  assertTable(table);
  return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes > 0;
}

function reorderRows(table, ids) {
  assertTable(table);
  const update = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
  const tx = db.transaction((list) => {
    list.forEach((id, index) => {
      const number = Number(id);
      if (Number.isInteger(number) && number > 0) update.run(index, number);
    });
  });
  tx(Array.isArray(ids) ? ids : []);
}

function countRows(table) {
  assertTable(table);
  return db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
}

function addMessage(message) {
  const info = db.prepare(
    `INSERT INTO messages (name, email, company, service, message, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  ).run(message.name, message.email, message.company, message.service, message.message, new Date().toISOString());
  return Number(info.lastInsertRowid);
}

function messageWhere({ status = "all", q = "", from = null, to = null } = {}) {
  const clauses = [];
  const params = [];

  if (status === "unread") clauses.push("is_read = 0");
  if (status === "read") clauses.push("is_read = 1");

  const query = String(q || "").trim().slice(0, 80);
  if (query) {
    const like = `%${query.replace(/[%_]/g, "")}%`;
    clauses.push("(name LIKE ? OR email LIKE ? OR company LIKE ? OR message LIKE ?)");
    params.push(like, like, like, like);
  }

  if (from) {
    clauses.push("created_at >= ?");
    params.push(from);
  }
  if (to) {
    clauses.push("created_at < ?");
    params.push(to);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

function listMessages({ status = "all", q = "", from = null, to = null, limit = 300 } = {}) {
  const { where, params } = messageWhere({ status, q, from, to });
  const cap = Math.min(Math.max(Number(limit) || 300, 1), 300);
  return db.prepare(`SELECT * FROM messages ${where} ORDER BY created_at DESC, id DESC LIMIT ?`).all(...params, cap);
}

function countFilteredMessages({ status = "all", q = "", from = null, to = null } = {}) {
  const { where, params } = messageWhere({ status, q, from, to });
  return db.prepare(`SELECT COUNT(*) AS count FROM messages ${where}`).get(...params).count;
}

function getMessage(id) {
  return db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
}

function setMessageRead(id, isRead) {
  return db.prepare("UPDATE messages SET is_read = ? WHERE id = ?").run(isRead ? 1 : 0, id).changes > 0;
}

function markAllRead() {
  return db.prepare("UPDATE messages SET is_read = 1 WHERE is_read = 0").run().changes;
}

function deleteMessage(id) {
  return db.prepare("DELETE FROM messages WHERE id = ?").run(id).changes > 0;
}

function messageCounts() {
  const total = db.prepare("SELECT COUNT(*) AS count FROM messages").get().count;
  const unread = db.prepare("SELECT COUNT(*) AS count FROM messages WHERE is_read = 0").get().count;
  return { total, unread };
}

function nairobiParts(date = new Date()) {
  const bag = {};
  new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date).forEach((part) => {
    bag[part.type] = part.value;
  });
  return { year: Number(bag.year), month: Number(bag.month), day: Number(bag.day), weekday: bag.weekday };
}

function shiftNairobi(parts, days) {
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

function dayKeyFromParts(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function dayKey(date) {
  return dayKeyFromParts(nairobiParts(date));
}

function recordVisit() {
  const now = new Date();
  db.prepare("INSERT INTO visits (day, created_at) VALUES (?, ?)").run(dayKey(now), now.toISOString());
}

function visitStats({ from = null, to = null } = {}) {
  const total = db.prepare("SELECT COUNT(*) AS count FROM visits").get().count;
  const today = nairobiParts();
  const start = from ? nairobiParts(new Date(from)) : shiftNairobi(today, -6);
  const end = to ? nairobiParts(new Date(to)) : shiftNairobi(today, 1);
  const startKey = dayKeyFromParts(start);
  const endKey = dayKeyFromParts(end);
  const rows = db.prepare(
    "SELECT day, COUNT(*) AS count FROM visits WHERE day >= ? AND day < ? GROUP BY day"
  ).all(startKey, endKey);
  let dayCount = 0;
  let walker = start;
  while (dayKeyFromParts(walker) < endKey && dayCount < 400) {
    dayCount += 1;
    walker = shiftNairobi(walker, 1);
  }
  const monthly = dayCount > 45;

  if (monthly) {
    const buckets = [];
    let cursor = { year: start.year, month: start.month, day: 1 };
    while (buckets.length < 24) {
      const monthStart = dayKeyFromParts(cursor);
      const next = { year: cursor.month === 12 ? cursor.year + 1 : cursor.year, month: cursor.month === 12 ? 1 : cursor.month + 1, day: 1 };
      if (monthStart >= endKey) break;
      const labelDate = new Date(Date.UTC(cursor.year, cursor.month - 1, 1) - 3 * 60 * 60 * 1000);
      buckets.push({
        day: monthStart.slice(0, 7),
        label: labelDate.toLocaleDateString("en-US", { timeZone: "Africa/Nairobi", month: "short" }),
        count: 0,
      });
      cursor = next;
    }
    rows.forEach((row) => {
      const bucket = buckets.find((item) => item.day === row.day.slice(0, 7));
      if (bucket) bucket.count += row.count;
    });
    return { total, week: buckets.reduce((sum, item) => sum + item.count, 0), series: buckets };
  }

  const counts = Object.fromEntries(rows.map((row) => [row.day, row.count]));
  const series = [];
  let cursor = start;
  while (dayKeyFromParts(cursor) < endKey && series.length < 45) {
    const day = dayKeyFromParts(cursor);
    const labelDate = new Date(Date.UTC(cursor.year, cursor.month - 1, cursor.day) - 3 * 60 * 60 * 1000);
    series.push({
      day,
      label: dayCount <= 14
        ? labelDate.toLocaleDateString("en-US", { timeZone: "Africa/Nairobi", weekday: "short" })
        : String(cursor.day),
      count: counts[day] || 0,
    });
    cursor = shiftNairobi(cursor, 1);
  }
  return { total, week: series.reduce((sum, item) => sum + item.count, 0), series };
}

function findAdmin(username) {
  return db.prepare("SELECT * FROM admins WHERE lower(username) = lower(?)").get(username);
}

function getAdmin(id) {
  return db.prepare("SELECT id, username, must_change, created_at FROM admins WHERE id = ?").get(id);
}

function getAdminAuth(id) {
  return db.prepare("SELECT * FROM admins WHERE id = ?").get(id);
}

function setPassword(id, passwordHash) {
  db.prepare("UPDATE admins SET password_hash = ?, must_change = 0 WHERE id = ?").run(passwordHash, id);
}

function passwordChangeRequired() {
  const admin = db.prepare("SELECT must_change FROM admins ORDER BY id ASC LIMIT 1").get();
  return !!(admin && admin.must_change);
}

module.exports = {
  getSettings,
  saveSettings,
  listRows,
  getRow,
  insertRow,
  updateRow,
  deleteRow,
  reorderRows,
  countRows,
  addMessage,
  listMessages,
  countFilteredMessages,
  getMessage,
  setMessageRead,
  markAllRead,
  deleteMessage,
  messageCounts,
  recordVisit,
  visitStats,
  findAdmin,
  getAdmin,
  getAdminAuth,
  setPassword,
  passwordChangeRequired,
};
