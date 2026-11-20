// Builds the Express app: security headers, login sessions, routes and error handling.
const path = require("path");
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const config = require("./config");
const { SESSION_COOKIE } = require("./storage-names");
const db = require("./db");
const publicRoutes = require("./routes/public");
const adminRoutes = require("./routes/admin");
const pages = require("./routes/pages");
const telegramBot = require("./telegram-bot"); // standalone feature: src/telegram-bot/

const publicDir = path.join(__dirname, "..", "public");

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
}

// Admin login sessions are stored in MySQL so they survive a restart.
function sessions() {
  const maxAge = config.sessionHours * 60 * 60 * 1000;
  const store = new MySQLStore(
    {
      clearExpired: true,
      checkExpirationInterval: 15 * 60 * 1000,
      expiration: maxAge,
      createDatabaseTable: true,
      schema: {
        tableName: "sessions",
        columnNames: { session_id: "session_id", expires: "expires", data: "data" },
      },
    },
    db.getPool()
  );

  return session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: "auto", // secure cookie when the site is served over HTTPS
      maxAge,
    },
  });
}

// Turns thrown errors into JSON answers. Hides details of unexpected (500) errors.
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON." });
  }
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: status >= 500 ? "Something went wrong." : error.message });
}

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(securityHeaders);
  app.use(express.json({ limit: "1mb" }));
  app.use(sessions());

  app.use(telegramBot.router); // Telegram alerts (API + dashboard page)
  app.use("/api/admin", adminRoutes);
  app.use("/api", publicRoutes);
  app.use(pages.router);
  app.use(express.static(publicDir));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found." });
    pages.notFoundPage(req, res).catch(next);
  });
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
