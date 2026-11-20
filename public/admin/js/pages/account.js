// Account: change the admin password.
import { api } from "../core/api.js";
import { esc, toast } from "../core/util.js";
import { icon } from "../core/icons.js";
import { registerForms } from "../core/actions.js";
import { view, session, updatePasswordBanner } from "../core/shell.js";

export function renderAccount() {
  view().innerHTML = `
    <div class="page-head">
      <div>
        <h2>Password</h2>
        <p class="muted">Signed in as <strong>${esc(session.username)}</strong>.</p>
      </div>
    </div>

    <form class="card narrow" data-form="change-password">
      <div class="card-head">
        <span class="stat-icon">${icon("lock")}</span>
        <div>
          <h3>Change password</h3>
          <p class="muted">Use at least 8 characters. A short sentence is easy to remember and hard to guess.</p>
        </div>
      </div>
      <div class="form-grid one">
        <div class="field"><label for="pw-current">Current password</label><input id="pw-current" type="password" name="current" autocomplete="current-password" required></div>
        <div class="field"><label for="pw-next">New password</label><input id="pw-next" type="password" name="next" autocomplete="new-password" minlength="8" required></div>
        <div class="field"><label for="pw-confirm">Repeat new password</label><input id="pw-confirm" type="password" name="confirm" autocomplete="new-password" minlength="8" required></div>
      </div>
      <div class="form-actions">
        <button class="btn primary" type="submit">Update password</button>
      </div>
    </form>
  `;
}

registerForms({
  "change-password": async (form) => {
    const { current, next, confirm } = form.elements;
    if (next.value !== confirm.value) throw new Error("The new passwords don't match.");
    await api("/api/admin/password", {
      method: "PUT",
      body: { currentPassword: current.value, newPassword: next.value },
    });
    session.mustChange = false;
    updatePasswordBanner();
    form.reset();
    toast("Password updated.");
  },
});
