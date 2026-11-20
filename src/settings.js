// Everything the admin can edit (stored in the database, table "settings").
// Nothing here is specific to one company: a new install starts with neutral texts,
// and {company}, {email}, {phone}, {location} in any text are filled in from the Company profile.

function field(key, label, type = "text", extra = {}) {
  return { key, label, type, ...extra };
}

const SECTIONS = [
  ["solutions", "Solutions"],
  ["products", "Products"],
  ["apps", "Apps"],
  ["process", "Process"],
  ["team", "Team"],
  ["testimonials", "Testimonials"],
  ["pricing", "Pricing"],
  ["tech", "Technology"],
  ["faq", "FAQ"],
  ["contact", "Contact"],
];

function sectionFields(id, name) {
  return [
    field(`${id}_label`, `${name} small label`),
    field(`${id}_title`, `${name} title`, "text", {
      hint: "Use {highlight} where the green words should appear.",
    }),
    field(`${id}_highlight`, `${name} highlight`),
    field(`${id}_text`, `${name} description`, "textarea"),
  ];
}

// Time zones for the clock, visit counts and dates. [IANA name, label]
const TIME_ZONES = [
  ["UTC", "UTC"],
  ["Africa/Addis_Ababa", "Addis Ababa (UTC+3)"],
  ["Africa/Nairobi", "Nairobi (UTC+3)"],
  ["Africa/Cairo", "Cairo"],
  ["Africa/Johannesburg", "Johannesburg (UTC+2)"],
  ["Africa/Lagos", "Lagos (UTC+1)"],
  ["Africa/Accra", "Accra (UTC+0)"],
  ["Africa/Casablanca", "Casablanca"],
  ["Africa/Kigali", "Kigali (UTC+2)"],
  ["Africa/Kampala", "Kampala (UTC+3)"],
  ["Africa/Dar_es_Salaam", "Dar es Salaam (UTC+3)"],
  ["Europe/London", "London"],
  ["Europe/Paris", "Paris / Berlin / Rome"],
  ["Europe/Istanbul", "Istanbul (UTC+3)"],
  ["Europe/Moscow", "Moscow (UTC+3)"],
  ["Asia/Dubai", "Dubai (UTC+4)"],
  ["Asia/Riyadh", "Riyadh (UTC+3)"],
  ["Asia/Karachi", "Karachi (UTC+5)"],
  ["Asia/Kolkata", "India (UTC+5:30)"],
  ["Asia/Dhaka", "Dhaka (UTC+6)"],
  ["Asia/Bangkok", "Bangkok (UTC+7)"],
  ["Asia/Singapore", "Singapore (UTC+8)"],
  ["Asia/Shanghai", "China (UTC+8)"],
  ["Asia/Tokyo", "Tokyo (UTC+9)"],
  ["Australia/Sydney", "Sydney"],
  ["Pacific/Auckland", "Auckland"],
  ["America/Sao_Paulo", "São Paulo (UTC−3)"],
  ["America/New_York", "New York (US Eastern)"],
  ["America/Chicago", "Chicago (US Central)"],
  ["America/Denver", "Denver (US Mountain)"],
  ["America/Los_Angeles", "Los Angeles (US Pacific)"],
  ["America/Toronto", "Toronto"],
  ["America/Mexico_City", "Mexico City"],
];

