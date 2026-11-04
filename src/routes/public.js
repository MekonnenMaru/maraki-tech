const express = require("express");
const db = require("../db");
const { COLLECTIONS, present } = require("../content");
const { limited, strike } = require("../rate-limit");

const router = express.Router();
const HOUR = 60 * 60 * 1000;

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

function cleanMessage(body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const company = String(body.company || "").trim();
  const service = String(body.service || "").trim();
  const message = String(body.message || "").trim();

  if (name.length < 2 || name.length > 80) {
    const error = new Error("Please enter your name.");
    error.status = 400;
    throw error;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    const error = new Error("Please enter a valid email.");
    error.status = 400;
    throw error;
  }
  if (company.length > 120) {
    const error = new Error("Company name is too long.");
    error.status = 400;
    throw error;
  }
  if (service.length > 120) {
    const error = new Error("Service name is too long.");
    error.status = 400;
    throw error;
  }
  if (message.length < 10 || message.length > 4000) {
    const error = new Error("Tell us a little more about the project (at least a sentence).");
    error.status = 400;
    throw error;
  }

  return { name, email, company, service, message };
}

function clientIp(req) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

router.get("/health", (req, res) => {
  res.json({ ok: true });
});

router.get("/content", async (req, res, next) => {
  try {
    const cookies = req.headers.cookie || "";
    const seen = cookies.split(";").some((part) => part.trim().startsWith("mt_seen="));
    if (!seen) {
      await db.recordVisit();
      res.append("Set-Cookie", "mt_seen=1; Max-Age=1800; Path=/; HttpOnly; SameSite=Lax");
    }

    const payload = { settings: await db.getSettings() };
    for (const [name, spec] of Object.entries(COLLECTIONS)) {
      const rows = await db.listRows(spec.table, { visibleOnly: true });
      payload[name] = rows.map((row) => present(name, row));
    }
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.post("/contact", async (req, res, next) => {
  try {
    const ip = clientIp(req);
    if (limited("contact", ip, 5, HOUR)) {
      return res.status(429).json({ error: "Too many messages. Please try again in an hour." });
    }
    strike("contact", ip, HOUR);

    if (req.body && String(req.body.company_website || "").trim()) {
      return res.json({ ok: true });
    }

    const message = cleanMessage(req.body || {});
    await db.addMessage(message);
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
