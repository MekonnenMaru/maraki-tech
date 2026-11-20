const express = require("express");
const db = require("../db");
const { COLLECTIONS, present, fail } = require("../content");
const { socialLinks } = require("../social");
const { limited, strike } = require("../rate-limit");

const router = express.Router();
const HOUR = 60 * 60 * 1000;

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

function clip(value, max) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

// Text fields from the contact form and their maximum length.
const FIELDS = {
  name: 80,
  email: 160,
  company: 120,
  service: 120,
  message: 4000,
  country: 80,
  city: 80,
  phone: 40,
  source: 40,
  utm_source: 120,
  utm_medium: 120,
  utm_campaign: 160,
  utm_term: 160,
  utm_content: 160,
  gclid: 200,
  landing_page: 500,
  referrer: 500,
};

// Trims every field, then checks the required ones. Throws a 400 error with a friendly message.
function cleanMessage(body) {
  const message = {};
  for (const [key, max] of Object.entries(FIELDS)) message[key] = clip(body[key], max);
  message.email = message.email.toLowerCase();
  message.source = message.source.toLowerCase() || "direct";

  if (message.name.length < 2) fail(400, "Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email)) fail(400, "Please enter a valid email.");
  if (message.message.length < 10) fail(400, "Tell us a little more about the project (at least a sentence).");
  if (message.country.length < 2) fail(400, "Please tell us which country you are in.");

  return message;
}

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwarded || req.ip || req.socket.remoteAddress || "";
}

function normalizeIp(ip) {
  const value = String(ip || "").trim();
  if (!value) return "";
  if (value.startsWith("::ffff:")) return value.slice(7);
  return value.slice(0, 64);
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

    const settings = await db.getSettings();
    const payload = { settings };
    for (const [name, spec] of Object.entries(COLLECTIONS)) {
      const rows = await db.listRows(spec.table, { visibleOnly: true });
      payload[name] = rows.map((row) => present(name, row));
    }
    // Finished footer links (WhatsApp may need the phone number from settings).
    payload.social = socialLinks(payload.socials, settings);
    delete payload.socials;
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
    message.ip = normalizeIp(ip);
    message.user_agent = clip(req.headers["user-agent"], 300);
    await db.addMessage(message);
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
