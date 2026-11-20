// Admin dashboard — entry point.
//
//   core/     shared building blocks (server calls, pop-ups, form fields, layout)
//   config/   the sidebar menu and the editable lists with their fields
//   pages/    one file per page
//
// To add a page: create pages/my-page.js with a render function,
// register it below, and add it to config/menu.js.
import { api, whenSignedOut } from "./core/api.js";
import { startActions, registerForms, registerActions } from "./core/actions.js";
import { startShell, registerPage, registerListPage, showLogin, showApp, session, REMEMBERED_USER_KEY, loadProfile } from "./core/shell.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderMessages } from "./pages/messages.js";
import { renderSettings, renderProfile } from "./pages/settings.js";
import { renderList, isList } from "./pages/list.js";
import { renderAccount } from "./pages/account.js";
import { renderPrivacy } from "./pages/privacy.js";
import { renderTelegram } from "/telegram-bot/admin-page.js"; // feature in src/telegram-bot/
import { toast, storage } from "./core/util.js";

registerPage("dashboard", renderDashboard);
registerPage("messages", renderMessages);
registerPage("content", renderSettings);
registerPage("profile", renderProfile);
registerPage("account", renderAccount);
registerPage("privacy", renderPrivacy);
registerPage("telegram", renderTelegram);
registerListPage(renderList, isList);

/* ---------- Sign in / out ---------- */

// Asks the browser's password manager (Chrome, Edge, …) to offer saving the login.
// The site itself never stores the password.
function offerToSavePassword(username, password) {
  if (!("PasswordCredential" in window)) return; // other browsers show their own prompt
  navigator.credentials.store(new PasswordCredential({ id: username, password, name: username })).catch(() => {});
}

registerForms({
  login: async (form) => {
    const username = form.username.value.trim();
    const password = form.password.value;
    const remember = form.remember.checked;
    try {
      const result = await api("/api/admin/login", {
        method: "POST",
        body: { username, password, remember },
      });

      // "Remember me": keep the username on this device and offer to save the password.
      if (remember) {
        storage.set(REMEMBERED_USER_KEY, result.username);
        offerToSavePassword(result.username, password);
      } else {
        storage.remove(REMEMBERED_USER_KEY);
      }

      session.username = result.username;
      session.mustChange = result.mustChange;
      session.page = "dashboard";
      form.reset();
      showApp();
    } catch (problem) {
      toast(problem.message, "err");
      form.password.select();
    }
  },
});

registerActions({
  logout: async () => {
    await api("/api/admin/logout", { method: "POST" });
    showLogin();
  },

  "toggle-password": (button) => {
    const input = document.getElementById(button.getAttribute("aria-controls"));
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "Hide" : "Show";
    button.setAttribute("aria-label", show ? "Hide password" : "Show password");
  },
});

document.getElementById("loginYear").textContent = new Date().getFullYear();

whenSignedOut(showLogin);

/* ---------- Start ---------- */

async function start() {
  startActions();
  startShell();
  await loadProfile(); // company name, logo and time zone
  try {
    const me = await api("/api/admin/me");
    session.username = me.username;
    session.mustChange = me.mustChange;
    showApp();
  } catch {
    showLogin();
  }
}

start();
