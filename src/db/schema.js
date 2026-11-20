// Creates the database tables on first start, and adds new columns to old databases.
// To add a column: add it to the table below AND to UPGRADES so existing databases get it too.
const bcrypt = require("bcryptjs");
const { query, execute, count } = require("./connection");

const ID = "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY";
const ORDER_AND_VISIBLE = ["sort_order INT NOT NULL DEFAULT 0", "visible TINYINT(1) NOT NULL DEFAULT 1"];

const TABLES = {
  settings: ["`key` VARCHAR(120) NOT NULL PRIMARY KEY", "value TEXT NOT NULL"],

  admins: [
    ID,
    "username VARCHAR(80) NOT NULL",
    "password_hash VARCHAR(255) NOT NULL",
    "must_change TINYINT(1) NOT NULL DEFAULT 1",
    "created_at VARCHAR(40) NOT NULL",
    "UNIQUE KEY uq_admins_username (username)",
  ],

  stats: [
    ID,
    "value INT NOT NULL",
    "suffix VARCHAR(8) NOT NULL DEFAULT ''",
    "label VARCHAR(80) NOT NULL",
    ...ORDER_AND_VISIBLE,
  ],

  services: [
    ID,
    "icon VARCHAR(16) NOT NULL DEFAULT ''",
    "title VARCHAR(120) NOT NULL",
    "description TEXT NOT NULL",
    ...ORDER_AND_VISIBLE,
  ],

  products: [
    ID,
    "title VARCHAR(120) NOT NULL",
    "description TEXT NOT NULL",
    "link VARCHAR(300) NOT NULL DEFAULT ''",
    ...ORDER_AND_VISIBLE,
  ],

  apps: [
    ID,
    "name VARCHAR(80) NOT NULL",
    "tagline VARCHAR(140) NOT NULL DEFAULT ''",
    "description TEXT NOT NULL",
    "photos TEXT NOT NULL",
    "video VARCHAR(300) NOT NULL DEFAULT ''",
    "link VARCHAR(300) NOT NULL DEFAULT ''",
    "family VARCHAR(20) NOT NULL DEFAULT 'bingo'",
    "channel VARCHAR(20) NOT NULL DEFAULT 'both'",
    "edition VARCHAR(40) NOT NULL DEFAULT ''",
    ...ORDER_AND_VISIBLE,
  ],

  process_steps: [ID, "title VARCHAR(120) NOT NULL", "description TEXT NOT NULL", ...ORDER_AND_VISIBLE],

  team_members: [
    ID,
    "name VARCHAR(120) NOT NULL",
    "role VARCHAR(120) NOT NULL",
    "bio TEXT NOT NULL",
    "skills TEXT NOT NULL",
    "avatar_letter VARCHAR(2) NOT NULL DEFAULT ''",
    "avatar_image VARCHAR(300) NOT NULL DEFAULT ''",
    ...ORDER_AND_VISIBLE,
  ],

  testimonials: [
    ID,
    "quote TEXT NOT NULL",
    "name VARCHAR(120) NOT NULL",
    "company VARCHAR(160) NOT NULL DEFAULT ''",
    "avatar_letter VARCHAR(2) NOT NULL DEFAULT ''",
    "avatar_image VARCHAR(300) NOT NULL DEFAULT ''",
    ...ORDER_AND_VISIBLE,
  ],

  technologies: [ID, "name VARCHAR(60) NOT NULL", ...ORDER_AND_VISIBLE],

  faqs: [ID, "question VARCHAR(200) NOT NULL", "answer TEXT NOT NULL", ...ORDER_AND_VISIBLE],

  pricing_plans: [
    ID,
    "name VARCHAR(80) NOT NULL",
    "amount VARCHAR(40) NOT NULL",
    "period VARCHAR(40) NOT NULL DEFAULT ''",
    "description VARCHAR(300) NOT NULL DEFAULT ''",
    "features TEXT NOT NULL",
    "featured TINYINT(1) NOT NULL DEFAULT 0",
    "badge VARCHAR(40) NOT NULL DEFAULT ''",
    "button_text VARCHAR(40) NOT NULL DEFAULT 'Get Started'",
    ...ORDER_AND_VISIBLE,
  ],

  messages: [
    ID,
    "name VARCHAR(80) NOT NULL",
    "email VARCHAR(160) NOT NULL",
    "company VARCHAR(120) NOT NULL DEFAULT ''",
    "service VARCHAR(120) NOT NULL DEFAULT ''",
    "message TEXT NOT NULL",
    "country VARCHAR(80) NOT NULL DEFAULT ''",
    "city VARCHAR(80) NOT NULL DEFAULT ''",
    "phone VARCHAR(40) NOT NULL DEFAULT ''",
    "source VARCHAR(40) NOT NULL DEFAULT ''",
    "utm_source VARCHAR(120) NOT NULL DEFAULT ''",
    "utm_medium VARCHAR(120) NOT NULL DEFAULT ''",
    "utm_campaign VARCHAR(160) NOT NULL DEFAULT ''",
    "utm_term VARCHAR(160) NOT NULL DEFAULT ''",
    "utm_content VARCHAR(160) NOT NULL DEFAULT ''",
    "gclid VARCHAR(200) NOT NULL DEFAULT ''",
    "landing_page VARCHAR(500) NOT NULL DEFAULT ''",
    "referrer VARCHAR(500) NOT NULL DEFAULT ''",
    "ip VARCHAR(64) NOT NULL DEFAULT ''",
    "user_agent VARCHAR(300) NOT NULL DEFAULT ''",
    "is_read TINYINT(1) NOT NULL DEFAULT 0",
    "created_at VARCHAR(40) NOT NULL",
    "KEY idx_messages_created (created_at, id)",
  ],

  visits: [ID, "day CHAR(10) NOT NULL", "created_at VARCHAR(40) NOT NULL", "KEY idx_visits_day (day)"],
};

