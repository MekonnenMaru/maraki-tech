// Google Analytics 4 + Google Ads, cookie consent, and lead attribution.
//
// How it works:
//  1. The IDs are pasted in the admin under "Google Ads & Analytics".
//  2. Google tags load ONLY after the visitor clicks "Accept" on the cookie banner.
//  3. UTM tags and the Google click ID (gclid) from the ad link are remembered for the visit
//     and sent along with the contact form, so each lead shows where it came from.

import { esc } from "../lib/html.js";

const CONSENT_KEY = "mt_consent";
const ATTRIBUTION_KEY = "mt_attr";
const URL_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid"];

let ids = { ga4: "", adsId: "", adsLabel: "" };

/* ---------- Browser storage (can fail in private mode, so always guarded) ---------- */

function read(storage, key) {
  try {
    return storage.getItem(key) || "";
  } catch {
    return "";
  }
}

function write(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/* ---------- Where did this visitor come from? ---------- */

function rememberCampaign() {
  let saved = {};
  try {
    saved = JSON.parse(read(sessionStorage, ATTRIBUTION_KEY) || "{}");
  } catch {
    saved = {};
  }

  const params = new URLSearchParams(window.location.search);
  for (const key of URL_KEYS) {
    const value = params.get(key);
    if (value) saved[key] = value.slice(0, 160);
  }
  saved.landing_page ||= `${window.location.pathname}${window.location.search}`.slice(0, 500);
  saved.referrer ||= String(document.referrer || "").slice(0, 500);

  write(sessionStorage, ATTRIBUTION_KEY, JSON.stringify(saved));
  return saved;
}

function sourceOf(attr) {
  if (attr.gclid || attr.gbraid || attr.wbraid || attr.utm_medium === "cpc" || attr.utm_source === "google") {
    return "google_ads";
  }
  if (attr.utm_source) return "campaign";
  if (!attr.referrer) return "direct";
  try {
    const from = new URL(attr.referrer).hostname.replace(/^www\./, "");
    return from && from !== window.location.hostname.replace(/^www\./, "") ? "referral" : "direct";
  } catch {
    return "referral";
  }
}

// Sent with the contact form.
export function campaignDetails() {
  const attr = rememberCampaign();
  return {
    source: sourceOf(attr),
    utm_source: attr.utm_source || "",
    utm_medium: attr.utm_medium || "",
    utm_campaign: attr.utm_campaign || "",
    utm_term: attr.utm_term || "",
    utm_content: attr.utm_content || "",
    gclid: attr.gclid || attr.gbraid || attr.wbraid || "",
    landing_page: attr.landing_page || "",
    referrer: attr.referrer || "",
  };
}

/* ---------- Google tags ---------- */

function gtagReady() {
  return typeof window.gtag === "function";
}

function loadGoogleTags() {
  if (window.__mtTagsLoaded || !(ids.ga4 || ids.adsId)) return;
  window.__mtTagsLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  // Consent Mode v2: the visitor already clicked "Accept", so everything is granted.
  const consent = { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" };
  window.gtag("consent", "default", consent);
  window.gtag("consent", "update", Object.fromEntries(Object.keys(consent).map((key) => [key, "granted"])));

  window.gtag("js", new Date());
  if (ids.ga4) window.gtag("config", ids.ga4, { anonymize_ip: true });
  if (ids.adsId) window.gtag("config", ids.adsId);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids.ga4 || ids.adsId)}`;
  document.head.appendChild(script);
}

// Called after the contact form was sent successfully.
export function trackLead() {
  if (!gtagReady()) return;
  if (ids.ga4) window.gtag("event", "generate_lead", { event_category: "contact", event_label: "contact_form" });
  if (ids.adsId && ids.adsLabel) window.gtag("event", "conversion", { send_to: `${ids.adsId}/${ids.adsLabel}` });
}

// Phone, email, Telegram and WhatsApp links count as contact attempts too.
function trackContactClicks() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="tel:"], a[href^="mailto:"], a[href*="t.me/"], a[href*="wa.me/"]');
    if (!link || !gtagReady()) return;
    const href = link.getAttribute("href");
    const method = href.startsWith("tel:") ? "phone" : href.startsWith("mailto:") ? "email" : href.includes("wa.me/") ? "whatsapp" : "telegram";
    window.gtag("event", "contact_click", { method });
  });
}

/* ---------- Cookie banner ---------- */

// Texts come from Site settings → Cookie banner.
function showCookieBanner(s) {
  if (document.getElementById("consentBanner")) return;

  const banner = document.createElement("div");
  banner.id = "consentBanner";
  banner.className = "consent-banner";
  banner.innerHTML = `
    <div class="consent-inner">
      <p>${esc(s.consent_text || "")} See our <a href="/privacy">Privacy Policy</a>.</p>
      <div class="consent-actions">
        <button type="button" class="btn btn-secondary" data-consent="denied">${esc(s.consent_decline || "Essential only")}</button>
        <button type="button" class="btn btn-primary" data-consent="accepted">${esc(s.consent_accept || "Accept")}</button>
      </div>
    </div>
  `;
  banner.addEventListener("click", (event) => {
    const button = event.target.closest("[data-consent]");
    if (!button) return;
    const choice = button.dataset.consent;
    write(localStorage, CONSENT_KEY, choice);
    banner.remove();
    if (choice === "accepted") loadGoogleTags();
  });
  document.body.appendChild(banner);
}

/* ---------- Start ---------- */

let started = false;

export function startTracking(s) {
  ids = {
    ga4: String(s.ga4_measurement_id || "").trim(),
    adsId: String(s.google_ads_id || "").trim(),
    adsLabel: String(s.google_ads_conversion_label || "").trim(),
  };

  rememberCampaign();
  if (!started) {
    trackContactClicks();
    started = true;
  }

  if (!ids.ga4 && !ids.adsId) return; // nothing configured yet → no banner
  const consent = read(localStorage, CONSENT_KEY);
  if (consent === "accepted") loadGoogleTags();
  else if (!consent) showCookieBanner(s);
}
