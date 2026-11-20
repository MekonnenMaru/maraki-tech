// Small helpers used on every admin page.

// Makes text safe to put inside HTML. Use it for every value from the server.
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shortens long text: "A very long sente…"
export function clip(value, max = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// Only shows images from our uploads folder or a web address.
export function previewSrc(value) {
  const url = String(value || "");
  if (url.startsWith("/uploads/") && !url.includes("..")) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return "";
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// Small pop-up message in the corner. type: "ok" (default) or "err".
export function toast(message, type = "ok") {
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  document.getElementById("toastRoot").appendChild(node);
  requestAnimationFrame(() => node.classList.add("show"));
  setTimeout(() => {
    node.classList.remove("show");
    setTimeout(() => node.remove(), 250);
  }, 2800);
}

// Browser storage that never throws (private mode can block it).
export const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
