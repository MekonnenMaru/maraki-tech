// Privacy policy: every section of the public /privacy page.
// Company name, email, phone and location come from Site settings.
//   Built-in sections: edit, hide/show, move, reset to the automatic text.
//   Your own sections: add, edit, hide/show, move, delete.
// The default text lives on the server in src/views/privacy.js.
import { api } from "../core/api.js";
import { esc, clip, toast } from "../core/util.js";
import { icon } from "../core/icons.js";
import { registerActions, registerForms } from "../core/actions.js";
import { openModal, closeModal, confirmDialog, modalElement } from "../core/modal.js";
import { view } from "../core/shell.js";

const API = "/api/admin/privacy";
let sections = [];

const FORMAT_HELP = `
  <details class="help">
    <summary>How to format the text</summary>
    <ul>
      <li>Leave an <strong>empty line</strong> between paragraphs.</li>
      <li>Start a line with <code>- </code> for a bullet point.</li>
      <li><code>**words**</code> makes words <strong>bold</strong>.</li>
      <li><code>[text](https://example.com)</code> makes a link.</li>
      <li>These are filled in from Site settings: <code>{company}</code> (company name), <code>{email}</code> (contact email), <code>{domain}</code> (website address).</li>
    </ul>
  </details>
`;

function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const sectionApi = (id, suffix = "") => `${API}/sections/${encodeURIComponent(id)}${suffix}`;

/* ---------- List ---------- */

function statusChips(section) {
  const chips = [];
  if (section.custom) chips.push('<span class="chip">Your section</span>');
  else if (section.edited) chips.push('<span class="chip chip-warn">Edited</span>');
  else chips.push('<span class="chip chip-green">Automatic</span>');
  return chips.join(""); // hidden/shown is shown by the on/off switch
}

function sectionRow(section, index, label) {
  const id = esc(section.id);
  const pinned = section.id === "summary"; // "In short" always stays on top
  const first = index <= 1; // can't go above "In short"
  const last = index === sections.length - 1;
  return `
    <li class="list-row ${section.hidden ? "is-hidden" : ""}">
      <span class="row-number">${label}</span>
      <button type="button" class="row-main" data-action="edit-privacy-section" data-id="${id}">
        <strong>${esc(section.title)}</strong>
        <small>${esc(clip(section.snippet || "", 140)) || "Shows your email, phone and location (automatic)"}</small>
      </button>
      <span class="row-chips">${statusChips(section)}</span>
      <span class="row-actions">
        ${pinned ? "" : `
          <button class="icon-btn" type="button" data-action="move-privacy-section" data-index="${index}" data-step="-1" ${first ? "disabled" : ""} title="Move up">${icon("up")}</button>
          <button class="icon-btn" type="button" data-action="move-privacy-section" data-index="${index}" data-step="1" ${last ? "disabled" : ""} title="Move down">${icon("down")}</button>`}
        <button class="icon-btn" type="button" data-action="edit-privacy-section" data-id="${id}" title="Edit">${icon("edit")}</button>
        <button class="row-switch" type="button" role="switch" aria-checked="${!section.hidden}" data-action="toggle-privacy-section" data-id="${id}"
          title="${section.hidden ? "Hidden — click to show on the page" : "Shown — click to hide from the page"}" aria-label="Show “${esc(section.title)}” on the page">
          <span class="switch-track"><span class="switch-thumb"></span></span>
        </button>
        ${section.custom
          ? `<button class="icon-btn danger" type="button" data-action="delete-privacy-section" data-id="${id}" title="Delete">${icon("trash")}</button>`
          : section.edited
            ? `<button class="icon-btn" type="button" data-action="reset-privacy-section" data-id="${id}" title="Reset to the automatic text">${icon("reset")}</button>`
            : ""}
      </span>
    </li>
  `;
}

function render(state) {
  sections = state.sections;
  const shown = sections.filter((section) => !section.hidden);
  const counts = [
    `${shown.length} shown`,
    sections.length - shown.length && `${sections.length - shown.length} hidden`,
    sections.filter((section) => section.custom).length && `${sections.filter((section) => section.custom).length} added by you`,
  ].filter(Boolean).join(" · ");

  // Numbers match the public page: hidden sections and "In short" get no number.
  let number = 0;
  const label = (section) => (section.id === "summary" ? "★" : section.hidden ? "–" : ++number);

  view().innerHTML = `
    <div class="page-head">
      <div>
        <h2>Privacy policy</h2>
        <p class="muted">This is your public Privacy Policy page. Add, edit, hide or reorder sections. Your company name, email, phone and location come from <a href="#content" data-action="go" data-page="content">Site settings</a>.
          ${state.updated ? ` Last updated: <strong>${esc(formatDate(state.updated))}</strong>.` : ""}</p>
      </div>
      <a class="btn ghost" href="/privacy" target="_blank" rel="noopener">${icon("external")}View page</a>
    </div>

    <section class="card flush">
      <div class="card-head padded">
        <div>
          <h3>Sections</h3>
          <p class="muted">${counts}. Automatic sections update themselves when your settings change.</p>
        </div>
        <button class="btn primary" type="button" data-action="add-privacy-section">${icon("plus")}Add section</button>
      </div>
      <ul class="list">
        ${sections.map((section, index) => sectionRow(section, index, label(section))).join("")}
      </ul>
    </section>
  `;
}

