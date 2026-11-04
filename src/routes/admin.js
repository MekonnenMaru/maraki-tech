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

router.post("/login", async (req, res, next) => {
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

    const admin = await db.findAdmin(username);
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

router.put("/settings", async (req, res, next) => {
  try {
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
    res.json(await db.saveSettings(next));
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
