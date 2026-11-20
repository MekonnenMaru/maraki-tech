// The Privacy Policy page (/privacy).
//
// Edited in the admin: menu → "Privacy policy".
//   - Every section below has automatic default text. Any section can be edited in the
//     dashboard; edited text is saved in the database (setting "privacy_overrides").
//   - "Reset" in the dashboard brings back the automatic text.
//   - Some parts are always automatic and not editable: the contact details,
//     the cookie table, and which Google sections appear.
//
// Text format (the same in this file and in the dashboard):
//   empty line          → new paragraph
//   - item              → bullet list
//   **bold**            → bold
//   [text](https://…)   → link (https://, mailto: or /page)
//   {company} {email} {domain}  → filled in from the Company profile
const { esc, telHref, companyName, brandHtml } = require("./html");
const names = require("../storage-names");

const code = (name) => `<code>${esc(name)}</code>`;

// The country is the last part of the Company profile location: "Addis Ababa, Ethiopia" → "Ethiopia".
function countryOf(location) {
  const parts = String(location || "").split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

// Data protection laws named in "Your rights" when the company is in that country. Add more as needed.
const PRIVACY_LAWS = {
  Ethiopia: "the Personal Data Protection Proclamation No. 1321/2024",
};

const TEXT_UPDATED = "2026-11-20"; // last change to the default wording in this file (YYYY-MM-DD)

/* ---------- Helpers ---------- */

// The later of: this file's wording date, or the last privacy change made in the dashboard.
function lastUpdated(updated) {
  const fromDashboard = /^\d{4}-\d{2}-\d{2}$/.test(updated || "") ? updated : "";
  const latest = fromDashboard > TEXT_UPDATED ? fromDashboard : TEXT_UPDATED;
  return new Date(`${latest}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function servicesInUse(s) {
  return {
    analytics: !!String(s.ga4_measurement_id || "").trim(),
    ads: !!String(s.google_ads_id || "").trim(),
    adsense: /^ca-pub-\d{10,20}$/.test(String(s.adsense_client_id || "").trim()),
  };
}

// Values that {placeholders} in the text are replaced with.
function placeholders(s, base) {
  const company = companyName(s);
  return {
    company,
    email: String(s.email || "").trim(),
    domain: base.replace(/^https?:\/\//, ""),
    // Older names, still filled in so text saved before keeps working.
    legal_name: company,
    min_age: "16",
    retention: "until we have finished handling your enquiry and delete them, or until you ask us to delete them",
  };
}

// **bold** and [text](link) inside already-escaped text.
function inline(escaped) {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\/)[^)\s]+)\)/g, (match, label, url) => {
      const outside = /^https?:/.test(url) ? ' rel="noopener noreferrer" target="_blank"' : "";
      return `<a href="${url}"${outside}>${label}</a>`;
    });
}

// Simple text → safe HTML (no raw HTML is ever allowed through).
function renderText(text, values) {
  const filled = String(text || "").replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
  return filled
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim());
      if (lines.every((line) => line.startsWith("- "))) {
        return `<ul>${lines.map((line) => `<li>${inline(esc(line.slice(2)))}</li>`).join("")}</ul>`;
      }
      return `<p>${lines.map((line) => inline(esc(line))).join("<br>")}</p>`;
    })
    .join("");
}

/* ---------- Always-automatic parts ---------- */

function contactHtml(s) {
  const email = String(s.email || "").trim();
  const phone = String(s.phone || "").trim();
  const location = String(s.location || "").trim();
  const tel = telHref(phone);
  const lines = [
    email && `Email: <a href="mailto:${esc(email)}">${esc(email)}</a>`,
    phone && `Phone: ${tel ? `<a href="${esc(tel)}">${esc(phone)}</a>` : esc(phone)}`,
    location && `Location: ${esc(location)}`,
  ].filter(Boolean);
  return lines.length ? `<p>${lines.join("<br>")}</p>` : '<p>Please use the <a href="/#contact">contact form</a>.</p>';
}

function storageTable(on, sessionHours) {
  const rows = [
    [code(names.VISIT_COOKIE), "Cookie", "Counts your visit once, so reloading the page is not counted again. Contains no personal data.", "30 minutes", "Always"],
    [code(names.CONSENT_KEY), "Browser storage", "Remembers your choice on the cookie banner.", "Until you clear site data", "After you choose"],
    [code(names.CAMPAIGN_KEY), "Browser storage (this tab)", "Remembers which ad or link brought you here, so it can be sent with the contact form.", "Until you close the tab", "Always"],
    [code(names.THEME_KEY), "Browser storage", "Remembers light or dark mode.", "Until you clear site data", "If you switch the theme"],
    [code(names.SESSION_COOKIE), "Cookie", "Keeps our staff signed in to the admin area.", `${esc(sessionHours)} hours, or 30 days with “Remember me”`, "Staff only"],
    [code(names.ADMIN_USERNAME_KEY), "Browser storage", "Remembers a staff member’s username (never the password).", "Until they sign in without “Remember me”", "Staff only"],
    [code(names.ADMIN_TAB_KEY), "Browser storage", "Remembers which settings tab a staff member had open.", "Until they clear site data", "Staff only"],
  ];
  if (on.analytics || on.ads) {
    rows.push(["Google cookies (e.g. <code>_ga</code>, <code>_gcl_au</code>)", "Cookie", `Measure visits${on.ads ? " and which Google ads lead to contact requests" : ""}.`, "Up to 2 years (set by Google)", "Only after you click <em>Accept</em>"]);
  }
  if (on.adsense) {
    rows.push(["Google advertising cookies", "Cookie", "Show ads and limit how often you see the same ad.", "Set by Google and its partners", "When ads are shown"]);
  }
  const headings = ["Name", "Type", "Purpose", "How long", "When"];
  return `
    <div class="legal-table">
      <table>
        <thead><tr>${headings.map((heading) => `<th>${heading}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell, i) => `<td data-label="${headings[i]}">${cell}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* ---------- The sections and their default text ---------- */

// Every section that can ever appear, in page order. Used to check ids from the dashboard.
const SECTION_IDS = [
  "summary", "who", "collect", "use", "cookies", "analytics", "adsense", "spam",
  "retention", "sharing", "transfers", "security", "rights", "children", "changes", "contact",
];

// Returns the sections for the current settings, with their DEFAULT text.
// `auto` = HTML that is always added after the text (not editable).
// `optional: true` = hidden until switched on in the dashboard (only the necessary sections show by default).
// `shares` = other services that receive data, e.g. [{ name: "Telegram", purpose: "…" }] from optional features.
function defaultSections(s, { base, sessionHours, shares = [] }) {
  const on = servicesInUse(s);
  const cookies = on.analytics || on.ads;
  const google = [on.analytics && "Google Analytics", on.ads && "Google Ads", on.adsense && "Google AdSense"].filter(Boolean);
  const country = countryOf(s.location);
  const https = base.startsWith("https://");

  const sections = [
    {
      id: "summary",
      optional: true,
      title: "In short",
      text: [
        "- We only collect what you type into the contact form, plus basic technical details to stop spam.",
        "- We use it to reply to you. We never sell it.",
        `- ${cookies ? "Analytics and advertising cookies load only if you click **Accept**." : "We don’t use analytics or advertising cookies."}${on.adsense ? " Google may show ads on this site." : ""}`,
        "- You can ask us to see, correct or delete your information at any time.",
      ].join("\n"),
    },
    {
      id: "who",
      title: "Who we are",
      text: "{company} (“we”, “us”) runs this website and is responsible for the personal information described here (the “data controller”).",
      auto: contactHtml(s),
    },
    {
      id: "collect",
      title: "What we collect",
      text: [
        "- **When you send the contact form:** your name, email and message, plus anything optional you add (phone, company, country, city, the service you’re interested in).",
        "- **Where you came from:** with the form we also save the page you first landed on, the website that linked to us, and campaign codes in the link (UTM tags and Google click IDs), so we know which ads and links bring enquiries.",
        "- **Technical details with each message:** your IP address and browser type, to block spam and abuse.",
        "- **Visit counter:** we count visits per day for our own dashboard. This count stores only the date and time — no IP address, name or other personal data.",
        "",
        "We do not ask for payment details, passwords, identity documents or sensitive personal data (such as health, religion or political views) through this website. Please don’t include them in your message.",
      ].join("\n"),
    },
    {
      id: "use",
      title: "Why we use it, and on what legal basis",
      text: [
        "- **Reply to your enquiry and discuss a possible project:** you asked us to (steps before a possible contract), and our legitimate interest in answering business enquiries.",
        "- **Record which page, ad or link brought you to us:** our legitimate interest in knowing which marketing works. Saved only together with a message you send.",
        "- **Keep your IP address and browser type with your message, and limit repeated sending:** our legitimate interest in protecting the website from spam and abuse.",
        cookies && "- **Analytics and ad measurement cookies:** your consent (the Accept button). You can withdraw it at any time.",
        "- **Keep records when the law requires it:** our legal obligations.",
        "",
        "We use your contact details only to reply to you about your enquiry. We do not add you to a mailing list.",
        "",
        "We do not make decisions about you by automated means alone, and we do not build profiles of individual visitors.",
      ].filter((line) => line !== false).join("\n"),
    },
    {
      id: "cookies",
      title: "Cookies and browser storage",
      text: "This is everything the website stores in your browser:",
      auto:
        storageTable(on, sessionHours) +
        (cookies ? "<p>You can change your cookie choice at any time by clearing this site’s data in your browser. The banner will then ask again.</p>" : ""),
    },
    on.analytics || on.ads
      ? {
          id: "analytics",
          title: "Analytics and ad measurement",
          text: [
            `We use ${[on.analytics && "Google Analytics 4", on.ads && "Google Ads conversion tracking"].filter(Boolean).join(" and ")}. These load **only after you click Accept** on the cookie banner. If you choose Essential only, they do not load.`,
            "",
            on.analytics && "- **Google Analytics 4** shows us how many people visit, from which countries and devices, and which pages they use. IP addresses are anonymised.",
            on.ads && "- **Google Ads** tells us when someone who clicked one of our ads sends the contact form, so we know which ads work.",
            "- We also count clicks on our phone, email, Telegram and WhatsApp links as contact attempts.",
            "",
            "Google processes this data under [Google’s Privacy Policy](https://policies.google.com/privacy).",
          ].filter((line) => line !== false).join("\n"),
        }
      : null,
    on.adsense
      ? {
          id: "adsense",
          title: "Ads on this site (Google AdSense)",
          text: [
            "- Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites.",
            "- Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet.",
            "- You can opt out of personalised advertising in [Google Ads Settings](https://adssettings.google.com), or opt out of some third-party vendors’ cookies at [www.aboutads.info](https://www.aboutads.info/choices/).",
            "- Visitors in the European Economic Area, the UK and Switzerland are asked for consent before personalised ads are shown.",
            "",
            "Learn more: [How Google uses information from sites that use its services](https://policies.google.com/technologies/partner-sites).",
          ].join("\n"),
        }
      : null,
    {
      id: "spam",
      optional: true,
      title: "Spam protection and server logs",
      text: [
        "To stop automated spam, the server briefly remembers how often an IP address sends the contact form (at most 5 messages per hour) or tries to sign in to the admin area. This is kept in memory only, never saved, and forgotten within an hour.",
        "",
        "Like almost every website, our hosting provider may keep standard technical logs (IP address, time and page requested) for security and troubleshooting, normally for a short period.",
      ].join("\n"),
    },
    {
      id: "retention",
      title: "How long we keep information",
      text: [
        "- **Contact messages:** until we have finished handling your enquiry and delete them, or until you ask us to delete them.",
        "- **Visit counts:** kept as dates and times only, with no personal data.",
        "- **Browser storage:** see the table under “Cookies and browser storage”.",
      ].join("\n"),
    },
    {
      id: "sharing",
      title: "Who we share it with",
      text: [
        "We do not sell or rent your personal information. We only share it with:",
        "",
        "- **Our hosting provider**, which stores the website and its database on our behalf.",
        google.length && `- **${google.join(", ")}**, as described above.`,
        ...shares.map((share) => `- **${share.name}**, ${share.purpose}.`),
        "- **Authorities**, only when the law requires it.",
      ].filter((line) => line !== 0 && line !== false).join("\n"),
    },
    {
      id: "transfers",
      optional: google.length === 0 && shares.length === 0,
      title: "Information stored outside your country",
      text: `Our hosting provider${[google.length && "Google", ...shares.map((share) => share.name)].filter(Boolean).map((name, i, all) => (i === all.length - 1 ? " and " : ", ") + name).join("")} may store or process information on servers outside your country${country ? `, including outside ${country}` : ""}. When that happens, we choose providers that protect information with recognised safeguards.`,
    },
    {
      id: "security",
      optional: true,
      title: "How we protect it",
      text: `Messages are stored in our own database, which only authorised {company} staff can access through a password-protected admin area. ${https ? "The website uses an encrypted (HTTPS) connection, and staff" : "Staff"} passwords are stored only as secure one-way hashes. No system is perfectly secure, so please do not send highly sensitive information through the contact form.`,
    },
    {
      id: "rights",
      title: "Your rights",
      text: [
        "You can ask us to:",
        "",
        "- **See** the information we hold about you, and get a copy of it.",
        "- **Correct** information that is wrong or incomplete.",
        "- **Delete** your message and contact details.",
        "- **Stop or limit** how we use your information, or object to it.",
        cookies && "- **Withdraw your consent** for cookies at any time: clear this site’s data and choose Essential only.",
        "",
        "To use these rights, contact us using the details under “Contact us about privacy”. We may ask you to confirm who you are, and we will reply within 30 days. You can also complain to the data protection authority in your country." + (PRIVACY_LAWS[country] ? ` In ${country}, this is the authority responsible under ${PRIVACY_LAWS[country]}.` : ""),
      ].filter((line) => line !== 0 && line !== false).join("\n"),
    },
    {
      id: "children",
      optional: true,
      title: "Children",
      text: "This website is meant for businesses and adults. We do not knowingly collect information from children under 16. If you believe a child has sent us information, contact us and we will delete it.",
    },
    {
      id: "changes",
      optional: true,
      title: "Changes to this policy",
      text: "If we change how we handle information, we will update this page and the date at the top.",
    },
    {
      id: "contact",
      title: "Contact us about privacy",
      text: "",
      auto: contactHtml(s),
    },
  ];

  return sections.filter(Boolean);
}

/* ---------- Dashboard changes: edits, hidden, own sections, order ---------- */
//
// Saved in the database (setting "privacy_overrides") as:
// {
//   sections: { who: { title, text, hidden }, ... },   // changes to built-in sections
//   custom:   [ { id: "custom-1a2b3c", title, text, hidden }, ... ],  // sections you added
//   order:    [ "summary", "who", "custom-1a2b3c", ... ]              // your order (optional)
//   updated:  "2026-11-20"                                           // "Last updated" date
// }

// Accepts the saved value (also the older format { who: { title, text } }) and cleans it up.
function normalizeStore(raw) {
  const value = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const isNewFormat = "sections" in value || "custom" in value || "order" in value;
  return {
    sections: (isNewFormat ? value.sections : value) || {},
    custom: Array.isArray(value.custom) ? value.custom.filter((item) => item && /^custom-[a-z0-9]{4,20}$/.test(item.id)) : [],
    order: Array.isArray(value.order) ? value.order.filter((id) => typeof id === "string") : [],
    updated: /^\d{4}-\d{2}-\d{2}$/.test(value.updated || "") ? value.updated : "",
  };
}

// Puts sections in the saved order. Sections that are not in the saved order
// (for example a Google section that just appeared) go after their usual neighbour.
function applyOrder(items, order) {
  if (!order.length) return items;
  const result = items.filter((item) => order.includes(item.id)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  items.forEach((item, index) => {
    if (order.includes(item.id)) return;
    const before = items.slice(0, index).reverse().find((other) => result.includes(other));
    result.splice(before ? result.indexOf(before) + 1 : 0, 0, item);
  });
  // "In short" always stays at the top.
  const summary = result.findIndex((item) => item.id === "summary");
  if (summary > 0) result.unshift(...result.splice(summary, 1));
  return result;
}

// All sections (including hidden ones) with dashboard changes applied, in page order.
function privacySections(s, opts, rawStore = {}) {
  const store = normalizeStore(rawStore);

  const builtIn = defaultSections(s, opts).map((section) => {
    const change = store.sections[section.id] || {};
    const hasText = typeof change.text === "string";
    return {
      ...section,
      defaultTitle: section.title,
      defaultText: section.text,
      title: String(change.title || "").trim() || section.title,
      text: hasText ? change.text : section.text,
      edited: hasText || !!String(change.title || "").trim(),
      hidden: typeof change.hidden === "boolean" ? change.hidden : !!section.optional,
      custom: false,
    };
  });

  const own = store.custom.map((item) => ({
    id: item.id,
    title: String(item.title || "").trim() || "Untitled section",
    text: String(item.text || ""),
    defaultTitle: "",
    defaultText: "",
    edited: true,
    hidden: !!item.hidden,
    custom: true,
  }));

  // Your own sections go just before "Contact us about privacy" unless you moved them.
  const contactAt = builtIn.findIndex((section) => section.id === "contact");
  const all = contactAt >= 0 ? [...builtIn.slice(0, contactAt), ...own, ...builtIn.slice(contactAt)] : [...builtIn, ...own];
  return applyOrder(all, store.order);
}

// HTML preview of one section's text (used by the dashboard).
function sectionPreview(section, s, base) {
  return renderText(section.text, placeholders(s, base)) + (section.auto || "");
}

/* ---------- Page ---------- */

function privacyPage(s, { base, sessionHours, overrides = {}, shares = [] }) {
  const values = placeholders(s, base);
  const company = esc(values.company);
  const brand = brandHtml(s);
  const sections = privacySections(s, { base, sessionHours, shares }, overrides).filter((section) => !section.hidden);
  const summary = sections.find((section) => section.id === "summary");
  const numbered = sections.filter((section) => section.id !== "summary");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — ${company}</title>
  <meta name="description" content="How ${company} collects, uses and protects information from website visitors and people who contact us." />
  <meta name="theme-color" content="#050806" />
  <link rel="canonical" href="${esc(base)}/privacy" />
  <script>
    (function () {
      try {
        var saved = localStorage.getItem("${names.THEME_KEY}");
        document.documentElement.dataset.theme = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      } catch (e) {}
    })();
  </script>
  <link rel="icon" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body class="legal-page">
  <a class="skip" href="#content">Skip to content</a>

  <div class="background" aria-hidden="true">
    <div class="grid"></div>
    <div class="orb one"></div>
    <div class="orb two"></div>
  </div>

  <nav id="navbar" class="scrolled">
    <div class="nav-inner">
      <a href="/" class="logo">
        ${brand}
      </a>
      <div class="nav-actions">
        <a class="nav-cta" href="/#contact">${esc(s.nav_cta || "Contact us")}</a>
      </div>
    </div>
  </nav>

  <main id="content" class="legal-wrap">
    <p class="section-label">Legal</p>
    <h1 class="section-title">Privacy Policy</h1>
    <p class="section-description">Last updated: ${lastUpdated(normalizeStore(overrides).updated)}. This page explains what ${company} collects when you visit ${esc(values.domain)} or contact us, why, and what you can do about it.</p>

    ${summary && summary.text.trim() ? `
    <aside class="legal-summary">
      <h2>${esc(summary.title)}</h2>
      ${renderText(summary.text, values)}
    </aside>` : ""}

    <article class="legal-card">
      ${numbered
        .map((section, index) => `
      <h2>${index + 1}. ${esc(section.title)}</h2>
      ${renderText(section.text, values)}${section.auto || ""}`)
        .join("")}
    </article>

    <p class="legal-back"><a class="btn btn-secondary" href="/">← Back to ${company}</a></p>
  </main>
</body>
</html>`;
}

module.exports = { privacyPage, privacySections, sectionPreview, normalizeStore, SECTION_IDS };
