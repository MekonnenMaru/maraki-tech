// The Privacy Policy page, built from the admin settings.
//
// - Company name, email, phone and location come from Site settings (database).
// - The Google sections only appear when that service is switched on (its ID is filled in).
// - When you change what the site collects or stores, update the text below
//   AND the date in POLICY_UPDATED.
const { esc, telHref } = require("./html");

const POLICY_UPDATED = "20 November 2026";

const external = (href, text) => `<a href="${href}" rel="noopener noreferrer" target="_blank">${text}</a>`;

/* ---------- Which Google services are on ---------- */

function servicesInUse(s) {
  return {
    analytics: !!String(s.ga4_measurement_id || "").trim(),
    ads: !!String(s.google_ads_id || "").trim(),
    adsense: /^ca-pub-\d{10,20}$/.test(String(s.adsense_client_id || "").trim()),
  };
}

/* ---------- Sections ---------- */

function contactLines(s) {
  const email = String(s.email || "").trim();
  const phone = String(s.phone || "").trim();
  const location = String(s.location || "").trim();
  const tel = telHref(phone);
  return [
    email && `Email: <a href="mailto:${esc(email)}">${esc(email)}</a>`,
    phone && `Phone: ${tel ? `<a href="${esc(tel)}">${esc(phone)}</a>` : esc(phone)}`,
    location && `Location: ${esc(location)}`,
  ].filter(Boolean);
}

