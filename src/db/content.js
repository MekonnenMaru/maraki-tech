// Site settings (key/value) and the editable lists: services, products, FAQs, etc.
const { DEFAULT_SETTINGS } = require("../settings");
const { query, queryOne, execute, withTransaction, count } = require("./connection");

// Only these tables can be edited through the admin API.
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

// Privacy policy sections edited in the dashboard: { sectionId: { title, text } }.
// Stored as JSON in the settings table under its own key.
const PRIVACY_OVERRIDES_KEY = "privacy_overrides";

async function getPrivacyOverrides() {
  const row = await queryOne("SELECT value FROM settings WHERE `key` = ?", [PRIVACY_OVERRIDES_KEY]);
  try {
    const parsed = JSON.parse(row?.value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function savePrivacyOverrides(overrides) {
  await execute(
    "INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
    [PRIVACY_OVERRIDES_KEY, JSON.stringify(overrides)]
  );
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
  return count(`SELECT COUNT(*) AS count FROM ${table}`);
}

module.exports = {
  getSettings,
  saveSettings,
  getPrivacyOverrides,
  savePrivacyOverrides,
  listRows,
  getRow,
  insertRow,
  updateRow,
  deleteRow,
  reorderRows,
  countRows,
};
