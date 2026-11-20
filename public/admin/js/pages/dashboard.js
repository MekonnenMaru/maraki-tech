// Overview: key numbers, visits chart, Google Ads launch checklist, latest leads.
import { api } from "../core/api.js";
import { esc, plural } from "../core/util.js";
import { icon } from "../core/icons.js";
import { rangePicker, rangeQuery, rangeLabel, isAllTime, nairobiNow } from "../core/date-range.js";
import { view, setUnread, session } from "../core/shell.js";
import { LISTS } from "../config/lists.js";
import { messagesTable, rememberMessages } from "./messages.js";

function greeting() {
  const hour = nairobiNow().hour;
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/* ---------- Number cards ---------- */

function statCard({ label, value, iconName, action = "", tone = "", extra = "" }) {
  const tag = action ? "button" : "div";
  return `
    <${tag} class="stat ${tone}" ${action}${action ? ' type="button"' : ""}>
      <span class="stat-icon">${icon(iconName)}</span>
      <span class="stat-label">${esc(label)}</span>
      <strong class="stat-value" ${extra}>${esc(value)}</strong>
    </${tag}>
  `;
}

/* ---------- Visits chart ---------- */

function visitsChart(series, pending) {
  if (pending) return '<p class="muted">Choose a start and end date.</p>';
  if (!series.length) return '<p class="muted">No visits yet.</p>';
  const max = Math.max(1, ...series.map((point) => point.count));
  return `
    <div class="chart ${series.length > 14 ? "dense" : ""}" style="--bars:${series.length}">
      ${series.map((point) => `
        <div class="chart-bar" title="${esc(point.label)}: ${point.count}">
          <span class="chart-value">${point.count}</span>
          <i style="height:${point.count ? Math.max(6, Math.round((point.count / max) * 100)) : 0}%"></i>
          <span class="chart-label">${esc(point.label)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

/* ---------- Google Ads launch checklist ---------- */

function checklist(s) {
  const placeholderPhone = /900\s*000\s*000/.test(s.phone || "");
  const items = [
    {
      done: !!(s.google_ads_id && s.google_ads_conversion_label),
      title: "Google Ads conversion tracking",
      hint: "Paste the Ads ID and conversion label so leads count as conversions.",
      page: "content",
    },
    {
      done: !!s.ga4_measurement_id,
      title: "Google Analytics 4",
      hint: "Paste your GA4 measurement ID to see traffic.",
      page: "content",
    },
    {
      done: !session.mustChange,
      title: "Admin password changed",
      hint: "You're still using the default password.",
      page: "account",
    },
    {
      done: !!s.phone && !placeholderPhone,
      title: "Real phone number",
      hint: "The phone number is still the sample one.",
      page: "content",
    },
    {
      done: !/\.gif(\?|$)/i.test(s.hero_image || "") && !/giphy\.com/i.test(s.hero_image || ""),
      title: "Fast hero image (JPG/PNG/WebP)",
      hint: "GIFs load slowly and can't be used as the link preview.",
      page: "content",
    },
    {
      done: s.show_apps !== "1",
      title: "Gambling apps hidden",
      hint: "Google restricts gambling ads. Hide Entertainment on the advertised page.",
      page: "content",
    },
    {
      done: s.show_testimonials !== "1" && s.show_team !== "1",
      title: "Testimonials and team are real",
      hint: "They're visible — make sure every name and quote is real.",
      page: "testimonials",
      warnOnly: true,
    },
  ];
  const doneCount = items.filter((item) => item.done).length;

  return `
    <section class="card">
      <div class="card-head">
        <div>
          <h3>Ready for Google Ads</h3>
          <p class="muted">${doneCount} of ${items.length} done</p>
        </div>
        <div class="progress-ring" style="--p:${Math.round((doneCount / items.length) * 100)}">
          <span>${Math.round((doneCount / items.length) * 100)}%</span>
        </div>
      </div>
      <ul class="checklist">
        ${items.map((item) => `
          <li class="${item.done ? "done" : item.warnOnly ? "warn" : "todo"}">
            <span class="check-dot">${icon(item.done ? "check" : "alert")}</span>
            <div>
              <strong>${esc(item.title)}</strong>
              ${item.done ? "" : `<small>${esc(item.hint)}</small>`}
            </div>
            ${item.done ? "" : `<button class="btn small ghost" type="button" data-action="go" data-page="${item.page}">Fix</button>`}
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

/* ---------- Content shortcuts ---------- */

function shortcuts(counts) {
  const ids = ["services", "products", "stats", "process", "faqs", "technologies", "team", "testimonials", "pricing", "socials", "apps"];
  return `
    <section class="card">
      <div class="card-head"><h3>Website content</h3>
        <button class="btn small ghost" type="button" data-action="go" data-page="content">${icon("settings")}Site settings</button>
      </div>
      <div class="shortcuts">
        ${ids.map((id) => `
          <button type="button" class="shortcut" data-action="go" data-page="${id}">
            ${icon(LISTS[id].icon)}
            <span>${esc(LISTS[id].title)}</span>
            <b>${counts[id] ?? 0}</b>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

/* ---------- Page ---------- */

export async function renderDashboard() {
  const range = rangeQuery();
  const query = range && !range.pending ? `?${new URLSearchParams(range)}` : "";
  const data = await api(`/api/admin/dashboard${query}`);
  const unread = data.messages.unread;
  setUnread(unread);
  rememberMessages(data.recent);

  const periodLabel = isAllTime() ? "last 7 days" : rangeLabel().toLowerCase();

  view().innerHTML = `
    <div class="page-head">
      <div>
        <h2>${greeting()}, ${esc(session.username)}</h2>
        <p class="muted">${unread ? `You have ${plural(unread, "new message")}.` : "You're all caught up."}</p>
      </div>
      ${rangePicker(renderDashboard)}
    </div>

    <div class="stats">
      ${statCard({ label: `Visits · ${periodLabel}`, value: data.visits.week, iconName: "visits" })}
      ${statCard({ label: "Visits · all time", value: data.visits.total, iconName: "chart" })}
      ${statCard({ label: "New messages", value: unread, iconName: "mail", tone: unread ? "highlight" : "", action: 'data-action="open-inbox" data-status="unread"', extra: "data-unread-stat" })}
      ${statCard({ label: "All messages", value: data.messages.total, iconName: "inbox", action: 'data-action="open-inbox" data-status="all"' })}
    </div>

    <div class="grid-2">
      <section class="card chart-card">
        <div class="card-head">
          <div>
            <h3>Visits</h3>
            <p class="muted">${esc(isAllTime() ? "Last 7 days" : rangeLabel())}</p>
          </div>
        </div>
        ${visitsChart(data.visits.series, range?.pending)}
      </section>
      ${checklist(data.settings || {})}
    </div>

    <section class="card">
      <div class="card-head">
        <h3>Latest messages</h3>
        <button class="btn small ghost" type="button" data-action="open-inbox" data-status="all">Open inbox</button>
      </div>
      ${range?.pending
        ? '<p class="muted">Choose a start and end date.</p>'
        : data.recent.length
          ? messagesTable(data.recent)
          : '<p class="muted">No messages in this period.</p>'}
    </section>

    ${shortcuts(data.counts)}
  `;
}
