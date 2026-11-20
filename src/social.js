// Social media links (admin menu → Social links). Each row in the database has:
//   platform  facebook | instagram | … | other
//   handle    a username ("yourcompany"), or a full link ("https://…")
//   visible   on/off
//
// From a username the link is built with the pattern below, so every network can have
// its own username. WhatsApp with an empty handle uses the phone number from the Company profile.
// "Other" needs a full link (for example Behance or a second website).
//
// To add a platform: add it here and add its icon in public/js/lib/social-icons.js.

const PLATFORMS = [
  { id: "facebook", label: "Facebook", link: (user) => `https://www.facebook.com/${user}` },
  { id: "instagram", label: "Instagram", link: (user) => `https://www.instagram.com/${user}` },
  { id: "tiktok", label: "TikTok", link: (user) => `https://www.tiktok.com/@${user}` },
  { id: "youtube", label: "YouTube", link: (user) => `https://www.youtube.com/@${user}` },
  { id: "linkedin", label: "LinkedIn", link: (user) => `https://www.linkedin.com/company/${user}` },
  { id: "x", label: "X (Twitter)", link: (user) => `https://x.com/${user}` },
  { id: "telegram", label: "Telegram", link: (user) => `https://t.me/${user}` },
  { id: "whatsapp", label: "WhatsApp", link: (number) => `https://wa.me/${number}` },
  { id: "github", label: "GitHub", link: (user) => `https://github.com/${user}` },
  { id: "other", label: "Other link", link: null },
];

// The starting username, made from the company name: "Maraki Tech" → "marakitech".
function usernameFrom(companyName) {
  return String(companyName || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60) || "yourcompany";
}
const USERNAME = /^[A-Za-z0-9._-]{1,60}$/;
const FULL_LINK = /^https:\/\/[^\s"'<>]{4,290}$/i;

const platformOf = (id) => PLATFORMS.find((platform) => platform.id === id);
const digits = (value) => String(value || "").replace(/\D/g, "");

function badInput(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

// Checks one row before it is saved. Throws a friendly message when something is wrong.
function checkSocialRow(row) {
  const platform = platformOf(row.platform);
  if (!platform) badInput("Choose a platform.");
  const handle = String(row.handle || "").trim().replace(/^@/, "");
  row.handle = handle;

  if (/^https?:\/\//i.test(handle)) {
    if (!FULL_LINK.test(handle)) badInput("Links must start with https:// and have no spaces.");
    return row;
  }
  if (platform.id === "other") badInput("For “Other link”, paste the full link, starting with https://");
  if (platform.id === "whatsapp") {
    if (handle && (digits(handle).length < 8 || digits(handle).length > 15)) {
      badInput("For WhatsApp, type the phone number with country code (e.g. +44 7700 900123), or leave it empty to use the phone from the Company profile.");
    }
    return row;
  }
  if (!USERNAME.test(handle)) badInput("Type the username (letters, numbers, dots, dashes, underscores — no spaces), or paste the full link.");
  return row;
}

// The link for one row. `phone` (from the Company profile) is used by WhatsApp with an empty handle.
function linkFor(row, phone = "") {
  const platform = platformOf(row.platform);
  const handle = String(row.handle || "").trim();
  if (!platform) return "";
  if (FULL_LINK.test(handle)) return handle;
  if (platform.id === "whatsapp") {
    const number = digits(handle) || digits(phone);
    return number.length >= 8 ? platform.link(number) : "";
  }
  return platform.link && USERNAME.test(handle) ? platform.link(handle) : "";
}

// "Other link" rows are labelled with the website name, e.g. "behance.net".
function labelFor(row) {
  if (row.platform !== "other") return platformOf(row.platform)?.label || "Link";
  try {
    return new URL(row.handle).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

// Visible rows → [{ id: "facebook", label: "Facebook", url: "https://…" }] for the footer.
function socialLinks(rows, settings) {
  return rows
    .filter((row) => row.visible !== false && row.visible !== 0)
    .map((row) => ({ id: row.platform, label: labelFor(row), url: linkFor(row, settings.phone) }))
    .filter((item) => item.url);
}

module.exports = { PLATFORMS, usernameFrom, checkSocialRow, linkFor, labelFor, socialLinks };
