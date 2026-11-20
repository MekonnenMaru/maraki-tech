// Privacy policy: company details + every section of the public /privacy page.
// Each section can be edited, or reset to the automatic text.
// The text and defaults live on the server in src/views/privacy.js.
import { api } from "../core/api.js";
import { esc, clip, toast } from "../core/util.js";
import { icon } from "../core/icons.js";
import { registerActions, registerForms } from "../core/actions.js";
import { openModal, closeModal, confirmDialog, modalElement } from "../core/modal.js";
import { fieldHtml } from "../core/fields.js";
import { view } from "../core/shell.js";

let sections = [];
let detailFields = [];

const FORMAT_HELP = `
  <details class="help">
    <summary>How to format the text</summary>
    <ul>
      <li>Leave an <strong>empty line</strong> between paragraphs.</li>
      <li>Start a line with <code>- </code> for a bullet point.</li>
      <li><code>**words**</code> makes words <strong>bold</strong>.</li>
      <li><code>[text](https://example.com)</code> makes a link.</li>
      <li>These are filled in from your settings:
        <code>{company}</code> <code>{legal_name}</code> <code>{email}</code> <code>{domain}</code> <code>{min_age}</code> <code>{retention}</code></li>
    </ul>
  </details>
`;

function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

// Short plain-text preview of a section (made by the server, placeholders filled in).
function snippet(section) {
  return clip(section.snippet || "", 140);
}

/* ---------- Page ---------- */

function sectionRow(section, number) {
  return `
    <li class="list-row">
      <span class="row-number">${number || "★"}</span>
      <button type="button" class="row-main" data-action="edit-privacy-section" data-id="${esc(section.id)}">
        <strong>${esc(section.title)}</strong>
        <small>${esc(snippet(section)) || "Shows your email, phone and location (automatic)"}</small>
      </button>
      <span class="row-chips">
        ${section.edited ? '<span class="chip chip-warn">Edited</span>' : '<span class="chip chip-green">Automatic</span>'}
      </span>
      <span class="row-actions">
        <button class="icon-btn" type="button" data-action="edit-privacy-section" data-id="${esc(section.id)}" title="Edit">${icon("edit")}</button>
        ${section.edited ? `<button class="icon-btn" type="button" data-action="reset-privacy-section" data-id="${esc(section.id)}" title="Reset to automatic text">${icon("reset")}</button>` : ""}
      </span>
    </li>
  `;
}

function render(state, settings) {
  sections = state.sections;
  const edited = sections.filter((section) => section.edited).length;
  let number = 0;

  view().innerHTML = `
    <div class="page-head">
      <div>
        <h2>Privacy policy</h2>
        <p class="muted">This is your public Privacy Policy page. Change the details, edit any section, or reset a section to the automatic text.
          ${state.updated ? ` Last updated: <strong>${esc(formatDate(state.updated))}</strong>.` : ""}</p>
      </div>
      <a class="btn ghost" href="/privacy" target="_blank" rel="noopener">${icon("external")}View page</a>
    </div>

    <form class="card" data-form="save-privacy-details">
      <div class="card-head">
        <div>
          <h3>Company details</h3>
          <p class="muted">Used throughout the policy. Email, phone and location come from Site settings → Contact details.</p>
        </div>
      </div>
      <div class="switch-grid">${detailFields.filter((f) => f.type === "toggle").map((f) => fieldHtml(f, settings[f.key] === "1")).join("")}</div>
      <div class="form-grid">${detailFields.filter((f) => f.type !== "toggle").map((f) => fieldHtml(f, settings[f.key] ?? "")).join("")}</div>
      <div class="form-actions"><button class="btn primary" type="submit">${icon("check")}Save details</button></div>
    </form>

    <section class="card flush">
      <div class="card-head padded">
        <div>
          <h3>Sections</h3>
          <p class="muted">${sections.length} sections${edited ? ` · ${edited} edited by you` : " · all automatic"}. Automatic sections update themselves when your settings change (for example when you add a Google ID).</p>
        </div>
      </div>
      <ul class="list">
        ${sections.map((section) => sectionRow(section, section.id === "summary" ? 0 : ++number)).join("")}
      </ul>
    </section>
  `;
}

