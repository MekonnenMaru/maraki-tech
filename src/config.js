// Reads settings from the .env file. On the very first run a .env file is created
// with safe defaults and a random session secret — then edit it for your MySQL login.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(
    envPath,
    [
      "PORT=3000",
      `SESSION_SECRET=${crypto.randomBytes(32).toString("hex")}`,
      "SESSION_HOURS=12",
      "DB_HOST=localhost",
      "DB_PORT=3306",
      "DB_USER=root",
      "DB_PASSWORD=",
      "DB_NAME=maraki_tech",
      "DB_CONNECTION_LIMIT=10",
      "DB_QUEUE_LIMIT=0",
      "",
    ].join("\n")
  );
}

require("dotenv").config({ path: envPath });

for (const key of ["SESSION_SECRET", "DB_HOST", "DB_USER", "DB_NAME"]) {
  if (!String(process.env[key] || "").trim()) {
    console.error(`Set ${key} in the .env file before starting.`);
    process.exit(1);
  }
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET,
  sessionHours: Math.max(1, Number(process.env.SESSION_HOURS) || 12),
};