const GROUPS = [
  {
    id: "profile",
    title: "Company profile",
    intro: "Who you are. Used everywhere: logo, footer, contact section, privacy policy, Google, WhatsApp, clock and dates.",
    fields: [
      field("company_name", "Company name", "text", {
        hint: "Without a logo, the site shows the first word in capitals as the logo.",
      }),
      field("logo_image", "Logo", "image", {
        hint: "Optional. A PNG or WebP with a transparent background works best (under 2 MB). Also used as the browser tab icon.",
      }),
      field("email", "Email"),
      field("phone", "Phone", "text", { hint: "With country code, e.g. +44 20 1234 5678. Also used for the WhatsApp link." }),
      field("location", "Location", "text", { hint: "City, Country — e.g. Addis Ababa, Ethiopia. The country is used in the privacy policy." }),
      field("time_zone", "Time zone", "choice", {
        options: TIME_ZONES,
        hint: "For the clock on the site, visit counts and dates in the dashboard.",
      }),
    ],
  },
  {
    id: "visibility",
    title: "Visibility",
    intro: "Hidden sections leave the page, the menu, and the footer.",
    fields: [
      field("show_stats", "Stats bar", "toggle"),
      field("show_solutions", "Solutions", "toggle"),
      field("show_products", "Products", "toggle"),
      field("show_apps", "Entertainment apps", "toggle"),
      field("show_process", "Process", "toggle"),
      field("show_team", "Team", "toggle"),
      field("show_testimonials", "Testimonials", "toggle"),
      field("show_pricing", "Pricing", "toggle"),
      field("show_tech", "Technology", "toggle"),
      field("show_faq", "FAQ", "toggle"),
      field("show_contact", "Contact", "toggle"),
      field("show_cta", "Bottom call to action", "toggle"),
    ],
  },
  {
    id: "seo",
    title: "Google & browser tab",
    intro: "How the site appears in the browser tab and on Google. Both are optional.",
    fields: [
      field("meta_title", "Page title (browser tab and Google)", "text", {
        hint: "Empty = the company name.",
      }),
      field("meta_description", "Page description (Google)", "textarea", {
        hint: "About 150 characters. Empty = the hero supporting text.",
      }),
    ],
  },
  {
    id: "hero",
    title: "Hero",
    intro: "The first screen. Put {highlight} in the title where the green words go.",
    fields: [
      field("badge", "Badge"),
      field("hero_title", "Headline"),
      field("hero_highlight", "Headline highlight"),
      field("hero_text", "Supporting text", "textarea"),
      field("hero_image", "Hero image", "image"),
      field("hero_image_alt", "Hero image description"),
      field("hero_primary_text", "Primary button"),
      field("hero_primary_href", "Primary button link", "text", { placeholder: "#products" }),
      field("hero_secondary_text", "Secondary button"),
      field("hero_secondary_href", "Secondary button link", "text", { placeholder: "#contact" }),
      field("trusted_label", "Stats caption"),
    ],
  },
  {
    id: "navigation",
    title: "Navigation",
    intro: "Labels in the top menu. A link stays hidden when its section is hidden.",
    fields: [
      field("nav_solutions", "Solutions"),
      field("nav_products", "Products"),
      field("nav_process", "Process"),
      field("nav_team", "Team"),
      field("nav_pricing", "Pricing"),
      field("nav_cta", "Menu button"),
    ],
  },
  {
    id: "sections",
    title: "Section headings",
    intro: "Eyebrows, titles, and introductions for each block on the page.",
    fields: SECTIONS.flatMap(([id, name]) => sectionFields(id, name)),
  },
  {
    id: "contact",
    title: "Contact section",
    intro: "Texts of the contact section. Your email, phone and location come from the Company profile.",
    fields: [
      field("contact_aside_title", "Text beside the form: title"),
      field("contact_aside_text", "Text beside the form", "textarea"),
      field("form_tip", "Tip above the optional fields", "text", { hint: "Empty = no tip." }),
      field("form_button", "Form button"),
      field("form_success", "Message after sending", "text", { hint: "Shown when a message was sent." }),
    ],
  },
  {
    id: "cta",
    title: "Call to action",
    intro: "The closing banner above the footer.",
    fields: [
      field("cta_title", "Title", "text", {
        hint: "Use {highlight} where the green words should appear.",
      }),
      field("cta_highlight", "Highlight"),
      field("cta_text", "Text", "textarea"),
      field("cta_button", "Button"),
      field("cta_button_href", "Button link", "text", { placeholder: "#contact" }),
    ],
  },
  {
    id: "footer",
    title: "Footer",
    intro: "Social media links are in their own list: menu → Social links. Footer links use your section and menu names.",
    fields: [
      field("footer_blurb", "Short description", "textarea"),
      field("footer_col_product", "Column title 1"),
      field("footer_col_company", "Column title 2"),
      field("footer_col_contact", "Column title 3"),
    ],
  },
  {
    id: "cookies",
    title: "Cookie banner",
    intro: "Shown only when a Google Analytics or Google Ads ID is filled in.",
    fields: [
      field("consent_text", "Banner text", "textarea"),
      field("consent_accept", "Accept button"),
      field("consent_decline", "Decline button"),
    ],
  },
  {
    id: "tracking",
    title: "Google Ads, AdSense & Analytics",
    intro:
      "Paste the IDs from your Google accounts. Leave a box empty to switch that service off. Step-by-step guides: docs/ folder in the project.",
    fields: [
      field("ga4_measurement_id", "GA4 Measurement ID", "text", {
        placeholder: "G-XXXXXXXXXX",
        hint: "Admin → Data Streams → Measurement ID.",
      }),
      field("google_ads_id", "Google Ads ID", "text", {
        placeholder: "AW-XXXXXXXXXX",
        hint: "From Google Ads → Tools → Conversions.",
      }),
      field("google_ads_conversion_label", "Ads conversion label", "text", {
        placeholder: "AbCdEfGhIjKlMnOp",
        hint: "The label after the slash in send_to (AW-XXXX/label).",
      }),
      field("adsense_client_id", "AdSense publisher ID", "text", {
        placeholder: "ca-pub-0000000000000000",
        hint: "Only if you want Google ads SHOWN on this site. AdSense → Account → Account information.",
      }),
    ],
  },
];

