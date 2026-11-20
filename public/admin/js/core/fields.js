// Form inputs used by Site settings and by every list editor.
//   fieldHtml(field, value)  → the input for one field
//   readField(form, field)   → the value typed into it
// Uploads (image, photos, video) are handled here too.
import { esc, previewSrc, toast } from "./util.js";
import { icon } from "./icons.js";
import { uploadFile } from "./api.js";
import { registerActions, registerChanges } from "./actions.js";

const IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif";
const MAX_PHOTOS = 12;

function wrap(field, inner, hint = field.hint) {
  return `
    <div class="field ${field.wide ? "wide" : ""}">
      <label for="f-${esc(field.key)}">${esc(field.label)}${field.required ? ' <i class="req">*</i>' : ""}</label>
      ${inner}
      ${hint ? `<small>${esc(hint)}</small>` : ""}
    </div>
  `;
}

function galleryThumbs(urls) {
  if (!urls.length) return '<p class="muted small">No photos yet.</p>';
  return urls.map((url, index) => `
    <figure>
      <img alt="" src="${esc(previewSrc(url))}">
      <button type="button" class="icon-btn danger" data-action="remove-photo" data-index="${index}" title="Remove">${icon("close")}</button>
    </figure>
  `).join("");
}

function parseList(value) {
  try {
    const list = JSON.parse(value || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function fieldHtml(field, value) {
  const key = esc(field.key);
  const id = `f-${key}`;
  const required = field.required ? "required" : "";
  const placeholder = esc(field.placeholder || "");

  switch (field.type) {
    case "toggle":
      return `
        <label class="switch">
          <input type="checkbox" name="${key}" ${value ? "checked" : ""}>
          <span class="switch-track"><span class="switch-thumb"></span></span>
          <span class="switch-label">${esc(field.label)}</span>
        </label>`;

    case "choice":
      return wrap(field, `
        <select id="${id}" name="${key}">
          ${field.options.map(([option, label]) => `<option value="${esc(option)}" ${option === (value || field.options[0][0]) ? "selected" : ""}>${esc(label)}</option>`).join("")}
        </select>`);

    case "textarea":
      return wrap(field, `<textarea id="${id}" name="${key}" rows="4" placeholder="${placeholder}" ${required}>${esc(value || "")}</textarea>`);

    case "lines":
      return wrap(field, `<textarea id="${id}" name="${key}" rows="5">${esc((Array.isArray(value) ? value : []).join("\n"))}</textarea>`, "One item per line.");

    case "image": {
      const src = previewSrc(value);
      return wrap({ ...field, wide: true }, `
        <div class="upload">
          <div class="upload-preview" data-preview="${key}">${src ? `<img alt="" src="${esc(src)}">` : icon("upload")}</div>
          <div class="upload-inputs">
            <input id="${id}" name="${key}" value="${esc(value || "")}" placeholder="https://… or upload a file" data-change="image-url">
            <label class="btn small ghost">${icon("upload")}Upload image
              <input type="file" accept="${IMAGE_TYPES}" data-change="upload-image" data-target="${key}" hidden>
            </label>
          </div>
        </div>`);
    }

    case "gallery": {
      const list = Array.isArray(value) ? value : [];
      return wrap(field, `
        <div class="gallery" data-gallery="${key}">
          <input type="hidden" name="${key}" value="${esc(JSON.stringify(list))}">
          <div class="gallery-grid">${galleryThumbs(list)}</div>
          <label class="btn small ghost">${icon("plus")}Add photos
            <input type="file" accept="${IMAGE_TYPES}" multiple data-change="upload-photos" hidden>
          </label>
        </div>`, `Up to ${MAX_PHOTOS} photos.`);
    }

    case "video":
      return wrap(field, `
        <div class="upload-inputs">
          <input id="${id}" name="${key}" value="${esc(value || "")}" placeholder="${placeholder}">
          <label class="btn small ghost">${icon("upload")}Upload video
            <input type="file" accept="video/mp4,video/webm" data-change="upload-video" data-target="${key}" hidden>
          </label>
        </div>`, "MP4 or WebM under 40 MB, or a YouTube link.");

    case "int":
      return wrap(field, `<input id="${id}" type="number" min="0" step="1" name="${key}" value="${esc(value ?? "")}" ${required}>`);

    default:
      return wrap(field, `<input id="${id}" name="${key}" value="${esc(value ?? "")}" placeholder="${placeholder}" ${required}>`);
  }
}

export function readField(form, field) {
  const input = form.elements[field.key];
  switch (field.type) {
    case "toggle": return input.checked;
    case "gallery": return parseList(input.value);
    case "lines": return input.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    case "int": return Number(input.value);
    default: return input.value.trim();
  }
}

/* ---------- Uploads ---------- */

function showPreview(form, key, url) {
  const box = form.querySelector(`[data-preview="${key}"]`);
  if (!box) return;
  const src = previewSrc(url);
  box.innerHTML = src ? `<img alt="" src="${esc(src)}">` : icon("upload");
}

registerChanges({
  "upload-image": async (input) => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file);
      const form = input.closest("form");
      form.elements[input.dataset.target].value = url;
      showPreview(form, input.dataset.target, url);
      form.dispatchEvent(new Event("input", { bubbles: true })); // marks the form as changed
      toast("Image uploaded.");
    } finally {
      input.value = "";
    }
  },

  "image-url": (input) => showPreview(input.closest("form"), input.name, input.value),

  "upload-photos": async (input) => {
    const gallery = input.closest("[data-gallery]");
    const hidden = gallery.querySelector("input[type=hidden]");
    const urls = parseList(hidden.value);
    try {
      for (const file of input.files || []) {
        if (urls.length >= MAX_PHOTOS) break;
        urls.push(await uploadFile(file));
      }
      hidden.value = JSON.stringify(urls);
      gallery.querySelector(".gallery-grid").innerHTML = galleryThumbs(urls);
      toast("Photos uploaded.");
    } finally {
      input.value = "";
    }
  },

  "upload-video": async (input) => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      toast("Uploading video…");
      input.closest("form").elements[input.dataset.target].value = await uploadFile(file, "video");
      toast("Video uploaded.");
    } finally {
      input.value = "";
    }
  },
});

registerActions({
  "remove-photo": (button) => {
    const gallery = button.closest("[data-gallery]");
    const hidden = gallery.querySelector("input[type=hidden]");
    const urls = parseList(hidden.value).filter((_, index) => index !== Number(button.dataset.index));
    hidden.value = JSON.stringify(urls);
    gallery.querySelector(".gallery-grid").innerHTML = galleryThumbs(urls);
  },
});
