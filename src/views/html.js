// Helpers for building HTML on the server.
// Everything company-specific comes from the Company profile (settings in the database).

// Makes text safe inside HTML (both in text and in attribute values).
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// "+44 20 1234 5678" → "tel:+442012345678" (or "" if it doesn't look like a phone number).
function telHref(phone) {
  const compact = String(phone || "").replace(/[^\d+]/g, "");
  return /^\+?\d{6,}$/.test(compact) ? `tel:${compact}` : "";
}

// "https://example.com" — works behind a proxy (nginx, Cloudflare, cPanel).
function siteUrl(req) {
  const first = (value) => String(value || "").split(",")[0].trim();
  const host = first(req.get("x-forwarded-host") || req.get("host")) || "localhost:3000";
  const protocol = first(req.get("x-forwarded-proto") || req.protocol) || "http";
  return `${protocol}://${host}`;
}

// The company name from the Company profile.
function companyName(s) {
  return String(s.company_name || "").trim() || "Your Company";
}

// Without a logo image, the first word of the company name in capitals: "Acme Software" → "ACME".
function logoText(s) {
  return companyName(s).split(/\s+/)[0].toUpperCase();
}

// The uploaded logo (or an https image link), or "" when there is none.
function logoUrl(s) {
  const url = String(s.logo_image || "").trim();
  if (/^\/uploads\/[a-z0-9]+\.(png|jpe?g|webp|gif)$/i.test(url)) return url;
  if (/^https:\/\/[^\s"'<>]+$/i.test(url)) return url;
  return "";
}

// The logo for server-built pages: the image, or the round mark + logo text.
function brandHtml(s) {
  const logo = logoUrl(s);
  if (logo) return `<img class="brand-logo" src="${esc(logo)}" alt="${esc(companyName(s))}">`;
  return `<span class="logo-mark" aria-hidden="true"><span class="ring"></span><span class="dot"></span></span>${esc(logoText(s))}`;
}

// {company} {email} {phone} {location} in a text → the Company profile values.
function fillPlaceholders(text, s) {
  const values = { company: companyName(s), email: s.email || "", phone: s.phone || "", location: s.location || "" };
  return String(text || "").replace(/\{(company|email|phone|location)\}/g, (match, key) => values[key]);
}

module.exports = { esc, telHref, siteUrl, companyName, logoText, logoUrl, brandHtml, fillPlaceholders };
