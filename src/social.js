// Social media links in the footer (and in the business details Google reads).
//
// One username (Site settings → Footer and social) builds every link,
// and each network has an on/off switch. WhatsApp uses the phone number
// from Contact details, so nothing is typed twice.
//
// To add a network: add it here, add an icon in public/js/lib/social-icons.js,
// and a "show_social_<id>" switch in src/settings.js.

const NETWORKS = [
  { id: "facebook", label: "Facebook", link: (user) => `https://www.facebook.com/${user}` },
  { id: "instagram", label: "Instagram", link: (user) => `https://www.instagram.com/${user}` },
  { id: "tiktok", label: "TikTok", link: (user) => `https://www.tiktok.com/@${user}` },
  { id: "youtube", label: "YouTube", link: (user) => `https://www.youtube.com/@${user}` },
  { id: "linkedin", label: "LinkedIn", link: (user) => `https://www.linkedin.com/company/${user}` },
  { id: "x", label: "X (Twitter)", link: (user) => `https://x.com/${user}` },
  { id: "telegram", label: "Telegram", link: (user) => `https://t.me/${user}` },
  { id: "whatsapp", label: "WhatsApp", link: (user, phone) => (phone ? `https://wa.me/${phone}` : "") },
  { id: "github", label: "GitHub", link: (user) => `https://github.com/${user}` },
];

const USERNAME = /^[A-Za-z0-9._-]{1,60}$/;

// "@marakitech" → "marakitech". Returns "" if it isn't a valid username.
function cleanUsername(value) {
  const user = String(value || "").trim().replace(/^@/, "");
  return USERNAME.test(user) ? user : "";
}

// The links that are switched on, e.g. [{ id: "facebook", label: "Facebook", url: "https://…" }].
function socialLinks(s) {
  const user = cleanUsername(s.social_username);
  const phone = String(s.phone || "").replace(/\D/g, ""); // wa.me wants digits only
  return NETWORKS.filter((network) => s[`show_social_${network.id}`] === "1")
    .map((network) => ({
      id: network.id,
      label: network.label,
      url: network.id === "whatsapp" ? network.link(user, phone.length >= 8 ? phone : "") : user ? network.link(user) : "",
    }))
    .filter((item) => item.url);
}

module.exports = { NETWORKS, socialLinks, cleanUsername };
