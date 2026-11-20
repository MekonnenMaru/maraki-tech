const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const db = require("../db");
const { DEFAULT_SETTINGS, GROUPS } = require("../settings");
const { COLLECTIONS, sanitize, present, fail } = require("../content");
const { limited, strike, clear } = require("../rate-limit");

const router = express.Router();
const WINDOW = 15 * 60 * 1000;
const REMEMBER_ME_DAYS = 30;
const uploadDir = path.join(__dirname, "..", "..", "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const VIDEO_TYPES = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = VIDEO_TYPES[file.mimetype];
      if (!ext) return cb(new Error("Use an MP4 or WebM video."));
      cb(null, crypto.randomBytes(16).toString("hex") + ext);
    },
  }),
  limits: { fileSize: 40 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!VIDEO_TYPES[file.mimetype]) return cb(new Error("Use an MP4 or WebM video."));
    cb(null, true);
  },
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = TYPES[file.mimetype];
      if (!ext) return cb(new Error("Use a JPG, PNG, WEBP, or GIF."));
      cb(null, crypto.randomBytes(16).toString("hex") + ext);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!TYPES[file.mimetype]) return cb(new Error("Use a JPG, PNG, WEBP, or GIF."));
    cb(null, true);
  },
});

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.use((req, res, next) => {
  if (req.method === "POST" && req.path === "/login") return next();
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: "Please sign in." });
  }
  next();
});

function clientIp(req) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function presentMessage(row) {
  const place = [row.city, row.country].filter(Boolean).join(", ");
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company || "",
    service: row.service || "",
    message: row.message,
    country: row.country || "",
    city: row.city || "",
    phone: row.phone || "",
    place,
    source: row.source || "",
    utm_source: row.utm_source || "",
    utm_medium: row.utm_medium || "",
    utm_campaign: row.utm_campaign || "",
    utm_term: row.utm_term || "",
    utm_content: row.utm_content || "",
    gclid: row.gclid || "",
    landing_page: row.landing_page || "",
    referrer: row.referrer || "",
    ip: row.ip || "",
    user_agent: row.user_agent || "",
    is_read: !!row.is_read,
    created_at: row.created_at,
  };
}

router.post("/login", async (req, res, next) => {
  try {
    const ip = clientIp(req);
    if (limited("login", ip, 8, WINDOW)) {
      return res.status(429).json({ error: "Too many sign-in attempts. Please wait 15 minutes and try again." });
    }

    const username = String((req.body && req.body.username) || "").trim();
    const password = String((req.body && req.body.password) || "");
    if (!username || !password) {
      return res.status(400).json({ error: "Enter your username and password." });
    }

    const admin = await db.findAdmin(username);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      strike("login", ip, WINDOW);
      return res.status(401).json({ error: "Invalid username or password." });
    }

    clear("login", ip);
    const remember = !!(req.body && req.body.remember === true);
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.adminId = admin.id;
      req.session.username = admin.username;
      // "Remember me": stay signed in for 30 days. Otherwise SESSION_HOURS from .env (default 12).
      if (remember) req.session.cookie.maxAge = REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000;
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.json({ username: admin.username, mustChange: !!admin.must_change });
      });
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("maraki.sid", { path: "/", httpOnly: true, sameSite: "lax" });
    res.json({ ok: true });
  });
});

router.get("/me", async (req, res, next) => {
  try {
    const admin = await db.getAdmin(req.session.adminId);
    if (!admin) return res.status(401).json({ error: "Please sign in." });
    res.json({ username: admin.username, mustChange: !!admin.must_change });
  } catch (error) {
    next(error);
  }
});