function storageTable(on, sessionHours) {
  const rows = [
    ["<code>mt_seen</code>", "Cookie", "Counts your visit once, so reloading the page is not counted again. Contains no personal data.", "30 minutes", "Always"],
    ["<code>mt_consent</code>", "Browser storage", "Remembers your choice on the cookie banner.", "Until you clear site data", "After you choose"],
    ["<code>mt_attr</code>", "Browser storage (this tab)", "Remembers which ad or link brought you here, so it can be sent with the contact form.", "Until you close the tab", "Always"],
    ["<code>maraki-theme</code>", "Browser storage", "Remembers light or dark mode.", "Until you clear site data", "If you switch the theme"],
    ["<code>maraki.sid</code>", "Cookie", "Keeps our staff signed in to the admin area.", `${esc(sessionHours)} hours, or 30 days with “Remember me”`, "Staff only"],
    ["<code>maraki-admin-username</code>", "Browser storage", "Remembers a staff member’s username (never the password).", "Until they sign in without “Remember me”", "Staff only"],
  ];
  if (on.analytics || on.ads) {
    rows.push([
      "Google cookies (e.g. <code>_ga</code>, <code>_gcl_au</code>)",
      "Cookie",
      `Measure visits${on.ads ? " and which Google ads lead to contact requests" : ""}.`,
      "Up to 2 years (set by Google)",
      "Only after you click <em>Accept</em>",
    ]);
  }
  if (on.adsense) {
    rows.push(["Google advertising cookies", "Cookie", "Show ads and limit how often you see the same ad.", "Set by Google and its partners", "When ads are shown (see below)"]);
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

function googleSection(on) {
  if (!on.analytics && !on.ads) return "";
  const names = [on.analytics && "Google Analytics 4", on.ads && "Google Ads conversion tracking"].filter(Boolean).join(" and ");
  return `
    <h2>Analytics and ad measurement</h2>
    <p>We use ${names}. These load <strong>only after you click <em>Accept</em></strong> on the cookie banner. If you choose <em>Essential only</em>, they do not load.</p>
    <ul>
      ${on.analytics ? "<li><strong>Google Analytics 4</strong> shows us how many people visit, from which countries and devices, and which pages they use. IP addresses are anonymised.</li>" : ""}
      ${on.ads ? "<li><strong>Google Ads</strong> tells us when someone who clicked one of our ads sends the contact form, so we know which ads work.</li>" : ""}
      <li>We also count clicks on our phone, email and Telegram links as contact attempts.</li>
    </ul>
    <p>Google processes this data under ${external("https://policies.google.com/privacy", "Google’s Privacy Policy")}.</p>
  `;
}

function adsenseSection(on) {
  if (!on.adsense) return "";
  return `
    <h2>Ads on this site (Google AdSense)</h2>
    <ul>
      <li>Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites.</li>
      <li>Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet.</li>
      <li>You can opt out of personalised advertising in ${external("https://adssettings.google.com", "Google Ads Settings")}, or opt out of some third-party vendors’ cookies at ${external("https://www.aboutads.info/choices/", "www.aboutads.info")}.</li>
      <li>Visitors in the European Economic Area, the UK and Switzerland are asked for consent before personalised ads are shown.</li>
    </ul>
    <p>Learn more: ${external("https://policies.google.com/technologies/partner-sites", "How Google uses information from sites that use its services")}.</p>
  `;
}

/* ---------- Page ---------- */

function privacyPage(s, { base, sessionHours }) {
  const company = esc(s.footer_brand || "Maraki Tech");
  const brand = esc(s.brand_name || "MARAKI");
  const domain = esc(base.replace(/^https?:\/\//, ""));
  const on = servicesInUse(s);
  const contact = contactLines(s);
  const sharedWith = [
    on.analytics && "Google Analytics",
    on.ads && "Google Ads",
    on.adsense && "Google AdSense",
  ].filter(Boolean);

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
        var saved = localStorage.getItem("maraki-theme");
        document.documentElement.dataset.theme = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      } catch (e) {}
    })();
  </script>
  <link rel="icon" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/enhancements.css" />
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
        <span class="logo-mark" aria-hidden="true"><span class="ring"></span><span class="dot"></span></span>
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
    <p class="section-description">Last updated: ${POLICY_UPDATED}. This page explains what ${company} collects when you visit ${domain} or contact us, why, and what you can do about it.</p>

    <article class="legal-card">
      <h2>Who we are</h2>
      <p>${company} is responsible for this website and the information described here.</p>
      ${contact.length ? `<p>${contact.join("<br>")}</p>` : ""}

      <h2>What we collect</h2>
      <ul>
        <li><strong>When you send the contact form:</strong> your name, email, country and message, plus anything optional you add (company, phone, city, the service you’re interested in).</li>
        <li><strong>Where you came from:</strong> with the form we also save the page you first landed on, the website that linked to us, and campaign codes in the link (UTM tags and Google click IDs), so we know which ads and links bring enquiries.</li>
        <li><strong>Technical details with each message:</strong> your IP address and browser type, to block spam and abuse.</li>
        <li><strong>Visit counter:</strong> we count visits per day for our own dashboard. This count stores only the date and time — no IP address, name or other personal data.</li>
      </ul>
      <p>We do not ask for payment details, passwords or sensitive personal data through this website.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To answer your enquiry and discuss a possible project with you.</li>
        <li>To understand which pages, ads and links bring real enquiries.</li>
        <li>To keep the website safe from spam and misuse.</li>
      </ul>
      <p>We use your contact details only to reply to you about your enquiry. We do not add you to a mailing list.</p>

      <h2>Cookies and browser storage</h2>
      <p>This is everything the website stores in your browser:</p>
      ${storageTable(on, sessionHours)}
      ${on.analytics || on.ads ? "<p>You can change your cookie choice at any time by clearing this site’s data in your browser. The banner will then ask again.</p>" : ""}

      ${googleSection(on)}
      ${adsenseSection(on)}

      <h2>Spam protection</h2>
      <p>To stop automated spam, the server briefly remembers how often an IP address sends the contact form (at most 5 messages per hour) or tries to sign in to the admin area. This is kept in memory only, never saved, and forgotten within an hour.</p>

      <h2>How long we keep information</h2>
      <ul>
        <li><strong>Contact messages:</strong> until we have finished handling your enquiry and delete them, or until you ask us to delete them.</li>
        <li><strong>Visit counts:</strong> kept as dates and times only.</li>
        <li><strong>Browser storage:</strong> see the table above.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>We do not sell or rent your personal information.${
        sharedWith.length
          ? ` We use ${sharedWith.join(", ")} as described above.`
          : ""
      } Our website hosting provider stores the data on our behalf. We may share information if the law requires it.</p>

      <h2>How we protect it</h2>
      <p>Messages are stored in our own database, which only authorised ${company} staff can access through a password-protected admin area. Staff passwords are stored only as secure one-way hashes. Please do not send highly sensitive information through the contact form.</p>

      <h2>Your rights</h2>
      <ul>
        <li>Ask what information we hold about you.</li>
        <li>Ask us to correct or delete your message and contact details.</li>
        ${on.analytics || on.ads ? "<li>Refuse analytics and advertising cookies by choosing <em>Essential only</em>.</li>" : ""}
        <li>Clear cookies and site data in your browser at any time.</li>
      </ul>
      <p>To use these rights, contact us using the details below. We will reply as soon as we can.</p>

      <h2>Children</h2>
      <p>This website is meant for businesses and adults. We do not knowingly collect information from children under 16.</p>

      <h2>Changes to this policy</h2>
      <p>If we change how we handle information, we will update this page and the date at the top.</p>

      <h2>Contact us about privacy</h2>
      ${contact.length ? `<p>${contact.join("<br>")}</p>` : '<p>Please use the <a href="/#contact">contact form</a>.</p>'}
    </article>

    <p class="legal-back"><a class="btn btn-secondary" href="/">← Back to ${company}</a></p>
  </main>
</body>
</html>`;
}

module.exports = { privacyPage };
