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

function clip(value, max) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function cleanMessage(body) {
  const name = clip(body.name, 80);
  const email = clip(body.email, 160).toLowerCase();
  const company = clip(body.company, 120);
  const service = clip(body.service, 120);
  const message = clip(body.message, 4000);
  const country = clip(body.country, 80);
  const city = clip(body.city, 80);
  const phone = clip(body.phone, 40);
  const source = clip(body.source, 40).toLowerCase() || "direct";
  const utm_source = clip(body.utm_source, 120);
  const utm_medium = clip(body.utm_medium, 120);
  const utm_campaign = clip(body.utm_campaign, 160);
  const utm_term = clip(body.utm_term, 160);
  const utm_content = clip(body.utm_content, 160);
  const gclid = clip(body.gclid, 200);
  const landing_page = clip(body.landing_page, 500);
  const referrer = clip(body.referrer, 500);

  if (name.length < 2) {
    const error = new Error("Please enter your name.");
    error.status = 400;
    throw error;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
  if (message.length < 10) {
    const error = new Error("Tell us a little more about the project (at least a sentence).");
    error.status = 400;
    throw error;
  }
  if (country.length < 2) {
    const error = new Error("Please tell us which country you are in.");
    error.status = 400;
    throw error;
  }

  return {
    name,
    email,
    company,
    service,
    message,
    country,
    city,
    phone,
    source,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    gclid,
    landing_page,
    referrer,
  };
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
    message.ip = normalizeIp(ip);
    message.user_agent = clip(req.headers["user-agent"], 300);
    await db.addMessage(message);
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
