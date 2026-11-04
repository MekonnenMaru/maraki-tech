const COLLECTIONS = {
  stats: {
    table: "stats",
    fields: {
      value: { type: "int", min: 0, max: 1000000, required: true },
      suffix: { type: "string", max: 8, default: "+" },
      label: { type: "string", max: 80, required: true },
      visible: { type: "bool", default: true },
    },
  },
  services: {
    table: "services",
    fields: {
      icon: { type: "string", max: 16, default: "" },
      title: { type: "string", max: 120, required: true },
      description: { type: "string", max: 800, required: true },
      visible: { type: "bool", default: true },
    },
  },
  products: {
    table: "products",
    fields: {
      title: { type: "string", max: 120, required: true },
      description: { type: "string", max: 800, required: true },
      link: { type: "string", max: 300, default: "" },
      visible: { type: "bool", default: true },
    },
  },
  apps: {
    table: "apps",
    fields: {
      family: { type: "choice", options: ["bingo", "keno", "spin"], default: "bingo" },
      name: { type: "string", max: 80, required: true },
      edition: { type: "string", max: 40, default: "" },
      channel: { type: "choice", options: ["both", "online", "offline", "telegram"], default: "both" },
      tagline: { type: "string", max: 140, default: "" },
      description: { type: "string", max: 800, default: "" },
      photos: { type: "gallery", maxItems: 12, default: [] },
      video: { type: "media", default: "" },
      link: { type: "string", max: 300, default: "" },
      visible: { type: "bool", default: true },
    },
  },
  process: {
    table: "process_steps",
    fields: {
      title: { type: "string", max: 120, required: true },
      description: { type: "string", max: 800, required: true },
      visible: { type: "bool", default: true },
    },
  },
  team: {
    table: "team_members",
    fields: {
      name: { type: "string", max: 120, required: true },
      role: { type: "string", max: 120, required: true },
      bio: { type: "string", max: 800, required: true },
      skills: { type: "lines", maxItems: 12, itemMax: 40, default: [] },
      avatar_letter: { type: "string", max: 2, default: "" },
      avatar_image: { type: "string", max: 300, default: "" },
      visible: { type: "bool", default: true },
    },
  },
  testimonials: {
    table: "testimonials",
    fields: {
      quote: { type: "string", max: 800, required: true },
      name: { type: "string", max: 120, required: true },
      company: { type: "string", max: 160, default: "" },
      avatar_letter: { type: "string", max: 2, default: "" },
      avatar_image: { type: "string", max: 300, default: "" },
      visible: { type: "bool", default: true },
    },
  },
  technologies: {
    table: "technologies",
    fields: {
      name: { type: "string", max: 60, required: true },
      visible: { type: "bool", default: true },
    },
  },
  faqs: {
    table: "faqs",
    fields: {
      question: { type: "string", max: 200, required: true },
      answer: { type: "string", max: 1200, required: true },
      visible: { type: "bool", default: true },
    },
  },
  pricing: {
    table: "pricing_plans",
    fields: {
      name: { type: "string", max: 80, required: true },
      amount: { type: "string", max: 40, required: true },
      period: { type: "string", max: 40, default: "" },
      description: { type: "string", max: 300, default: "" },
      features: { type: "lines", maxItems: 20, itemMax: 120, default: [] },
      featured: { type: "bool", default: false },
      badge: { type: "string", max: 40, default: "" },
      button_text: { type: "string", max: 40, default: "Get Started" },
      visible: { type: "bool", default: true },
    },
  },
};