const DEFAULT_SETTINGS = {
  show_stats: "1",
  show_solutions: "1",
  show_products: "1",
  show_apps: "0", // gambling content is restricted on Google Ads — turn on only if you are not advertising it
  show_process: "1",
  show_team: "0", // sample team — turn on after adding your real team
  show_testimonials: "0", // sample quotes — turn on after adding real client quotes
  show_pricing: "0",
  show_tech: "1",
  show_faq: "1",
  show_contact: "1",
  show_cta: "1",

  company_name: "Your Company",
  logo_image: "",
  email: "",
  phone: "",
  location: "",
  time_zone: "UTC",

  meta_title: "",
  meta_description: "",

  badge: "Building what's next",
  hero_title: "Technology {highlight} business forward.",
  hero_highlight: "that moves",
  hero_text:
    "{company} builds modern software, payment solutions, business platforms and digital products designed to solve real-world problems.",
  hero_image:
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
  hero_image_alt: "Technology network visualization",
  hero_primary_text: "Explore Products →",
  hero_primary_href: "#products",
  hero_secondary_text: "Talk to Us",
  hero_secondary_href: "#contact",
  trusted_label: "Trusted by forward-thinking businesses",

  nav_solutions: "Solutions",
  nav_products: "Products",
  nav_process: "Process",
  nav_team: "Team",
  nav_pricing: "Pricing",
  nav_cta: "Get Started",

  solutions_label: "What we do",
  solutions_title: "We turn complex ideas into simple products.",
  solutions_highlight: "",
  solutions_text:
    "From software development to payment infrastructure, we create technology that helps businesses operate, grow and connect with their customers.",

  products_label: "Our ecosystem",
  products_title: "Products {highlight}",
  products_highlight: "built by {company}.",
  products_text: "",

  apps_label: "Entertainment",
  apps_title: "Entertainment Apps",
  apps_highlight: "",
  apps_text: "Bingo, Keno, and Spin — online and offline. Bingo includes named hall layouts and Telegram Normal and Super.",

  process_label: "How we work",
  process_title: "A simple process. {highlight}",
  process_highlight: "Real results.",
  process_text: "We keep things lean and transparent — so you always know what's happening and why.",

  team_label: "The team",
  team_title: "Meet the {highlight}",
  team_highlight: "developers.",
  team_text: "A small, focused team of engineers building products that matter.",

  testimonials_label: "Testimonials",
  testimonials_title: "What our clients {highlight}",
  testimonials_highlight: "say.",
  testimonials_text: "",

  pricing_label: "Pricing",
  pricing_title: "Simple plans. {highlight}",
  pricing_highlight: "Real value.",
  pricing_text:
    "Transparent pricing for teams of every size. Need something custom? Send a note and we'll shape a plan around the work.",

  tech_label: "Technology",
  tech_title: "Modern stack. Practical solutions.",
  tech_highlight: "",
  tech_text: "We use reliable technologies to build fast, maintainable and scalable digital products.",

  faq_label: "FAQ",
  faq_title: "Questions? {highlight}",
  faq_highlight: "We've got answers.",
  faq_text: "",

  contact_label: "Let's build",
  contact_title: "Have an idea? {highlight}",
  contact_highlight: "Let's talk.",
  contact_text: "Tell us about your project and we'll get back to you within 24 hours.",

  contact_aside_title: "Get in touch",
  contact_aside_text:
    "Whether you're starting a new digital product, improving an existing system, or looking for a technology partner — we'd love to hear from you.",

  cta_title: "Ready to build something {highlight}",
  cta_highlight: "great?",
  cta_text: "Let's turn your idea into a product people love. Start a conversation with our team today.",
  cta_button: "Start a Conversation →",
  cta_button_href: "#contact",

  footer_blurb:
    "Technology that moves business forward. We build modern software, payment solutions, and digital products.",
  footer_col_product: "Product",
  footer_col_company: "Company",
  footer_col_contact: "Contact",

  form_tip: "Tip: adding your phone number and location helps us reply faster.",
  form_button: "Send Message →",
  form_success: "Thanks! Your message has been sent.",

  consent_text: "We use cookies for analytics and advertising, so we can improve this website and measure our campaigns.",
  consent_accept: "Accept",
  consent_decline: "Essential only",

  ga4_measurement_id: "",
  google_ads_id: "",
  google_ads_conversion_label: "",
  adsense_client_id: "",

};

const keys = GROUPS.flatMap((group) => group.fields.map((item) => item.key));
const defaults = Object.keys(DEFAULT_SETTINGS);
const missing = defaults.filter((key) => !keys.includes(key));
const extra = keys.filter((key) => !Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key));
const dupes = keys.filter((key, index) => keys.indexOf(key) !== index);

if (missing.length || extra.length || dupes.length) {
  throw new Error(
    `Settings out of sync. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}. Dupes: ${dupes.join(", ") || "none"}.`
  );
}

module.exports = { GROUPS, DEFAULT_SETTINGS, TIME_ZONES };