router.put("/password", async (req, res, next) => {
  try {
    const currentPassword = String((req.body && req.body.currentPassword) || "");
    const newPassword = String((req.body && req.body.newPassword) || "");
    if (newPassword.length < 8) fail(400, "Use at least 8 characters.");
    if (newPassword.length > 200) fail(400, "That password is too long.");

    const admin = await db.getAdminAuth(req.session.adminId);
    if (!admin || !bcrypt.compareSync(currentPassword, admin.password_hash)) {
      fail(400, "Current password is incorrect.");
    }
    await db.setPassword(admin.id, bcrypt.hashSync(newPassword, 10));
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

function queryInstant(value) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

router.get("/dashboard", async (req, res, next) => {
  try {
    const messages = await db.messageCounts();
    const from = queryInstant(req.query.from);
    const to = queryInstant(req.query.to);
    const visits = await db.visitStats({ from, to });
    const counts = {};
    for (const [name, spec] of Object.entries(COLLECTIONS)) {
      counts[name] = await db.countRows(spec.table);
    }
    const recent = (await db.listMessages({ limit: 5, from, to })).map(presentMessage);
    res.json({ messages, visits, counts, recent, settings: await db.getSettings() });
  } catch (error) {
    next(error);
  }
});

router.get("/settings", async (req, res, next) => {
  try {
    res.json(await db.getSettings());
  } catch (error) {
    next(error);
  }
});

router.get("/schema", (req, res) => {
  res.json({ groups: GROUPS });
});

// Settings that must have a certain shape. An empty value is always allowed
// (for Google IDs it switches that service off).
const FORMATS = {
  ga4_measurement_id: [/^G-[A-Z0-9]{4,20}$/, "The GA4 ID looks like G-XXXXXXXXXX."],
  google_ads_id: [/^AW-\d{6,15}$/, "The Google Ads ID looks like AW-123456789."],
  google_ads_conversion_label: [/^[\w-]{6,40}$/, "The conversion label is the short code after the slash, e.g. AbC-D_efG12."],
  adsense_client_id: [/^ca-pub-\d{10,20}$/, "The AdSense publisher ID looks like ca-pub-1234567890123456."],
  privacy_email: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "The privacy contact email doesn't look like an email address."],
  privacy_min_age: [/^\d{1,2}$/, "The minimum age must be a number, e.g. 16."],
  privacy_updated: [/^\d{4}-\d{2}-\d{2}$/, "Write the “Last updated” date as YYYY-MM-DD, e.g. 2026-11-20."],
};

function checkFormat(key, value) {
  const rule = FORMATS[key];
  if (rule && value && !rule[0].test(value)) fail(400, rule[1]);
}

// Most settings are short. Text a lawyer provides can be long.
const MAX_LENGTH = { privacy_extra: 20000 };

// Changing any of these changes what the Privacy Policy says,
// so its "Last updated" date moves to today automatically.
const PRIVACY_KEYS = [
  "privacy_newsletter", "privacy_legal_name", "privacy_email", "privacy_retention", "privacy_min_age", "privacy_extra",
  "ga4_measurement_id", "google_ads_id", "adsense_client_id",
];

function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }); // YYYY-MM-DD
}

router.put("/settings", async (req, res, next) => {
  try {
    const input = req.body;
    if (!input || typeof input !== "object" || Array.isArray(input)) fail(400, "Invalid data.");

    const values = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
      let value = input[key];
      if (typeof value === "boolean") value = value ? "1" : "0";
      value = value == null ? "" : String(value).trim();
      if (key.startsWith("show_") || key === "privacy_newsletter") value = value === "1" || value === "true" ? "1" : "0";
      if (value.length > (MAX_LENGTH[key] || 2000)) fail(400, `${key.replace(/_/g, " ")} is too long.`);
      if (key === "ga4_measurement_id" || key === "google_ads_id") value = value.toUpperCase();
      if (key === "adsense_client_id" || key === "privacy_email") value = value.toLowerCase();
      checkFormat(key, value);
      values[key] = value;
    }

    if (!Object.keys(values).length) fail(400, "Nothing to update.");

    // Policy text changed and the date wasn't edited by hand → today's date.
    const current = await db.getSettings();
    const policyChanged = PRIVACY_KEYS.some((key) => key in values && values[key] !== current[key]);
    const dateEdited = "privacy_updated" in values && values.privacy_updated !== current.privacy_updated;
    if (policyChanged && !dateEdited) values.privacy_updated = today();

    res.json(await db.saveSettings(values));
  } catch (error) {
    next(error);
  }
});

