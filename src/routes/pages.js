// Full HTML pages: the home page (with search/ad-friendly tags), privacy, sitemap and 404.
const fs = require("fs");
const path = require("path");
const express = require("express");
const db = require("../db");
const config = require("../config");
const { esc: escAttr, siteUrl, companyName, logoText } = require("../views/html");
const { privacyPage } = require("../views/privacy");
const { socialLinks } = require("../social");

const router = express.Router();
const publicDir = path.join(__dirname, "..", "..", "public");
const homeTemplate = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");

// Browser tab / Google title and description. Both are optional in Site settings:
// empty title → company name, empty description → the hero supporting text.
function pageTitle(s) {
  return String(s.meta_title || "").trim() || companyName(s);
}

function pageDescription(s) {
  return String(s.meta_description || "").trim() || String(s.hero_text || "").trim();
}

// The hero image is used as the link preview picture when it is a JPG/PNG/WebP.
function previewImage(s, base) {
  const image = String(s.hero_image || "").trim();
  if (/^https:\/\/\S+\.(jpe?g|png|webp)(\?|#|$)/i.test(image)) return image;
  if (/^\/uploads\/[a-z0-9]+\.(jpe?g|png|webp)$/i.test(image)) return base + image;
  return "";
}

// Business details Google can read (schema.org Organization).
// `social` = finished social links; WhatsApp is a chat link, not a profile, so it's left out.
function organizationJson(s, base, social) {
  const socials = social.filter((item) => item.id !== "whatsapp").map((item) => item.url);
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: companyName(s),
    url: `${base}/`,
    description: pageDescription(s) || undefined,
    email: s.email || undefined,
    telephone: s.phone || undefined,
    address: s.location ? { "@type": "PostalAddress", addressLocality: s.location } : undefined,
    sameAs: socials.length ? socials : undefined,
  };
  return JSON.stringify(data).split("<").join("\\u003c");
}

// AdSense publisher ID ("ca-pub-1234…"), or "" when AdSense is off or the ID looks wrong.
function adsenseId(s) {
  const id = String(s.adsense_client_id || "").trim().toLowerCase();
  return /^ca-pub-\d{10,20}$/.test(id) ? id : "";
}

// Google's site-verification tag + the AdSense script (Auto ads are switched on in AdSense itself).
// Docs: docs/google-adsense.md
function adsenseTags(s) {
  const id = adsenseId(s);
  if (!id) return [];
  return [
    `<meta name="google-adsense-account" content="${id}" />`,
    `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${id}" crossorigin="anonymous"></script>`,
  ];
}

function setMeta(html, attribute, value) {
  const pattern = new RegExp(`(<meta ${attribute} content=")[^"]*(")`);
  return html.replace(pattern, (match, start, end) => start + escAttr(value) + end);
}

// Home page: same HTML file, but with the title, description and preview tags
// filled in on the server so Google (search + Ads review) sees them right away.
router.get(["/", "/index.html"], async (req, res, next) => {
  try {
    const s = await db.getSettings();
    const social = socialLinks(await db.listRows("social_links", { visibleOnly: true }), s);
    const base = siteUrl(req);
    const title = pageTitle(s);
    const description = pageDescription(s);
    const image = previewImage(s, base);

    const extraTags = [
      `<link rel="canonical" href="${escAttr(`${base}/`)}" />`,
      `<meta property="og:url" content="${escAttr(`${base}/`)}" />`,
      `<meta property="og:site_name" content="${escAttr(companyName(s))}" />`,
      image && `<meta property="og:image" content="${escAttr(image)}" />`,
      `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
      `<script type="application/ld+json">${organizationJson(s, base, social)}</script>`,
      ...adsenseTags(s),
    ].filter(Boolean);

    let html = homeTemplate.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escAttr(title)}</title>`);
    html = setMeta(html, 'name="description"', description);
    html = setMeta(html, 'property="og:title"', title);
    html = setMeta(html, 'property="og:description"', description);
    html = html.replace("</head>", () => `  ${extraTags.join("\n  ")}\n</head>`);
    // Company name in the loading screen, the logo (before the page script runs) and the no-JavaScript note.
    html = html
      .replace(/(<div class="loader-word">)[^<]*(<\/div>)/, (m, a, b) => a + escAttr(logoText(s)) + b)
      .replace(/(id="brandLockup">)[^<]*(<\/a>)/, (m, a, b) => a + escAttr(logoText(s)) + b)
      .replace(/(Enable JavaScript to view the )[^<]*( site\.)/, (m, a, b) => a + escAttr(companyName(s)) + b);

    res.set("Cache-Control", "no-cache").type("html").send(html);
  } catch (error) {
    next(error);
  }
});

// Privacy policy: contact details and Google sections follow the admin settings.
// Text lives in src/views/privacy.js.
router.get(["/privacy", "/privacy.html"], async (req, res, next) => {
  try {
    const [settings, overrides] = await Promise.all([db.getSettings(), db.getPrivacyOverrides()]);
    const html = privacyPage(settings, { base: siteUrl(req), sessionHours: config.sessionHours, overrides });
    res.set("Cache-Control", "no-cache").type("html").send(html);
  } catch (error) {
    next(error);
  }
});

// ads.txt tells ad buyers which ad accounts may sell ads on this site. AdSense needs it.
// It only exists while an AdSense publisher ID is saved in the admin.
router.get("/ads.txt", async (req, res, next) => {
  try {
    const id = adsenseId(await db.getSettings());
    if (!id) return res.status(404).type("text/plain").send("No ads are sold on this site.\n");
    res.type("text/plain").send(`google.com, ${id.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n`);
  } catch (error) {
    next(error);
  }
});

router.get("/sitemap.xml", (req, res) => {
  const base = siteUrl(req);
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${base}/privacy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
</urlset>
`);
});

async function notFoundPage(req, res) {
  const company = escAttr(companyName(await db.getSettings().catch(() => ({}))));
  res.status(404).type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found — ${company}</title>
  <link rel="icon" href="/favicon.svg">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body style="min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px">
  <div>
    <div class="section-label">404</div>
    <h1 class="section-title">Page not found.</h1>
    <p class="section-description" style="margin:16px auto 28px">That address is not part of this site.</p>
    <a class="btn btn-primary" href="/">Back to ${company}</a>
  </div>
</body>
</html>`);
}

module.exports = { router, notFoundPage };
