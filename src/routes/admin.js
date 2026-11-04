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
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    service: row.service,
    message: row.message,
    is_read: !!row.is_read,
    created_at: row.created_at,
  };
}

router.post("/login", (req, res, next) => {
  try {
    const ip = clientIp(req);
    if (limited("login", ip, 8, WINDOW)) {
      return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    }

    const username = String((req.body && req.body.username) || "").trim();
    const password = String((req.body && req.body.password) || "");
    if (!username || !password) {
      return res.status(400).json({ error: "Enter your username and password." });
    }

    const admin = db.findAdmin(username);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      strike("login", ip, WINDOW);
      return res.status(401).json({ error: "Invalid username or password." });
    }

    clear("login", ip);
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.adminId = admin.id;
      req.session.username = admin.username;
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

router.get("/me", (req, res) => {
  const admin = db.getAdmin(req.session.adminId);
  if (!admin) return res.status(401).json({ error: "Please sign in." });
  res.json({ username: admin.username, mustChange: !!admin.must_change });
});

router.put("/password", (req, res) => {
  const currentPassword = String((req.body && req.body.currentPassword) || "");
  const newPassword = String((req.body && req.body.newPassword) || "");
  if (newPassword.length < 8) fail(400, "Use at least 8 characters.");
  if (newPassword.length > 200) fail(400, "That password is too long.");

  const admin = db.getAdminAuth(req.session.adminId);
  if (!admin || !bcrypt.compareSync(currentPassword, admin.password_hash)) {
    fail(400, "Current password is incorrect.");
  }
  db.setPassword(admin.id, bcrypt.hashSync(newPassword, 10));
  res.json({ ok: true });
});

function queryInstant(value) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

router.get("/dashboard", (req, res) => {
  const messages = db.messageCounts();
  const from = queryInstant(req.query.from);
  const to = queryInstant(req.query.to);
  const visits = db.visitStats({ from, to });
  const counts = {};
  for (const [name, spec] of Object.entries(COLLECTIONS)) {
    counts[name] = db.countRows(spec.table);
  }
  const recent = db.listMessages({ limit: 5, from, to }).map(presentMessage);
  res.json({ messages, visits, counts, recent, settings: db.getSettings() });
});

router.get("/settings", (req, res) => {
  res.json(db.getSettings());
});

router.get("/schema", (req, res) => {
  res.json({ groups: GROUPS });
});

router.put("/settings", (req, res) => {
  const input = req.body;
  if (!input || typeof input !== "object" || Array.isArray(input)) fail(400, "Invalid data.");

  const next = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    let value = input[key];
    if (typeof value === "boolean") value = value ? "1" : "0";
    value = value == null ? "" : String(value).trim();
    if (key.startsWith("show_")) value = value === "1" || value === "true" ? "1" : "0";
    if (value.length > 2000) fail(400, `${key.replace(/_/g, " ")} is too long.`);
    next[key] = value;
  }

  if (!Object.keys(next).length) fail(400, "Nothing to update.");
  res.json(db.saveSettings(next));
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

router.get("/messages", (req, res) => {
  const status = ["unread", "read"].includes(req.query.status) ? req.query.status : "all";
  const filter = {
    status,
    q: req.query.q || "",
    from: queryInstant(req.query.from),
    to: queryInstant(req.query.to),
  };
  const messages = db.listMessages(filter).map(presentMessage);
  res.json({
    messages,
    matched: db.countFilteredMessages(filter),
    limit: 300,
    counts: db.messageCounts(),
  });
});

router.patch("/messages/read-all", (req, res) => {
  db.markAllRead();
  res.json({ ok: true, counts: db.messageCounts() });
});

router.patch("/messages/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) fail(400, "Invalid id.");
  const isRead = !!(req.body && req.body.is_read);
  if (!db.setMessageRead(id, isRead)) fail(404, "Message not found.");
  res.json({ message: presentMessage(db.getMessage(id)), counts: db.messageCounts() });
});

router.delete("/messages/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) fail(400, "Invalid id.");
  if (!db.deleteMessage(id)) fail(404, "Message not found.");
  res.json({ ok: true, counts: db.messageCounts() });
});

router.get("/:collection", (req, res) => {
  const spec = COLLECTIONS[req.params.collection];
  if (!spec) fail(404, "Not found.");
  res.json(db.listRows(spec.table).map((row) => present(req.params.collection, row)));
});

router.post("/:collection/reorder", (req, res) => {
  const spec = COLLECTIONS[req.params.collection];
  if (!spec) fail(404, "Not found.");
  if (!req.body || !Array.isArray(req.body.ids)) fail(400, "Provide the new order.");
  db.reorderRows(spec.table, req.body.ids);
  res.json(db.listRows(spec.table).map((row) => present(req.params.collection, row)));
});

router.post("/:collection", (req, res) => {
  const name = req.params.collection;
  if (!COLLECTIONS[name]) fail(404, "Not found.");
  const row = db.insertRow(COLLECTIONS[name].table, sanitize(name, req.body));
  res.status(201).json(present(name, row));
});

router.put("/:collection/:id", (req, res) => {
  const name = req.params.collection;
  if (!COLLECTIONS[name]) fail(404, "Not found.");
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) fail(400, "Invalid id.");
  const row = db.updateRow(COLLECTIONS[name].table, id, sanitize(name, req.body, { partial: true }));
  if (!row) fail(404, "Not found.");
  res.json(present(name, row));
});

router.delete("/:collection/:id", (req, res) => {
  const spec = COLLECTIONS[req.params.collection];
  if (!spec) fail(404, "Not found.");
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) fail(400, "Invalid id.");
  if (!db.deleteRow(spec.table, id)) fail(404, "Not found.");
  res.json({ ok: true });
});

module.exports = router;
