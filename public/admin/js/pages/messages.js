// Inbox: leads from the contact form. Filter, search, read, reply and delete.
import { api } from "../core/api.js";
import { esc, clip, plural, toast } from "../core/util.js";
import { icon } from "../core/icons.js";
import { registerActions } from "../core/actions.js";
import { openModal, closeModal, confirmDialog, modalElement } from "../core/modal.js";
import { rangePicker, rangeQuery, formatWhen } from "../core/date-range.js";
import { view, setUnread, session, go } from "../core/shell.js";

const inbox = {
  status: "all", // all | unread | read
  search: "",
  messages: [], // what's on screen now (also used by the Overview page)
  searchTimer: null,
};

/* ---------- Shared helpers (also used by the Overview page) ---------- */

export function rememberMessages(list) {
  inbox.messages = list;
}

export function sourceLabel(message) {
  switch (message.source) {
    case "google_ads": return "Google Ads";
    case "campaign": return message.utm_source ? `Campaign · ${message.utm_source}` : "Campaign";
    case "referral": return "Referral";
    case "direct": return "Direct";
    default: return message.source || "—";
  }
}

export function sourceChip(message) {
  const ads = message.source === "google_ads";
  return `<span class="chip ${ads ? "chip-green" : ""}">${esc(sourceLabel(message))}</span>`;
}

export function statusChip(isRead) {
  return isRead ? '<span class="chip">Read</span>' : '<span class="chip chip-warn">New</span>';
}

/* ---------- Page ---------- */

export async function renderMessages() {
  view().innerHTML = `
    <div class="page-head">
      <div>
        <h2>Inbox</h2>
        <p class="muted">Leads from the contact form. Opening one marks it as read.</p>
      </div>
      <button class="btn ghost" type="button" data-action="mark-all-read">${icon("check")}Mark all read</button>
    </div>

    <div class="toolbar">
      <div class="segmented" role="tablist">
        ${[["all", "All"], ["unread", "New"], ["read", "Read"]]
          .map(([value, label]) => `<button type="button" role="tab" data-action="inbox-status" data-status="${value}" class="${inbox.status === value ? "active" : ""}">${label}</button>`)
          .join("")}
      </div>
      <label class="search">
        ${icon("search")}
        <input type="search" id="inboxSearch" placeholder="Search name, email, place, source or text" value="${esc(inbox.search)}">
      </label>
      ${rangePicker(loadMessages)}
    </div>

    <p class="list-count" id="inboxCount"></p>
    <div id="inboxList"></div>
  `;

  // Search as you type (with a short pause so we don't ask the server on every key).
  document.getElementById("inboxSearch").addEventListener("input", (event) => {
    inbox.search = event.target.value;
    clearTimeout(inbox.searchTimer);
    inbox.searchTimer = setTimeout(loadMessages, 250);
  });

  await loadMessages();
}

async function loadMessages() {
  const list = document.getElementById("inboxList");
  const count = document.getElementById("inboxCount");
  if (!list) return;

  const range = rangeQuery();
  if (range?.pending) {
    count.textContent = "";
    list.innerHTML = emptyState("calendar", "Choose a start and end date.");
    return;
  }

  const params = new URLSearchParams({ status: inbox.status, q: inbox.search });
  if (range) {
    params.set("from", range.from);
    params.set("to", range.to);
  }
  const data = await api(`/api/admin/messages?${params}`);
  inbox.messages = data.messages;
  setUnread(data.counts.unread);

  const matched = Number(data.matched) || 0;
  count.textContent = matched > data.messages.length
    ? `Showing the latest ${data.messages.length} of ${matched}`
    : plural(matched, "message");

  list.innerHTML = data.messages.length
    ? messagesTable(data.messages, { full: true })
    : emptyState("inbox", inbox.search || inbox.status !== "all" ? "No messages match this filter." : "No messages yet.");
}

function emptyState(iconName, text) {
  return `<div class="empty-state">${icon(iconName, "icon big")}<p class="muted">${esc(text)}</p></div>`;
}