router.post("/upload", (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      const message = error.code === "LIMIT_FILE_SIZE" ? "Image must be under 2 MB." : error.message;
      return res.status(400).json({ error: message || "Upload failed." });
    }
    if (!req.file) return res.status(400).json({ error: "Choose an image." });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

router.post("/upload/video", (req, res) => {
  videoUpload.single("video")(req, res, (error) => {
    if (error) {
      const message = error.code === "LIMIT_FILE_SIZE" ? "Video must be under 40 MB." : error.message;
      return res.status(400).json({ error: message || "Upload failed." });
    }
    if (!req.file) return res.status(400).json({ error: "Choose a video." });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

router.get("/messages", async (req, res, next) => {
  try {
    const status = ["unread", "read"].includes(req.query.status) ? req.query.status : "all";
    const filter = {
      status,
      q: req.query.q || "",
      from: queryInstant(req.query.from),
      to: queryInstant(req.query.to),
    };
    const messages = (await db.listMessages(filter)).map(presentMessage);
    res.json({
      messages,
      matched: await db.countFilteredMessages(filter),
      limit: 300,
      counts: await db.messageCounts(),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/messages/read-all", async (req, res, next) => {
  try {
    await db.markAllRead();
    res.json({ ok: true, counts: await db.messageCounts() });
  } catch (error) {
    next(error);
  }
});

router.patch("/messages/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) fail(400, "Invalid id.");
    const isRead = !!(req.body && req.body.is_read);
    if (!(await db.setMessageRead(id, isRead))) fail(404, "Message not found.");
    res.json({
      message: presentMessage(await db.getMessage(id)),
      counts: await db.messageCounts(),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/messages/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) fail(400, "Invalid id.");
    if (!(await db.deleteMessage(id))) fail(404, "Message not found.");
    res.json({ ok: true, counts: await db.messageCounts() });
  } catch (error) {
    next(error);
  }
});

router.get("/:collection", async (req, res, next) => {
  try {
    const spec = COLLECTIONS[req.params.collection];
    if (!spec) fail(404, "Not found.");
    const rows = await db.listRows(spec.table);
    res.json(rows.map((row) => present(req.params.collection, row)));
  } catch (error) {
    next(error);
  }
});

router.post("/:collection/reorder", async (req, res, next) => {
  try {
    const spec = COLLECTIONS[req.params.collection];
    if (!spec) fail(404, "Not found.");
    if (!req.body || !Array.isArray(req.body.ids)) fail(400, "Provide the new order.");
    await db.reorderRows(spec.table, req.body.ids);
    const rows = await db.listRows(spec.table);
    res.json(rows.map((row) => present(req.params.collection, row)));
  } catch (error) {
    next(error);
  }
});

router.post("/:collection", async (req, res, next) => {
  try {
    const name = req.params.collection;
    if (!COLLECTIONS[name]) fail(404, "Not found.");
    const row = await db.insertRow(COLLECTIONS[name].table, sanitize(name, req.body));
    res.status(201).json(present(name, row));
  } catch (error) {
    next(error);
  }
});

router.put("/:collection/:id", async (req, res, next) => {
  try {
    const name = req.params.collection;
    if (!COLLECTIONS[name]) fail(404, "Not found.");
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) fail(400, "Invalid id.");
    const row = await db.updateRow(
      COLLECTIONS[name].table,
      id,
      sanitize(name, req.body, { partial: true })
    );
    if (!row) fail(404, "Not found.");
    res.json(present(name, row));
  } catch (error) {
    next(error);
  }
});

router.delete("/:collection/:id", async (req, res, next) => {
  try {
    const spec = COLLECTIONS[req.params.collection];
    if (!spec) fail(404, "Not found.");
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) fail(400, "Invalid id.");
    if (!(await db.deleteRow(spec.table, id))) fail(404, "Not found.");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
