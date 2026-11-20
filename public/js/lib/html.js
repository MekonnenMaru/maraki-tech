// Small helpers for building HTML strings safely.
// Every value that comes from the admin dashboard must go through esc().

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Returns the link if it is safe to use, otherwise the fallback.
export function safeHref(url, fallback = "") {
  const value = String(url || "").trim();
  if (!value) return fallback;
  if (/^#[A-Za-z][\w-]*$/.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("..")) return value;
  if (/^mailto:[^\s]+$/i.test(value)) return value;
  if (/^tel:\+?[\d]+$/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return fallback;
}

// Returns the image/video address if it is safe to use, otherwise "".
export function safeSrc(url) {
  const value = String(url || "").trim();
  if (value.startsWith("/uploads/") && !value.includes("..")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return "";
}

// Opens outside links in a new tab.
export function externalAttrs(url) {
  return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : "";
}

export function telHref(phone) {
  const compact = String(phone || "").replace(/[^\d+]/g, "");
  return /^\+?\d{6,}$/.test(compact) ? `tel:${compact}` : "";
}

// "01", "02", ...
export function twoDigits(number) {
  return String(number).padStart(2, "0");
}

// Turns "Build {highlight} today" + "great things" into a title with green words.
export function richTitle(title, highlight) {
  const accent = highlight ? `<span>${esc(highlight)}</span>` : "";
  const text = String(title || "");
  const token = "{highlight}";
  const at = text.indexOf(token);
  if (at >= 0) {
    return `${esc(text.slice(0, at))}${accent}${esc(text.slice(at + token.length))}`;
  }
  return `${esc(text)}${highlight ? ` ${accent}` : ""}`;
}

// The small label + big title + description at the top of every section.
export function sectionHeading(label, title, highlight, text) {
  return `
    <div class="reveal">
      ${label ? `<div class="section-label">${esc(label)}</div>` : ""}
      <h2 class="section-title">${richTitle(title, highlight)}</h2>
      ${text ? `<p class="section-description">${esc(text)}</p>` : ""}
    </div>
  `;
}

// The company name from the Company profile.
export function companyName(s) {
  return String(s.company_name || "").trim() || "Your Company";
}

// Without a logo image: the first word of the company name in capitals ("Acme Software" → "ACME").
export function logoText(s) {
  return companyName(s).split(/\s+/)[0].toUpperCase();
}

// The logo from the Company profile, or the round mark + logo text when there is no image.
export function brandHtml(s) {
  const logo = safeSrc(s.logo_image);
  if (logo) return `<img class="brand-logo" src="${esc(logo)}" alt="${esc(companyName(s))}">`;
  return `${logoMark()}${esc(logoText(s))}`;
}

// Lets any text on the site use {company}, {email}, {phone} and {location}
// (e.g. an FAQ answer "Email us at {email}"), so those details are typed only once.
// Other {words}, like {highlight}, are left alone.
export function withPlaceholders(data) {
  const s = data.settings;
  const values = { company: companyName(s), email: s.email || "", phone: s.phone || "", location: s.location || "" };
  const fill = (value) => {
    if (typeof value === "string") return value.replace(/\{(company|email|phone|location)\}/g, (m, key) => values[key]);
    if (Array.isArray(value)) return value.map(fill);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v)]));
    return value;
  };
  return fill(data);
}

export function logoMark() {
  return '<span class="logo-mark" aria-hidden="true"><span class="ring"></span><span class="dot"></span></span>';
}

// A round picture, or the first letter of the name when there is no picture.
export function avatar(person, className) {
  const src = safeSrc(person.avatar_image);
  if (src) return `<div class="${className}"><img src="${esc(src)}" alt=""></div>`;
  const letter =
    String(person.avatar_letter || "").trim().slice(0, 2) ||
    String(person.name || "?").trim().slice(0, 1).toUpperCase() ||
    "?";
  return `<div class="${className}">${esc(letter)}</div>`;
}
