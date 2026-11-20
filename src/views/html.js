// Helpers for building HTML on the server.

// Makes text safe inside HTML (both in text and in attribute values).
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// "+251 91 234 5678" → "tel:+251912345678" (or "" if it doesn't look like a phone number).
function telHref(phone) {
  const compact = String(phone || "").replace(/[^\d+]/g, "");
  return /^\+?\d{6,}$/.test(compact) ? `tel:${compact}` : "";
}

// "https://maraki.tech" — works behind a proxy (nginx, Cloudflare, cPanel).
function siteUrl(req) {
  const first = (value) => String(value || "").split(",")[0].trim();
  const host = first(req.get("x-forwarded-host") || req.get("host")) || "localhost:3000";
  const protocol = first(req.get("x-forwarded-proto") || req.protocol) || "http";
  return `${protocol}://${host}`;
}

module.exports = { esc, telHref, siteUrl };
