const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
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

const APP_CATALOG = [
  ["Ethiomark Bingo", "Hall layout", "Online and offline Bingo with the Ethiomark layout.", "bingo", "both", "", 0],
  ["Anbesa Bingo", "Hall layout", "Online and offline Bingo with the Anbesa layout.", "bingo", "both", "", 1],
  ["Telegram Bingo", "Telegram bot", "Bingo through Telegram in the Normal format.", "bingo", "telegram", "Normal", 2],
  ["Telegram Bingo", "Telegram bot", "Bingo through Telegram in the Super format.", "bingo", "telegram", "Super", 3],
  ["Keno", "Online & Offline", "Keno for online play and offline venues.", "keno", "both", "", 4],
  ["Spin", "Online & Offline", "Spin for online play and offline venues.", "spin", "both", "", 5],
];

let pool;

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value && name !== "DB_PASSWORD") {
    const error = new Error(`Set ${name} in the .env file.`);
    error.status = 500;
    throw error;
  }
  return value;
}

function createPool() {
  return mysql.createPool({
    host: requiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT) || 3306,
    user: requiredEnv("DB_USER"),
    password: process.env.DB_PASSWORD == null ? "" : String(process.env.DB_PASSWORD),
    database: requiredEnv("DB_NAME"),
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: Number(process.env.DB_QUEUE_LIMIT) || 0,
    namedPlaceholders: false,
    dateStrings: true,
    charset: "utf8mb4",
  });
}

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const api = {
      query: async (sql, params = []) => {
        const [rows] = await connection.query(sql, params);
        return rows;
      },
      execute: async (sql, params = []) => {
        const [result] = await connection.execute(sql, params);
        return result;
      },
    };
    const value = await work(api);
    await connection.commit();
    return value;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(120) NOT NULL PRIMARY KEY,
      value TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(80) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      must_change TINYINT(1) NOT NULL DEFAULT 1,
      created_at VARCHAR(40) NOT NULL,
      UNIQUE KEY uq_admins_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS stats (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      value INT NOT NULL,
      suffix VARCHAR(8) NOT NULL DEFAULT '',
      label VARCHAR(80) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      visible TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS services (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      icon VARCHAR(16) NOT NULL DEFAULT '',
      title VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      visible TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      link VARCHAR(300) NOT NULL DEFAULT '',
      sort_order INT NOT NULL DEFAULT 0,
      visible TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS apps (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      tagline VARCHAR(140) NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      photos TEXT NOT NULL,
      video VARCHAR(300) NOT NULL DEFAULT '',
      link VARCHAR(300) NOT NULL DEFAULT '',
      family VARCHAR(20) NOT NULL DEFAULT 'bingo',
      channel VARCHAR(20) NOT NULL DEFAULT 'both',
      edition VARCHAR(40) NOT NULL DEFAULT '',
      sort_order INT NOT NULL DEFAULT 0,
      visible TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS process_steps (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      visible TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      role VARCHAR(120) NOT NULL,
      bio TEXT NOT NULL,
      skills TEXT NOT NULL,
      avatar_letter VARCHAR(2) NOT NULL DEFAULT '',
      avatar_image VARCHAR(300) NOT NULL DEFAULT '',
      sort_order INT NOT NULL DEFAULT 0,
      visible TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      quote TEXT NOT NULL,
      name VARCHAR(120) NOT NULL,
      company VARCHAR(160) NOT NULL DEFAULT '',
      avatar_letter VARCHAR(2) NOT NULL DEFAULT '',
      avatar_image VARCHAR(300) NOT NULL DEFAULT '',
      sort_order INT NOT NULL DEFAULT 0,
      visible TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS technologies (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(60) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      visible TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS faqs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      question VARCHAR(200) NOT NULL,
      answer TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      visible TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS pricing_plans (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      amount VARCHAR(40) NOT NULL,
      period VARCHAR(40) NOT NULL DEFAULT '',
      description VARCHAR(300) NOT NULL DEFAULT '',
      features TEXT NOT NULL,
      featured TINYINT(1) NOT NULL DEFAULT 0,
      badge VARCHAR(40) NOT NULL DEFAULT '',
      button_text VARCHAR(40) NOT NULL DEFAULT 'Get Started',
      sort_order INT NOT NULL DEFAULT 0,
      visible TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      email VARCHAR(160) NOT NULL,
      company VARCHAR(120) NOT NULL DEFAULT '',
      service VARCHAR(120) NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at VARCHAR(40) NOT NULL,
      KEY idx_messages_created (created_at, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS visits (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      day CHAR(10) NOT NULL,
      created_at VARCHAR(40) NOT NULL,
      KEY idx_visits_day (day)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureAppsCatalog() {
  const countRow = await queryOne("SELECT COUNT(*) AS count FROM apps");
  if (!Number(countRow?.count || 0)) {
    for (const row of APP_CATALOG) {
      await execute(
        `INSERT INTO apps (name, tagline, description, photos, video, link, family, channel, edition, sort_order, visible)
         VALUES (?, ?, ?, '[]', '', '', ?, ?, ?, ?, 1)`,
        row
      );
    }
  } else {
    for (const row of APP_CATALOG) {
      const existing = await queryOne(
        "SELECT id FROM apps WHERE name = ? AND edition = ? LIMIT 1",
        [row[0], row[5]]
      );
      if (!existing) {
        await execute(
          `INSERT INTO apps (name, tagline, description, photos, video, link, family, channel, edition, sort_order, visible)
           VALUES (?, ?, ?, '[]', '', '', ?, ?, ?, ?, 1)`,
          row
        );
      }
    }
  }

  await execute(
    `UPDATE settings SET value = ?
     WHERE \`key\` = 'apps_text'
       AND value IN (?, ?, ?)`,
    [
      "Bingo, Keno, and Spin — online and offline. Bingo includes named hall layouts and Telegram Normal and Super.",
      "Bingo, Keno, Spin, and the next one you ship. Each app can carry its own photos and a video.",
      "Live Bingo, Keno, and Spin. Clear rounds, fast draws, and a result people can follow.",
      "Bingo, Keno, and Spin, online and offline. Bingo also runs on Telegram, in Normal and Super.",
    ]
  );
}

async function ensureAdmin() {
  const adminCount = await queryOne("SELECT COUNT(*) AS count FROM admins");
  if (Number(adminCount?.count || 0)) return;
  await execute(
    "INSERT INTO admins (username, password_hash, must_change, created_at) VALUES (?, ?, 1, ?)",
    ["admin", bcrypt.hashSync("admin123", 10), new Date().toISOString()]
  );
}

async function init() {
  if (pool) return pool;
  pool = createPool();
  await pool.query("SELECT 1");
  await ensureSchema();
  await seed({ query, queryOne, execute, withTransaction });
  await ensureAppsCatalog();
  await ensureAdmin();
  return pool;
}

function getPool() {
  if (!pool) {
    const error = new Error("Database is not ready.");
    error.status = 500;
    throw error;
  }
  return pool;
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

async function getSettings() {
  const merged = { ...DEFAULT_SETTINGS };
  const rows = await query("SELECT `key`, value FROM settings");
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(merged, row.key)) merged[row.key] = row.value;
  }
  return merged;
}

async function saveSettings(values) {
  await withTransaction(async (tx) => {
    for (const [key, value] of Object.entries(values)) {
      await tx.execute(
        `INSERT INTO settings (\`key\`, value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        [key, value]
      );
    }
  });
  return getSettings();
}

async function listRows(table, { visibleOnly = false } = {}) {
  assertTable(table);
  const where = visibleOnly ? "WHERE visible = 1" : "";
  return query(`SELECT * FROM ${table} ${where} ORDER BY sort_order ASC, id ASC`);
}

async function getRow(table, id) {
  assertTable(table);
  return queryOne(`SELECT * FROM ${table} WHERE id = ?`, [id]);
}

async function insertRow(table, data) {
  assertTable(table);
  const keys = Object.keys(data);
  keys.forEach(assertColumn);
  const maxRow = await queryOne(`SELECT COALESCE(MAX(sort_order), -1) AS max FROM ${table}`);
  const sort = Number(maxRow?.max ?? -1) + 1;
  const columns = [...keys, "sort_order"];
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
  const result = await execute(sql, [...keys.map((key) => data[key]), sort]);
  return getRow(table, Number(result.insertId));
}

async function updateRow(table, id, data) {
  assertTable(table);
  const existing = await getRow(table, id);
  if (!existing) return null;
  const keys = Object.keys(data);
  keys.forEach(assertColumn);
  const sql = `UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE id = ?`;
  await execute(sql, [...keys.map((key) => data[key]), id]);
  return getRow(table, id);
}

async function deleteRow(table, id) {
  assertTable(table);
  const result = await execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

async function reorderRows(table, ids) {
  assertTable(table);
  await withTransaction(async (tx) => {
    const list = Array.isArray(ids) ? ids : [];
    for (let index = 0; index < list.length; index += 1) {
      const number = Number(list[index]);
      if (Number.isInteger(number) && number > 0) {
        await tx.execute(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [index, number]);
      }
    }
  });
}

async function countRows(table) {
  assertTable(table);
  const row = await queryOne(`SELECT COUNT(*) AS count FROM ${table}`);
  return Number(row?.count || 0);
}

async function addMessage(message) {
  const result = await execute(
    `INSERT INTO messages (name, email, company, service, message, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [message.name, message.email, message.company, message.service, message.message, new Date().toISOString()]
  );
  return Number(result.insertId);
}

function messageWhere({ status = "all", q = "", from = null, to = null } = {}) {
  const clauses = [];
  const params = [];

  if (status === "unread") clauses.push("is_read = 0");
  if (status === "read") clauses.push("is_read = 1");

  const queryText = String(q || "").trim().slice(0, 80);
  if (queryText) {
    const like = `%${queryText.replace(/[%_]/g, "")}%`;
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

async function listMessages({ status = "all", q = "", from = null, to = null, limit = 300 } = {}) {
  const { where, params } = messageWhere({ status, q, from, to });
  const cap = Math.min(Math.max(Number(limit) || 300, 1), 300);
  return query(
    `SELECT * FROM messages ${where} ORDER BY created_at DESC, id DESC LIMIT ?`,
    [...params, cap]
  );
}

async function countFilteredMessages({ status = "all", q = "", from = null, to = null } = {}) {
  const { where, params } = messageWhere({ status, q, from, to });
  const row = await queryOne(`SELECT COUNT(*) AS count FROM messages ${where}`, params);
  return Number(row?.count || 0);
}

async function getMessage(id) {
  return queryOne("SELECT * FROM messages WHERE id = ?", [id]);
}

async function setMessageRead(id, isRead) {
  const result = await execute("UPDATE messages SET is_read = ? WHERE id = ?", [isRead ? 1 : 0, id]);
  return result.affectedRows > 0;
}

async function markAllRead() {
  const result = await execute("UPDATE messages SET is_read = 1 WHERE is_read = 0");
  return result.affectedRows;
}

async function deleteMessage(id) {
  const result = await execute("DELETE FROM messages WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

async function messageCounts() {
  const total = await queryOne("SELECT COUNT(*) AS count FROM messages");
  const unread = await queryOne("SELECT COUNT(*) AS count FROM messages WHERE is_read = 0");
  return { total: Number(total?.count || 0), unread: Number(unread?.count || 0) };
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

async function recordVisit() {
  const now = new Date();
  await execute("INSERT INTO visits (day, created_at) VALUES (?, ?)", [dayKey(now), now.toISOString()]);
}

async function visitStats({ from = null, to = null } = {}) {
  const totalRow = await queryOne("SELECT COUNT(*) AS count FROM visits");
  const total = Number(totalRow?.count || 0);
  const today = nairobiParts();
  const start = from ? nairobiParts(new Date(from)) : shiftNairobi(today, -6);
  const end = to ? nairobiParts(new Date(to)) : shiftNairobi(today, 1);
  const startKey = dayKeyFromParts(start);
  const endKey = dayKeyFromParts(end);
  const rows = await query(
    "SELECT day, COUNT(*) AS count FROM visits WHERE day >= ? AND day < ? GROUP BY day",
    [startKey, endKey]
  );
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
      const next = {
        year: cursor.month === 12 ? cursor.year + 1 : cursor.year,
        month: cursor.month === 12 ? 1 : cursor.month + 1,
        day: 1,
      };
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
      if (bucket) bucket.count += Number(row.count);
    });
    return { total, week: buckets.reduce((sum, item) => sum + item.count, 0), series: buckets };
  }

  const counts = Object.fromEntries(rows.map((row) => [row.day, Number(row.count)]));
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

async function findAdmin(username) {
  return queryOne("SELECT * FROM admins WHERE LOWER(username) = LOWER(?) LIMIT 1", [username]);
}

async function getAdmin(id) {
  return queryOne("SELECT id, username, must_change, created_at FROM admins WHERE id = ?", [id]);
}

async function getAdminAuth(id) {
  return queryOne("SELECT * FROM admins WHERE id = ?", [id]);
}

async function setPassword(id, passwordHash) {
  await execute("UPDATE admins SET password_hash = ?, must_change = 0 WHERE id = ?", [passwordHash, id]);
}

async function passwordChangeRequired() {
  const admin = await queryOne("SELECT must_change FROM admins ORDER BY id ASC LIMIT 1");
  return !!(admin && admin.must_change);
}

module.exports = {
  init,
  getPool,
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
