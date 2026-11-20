const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

const envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  const secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(
    envPath,
    [
      "PORT=3000",
      `SESSION_SECRET=${secret}`,
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

if (!process.env.SESSION_SECRET) {
  console.error("Set SESSION_SECRET in the .env file before starting.");
  process.exit(1);
}

for (const key of ["DB_HOST", "DB_USER", "DB_NAME"]) {
  if (!String(process.env[key] || "").trim()) {
    console.error(`Set ${key} in the .env file before starting.`);
    process.exit(1);
  }
}

const db = require("./src/db");
const publicRoutes = require("./src/routes/public");
const adminRoutes = require("./src/routes/admin");

async function start() {
  try {
    await db.init();
  } catch (error) {
    console.error("Could not connect to MySQL.");
    console.error(error.message || error);
    console.error("Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME in .env.");
    process.exit(1);
  }

  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const publicDir = path.join(__dirname, "public");

  const sessionHours = Math.max(1, Number(process.env.SESSION_HOURS) || 12);
  const sessionMaxAge = sessionHours * 60 * 60 * 1000;
  const sessionStore = new MySQLStore(
    {
      clearExpired: true,
      checkExpirationInterval: 15 * 60 * 1000,
      expiration: sessionMaxAge,
      createDatabaseTable: true,
      schema: {
        tableName: "sessions",
        columnNames: {
          session_id: "session_id",
          expires: "expires",
          data: "data",
        },
      },
    },
    db.getPool()
  );

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(
    session({
      name: "maraki.sid",
      secret: process.env.SESSION_SECRET,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: "auto",
        maxAge: sessionMaxAge,
      },
    })
  );

  app.use("/api/admin", adminRoutes);
  app.use("/api", publicRoutes);

  const indexTemplate = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
  const escAttr = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  function siteBase(req) {
    const host = String(req.get("x-forwarded-host") || req.get("host") || "localhost:3000")
      .split(",")[0]
      .trim();
    const proto = String(req.get("x-forwarded-proto") || req.protocol || "http")
      .split(",")[0]
      .trim();
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  app.get(["/", "/index.html"], async (req, res, next) => {
    try {
      const s = await db.getSettings();
      const base = siteBase(req);
      const title = s.meta_title || "Maraki Tech";
      const description = s.meta_description || "";
      const heroImage = String(s.hero_image || "").trim();
      const image = /^https:\/\/\S+\.(jpe?g|png|webp)(\?|#|$)/i.test(heroImage)
        ? heroImage
        : /^\/uploads\/[a-z0-9]+\.(jpe?g|png|webp)$/i.test(heroImage)
          ? base + heroImage
          : "";
      const sameAs = [s.social_x, s.social_linkedin, s.social_github, s.social_telegram].filter((url) =>
        /^https:\/\//i.test(url || "")
      );
      const org = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: s.footer_brand || "Maraki Tech",
        url: base + "/",
        description,
        email: s.email || undefined,
        telephone: s.phone || undefined,
        address: s.location ? { "@type": "PostalAddress", addressLocality: s.location } : undefined,
        sameAs: sameAs.length ? sameAs : undefined,
      };
      const orgJson = JSON.stringify(org).split("<").join("\\u003c");
      const extra = [
        `<link rel="canonical" href="${escAttr(base + "/")}" />`,
        `<meta property="og:url" content="${escAttr(base + "/")}" />`,
        `<meta property="og:site_name" content="${escAttr(s.footer_brand || "Maraki Tech")}" />`,
        image ? `<meta property="og:image" content="${escAttr(image)}" />` : "",
        `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
        `<script type="application/ld+json">${orgJson}</script>`,
      ]
        .filter(Boolean)
        .join("\n  ");
      const setMeta = (html, attr, value) =>
        html.replace(new RegExp(`(<meta ${attr} content=")[^"]*(")`), (m, a, b) => a + escAttr(value) + b);
      let html = indexTemplate.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escAttr(title)}</title>`);
      html = setMeta(html, 'name="description"', description);
      html = setMeta(html, 'property="og:title"', title);
      html = setMeta(html, 'property="og:description"', description);
      html = html.replace("</head>", () => `  ${extra}\n</head>`);
      res.set("Cache-Control", "no-cache").type("html").send(html);
    } catch (error) {
      next(error);
    }
  });

  app.get(["/privacy", "/privacy.html"], (req, res) => {
    res.sendFile(path.join(publicDir, "privacy.html"));
  });

  app.get("/sitemap.xml", (req, res) => {
    const host = String(req.get("x-forwarded-host") || req.get("host") || "localhost:3000")
      .split(",")[0]
      .trim();
    const proto = String(req.get("x-forwarded-proto") || req.protocol || "http")
      .split(",")[0]
      .trim();
    const base = `${proto}://${host}`.replace(/\/$/, "");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${base}/privacy</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
`);
  });

  app.use(express.static(publicDir));

  app.use((req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found." });
    res
      .status(404)
      .type("html")
      .send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found — Maraki Tech</title>
  <link rel="icon" href="/favicon.svg">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body style="min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px">
  <div>
    <div class="section-label">404</div>
    <h1 class="section-title">Page not found.</h1>
    <p class="section-description" style="margin:16px auto 28px">That address is not part of this site.</p>
    <a class="btn btn-primary" href="/">Back to Maraki</a>
  </div>
</body>
</html>`);
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Invalid JSON." });
    }
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({
      error: status >= 500 ? "Something went wrong." : error.message,
    });
  });

  const server = app.listen(port, async () => {
    const mustChange = await db.passwordChangeRequired();
    const passwordNote = mustChange
      ? "\nAdmin login: admin / admin123  — change this after you sign in."
      : "";
    console.log(`Maraki Tech is running at http://localhost:${port}`);
    console.log(`Admin dashboard: http://localhost:${port}/admin${passwordNote}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Set PORT in .env or stop the other process.`);
      process.exit(1);
    }
    throw error;
  });
}

start();