function isSafeMedia(value, { video = false } = {}) {
  const text = String(value || "").trim();
  if (text.startsWith("/uploads/")) {
    return video
      ? /^\/uploads\/[a-z0-9]+\.(mp4|webm)$/i.test(text)
      : /^\/uploads\/[a-z0-9]+\.(jpe?g|png|webp|gif)$/i.test(text);
  }
  if (!/^https:\/\/[^\s]+$/i.test(text) || text.length > 300) return false;
  if (video) return true;
  return /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(text);
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function labelFor(key) {
  return key.replace(/_/g, " ");
}

function coerce(key, rule, value) {
  const name = labelFor(key);

  if (rule.type === "bool") {
    if (value === true || value === 1 || value === "1" || value === "true") return 1;
    if (value === false || value === 0 || value === "0" || value === "false") return 0;
    fail(400, `${name} must be true or false.`);
  }

  if (rule.type === "choice") {
    const text = value == null ? "" : String(value).trim();
    if (!text) return rule.default;
    if (!rule.options.includes(text)) fail(400, `${name} is not a valid choice.`);
    return text;
  }

  if (rule.type === "int") {
    if (value === "" || value == null) fail(400, `${name} is required.`);
    const number = Number(value);
    if (!Number.isInteger(number)) fail(400, `${name} must be a whole number.`);
    if (number < rule.min || number > rule.max) {
      fail(400, `${name} must be between ${rule.min} and ${rule.max}.`);
    }
    return number;
  }

  if (rule.type === "gallery") {
    let items = value;
    if (typeof value === "string") {
      try {
        items = JSON.parse(value);
      } catch {
        items = value.split(/\r?\n/);
      }
    }
    if (!Array.isArray(items)) fail(400, `${name} must be a list of photos.`);
    items = items.map((item) => String(item).trim()).filter(Boolean);
    if (items.length > rule.maxItems) fail(400, `${name} can have at most ${rule.maxItems} photos.`);
    for (const item of items) {
      if (!isSafeMedia(item)) fail(400, "Each photo must be an uploaded image or an https link.");
    }
    return JSON.stringify(items);
  }

  if (rule.type === "media") {
    const text = value == null ? "" : String(value).trim();
    if (!text) return "";
    if (text.length > 300 || !isSafeMedia(text, { video: true })) {
      fail(400, "Use an uploaded video or an https link.");
    }
    return text;
  }

  if (rule.type === "lines") {
    let items = value;
    if (typeof value === "string") items = value.split(/\r?\n/);
    if (!Array.isArray(items)) fail(400, `${name} must be a list.`);
    items = items.map((item) => String(item).trim()).filter(Boolean);
    if (items.length > rule.maxItems) fail(400, `${name} can have at most ${rule.maxItems} lines.`);
    for (const item of items) {
      if (item.length > rule.itemMax) fail(400, `Each ${name} line must be under ${rule.itemMax} characters.`);
    }
    return JSON.stringify(items);
  }

  const text = value == null ? "" : String(value).trim();
  if (rule.required && !text) fail(400, `${name} is required.`);
  if (text.length > rule.max) fail(400, `${name} must be under ${rule.max} characters.`);
  return text;
}

function fallback(rule) {
  if (rule.type === "bool") return rule.default ? 1 : 0;
  if (rule.type === "lines" || rule.type === "gallery") return JSON.stringify(rule.default || []);
  if (rule.type === "int") return rule.default ?? 0;
  return rule.default ?? "";
}

function sanitize(collectionName, input, { partial = false } = {}) {
  const spec = COLLECTIONS[collectionName];
  if (!spec) fail(404, "Not found.");
  if (!input || typeof input !== "object" || Array.isArray(input)) fail(400, "Invalid data.");

  const output = {};

  for (const [key, rule] of Object.entries(spec.fields)) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      if (partial) continue;
      if (rule.required) fail(400, `${labelFor(key)} is required.`);
      output[key] = fallback(rule);
      continue;
    }
    output[key] = coerce(key, rule, input[key]);
  }

  if (!partial && (collectionName === "team" || collectionName === "testimonials")) {
    if (!output.avatar_letter && output.name) {
      output.avatar_letter = String(output.name).trim().slice(0, 1).toUpperCase();
    }
  }

  if (partial && !Object.keys(output).length) fail(400, "Nothing to update.");
  return output;
}

function present(collectionName, row) {
  const spec = COLLECTIONS[collectionName];
  const output = { id: Number(row.id) };

  for (const [key, rule] of Object.entries(spec.fields)) {
    if (rule.type === "bool") output[key] = !!row[key];
    else if (rule.type === "lines" || rule.type === "gallery") {
      try {
        const parsed = JSON.parse(row[key] || "[]");
        output[key] = Array.isArray(parsed) ? parsed : [];
      } catch {
        output[key] = [];
      }
    } else {
      output[key] = row[key] ?? "";
    }
  }

  return output;
}

module.exports = { COLLECTIONS, sanitize, present, fail };
