// One place that listens for clicks, form submits and file/select changes.
//
// In HTML:   <button data-action="delete-item" data-id="4">
//            <form data-form="save-settings">
//            <select data-change="range-preset">
// In a page: registerActions({ "delete-item": (button) => … })
//
// Errors thrown by a handler are shown as a red toast, so pages don't need try/catch.
import { toast } from "./util.js";

const clicks = {};
const submits = {};
const changes = {};

export function registerActions(map) {
  Object.assign(clicks, map);
}

export function registerForms(map) {
  Object.assign(submits, map);
}

export function registerChanges(map) {
  Object.assign(changes, map);
}

async function run(handler, element, event) {
  try {
    await handler(element, event);
  } catch (error) {
    toast(error.message, "err");
  }
}

let busy = false;

export function startActions() {
  document.addEventListener("click", async (event) => {
    const element = event.target.closest("[data-action]");
    if (!element || element.disabled) return;
    const handler = clicks[element.dataset.action];
    if (!handler) return;
    event.preventDefault();
    if (busy) return; // ignore double clicks while a request is running
    busy = true;
    await run(handler, element, event);
    busy = false;
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    const handler = submits[form.dataset.form];
    if (!handler) return;
    event.preventDefault();
    const button = form.querySelector("[type=submit]");
    if (button) button.disabled = true;
    await run(handler, form, event);
    if (button && form.isConnected) button.disabled = false;
  });

  document.addEventListener("change", (event) => {
    const element = event.target;
    const handler = changes[element.dataset?.change];
    if (handler) run(handler, element, event);
  });
}
