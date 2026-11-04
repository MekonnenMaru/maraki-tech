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

const GROUPS = [
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
    title: "Brand and SEO",
    intro: "The name in the logo, the browser tab, and the search snippet.",
    fields: [
      field("brand_name", "Logo text"),
      field("meta_title", "Page title"),
      field("meta_description", "Page description", "textarea"),
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
      field("float_top_label", "Top card label"),
      field("float_top_value", "Top card value"),
      field("float_bottom_label", "Bottom card label"),
      field("float_bottom_value", "Bottom card value"),
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
      field("nav_apps", "Apps"),
      field("nav_process", "Process"),
      field("nav_team", "Team"),
      field("nav_pricing", "Pricing"),
      field("nav_contact", "Contact"),
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
    title: "Contact details",
    intro: "Shown beside the contact form and in the footer.",
    fields: [
      field("contact_aside_title", "Aside title"),
      field("contact_aside_text", "Aside text", "textarea"),
      field("email", "Email"),
      field("phone", "Phone"),
      field("location", "Location"),
      field("form_note", "Form note"),
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
    title: "Footer and social",
    intro: "Leave a social link empty to hide that icon.",
    fields: [
      field("footer_brand", "Brand name"),
      field("footer_tagline", "Tagline"),
      field("footer_blurb", "Short description", "textarea"),
      field("social_x", "X / Twitter URL", "text", { placeholder: "https://" }),
      field("social_linkedin", "LinkedIn URL", "text", { placeholder: "https://" }),
      field("social_github", "GitHub URL", "text", { placeholder: "https://" }),
      field("social_telegram", "Telegram URL", "text", { placeholder: "https://" }),
    ],
  },
];

const DEFAULT_SETTINGS = {
  show_stats: "1",
  show_solutions: "1",
  show_products: "1",
  show_apps: "1",
  show_process: "1",
  show_team: "1",
  show_testimonials: "1",
  show_pricing: "0",
  show_tech: "1",
  show_faq: "1",
  show_contact: "1",
  show_cta: "1",

  brand_name: "MARAKI",
  meta_title: "Maraki Tech — Technology That Moves Business Forward",
  meta_description:
    "Maraki Tech builds modern software, payment solutions, business platforms and digital products.",

  badge: "Building the future from Ethiopia",
  hero_title: "Technology {highlight} business forward.",
  hero_highlight: "that moves",
  hero_text:
    "Maraki Tech builds modern software, payment solutions, business platforms and digital products designed to solve real-world problems.",
  hero_image:
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
  hero_image_alt: "Technology network visualization",
  hero_primary_text: "Explore Products →",
  hero_primary_href: "#products",
  hero_secondary_text: "Talk to Us",
  hero_secondary_href: "#contact",
  float_top_label: "Technology",
  float_top_value: "Built for scale",
  float_bottom_label: "Products",
  float_bottom_value: "Made by Maraki",
  trusted_label: "Trusted by forward-thinking businesses",

  nav_solutions: "Solutions",
  nav_products: "Products",
  nav_apps: "Apps",
  nav_process: "Process",
  nav_team: "Team",
  nav_pricing: "Pricing",
  nav_contact: "Contact",
  nav_cta: "Get Started",

  solutions_label: "What we do",
  solutions_title: "We turn complex ideas into simple products.",
  solutions_highlight: "",
  solutions_text:
    "From software development to payment infrastructure, we create technology that helps businesses operate, grow and connect with their customers.",

  products_label: "Our ecosystem",
  products_title: "Products {highlight}",
  products_highlight: "built by Maraki.",
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
  email: "hello@maraki.tech",
  phone: "+251 900 000 000",
  location: "Addis Ababa, Ethiopia",
  form_note: "We'll respond within 24 hours.",

  cta_title: "Ready to build something {highlight}",
  cta_highlight: "great?",
  cta_text: "Let's turn your idea into a product people love. Start a conversation with our team today.",
  cta_button: "Start a Conversation →",
  cta_button_href: "#contact",

  footer_brand: "Maraki Tech",
  footer_tagline: "Technology that moves business forward.",
  footer_blurb:
    "Technology that moves business forward. We build modern software, payment solutions, and digital products from Ethiopia.",
  social_x: "",
  social_linkedin: "",
  social_github: "",
  social_telegram: "",
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

module.exports = { GROUPS, DEFAULT_SETTINGS };
