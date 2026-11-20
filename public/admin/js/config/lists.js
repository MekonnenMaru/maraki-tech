// The editable lists in the dashboard and the fields in their edit forms.
// The server checks the same fields in src/content.js — keep both in sync.
//
// Field types: text, int, textarea, lines (one per line), toggle, choice, image, gallery, video.
// Options: required, wide (full width), placeholder, hint.
//   choicesFrom: "name" → the choices are loaded from the server (/api/admin/schema → choices.name).
//   thumb(item)  → small picture at the start of each row.
import { socialIcon } from "/js/lib/social-icons.js"; // the same icons as the website footer

const text = (key, label, extra = {}) => ({ key, label, type: "text", ...extra });
const number = (key, label, extra = {}) => ({ key, label, type: "int", ...extra });
const textarea = (key, label, extra = {}) => ({ key, label, type: "textarea", wide: true, ...extra });
const lines = (key, label) => ({ key, label, type: "lines", wide: true });
const toggle = (key, label) => ({ key, label, type: "toggle" });
const choice = (key, label, options) => ({ key, label, type: "choice", options });
const image = (key, label) => ({ key, label, type: "image", wide: true });
const visible = toggle("visible", "Visible on the site");

const FAMILIES = [["bingo", "Bingo"], ["keno", "Keno"], ["spin", "Spin"]];
const CHANNELS = [["both", "Online & Offline"], ["online", "Online"], ["offline", "Offline"], ["telegram", "Telegram"]];

const nameOf = (options, value) => (options.find(([key]) => key === value) || options[0])[1];

export const LISTS = {
  stats: {
    title: "Stats",
    icon: "chart",
    intro: "The numbers under the hero. The suffix comes after the number, such as + or %.",
    noun: "stat",
    fields: [number("value", "Number", { required: true }), text("suffix", "Suffix", { placeholder: "+" }), text("label", "Label", { required: true }), visible],
    summary: (item) => `${item.value}${item.suffix || ""}`,
  },
  services: {
    title: "Services",
    icon: "layers",
    intro: "The cards in “What we do”. The icon can be an emoji or a short symbol.",
    noun: "service",
    fields: [text("icon", "Icon"), text("title", "Title", { required: true }), textarea("description", "Description", { required: true }), visible],
  },
  products: {
    title: "Products",
    icon: "box",
    intro: "Product cards. Leave the link empty if the card shouldn't open anything.",
    noun: "product",
    fields: [text("title", "Title", { required: true }), textarea("description", "Description", { required: true }), text("link", "Link", { placeholder: "https:// or #contact" }), visible],
  },
  pricing: {
    title: "Pricing",
    icon: "tag",
    intro: "Plans are kept here even while the Pricing section is hidden. Turn it on in Site settings → Visibility.",
    noun: "plan",
    fields: [
      text("name", "Name", { required: true }),
      text("amount", "Price", { required: true }),
      text("period", "Period", { placeholder: "/project" }),
      text("badge", "Badge", { placeholder: "Most popular" }),
      textarea("description", "Description"),
      lines("features", "Features"),
      text("button_text", "Button text"),
      toggle("featured", "Highlight this plan"),
      visible,
    ],
    summary: (item) => `${item.amount || ""}${item.period || ""}`,
  },
  process: {
    title: "Process",
    icon: "steps",
    intro: "The steps under “How we work”, in the order a project moves.",
    noun: "step",
    fields: [text("title", "Title", { required: true }), textarea("description", "Description", { required: true }), visible],
  },
  team: {
    title: "Team",
    icon: "users",
    intro: "People in the team section. A photo replaces the initial when you add one.",
    noun: "person",
    fields: [
      text("name", "Name", { required: true }),
      text("role", "Role", { required: true }),
      textarea("bio", "Bio", { required: true }),
      lines("skills", "Skills"),
      text("avatar_letter", "Initial"),
      image("avatar_image", "Photo"),
      visible,
    ],
    summary: (item) => item.role,
  },
  testimonials: {
    title: "Testimonials",
    icon: "quote",
    intro: "Real quotes from real clients only. Google Ads rejects made-up reviews.",
    noun: "testimonial",
    fields: [
      textarea("quote", "Quote", { required: true }),
      text("name", "Name", { required: true }),
      text("company", "Company / role"),
      text("avatar_letter", "Initial"),
      image("avatar_image", "Photo"),
      visible,
    ],
    summary: (item) => item.company || item.quote,
  },
  technologies: {
    title: "Technology",
    icon: "code",
    intro: "The chips in the technology section.",
    noun: "technology",
    fields: [text("name", "Name", { required: true }), visible],
    summary: () => "",
  },
  faqs: {
    title: "FAQ",
    icon: "help",
    intro: "Questions and answers. Put the most important one first.",
    noun: "question",
    fields: [text("question", "Question", { required: true, wide: true }), textarea("answer", "Answer", { required: true }), visible],
    summary: (item) => item.answer,
  },
  socials: {
    title: "Social links",
    icon: "share",
    intro: "The icons in the footer. Each network can have its own username, or paste a full link. Use “Other link” for any other website.",
    noun: "link",
    fields: [
      { key: "platform", label: "Platform", type: "choice", choicesFrom: "socialPlatforms" }, // list comes from the server (src/social.js)
      text("handle", "Username or link", {
        wide: true,
        placeholder: "marakitech  or  https://…",
        hint: "Just the name (e.g. marakitech) — the link is made for you. WhatsApp: leave empty to use your phone number from Site settings → Contact.",
      }),
      visible,
    ],
    summary: (item) => item.url || (item.platform === "whatsapp" ? "Uses the phone number from Site settings → Contact" : ""),
    thumb: (item) => `<span class="row-thumb">${socialIcon(item.platform)}</span>`,
  },
  apps: {
    title: "Entertainment",
    icon: "game",
    intro: "Bingo, Keno and Spin apps. Google restricts gambling ads — keep this section hidden on pages you advertise.",
    noun: "app",
    fields: [
      choice("family", "Group", FAMILIES),
      text("name", "Name", { required: true, placeholder: "Ethiomark Bingo" }),
      text("edition", "Edition", { placeholder: "Normal or Super" }),
      choice("channel", "Where it runs", CHANNELS),
      text("tagline", "Tagline", { wide: true }),
      textarea("description", "Description"),
      { key: "photos", label: "Photos", type: "gallery", wide: true },
      { key: "video", label: "Video", type: "video", wide: true, placeholder: "Upload, or paste a YouTube link" },
      text("link", "Link", { placeholder: "https://", wide: true }),
      visible,
    ],
    summary: (item) =>
      [nameOf(FAMILIES, item.family), nameOf(CHANNELS, item.channel), item.edition].filter(Boolean).join(" · "),
  },
};

// The main name shown for a row in any list.
export function itemTitle(item) {
  return item.label || item.title || item.name || item.question || "Untitled";
}

// The second line shown under the name.
export function itemSummary(listName, item) {
  const custom = LISTS[listName].summary;
  return custom ? custom(item) : item.description || item.bio || "";
}
