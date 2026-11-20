// Admin accounts for the dashboard login.
const { queryOne, execute } = require("./connection");

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

module.exports = { findAdmin, getAdmin, getAdminAuth, setPassword, passwordChangeRequired };
