// One page for every editable list (services, products, FAQ, team, …).
// What each list contains is described in ../config/lists.js.
import { api } from "../core/api.js";
import { esc, clip, previewSrc, toast } from "../core/util.js";
import { icon } from "../core/icons.js";
import { registerActions, registerForms } from "../core/actions.js";
import { openModal, closeModal, confirmDialog, modalElement } from "../core/modal.js";
import { fieldHtml, readField } from "../core/fields.js";
import { view, session } from "../core/shell.js";
import { LISTS, itemTitle, itemSummary } from "../config/lists.js";

let items = [];
let editingId = null;
let choices = null; // choices that come from the server, e.g. social platforms (loaded once)

export function isList(id) {
  return Object.prototype.hasOwnProperty.call(LISTS, id);
}

const spec = () => LISTS[session.page];
const findItem = (element) => items.find((item) => item.id === Number(element.dataset.id));

/* ---------- The list ---------- */

function thumb(item) {
  if (spec().thumb) return spec().thumb(item);
  const src = previewSrc(item.avatar_image || (item.photos || [])[0]);
  if (src) return `<img class="row-thumb" alt="" src="${esc(src)}">`;
  if (item.icon) return `<span class="row-thumb">${esc(item.icon)}</span>`;
  return "";
}

function rowHtml(item, index, last) {
  const summary = clip(itemSummary(session.page, item), 110);
  return `
    <li class="list-row ${item.visible === false ? "is-hidden" : ""}">
      <span class="row-number">${index + 1}</span>
      ${thumb(item)}
      <button type="button" class="row-main" data-action="edit-item" data-id="${item.id}">
        <strong>${esc(itemTitle(item))}</strong>
        ${summary ? `<small>${esc(summary)}</small>` : ""}
      </button>
      <span class="row-chips">
        ${item.featured ? '<span class="chip chip-green">Featured</span>' : ""}
      </span>
      <span class="row-actions">
        <button class="icon-btn" type="button" data-action="move-item" data-index="${index}" data-step="-1" ${index === 0 ? "disabled" : ""} title="Move up">${icon("up")}</button>
        <button class="icon-btn" type="button" data-action="move-item" data-index="${index}" data-step="1" ${last ? "disabled" : ""} title="Move down">${icon("down")}</button>
        <button class="icon-btn" type="button" data-action="edit-item" data-id="${item.id}" title="Edit">${icon("edit")}</button>
        ${"visible" in item ? `
          <button class="row-switch" type="button" role="switch" aria-checked="${item.visible !== false}" data-action="toggle-item" data-id="${item.id}"
            title="${item.visible === false ? "Hidden — click to show on the site" : "Shown — click to hide from the site"}" aria-label="Show on the site">
            <span class="switch-track"><span class="switch-thumb"></span></span>
          </button>` : ""}
        <button class="icon-btn danger" type="button" data-action="delete-item" data-id="${item.id}" title="Delete">${icon("trash")}</button>
      </span>
    </li>
  `;
}

export async function renderList(id) {
  const list = LISTS[id];
  const needsChoices = list.fields.some((field) => field.choicesFrom) && !choices;
  const [rows, schema] = await Promise.all([api(`/api/admin/${id}`), needsChoices ? api("/api/admin/schema") : null]);
  items = rows;
  if (schema) choices = schema.choices || {};

  view().innerHTML = `
    <div class="page-head">
      <div>
        <h2>${esc(list.title)}</h2>
        <p class="muted">${esc(list.intro)}</p>
      </div>
      <button class="btn primary" type="button" data-action="add-item">${icon("plus")}Add ${esc(list.noun)}</button>
    </div>

    ${items.length
      ? `<ul class="list card flush">${items.map((item, index) => rowHtml(item, index, index === items.length - 1)).join("")}</ul>`
      : `<div class="empty-state">
          ${icon(list.icon, "icon big")}
          <h3>No ${esc(list.noun)}s yet</h3>
          <button class="btn primary" type="button" data-action="add-item">${icon("plus")}Add the first ${esc(list.noun)}</button>
        </div>`}
  `;
}

async function reload() {
  const y = window.scrollY;
  await renderList(session.page);
  window.scrollTo(0, y);
}

/* ---------- Add / edit window ---------- */

function defaultValue(field) {
  if (field.type === "toggle") return field.key !== "featured";
  if (field.key === "suffix") return "+";
  if (field.key === "button_text") return "Get Started";
  if (field.type === "lines" || field.type === "gallery") return [];
  return "";
}

function openEditor(item) {
  const list = spec();
  editingId = item ? item.id : null;
  const toggles = list.fields.filter((field) => field.type === "toggle");
  const others = list.fields.filter((field) => field.type !== "toggle");
  const value = (field) => (item ? item[field.key] : defaultValue(field));
  const withChoices = (field) => (field.choicesFrom ? { ...field, options: (choices || {})[field.choicesFrom] || [] } : field);

  openModal(`
    <form data-form="save-item">
      <h3>${item ? `Edit ${esc(list.noun)}` : `Add ${esc(list.noun)}`}</h3>
      <div class="form-grid">${others.map((field) => fieldHtml(withChoices(field), value(field))).join("")}</div>
      <div class="switch-grid">${toggles.map((field) => fieldHtml(field, value(field))).join("")}</div>
      <p class="form-error" role="alert"></p>
      <div class="modal-actions">
        ${item ? `<button class="btn danger ghost" type="button" data-action="delete-item" data-id="${item.id}">${icon("trash")}Delete</button>` : ""}
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-action="close-modal">Cancel</button>
        <button class="btn primary" type="submit">${item ? "Save changes" : `Add ${esc(list.noun)}`}</button>
      </div>
    </form>
  `, { size: "wide" });
}

registerActions({
  "add-item": () => openEditor(null),

  // On/off switch in a row: show or hide the item on the website.
  "toggle-item": async (element) => {
    const item = findItem(element);
    if (!item) return;
    await api(`/api/admin/${session.page}/${item.id}`, { method: "PUT", body: { visible: item.visible === false } });
    await reload();
  },
  "edit-item": (element) => openEditor(findItem(element)),

  "delete-item": (element) => {
    const item = findItem(element);
    confirmDialog({
      title: `Delete “${item ? itemTitle(item) : "this item"}”?`,
      text: "It will disappear from the website. This can't be undone.",
      button: "Delete",
      onConfirm: async () => {
        await api(`/api/admin/${session.page}/${item.id}`, { method: "DELETE" });
        toast("Deleted.");
        await reload();
      },
    });
  },

  "move-item": async (button) => {
    const from = Number(button.dataset.index);
    const to = from + Number(button.dataset.step);
    if (to < 0 || to >= items.length) return;
    const ids = items.map((item) => item.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    await api(`/api/admin/${session.page}/reorder`, { method: "POST", body: { ids } });
    await reload();
  },
});

registerForms({
  "save-item": async (form) => {
    const body = {};
    spec().fields.forEach((field) => {
      body[field.key] = readField(form, field);
    });
    try {
      if (editingId) {
        await api(`/api/admin/${session.page}/${editingId}`, { method: "PUT", body });
        toast("Saved.");
      } else {
        await api(`/api/admin/${session.page}`, { method: "POST", body });
        toast("Added.");
      }
    } catch (error) {
      // Show the problem inside the window instead of closing it.
      modalElement().querySelector(".form-error").textContent = error.message;
      return;
    }
    closeModal();
    await reload();
  },
});
