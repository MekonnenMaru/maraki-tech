// The dashboard frame: login screen vs. app, sidebar menu, page switching,
// the unread badge, the default-password banner and the light/dark switch.
import { esc, storage } from "./util.js";
import { icon } from "./icons.js";
import { registerActions } from "./actions.js";
import { closeModal } from "./modal.js";
import { MENU, pageLabel } from "../config/menu.js";

const $ = (id) => document.getElementById(id);

export const session = { username: "", mustChange: false, page: "dashboard" };

const pages = {}; // page id → render function
let listPage = null; // one render function shared by every list (services, faqs, …)
let isListPage = () => false;

export function registerPage(id, render) {
  pages[id] = render;
}

// isList(id) says whether `id` is one of the editable lists.
export function registerListPage(render, isList) {
  listPage = render;
  isListPage = isList;
}

export function view() {
  return $("view");
}

/* ---------- Screens ---------- */

export function showLogin() {
  closeModal();
  $("boot").hidden = true;
  $("appView").hidden = true;
  $("loginView").hidden = false;
  $("loginForm").elements.username.focus();
}

export function showApp() {
  $("boot").hidden = true;
  $("loginView").hidden = true;
  $("appView").hidden = false;
  $("who").textContent = session.username;
  $("whoInitial").textContent = (session.username[0] || "A").toUpperCase();
  updatePasswordBanner();
  go(readPageFromUrl() || session.page);
}

export function updatePasswordBanner() {
  $("passwordBanner").hidden = !session.mustChange;
}

export function setUnread(count) {
  const badge = $("unreadBadge");
  badge.hidden = !count;
  badge.textContent = count > 99 ? "99+" : String(count);
}

/* ---------- Sidebar ---------- */

function renderMenu() {
  $("menu").innerHTML = MENU.map(
    (group) => `
      <div class="menu-group">
        <p class="menu-title">${esc(group.title)}</p>
        ${group.items
          .map(
            ([id, label, iconName]) => `
              <a href="#${id}" class="menu-item" data-action="go" data-page="${id}">
                ${icon(iconName)}<span>${esc(label)}</span>
                ${id === "messages" ? '<b class="badge" id="unreadBadge" hidden>0</b>' : ""}
              </a>`
          )
          .join("")}
      </div>`
  ).join("");
}

function openSidebar() {
  document.body.classList.add("sidebar-open");
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
}

/* ---------- Page switching ---------- */

function readPageFromUrl() {
  const id = location.hash.slice(1);
  return pages[id] || isListPage(id) ? id : "";
}

export async function go(id) {
  session.page = id;
  if (location.hash.slice(1) !== id) history.replaceState(null, "", `#${id}`);

  document.querySelectorAll(".menu-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.page === id);
  });
  $("pageTitle").textContent = pageLabel(id);
  document.title = `${pageLabel(id)} — Maraki Admin`;
  closeSidebar();
  closeModal();

  const render = pages[id] || (isListPage(id) ? listPage : null) || pages.dashboard;
  const main = view();
  main.innerHTML = '<div class="loading"><span class="spinner"></span>Loading…</div>';
  main.scrollTop = 0;
  window.scrollTo(0, 0);

  try {
    await render(id);
  } catch (error) {
    main.innerHTML = `
      <div class="empty-state">
        ${icon("alert", "icon big")}
        <h3>This page didn't load</h3>
        <p class="muted">${esc(error.message)}</p>
        <button class="btn ghost" data-action="go" data-page="${esc(id)}">Try again</button>
      </div>`;
  }
}

/* ---------- Theme ---------- */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  storage.set("maraki-theme", theme);
  const button = $("themeToggle");
  button.innerHTML = icon(theme === "dark" ? "sun" : "moon");
  button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
}

/* ---------- Start ---------- */

export function startShell() {
  renderMenu();
  applyTheme(document.documentElement.dataset.theme || "dark");
  $("menuButton").innerHTML = icon("menu");
  $("logoutButton").innerHTML = icon("logout");
  $("viewSite").insertAdjacentHTML("afterbegin", icon("external"));

  registerActions({
    go: (element) => {
      go(element.dataset.page); // not awaited, so other clicks still work while it loads
    },
    "open-sidebar": openSidebar,
    "close-sidebar": closeSidebar,
    "toggle-theme": () => applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"),
  });

  window.addEventListener("hashchange", () => {
    const id = readPageFromUrl();
    if (id && id !== session.page && !$("appView").hidden) go(id);
  });
}