export async function renderPrivacy() {
  const [state, settings, schema] = await Promise.all([
    api("/api/admin/privacy"),
    api("/api/admin/settings"),
    api("/api/admin/schema"),
  ]);
  // The "Last updated" date is handled automatically and shown in the header instead.
  detailFields = (schema.groups.find((group) => group.id === "privacy")?.fields || [])
    .filter((field) => field.key !== "privacy_updated")
    .map((field) => ({ ...field, wide: field.wide || field.key === "privacy_email" }));
  render(state, settings);
}

async function refresh() {
  const y = window.scrollY;
  await renderPrivacy();
  window.scrollTo(0, y);
}

/* ---------- Edit one section ---------- */

function openSectionEditor(section) {
  const autoNote = {
    who: "Your email, phone and location are added automatically below this text.",
    contact: "Your email, phone and location are shown automatically. Text you write here appears above them.",
    cookies: "The cookie table is added automatically below this text, so it always matches the website.",
  }[section.id];

  openModal(`
    <form data-form="save-privacy-section" data-id="${esc(section.id)}">
      <h3>Edit “${esc(section.title)}”</h3>
      <p class="muted small modal-note">${section.edited
        ? "You edited this section. It no longer changes automatically."
        : "This is the automatic text. Once you save changes, it stops updating automatically (you can reset it any time)."}</p>
      <div class="form-grid one">
        <div class="field">
          <label for="ps-title">Title</label>
          <input id="ps-title" name="title" maxlength="120" value="${esc(section.title)}">
        </div>
        <div class="field">
          <label for="ps-text">Text</label>
          <textarea id="ps-text" name="text" rows="14" class="long-text">${esc(section.text)}</textarea>
          ${autoNote ? `<small>${esc(autoNote)}</small>` : ""}
        </div>
      </div>
      ${FORMAT_HELP}
      <p class="form-error" role="alert"></p>
      <div class="modal-actions">
        ${section.edited ? `<button class="btn ghost" type="button" data-action="reset-privacy-section" data-id="${esc(section.id)}">${icon("reset")}Reset to automatic</button>` : ""}
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-action="close-modal">Cancel</button>
        <button class="btn primary" type="submit">Save section</button>
      </div>
    </form>
  `, { size: "wide" });
}

const findSection = (element) => sections.find((section) => section.id === element.dataset.id);

registerActions({
  "edit-privacy-section": (element) => {
    const section = findSection(element);
    if (section) openSectionEditor(section);
  },

  "reset-privacy-section": (element) => {
    const section = findSection(element);
    if (!section) return;
    confirmDialog({
      title: `Reset “${section.title}”?`,
      text: "Your changes to this section are removed and the automatic text comes back.",
      button: "Reset",
      onConfirm: async () => {
        await api(`/api/admin/privacy/sections/${encodeURIComponent(section.id)}`, { method: "DELETE" });
        toast("Section reset to the automatic text.");
        await refresh();
      },
    });
  },
});

registerForms({
  "save-privacy-section": async (form) => {
    const title = form.elements.title.value.trim();
    const text = form.elements.text.value;
    try {
      await api(`/api/admin/privacy/sections/${encodeURIComponent(form.dataset.id)}`, {
        method: "PUT",
        body: { title, text },
      });
    } catch (error) {
      modalElement().querySelector(".form-error").textContent = error.message;
      return;
    }
    closeModal();
    toast("Section saved. The Privacy Policy page is updated.");
    await refresh();
  },

  "save-privacy-details": async (form) => {
    const values = {};
    for (const field of detailFields) {
      const input = form.elements[field.key];
      values[field.key] = field.type === "toggle" ? (input.checked ? "1" : "0") : input.value.trim();
    }
    await api("/api/admin/settings", { method: "PUT", body: values });
    toast("Details saved. The Privacy Policy page is updated.");
    await refresh();
  },
});