export async function renderPrivacy() {
  render(await api(API));
}

async function refresh() {
  const y = window.scrollY;
  await renderPrivacy();
  window.scrollTo(0, y);
}

/* ---------- Add / edit window ---------- */

function openEditor(section) {
  const isNew = !section;
  const autoNote = section && {
    who: "Your email, phone and location are added automatically below this text.",
    contact: "Your email, phone and location are shown automatically. Text you write here appears above them.",
    cookies: "The cookie table is added automatically below this text, so it always matches the website.",
  }[section.id];
  const note = isNew
    ? "Your own section. It appears just before “Contact us about privacy”; move it with the arrows afterwards."
    : section.custom
      ? "Your own section."
      : section.edited
        ? "You edited this section. It no longer changes automatically."
        : "This is the automatic text. Once you save changes, it stops updating automatically (you can reset it any time).";

  openModal(`
    <form data-form="save-privacy-section" data-id="${isNew ? "" : esc(section.id)}">
      <h3>${isNew ? "Add a section" : `Edit “${esc(section.title)}”`}</h3>
      <p class="muted small modal-note">${note}</p>
      <div class="form-grid one">
        <div class="field">
          <label for="ps-title">Title${isNew || section.custom ? ' <i class="req">*</i>' : ""}</label>
          <input id="ps-title" name="title" maxlength="120" value="${isNew ? "" : esc(section.title)}" ${isNew || section.custom ? "required" : ""} placeholder="${isNew ? "e.g. Payments" : ""}">
        </div>
        <div class="field">
          <label for="ps-text">Text</label>
          <textarea id="ps-text" name="text" rows="14" class="long-text">${isNew ? "" : esc(section.text)}</textarea>
          ${autoNote ? `<small>${esc(autoNote)}</small>` : ""}
        </div>
      </div>
      ${FORMAT_HELP}
      <p class="form-error" role="alert"></p>
      <div class="modal-actions">
        ${!isNew && section.custom ? `<button class="btn danger ghost" type="button" data-action="delete-privacy-section" data-id="${esc(section.id)}">${icon("trash")}Delete</button>` : ""}
        ${!isNew && !section.custom && section.edited ? `<button class="btn ghost" type="button" data-action="reset-privacy-section" data-id="${esc(section.id)}">${icon("reset")}Reset to automatic</button>` : ""}
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-action="close-modal">Cancel</button>
        <button class="btn primary" type="submit">${isNew ? "Add section" : "Save section"}</button>
      </div>
    </form>
  `, { size: "wide" });
}

/* ---------- Actions ---------- */

const findSection = (element) => sections.find((section) => section.id === element.dataset.id);

registerActions({
  "add-privacy-section": () => openEditor(null),

  "edit-privacy-section": (element) => {
    const section = findSection(element);
    if (section) openEditor(section);
  },

  "toggle-privacy-section": async (button) => {
    const section = findSection(button);
    if (!section) return;
    await api(sectionApi(section.id), { method: "PATCH", body: { hidden: !section.hidden } });
    toast(section.hidden ? `“${section.title}” is shown on the page again.` : `“${section.title}” is hidden from the page.`);
    await refresh();
  },

  "move-privacy-section": async (button) => {
    const from = Number(button.dataset.index);
    const to = from + Number(button.dataset.step);
    if (to < 1 || to >= sections.length) return; // position 0 is "In short"
    const ids = sections.map((section) => section.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    await api(`${API}/order`, { method: "PUT", body: { ids } });
    await refresh();
  },

  "reset-privacy-section": (element) => {
    const section = findSection(element);
    if (!section) return;
    confirmDialog({
      title: `Reset “${section.title}”?`,
      text: "Your changes to this section are removed and the automatic text comes back.",
      button: "Reset",
      onConfirm: async () => {
        await api(sectionApi(section.id, "/reset"), { method: "POST" });
        toast("Section reset to the automatic text.");
        await refresh();
      },
    });
  },

  "delete-privacy-section": (element) => {
    const section = findSection(element);
    if (!section) return;
    confirmDialog({
      title: `Delete “${section.title}”?`,
      text: "The section is removed for good. This can't be undone.",
      button: "Delete",
      onConfirm: async () => {
        await api(sectionApi(section.id), { method: "DELETE" });
        toast("Section deleted.");
        await refresh();
      },
    });
  },
});

registerForms({
  "save-privacy-section": async (form) => {
    const id = form.dataset.id;
    const body = { title: form.elements.title.value.trim(), text: form.elements.text.value };
    try {
      if (id) await api(sectionApi(id), { method: "PUT", body });
      else await api(`${API}/sections`, { method: "POST", body });
    } catch (error) {
      modalElement().querySelector(".form-error").textContent = error.message;
      return;
    }
    closeModal();
    toast(id ? "Section saved. The Privacy Policy page is updated." : "Section added.");
    await refresh();
  },

});
