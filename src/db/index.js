// Everything the app needs from the database, in one place.
// Use it with:  const db = require("./db");
//
//   connection.js  – MySQL pool and query helpers
//   schema.js      – table definitions and first-start setup
//   content.js     – settings and editable lists (services, FAQs, ...)
//   messages.js    – contact form leads
//   visits.js      – visit counter
//   admins.js      – dashboard login accounts
const connection = require("./connection");
const schema = require("./schema");
const { seed } = require("../seed");

let ready = false;

async function init() {
  if (ready) return;
  const pool = connection.connect();
  await pool.query("SELECT 1"); // fails fast if MySQL is unreachable
  await schema.createTables();
  await schema.addMissingColumns();
  await schema.renameOldSettings();
  await seed(connection);
  await schema.addMissingApps();
  await schema.createFirstAdmin();
  ready = true;
}

module.exports = {
  init,
  getPool: connection.getPool,
  ...require("./content"),
  ...require("./messages"),
  ...require("./visits"),
  ...require("./admins"),
};