// The table of leads. On phones each row turns into a card (see admin.css).
export function messagesTable(messages, { full = false } = {}) {
  return `
    <div class="table-card">
      <table class="table">
        <thead>
          <tr>
            <th>From</th>
            ${full ? "<th>Message</th>" : ""}
            <th>Source</th>
            <th>Received</th>
            <th>Status</th>
            <th class="actions-col"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          ${messages.map((message) => `
            <tr data-message-row="${message.id}" class="${message.is_read ? "" : "unread"}">
              <td data-label="From">
                <button type="button" class="row-link" data-action="open-message" data-id="${message.id}">
                  <strong>${esc(message.name)}</strong>
                  <small>${esc([message.company, message.place].filter(Boolean).join(" · ") || message.email)}</small>
                </button>
              </td>
              ${full ? `<td data-label="Message" class="clip"><div>${esc(clip(message.message, 90))}${message.service ? `<small>${esc(message.service)}</small>` : ""}</div></td>` : ""}
              <td data-label="Source">${sourceChip(message)}</td>
              <td data-label="Received" class="nowrap">${esc(formatWhen(message.created_at))}</td>
              <td data-label="Status" data-status>${statusChip(message.is_read)}</td>
              <td class="actions-col">
                <div class="row-actions">
                  <button class="icon-btn" type="button" data-action="open-message" data-id="${message.id}" title="Open">${icon("eye")}</button>
                  <button class="icon-btn danger" type="button" data-action="delete-message" data-id="${message.id}" title="Delete">${icon("trash")}</button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* ---------- One message ---------- */

function detail(label, value, href) {
  if (!value) return "";
  const shown = href ? `<a href="${esc(href)}">${esc(value)}</a>` : esc(value);
  return `<div><dt>${label}</dt><dd>${shown}</dd></div>`;
}

function openMessageWindow(message) {
  const campaign = [
    ["utm_source", message.utm_source],
    ["utm_medium", message.utm_medium],
    ["utm_campaign", message.utm_campaign],
    ["utm_term", message.utm_term],
    ["utm_content", message.utm_content],
    ["Google click ID", message.gclid],
    ["Landing page", message.landing_page],
    ["Referrer", message.referrer],
    ["IP address", message.ip],
  ].filter(([, value]) => value);

  openModal(
    `
    <div class="message-head">
      <div class="avatar">${esc((message.name || "?")[0].toUpperCase())}</div>
      <div>
        <h3>${esc(message.name)}</h3>
        <p class="muted">${esc(formatWhen(message.created_at))} · ${sourceChip(message)}</p>
      </div>
    </div>

    <dl class="details">
      ${detail("Email", message.email, `mailto:${message.email}`)}
      ${detail("Phone", message.phone, message.phone ? `tel:${message.phone.replace(/[^\d+]/g, "")}` : "")}
      ${detail("Company", message.company)}
      ${detail("Location", message.place)}
      ${detail("Service", message.service)}
    </dl>

    <div class="message-body">${esc(message.message)}</div>

    ${campaign.length ? `
      <details class="campaign">
        <summary>Where this lead came from</summary>
        <dl class="details compact">
          ${campaign.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd><code>${esc(value)}</code></dd></div>`).join("")}
        </dl>
      </details>` : ""}

    <div class="modal-actions">
      <button class="btn danger ghost" type="button" data-action="delete-message" data-id="${message.id}">${icon("trash")}Delete</button>
      <span class="spacer"></span>
      <button class="btn ghost" type="button" data-action="toggle-read" data-id="${message.id}">${message.is_read ? "Mark as new" : "Mark as read"}</button>
      <a class="btn primary" href="mailto:${esc(message.email)}?subject=${encodeURIComponent("Re: your message to Maraki Tech")}">${icon("mail")}Reply</a>
    </div>
  `,
    { size: "wide" }
  );
}

async function setRead(message, isRead) {
  if (message.is_read === isRead) return;
  const result = await api(`/api/admin/messages/${message.id}`, { method: "PATCH", body: { is_read: isRead } });
  message.is_read = isRead;
  setUnread(result.counts.unread);

  // Update the row and the Overview counter without reloading the page.
  const row = document.querySelector(`[data-message-row="${message.id}"]`);
  if (row) {
    row.classList.toggle("unread", !isRead);
    row.querySelector("[data-status]").innerHTML = statusChip(isRead);
  }
  const unreadStat = document.querySelector("[data-unread-stat]");
  if (unreadStat) unreadStat.textContent = String(result.counts.unread);
  const toggle = modalElement()?.querySelector('[data-action="toggle-read"]');
  if (toggle) toggle.textContent = isRead ? "Mark as new" : "Mark as read";
}

const findMessage = (element) => inbox.messages.find((item) => item.id === Number(element.dataset.id));

registerActions({
  "inbox-status": (button) => {
    inbox.status = button.dataset.status;
    document.querySelectorAll('[data-action="inbox-status"]').forEach((tab) => tab.classList.toggle("active", tab === button));
    return loadMessages();
  },

  "open-message": async (element) => {
    const message = findMessage(element);
    if (!message) return;
    openMessageWindow(message);
    await setRead(message, true);
  },

  "toggle-read": async (button) => {
    const message = findMessage(button);
    if (message) await setRead(message, !message.is_read);
  },

  "delete-message": (button) => {
    const id = Number(button.dataset.id);
    confirmDialog({
      title: "Delete this message?",
      text: "It will be removed for good. This can't be undone.",
      button: "Delete",
      onConfirm: async () => {
        const result = await api(`/api/admin/messages/${id}`, { method: "DELETE" });
        setUnread(result.counts.unread);
        toast("Message deleted.");
        if (session.page === "messages") await loadMessages();
        else await go(session.page);
      },
    });
  },

  "mark-all-read": () =>
    confirmDialog({
      title: "Mark everything as read?",
      text: "All new messages will be marked as read.",
      button: "Mark all read",
      danger: false,
      onConfirm: async () => {
        const result = await api("/api/admin/messages/read-all", { method: "PATCH" });
        setUnread(result.counts.unread);
        toast("All messages marked as read.");
        await loadMessages();
      },
    }),

  // From the Overview: "New messages" card → Inbox filtered to new ones.
  "open-inbox": (element) => {
    inbox.status = element.dataset.status || "all";
    inbox.search = "";
    closeModal();
    go("messages");
  },
});
