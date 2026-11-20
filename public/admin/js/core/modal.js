// Pop-up windows: openModal(), closeModal() and a ready-made "Are you sure?" dialog.
import { esc } from "./util.js";
import { icon } from "./icons.js";
import { registerActions, registerForms } from "./actions.js";

const root = document.getElementById("modalRoot");
let onClose = null;
let onConfirm = null;
let returnFocusTo = null;

// size: "small" | "normal" | "wide"
export function openModal(html, { size = "normal", whenClosed = null } = {}) {
  returnFocusTo = document.activeElement;
  onClose = whenClosed;
  root.innerHTML = `
    <div class="modal-back" data-modal-back>
      <div class="modal ${size}" role="dialog" aria-modal="true">
        <button type="button" class="modal-x" data-action="close-modal" aria-label="Close">${icon("close")}</button>
        ${html}
      </div>
    </div>
  `;
  document.body.classList.add("modal-open");
  root.querySelector("input:not([type=hidden]), textarea, select, button:not(.modal-x)")?.focus();
}

export function closeModal() {
  if (!root.innerHTML) return;
  root.innerHTML = "";
  document.body.classList.remove("modal-open");
  onConfirm = null;
  const callback = onClose;
  onClose = null;
  callback?.();
  returnFocusTo?.focus?.();
}

export function modalElement() {
  return root.querySelector(".modal");
}

// confirmDialog({ title, text, button: "Delete", danger: true, onConfirm: async () => … })
export function confirmDialog({ title, text, button = "Confirm", danger = true, onConfirm: action }) {
  openModal(
    `
    <form data-form="confirm">
      <div class="modal-icon ${danger ? "danger" : ""}">${icon(danger ? "alert" : "check")}</div>
      <h3>${esc(title)}</h3>
      <p class="muted">${esc(text)}</p>
      <div class="modal-actions">
        <button class="btn ghost" type="button" data-action="close-modal">Cancel</button>
        <button class="btn ${danger ? "danger" : "primary"}" type="submit">${esc(button)}</button>
      </div>
    </form>
  `,
    { size: "small" }
  );
  onConfirm = action;
}

registerActions({ "close-modal": () => closeModal() });

registerForms({
  confirm: async () => {
    const action = onConfirm;
    closeModal();
    await action?.();
  },
});

// Click outside the window or press Escape to close.
root.addEventListener("mousedown", (event) => {
  if (event.target.matches("[data-modal-back]")) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});