// Columns added after the first release. Old databases get them on the next start.
const UPGRADES = {
  messages: [
    "country", "city", "phone", "source",
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid",
    "landing_page", "referrer", "ip", "user_agent",
  ],
};

// The default Entertainment apps. Missing ones are added back on start.
// [name, tagline, description, family, channel, edition, sort_order]
const APP_CATALOG = [
  ["Ethiomark Bingo", "Hall layout", "Online and offline Bingo with the Ethiomark layout.", "bingo", "both", "", 0],
  ["Anbesa Bingo", "Hall layout", "Online and offline Bingo with the Anbesa layout.", "bingo", "both", "", 1],
  ["Telegram Bingo", "Telegram bot", "Bingo through Telegram in the Normal format.", "bingo", "telegram", "Normal", 2],
  ["Telegram Bingo", "Telegram bot", "Bingo through Telegram in the Super format.", "bingo", "telegram", "Super", 3],
  ["Keno", "Online & Offline", "Keno for online play and offline venues.", "keno", "both", "", 4],
  ["Spin", "Online & Offline", "Spin for online play and offline venues.", "spin", "both", "", 5],
];

async function createTables() {
  for (const [name, columns] of Object.entries(TABLES)) {
    await query(`
      CREATE TABLE IF NOT EXISTS ${name} (
        ${columns.join(",\n        ")}
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
}

async function addMissingColumns() {
  for (const [table, names] of Object.entries(UPGRADES)) {
    const existing = new Set((await query(`SHOW COLUMNS FROM ${table}`)).map((row) => row.Field));
    for (const name of names) {
      if (existing.has(name)) continue;
      const definition = TABLES[table].find((column) => column.startsWith(`${name} `));
      await execute(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
    }
  }
}

// Settings that were merged or renamed. The old value is copied to the new name once
// (only if the new one isn't saved yet). [old key, new key]
const RENAMED_SETTINGS = [
  ["footer_brand", "company_name"], // "Brand name" + "Logo text" became one "Company name"
];

async function renameOldSettings() {
  for (const [oldKey, newKey] of RENAMED_SETTINGS) {
    await execute(
      "INSERT IGNORE INTO settings (`key`, value) SELECT ?, value FROM settings WHERE `key` = ?",
      [newKey, oldKey]
    );
  }
}

async function addMissingApps() {
  for (const app of APP_CATALOG) {
    const [name, , , , , edition] = app;
    const found = await count("SELECT COUNT(*) AS count FROM apps WHERE name = ? AND edition = ?", [name, edition]);
    if (found) continue;
    await execute(
      `INSERT INTO apps (name, tagline, description, photos, video, link, family, channel, edition, sort_order, visible)
       VALUES (?, ?, ?, '[]', '', '', ?, ?, ?, ?, 1)`,
      app
    );
  }
}

// First start only: username "admin", password "admin123" (the dashboard forces a change).
async function createFirstAdmin() {
  if (await count("SELECT COUNT(*) AS count FROM admins")) return;
  await execute(
    "INSERT INTO admins (username, password_hash, must_change, created_at) VALUES (?, ?, 1, ?)",
    ["admin", bcrypt.hashSync("admin123", 10), new Date().toISOString()]
  );
}

module.exports = { createTables, addMissingColumns, renameOldSettings, addMissingApps, createFirstAdmin };
