// Leads sent through the contact form (the admin "Inbox").
const { query, queryOne, execute, count } = require("./connection");

async function addMessage(message) {
  const result = await execute(
    `INSERT INTO messages (
      name, email, company, service, message,
      country, city, phone, source,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid,
      landing_page, referrer, ip, user_agent,
      is_read, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      message.name,
      message.email,
      message.company,
      message.service,
      message.message,
      message.country || "",
      message.city || "",
      message.phone || "",
      message.source || "",
      message.utm_source || "",
      message.utm_medium || "",
      message.utm_campaign || "",
      message.utm_term || "",
      message.utm_content || "",
      message.gclid || "",
      message.landing_page || "",
      message.referrer || "",
      message.ip || "",
      message.user_agent || "",
      new Date().toISOString(),
    ]
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
    clauses.push(
      "(name LIKE ? OR email LIKE ? OR company LIKE ? OR message LIKE ? OR country LIKE ? OR city LIKE ? OR source LIKE ? OR utm_source LIKE ? OR utm_campaign LIKE ?)"
    );
    params.push(like, like, like, like, like, like, like, like, like);
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
  return {
    total: await count("SELECT COUNT(*) AS count FROM messages"),
    unread: await count("SELECT COUNT(*) AS count FROM messages WHERE is_read = 0"),
  };
}

module.exports = {
  addMessage,
  listMessages,
  countFilteredMessages,
  getMessage,
  setMessageRead,
  markAllRead,
  deleteMessage,
  messageCounts,
};
