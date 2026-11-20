// Dashboard page "Telegram alerts" (runs in the browser; served by src/telegram-bot/index.js).
// Uses the dashboard's shared building blocks from /admin/js/core.
import { api } from "/admin/js/core/api.js";
import { esc, toast } from "/admin/js/core/util.js";
import { icon } from "/admin/js/core/icons.js";
import { registerActions, registerForms } from "/admin/js/core/actions.js";
import { openModal, closeModal, confirmDialog, modalElement } from "/admin/js/core/modal.js";
import { view, session } from "/admin/js/core/shell.js";
import { formatWhen } from "/admin/js/core/date-range.js";

const API = "/api/admin/telegram";
let state = null;
let checkTimer = null;

/* ---------- Page ---------- */

function statusLine() {
  if (!state.hasToken) return { tone: "warn", text: "Add your bot token to start." };
  if (state.botError) return { tone: "danger", text: state.botError };
  if (!state.recipients.length) return { tone: "warn", text: "Connect a Telegram account to receive alerts." };
  if (!state.enabled) return { tone: "warn", text: "Alerts are switched off." };
  return { tone: "ok", text: `Working — new messages are sent to ${state.recipients.length === 1 ? "1 account" : `${state.recipients.length} accounts`}.` };
}

function render() {
  const line = statusLine();
  view().innerHTML = `
    <div class="page-head">
      <div>
        <h2>Telegram alerts</h2>
        <p class="muted">Get a Telegram message the moment someone sends the contact form — with their name, contact details and message.</p>
      </div>
    </div>

    <section class="card">
      <div class="card-head">
        <div>
          <h3>${state.bot ? `Bot: @${esc(state.bot.username)}` : "Bot"}</h3>
          <p class="tg-status ${line.tone}">${esc(line.text)}</p>
          ${state.lastError && line.tone === "ok" ? `<p class="tg-status danger">Last problem: ${esc(state.lastError)}</p>` : ""}
          ${state.lastSentAt ? `<p class="muted small">Last alert sent: ${esc(formatWhen(state.lastSentAt))}</p>` : ""}
        </div>
        <button class="row-switch" type="button" role="switch" aria-checked="${state.enabled}" data-action="tg-toggle" title="Alerts on/off" aria-label="Alerts on or off" ${state.hasToken ? "" : "disabled"}>
          <span class="switch-track"><span class="switch-thumb"></span></span>
        </button>
      </div>
      <div class="form-actions" style="justify-content:flex-start; gap:10px; flex-wrap:wrap">
        <button class="btn primary" type="button" data-action="tg-connect" ${state.bot ? "" : "disabled"}>${icon("plus")}Connect a Telegram account</button>
        <button class="btn ghost" type="button" data-action="tg-test" ${state.recipients.length ? "" : "disabled"}>${icon("send")}Send test message</button>
      </div>
    </section>

    <section class="card flush">
      <div class="card-head padded">
        <div>
          <h3>Who gets alerts</h3>
          <p class="muted">Telegram accounts connected with a one-time link. Remove anyone who shouldn't get leads.</p>
        </div>
      </div>
      ${state.recipients.length ? `
        <ul class="list">
          ${state.recipients.map((item) => `
            <li class="list-row">
              <span class="row-thumb">${icon("send")}</span>
              <div class="row-main" style="cursor:default"><strong>${esc(item.name)}</strong><small>Chat ID ${esc(item.chatId)}</small></div>
              <span class="row-actions">
                <button class="icon-btn danger" type="button" data-action="tg-remove" data-id="${esc(item.chatId)}" data-name="${esc(item.name)}" title="Remove">${icon("trash")}</button>
              </span>
            </li>`).join("")}
        </ul>` : '<p class="muted" style="padding: 0 22px 22px">No one yet.</p>'}
    </section>

    <form class="card" data-form="tg-token">
      <div class="card-head">
        <div>
          <h3>Bot token</h3>
          <p class="muted">${state.hasToken ? `Saved: <code>${esc(state.tokenHint)}</code>. Paste a new token to replace it.` : "Create a bot with <strong>@BotFather</strong> in Telegram (/newbot), then paste its token here."}</p>
        </div>
      </div>
      <div class="form-grid one">
        <div class="field">
          <label for="tg-token">New token</label>
          <input id="tg-token" name="token" type="password" autocomplete="off" spellcheck="false" placeholder="123456789:ABCdef…" required>
          <small>Stored only in your database. Changing the token disconnects everyone (connect again afterwards).</small>
        </div>
      </div>
      <div class="form-actions"><button class="btn primary" type="submit">Save token</button></div>
    </form>
  `;
}

export async function renderTelegram() {
  state = await api(API);
  render();
}

/* ---------- Connect a Telegram account ---------- */

function stopChecking() {
  clearInterval(checkTimer);
  checkTimer = null;
}

async function checkOnce() {
  const result = await api(`${API}/connect/check`, { method: "POST" });
  if (!result.connected) return;
  stopChecking();
  state = result.status;
  closeModal();
  if (session.page === "telegram") render();
  toast(`Connected: ${result.connected.name}`);
}

registerActions({
  "tg-connect": async () => {
    const { link, minutes } = await api(`${API}/connect`, { method: "POST" });
    openModal(`
      <h3>Connect a Telegram account</h3>
      <ol class="steps">
        <li>Open this link on the phone or computer where you use Telegram:<br>
          <a class="btn primary" href="${esc(link)}" target="_blank" rel="noopener">${icon("send")}Open in Telegram</a></li>
        <li>Press <strong>Start</strong> in the chat with the bot.</li>
        <li>Come back here — this window closes by itself when it's connected.</li>
      </ol>
      <p class="muted small">The link works once and for ${minutes} minutes. Only the account that uses it gets alerts.</p>
      <p class="tg-waiting"><span class="spinner"></span> Waiting for Telegram…</p>
      <div class="modal-actions"><button class="btn ghost" type="button" data-action="close-modal">Close</button></div>
    `, { size: "small", whenClosed: stopChecking });
    stopChecking();
    let tries = 0;
    checkTimer = setInterval(() => {
      tries += 1;
      if (tries > (minutes * 60) / 3) return stopChecking();
      checkOnce().catch((error) => {
        stopChecking();
        const box = modalElement()?.querySelector(".tg-waiting");
        if (box) box.textContent = error.message;
      });
    }, 3000);
  },

  "tg-toggle": async () => {
    state = await api(`${API}/enabled`, { method: "PUT", body: { enabled: !state.enabled } });
    render();
    toast(state.enabled ? "Telegram alerts are on." : "Telegram alerts are off.");
  },

  "tg-test": async () => {
    const result = await api(`${API}/test`, { method: "POST" });
    state = result.status;
    render();
    toast(`Test message sent to ${result.sent === 1 ? "1 account" : `${result.sent} accounts`}.`);
  },

  "tg-remove": (button) =>
    confirmDialog({
      title: `Remove ${button.dataset.name}?`,
      text: "They will stop getting Telegram alerts. You can connect them again later.",
      button: "Remove",
      onConfirm: async () => {
        state = await api(`${API}/recipients/${encodeURIComponent(button.dataset.id)}`, { method: "DELETE" });
        render();
        toast("Removed.");
      },
    }),
});

registerForms({
  "tg-token": async (form) => {
    state = await api(`${API}/token`, { method: "PUT", body: { token: form.elements.token.value.trim() } });
    render();
    toast(`Token saved. Bot: @${state.bot?.username || "?"}`);
  },
});
