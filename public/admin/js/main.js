// Maraki Tech admin — entry point.
//
//   core/     shared building blocks (server calls, pop-ups, form fields, layout)
//   config/   the sidebar menu and the editable lists with their fields
//   pages/    one file per page
//
// To add a page: create pages/my-page.js with a render function,
// register it below, and add it to config/menu.js.
import { api, whenSignedOut } from "./core/api.js";
import { startActions, registerForms, registerActions } from "./core/actions.js";
import { startShell, registerPage, registerListPage, showLogin, showApp, session } from "./core/shell.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderMessages } from "./pages/messages.js";
import { renderSettings } from "./pages/settings.js";
import { renderList, isList } from "./pages/list.js";
import { renderAccount } from "./pages/account.js";
import { toast } from "./core/util.js";

registerPage("dashboard", renderDashboard);
registerPage("messages", renderMessages);
registerPage("content", renderSettings);
registerPage("account", renderAccount);
registerListPage(renderList, isList);

/* ---------- Sign in / out ---------- */

registerForms({
  login: async (form) => {
    try {
      const result = await api("/api/admin/login", {
        method: "POST",
        body: { username: form.username.value.trim(), password: form.password.value },
      });
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
