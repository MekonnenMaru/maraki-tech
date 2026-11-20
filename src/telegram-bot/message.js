// The Telegram message sent for a new website enquiry.

// Telegram's HTML mode needs &, < and > escaped.
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SOURCES = {
  google_ads: "Google Ads",
  campaign: "Campaign",
  referral: "Another website",
  direct: "Direct visit",
};

// message = the saved lead; company = company name; base = website address ("https://…").
function leadMessage(message, { company, base }) {
  const line = (label, value) => (value ? `<b>${label}:</b> ${escapeHtml(value)}` : "");
  const place = [message.city, message.country].filter(Boolean).join(", ");
  const source = SOURCES[message.source] || message.source || "";
  const campaign = message.utm_campaign ? ` · ${message.utm_campaign}` : "";
  const text = String(message.message || "");
  const shortText = text.length > 3000 ? `${text.slice(0, 3000)}…` : text; // Telegram allows 4096 characters

  const details = [
    line("Name", message.name),
    line("Email", message.email),
    line("Phone", message.phone),
    line("Company", message.company),
    line("Location", place),
    line("Service", message.service),
    line("Source", source ? source + campaign : ""),
  ].filter(Boolean);

  const body = [
    `📩 <b>New message on ${escapeHtml(company)}</b>`,
    details.join("\n"),
    `<b>Message:</b>\n${escapeHtml(shortText)}`,
  ].join("\n\n");

  // Telegram buttons only accept public https links (not localhost).
  const inbox = /^https:\/\//.test(base) ? `${base}/admin#messages` : "";
  const extra = inbox ? { reply_markup: { inline_keyboard: [[{ text: "Open inbox", url: inbox }]] } } : {};
  return { text: body, extra };
}

module.exports = { leadMessage, escapeHtml };
