// Site settings: all words, links and switches on the public page, in tabs.
// The groups and fields come from src/settings.js on the server.
import { api } from "../core/api.js";
import { esc, toast, storage } from "../core/util.js";
import { icon } from "../core/icons.js";
import { registerActions, registerForms } from "../core/actions.js";
import { fieldHtml } from "../core/fields.js";
import { view } from "../core/shell.js";

let schema = null; // cached: it only changes when the server code changes
const TAB_KEY = "maraki-settings-tab";

// Long text fields get the full width.
const WIDE_KEYS = /title|text|description|href|url|blurb|email|highlight|alt|tagline/;

function prepare(field, settings) {
  const value = field.type === "toggle" ? settings[field.key] === "1" : settings[field.key] ?? "";
  return fieldHtml({ ...field, wide: field.wide || WIDE_KEYS.test(field.key) }, value);
}

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// "Section headings" has 4 fields per section — show them in small blocks.
function sectionBlocks(fields, settings) {
  const blocks = [];
  for (let i = 0; i < fields.length; i += 4) {
    const chunk = fields.slice(i, i + 4);
    const name = chunk[0].label.replace(/ small label$/i, "");
    blocks.push(`
      <fieldset class="subgroup">
        <legend>${esc(name)}</legend>
        <div class="form-grid">${chunk.map((field) => prepare({ ...field, label: capitalize(field.label.replace(`${name} `, "")) }, settings)).join("")}</div>
      </fieldset>
    `);
  }
  return blocks.join("");
}

function groupHtml(group, settings, active) {
  const toggles = group.fields.filter((field) => field.type === "toggle");
  const others = group.fields.filter((field) => field.type !== "toggle");
  return `
    <section class="card tab-panel" data-tab-panel="${esc(group.id)}" ${active ? "" : "hidden"}>
      <div class="card-head">
        <div>
          <h3>${esc(group.title)}</h3>
          ${group.intro ? `<p class="muted">${esc(group.intro)}</p>` : ""}
        </div>
      </div>
      ${toggles.length ? `<div class="switch-grid">${toggles.map((field) => prepare(field, settings)).join("")}</div>` : ""}
      ${others.length
        ? group.id === "sections"
          ? sectionBlocks(others, settings)
          : `<div class="form-grid">${others.map((field) => prepare(field, settings)).join("")}</div>`
        : ""}
    </section>
  `;
}

export async function renderSettings() {
  const [settings, loadedSchema] = await Promise.all([
    api("/api/admin/settings"),
    schema ? Promise.resolve(schema) : api("/api/admin/schema"),
  ]);
  schema = loadedSchema;

  const saved = storage.get(TAB_KEY);
  const groups = schema.groups;
  const activeId = groups.some((group) => group.id === saved) ? saved : groups[0].id;

  view().innerHTML = `
    <div class="page-head">
      <div>
        <h2>Site settings</h2>
        <p class="muted">Every word, link and switch on the public page. In titles, <code>{highlight}</code> marks where the green words go.</p>
      </div>
    </div>

    <form data-form="save-settings" id="settingsForm" class="settings">
      <nav class="tabs" role="tablist">
        ${groups.map((group) => `
          <button type="button" role="tab" class="tab ${group.id === activeId ? "active" : ""}" data-action="settings-tab" data-tab="${esc(group.id)}">${esc(group.title)}</button>
        `).join("")}
      </nav>

      ${groups.map((group) => groupHtml(group, settings, group.id === activeId)).join("")}

      <div class="savebar">
        <span class="savebar-note" id="saveNote">All changes saved</span>
        <a class="btn ghost" href="/" target="_blank" rel="noopener">${icon("external")}Preview site</a>
        <button class="btn primary" type="submit">${icon("check")}Save changes</button>
      </div>
    </form>
  `;

  const form = document.getElementById("settingsForm");
  form.addEventListener("input", () => markUnsaved(true));
  form.addEventListener("change", () => markUnsaved(true));
}

function markUnsaved(unsaved) {
  const note = document.getElementById("saveNote");
  if (!note) return;
  note.textContent = unsaved ? "Unsaved changes" : "All changes saved";
  note.classList.toggle("unsaved", unsaved);
}

registerActions({
  "settings-tab": (button) => {
    const id = button.dataset.tab;
    storage.set(TAB_KEY, id);
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.tabPanel !== id;
    });
    button.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  },
});

registerForms({
  "save-settings": async (form) => {
    const values = {};
    for (const group of schema.groups) {
      for (const field of group.fields) {
        const input = form.elements[field.key];
        values[field.key] = field.type === "toggle" ? (input.checked ? "1" : "0") : input.value.trim();
      }
    }
    await api("/api/admin/settings", { method: "PUT", body: values });
    markUnsaved(false);
    toast("Saved. Refresh the website to see the changes.");
  },
});
