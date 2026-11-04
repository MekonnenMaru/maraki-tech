(function () {
  "use strict";

  const TITLES = {
    dashboard: "Overview",
    messages: "Messages",
    content: "Site content",
    stats: "Stats",
    services: "Services",
    products: "Products",
    apps: "Entertainment",
    process: "Process",
    team: "Team",
    testimonials: "Testimonials",
    pricing: "Pricing",
    technologies: "Technology",
    faqs: "FAQ",
    account: "Password",
  };

  const text = (key, label, extra) => ({ key, label, type: "text", ...extra });
  const area = (key, label) => ({ key, label, type: "textarea", wide: true });
  const lines = (key, label) => ({ key, label, type: "lines", wide: true });
  const toggle = (key, label) => ({ key, label, type: "toggle" });
  const choice = (key, label, options) => ({ key, label, type: "choice", options });

  const PAGES = {
    stats: {
      title: "Stats",
      blurb: "The numbers under the hero. The suffix is what comes after the number, such as + or %.",
      noun: "stat",
      fields: [text("value", "Number", { type: "int", required: true }), text("suffix", "Suffix"), text("label", "Label", { required: true }), toggle("visible", "Visible on the site")],
    },
    services: {
      title: "Services",
      blurb: "The three cards in What we do. Icons can be an emoji or a short symbol.",
      noun: "service",
      fields: [text("icon", "Icon"), text("title", "Title", { required: true }), { ...area("description", "Description"), required: true }, toggle("visible", "Visible on the site")],
    },
    apps: {
      title: "Entertainment",
      blurb: "Group each one under Bingo, Keno, or Spin. Bingo can have several layouts, and a Telegram edition.",
      noun: "app",
      fields: [
        choice("family", "Group", [["bingo", "Bingo"], ["keno", "Keno"], ["spin", "Spin"]]),
        text("name", "Name", { required: true, placeholder: "Ethiomark Bingo" }),
        text("edition", "Edition", { placeholder: "Normal or Super" }),
        choice("channel", "Where it runs", [["both", "Online & Offline"], ["online", "Online"], ["offline", "Offline"], ["telegram", "Telegram"]]),
        text("tagline", "Tagline", { placeholder: "Its own layout", wide: true }),
        area("description", "Description"),
        { key: "photos", label: "Photos", type: "gallery" },
        { key: "video", label: "Video", type: "video", placeholder: "Upload, or paste a YouTube link" },
        text("link", "Link", { placeholder: "https://", wide: true }),
        toggle("visible", "Visible on the site"),
      ],
    },
    products: {
      title: "Products",
      blurb: "Product cards. Leave the link empty to keep the card from navigating away.",
      noun: "product",
      fields: [text("title", "Title", { required: true }), { ...area("description", "Description"), required: true }, text("link", "Link", { placeholder: "https:// or #contact" }), toggle("visible", "Visible on the site")],
    },
    process: {
      title: "Process",
      blurb: "The steps under How we work. Order them the way a project actually moves.",
      noun: "step",
      fields: [text("title", "Title", { required: true }), { ...area("description", "Description"), required: true }, toggle("visible", "Visible on the site")],
    },
    team: {
      title: "Team",
      blurb: "People on the team section. A photo replaces the initial when you add one.",
      noun: "person",
      fields: [text("name", "Name", { required: true }), text("role", "Role", { required: true }), { ...area("bio", "Bio"), required: true }, lines("skills", "Skills"), text("avatar_letter", "Initial"), text("avatar_image", "Photo", { type: "image" }), toggle("visible", "Visible on the site")],
    },
    testimonials: {
      title: "Testimonials",
      blurb: "Short quotes from clients. Keep them specific.",
      noun: "testimonial",
      fields: [{ ...area("quote", "Quote"), required: true }, text("name", "Name", { required: true }), text("company", "Company"), text("avatar_letter", "Initial"), text("avatar_image", "Photo", { type: "image" }), toggle("visible", "Visible on the site")],
    },
    pricing: {
      title: "Pricing",
      blurb: "Plans are saved here even while the section is hidden. Turn Pricing on under Site content to publish them.",
      noun: "plan",
      fields: [text("name", "Name", { required: true }), text("amount", "Price", { required: true }), text("period", "Period", { placeholder: "/project" }), area("description", "Description"), lines("features", "Features"), text("badge", "Badge"), text("button_text", "Button"), toggle("featured", "Highlight this plan"), toggle("visible", "Visible on the site")],
    },
    technologies: {
      title: "Technology",
      blurb: "The chips in the technology section.",
      noun: "technology",
      fields: [text("name", "Name", { required: true }), toggle("visible", "Visible on the site")],
    },
    faqs: {
      title: "FAQ",
      blurb: "Questions and answers. The first one people should see goes at the top.",
      noun: "question",
      fields: [text("question", "Question", { required: true, wide: true }), { ...area("answer", "Answer"), required: true }, toggle("visible", "Visible on the site")],
    },
  };

  const state = {
    page: "dashboard",
    username: "",
    mustChange: false,
    items: [],
    schema: null,
    busy: false,
    editorId: null,
    onConfirm: null,
  };

  const inbox = { status: "all", q: "", selected: null, items: [], timer: null };
  const range = { preset: "all", from: "", to: "" };

  const RANGE_OPTIONS = [
    ["all", "All time"],
    ["today", "Today"],
    ["yesterday", "Yesterday"],
    ["this-week", "This week"],
    ["last-week", "Last week"],
    ["this-month", "This month"],
    ["last-month", "Last month"],
    ["this-year", "This year"],
    ["last-year", "Last year"],
    ["custom", "Custom"],
  ];

  const view = document.getElementById("view");
  const modalRoot = document.getElementById("modalRoot");

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clip(value, max = 140) {
    const textValue = String(value || "").replace(/\s+/g, " ").trim();
    return textValue.length > max ? `${textValue.slice(0, max - 1)}…` : textValue;
  }

  function previewSrc(value) {
    const url = String(value || "");
    if (url.startsWith("/uploads/") && !url.includes("..")) return url;
    if (/^https?:\/\//i.test(url)) return url;
    return "";
  }

  async function api(url, options = {}) {
    const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
    const response = await fetch(url, { credentials: "same-origin", ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && !url.endsWith("/login")) {
      showLogin();
      throw new Error(data.error || "Please sign in.");
    }
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  async function uploadFile(file, kind = "image") {
    const body = new FormData();
    body.append(kind === "video" ? "video" : "image", file);
    const endpoint = kind === "video" ? "/api/admin/upload/video" : "/api/admin/upload";
    const response = await fetch(endpoint, { method: "POST", body, credentials: "same-origin" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Upload failed.");
    return data.url;
  }

  function toast(message, type) {
    const node = document.createElement("div");
    node.className = `toast${type === "err" ? " err" : ""}`;
    node.textContent = message;
    document.getElementById("toastRoot").appendChild(node);
    requestAnimationFrame(() => node.classList.add("show"));
    setTimeout(() => {
      node.classList.remove("show");
      setTimeout(() => node.remove(), 250);
    }, 2800);
  }

  const groupStorageKey = "maraki-nav-groups-v2";

  function saveGroups() {
    const collapsed = [...document.querySelectorAll(".nav-group.collapsed")].map((group) => group.dataset.group);
    localStorage.setItem(groupStorageKey, JSON.stringify(collapsed));
  }

  function restoreGroups() {
    const saved = localStorage.getItem(groupStorageKey);
    if (saved == null) return;
    let collapsed = [];
    try {
      collapsed = JSON.parse(saved);
    } catch (err) {
      return;
    }
    if (!Array.isArray(collapsed)) return;
    document.querySelectorAll(".nav-group").forEach((group) => {
      const isCollapsed = collapsed.includes(group.dataset.group);
      group.classList.toggle("collapsed", isCollapsed);
      const toggle = group.querySelector(".nav-group-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    });
  }

  function setGroupCollapsed(group, collapsed) {
    group.classList.toggle("collapsed", collapsed);
    const toggle = group.querySelector(".nav-group-toggle");
    if (toggle) toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  function setUnread(count) {
    [document.getElementById("msgBadge"), document.getElementById("groupMsgBadge")].forEach((badge) => {
      if (!badge) return;
      badge.hidden = !count;
      badge.textContent = String(count);
    });
  }

  function paintBanner() {
    document.getElementById("securityBanner").classList.toggle("hidden", !state.mustChange);
  }

  function closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("backdrop").classList.remove("show");
  }

  function showLogin() {
    document.getElementById("boot").classList.add("hidden");
    document.getElementById("appView").classList.add("hidden");
    document.getElementById("loginView").classList.remove("hidden");
  }

  function showApp() {
    document.getElementById("boot").classList.add("hidden");
    document.getElementById("loginView").classList.add("hidden");
    document.getElementById("appView").classList.remove("hidden");
    document.getElementById("who").textContent = state.username;
    paintBanner();
    go(state.page || "dashboard");
  }

  function markNav() {
    document.querySelectorAll(".side-nav [data-page]").forEach((button) => {
      const active = button.dataset.page === state.page;
      button.classList.toggle("active", active);
      if (!active) return;
      const group = button.closest(".nav-group");
      if (group && group.classList.contains("collapsed")) {
        setGroupCollapsed(group, false);
        saveGroups();
      }
    });
    document.getElementById("viewTitle").textContent = TITLES[state.page] || "Admin";
  }

  function go(pageName) {
    state.page = pageName;
    markNav();
    closeSidebar();
    renderPage(pageName);
  }

  async function renderPage(pageName) {
    try {
      if (pageName === "dashboard") return await renderDashboard();
      if (pageName === "content") return await renderSettings();
      if (pageName === "messages") return await renderMessages();
      if (pageName === "account") return renderAccount();
      if (PAGES[pageName]) return await renderCollection(pageName);
      view.innerHTML = "";
    } catch (err) {
      view.innerHTML = `<section class="card"><h2>This page didn't load.</h2><p class="muted">${esc(err.message)}</p></section>`;
      toast(err.message, "err");
    }
  }

  function greeting() {
    const hour = nairobiParts().hour;
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function weekday(day) {
    const parts = parseDateParts(day);
    if (!parts) return day;
    return nairobiMidnight(parts).toLocaleDateString("en-US", { timeZone: ZONE, weekday: "short" });
  }

  const ZONE = "Africa/Nairobi";
  const WEEKDAY = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

  function nairobiParts(date = new Date()) {
    const bag = {};
    new Intl.DateTimeFormat("en-US", {
      timeZone: ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).forEach((part) => {
      bag[part.type] = part.value;
    });
    return {
      year: Number(bag.year),
      month: Number(bag.month),
      day: Number(bag.day),
      hour: Number(bag.hour),
      weekday: bag.weekday,
    };
  }

  function shiftDate(parts, days) {
    const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
    return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
  }

  function nairobiMidnight(parts) {
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - 3 * 60 * 60 * 1000);
  }

  function daySpan(start, endExclusive) {
    return { from: nairobiMidnight(start), to: nairobiMidnight(endExclusive) };
  }

  function parseDateParts(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").slice(0, 10));
    if (!match) return null;
    const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    if (check.getUTCFullYear() !== parts.year || check.getUTCMonth() + 1 !== parts.month || check.getUTCDate() !== parts.day) return null;
    return parts;
  }

  function dateStamp(parts) {
    return parts.year * 10000 + parts.month * 100 + parts.day;
  }

  function todayStamp() {
    const today = nairobiParts();
    return `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
  }

  function formatDay(parts) {
    return nairobiMidnight(parts).toLocaleDateString("en-US", { timeZone: ZONE, month: "short", day: "numeric" });
  }

  function rangeBounds() {
    const today = nairobiParts();
    if (range.preset === "today") return daySpan(today, shiftDate(today, 1));
    if (range.preset === "yesterday") return daySpan(shiftDate(today, -1), today);
    if (range.preset === "this-week") {
      const start = shiftDate(today, -WEEKDAY[today.weekday]);
      return daySpan(start, shiftDate(start, 7));
    }
    if (range.preset === "last-week") {
      const start = shiftDate(today, -WEEKDAY[today.weekday] - 7);
      return daySpan(start, shiftDate(start, 7));
    }
    if (range.preset === "this-month") {
      return daySpan({ year: today.year, month: today.month, day: 1 }, { year: today.year, month: today.month + 1, day: 1 });
    }
    if (range.preset === "last-month") {
      return daySpan({ year: today.year, month: today.month - 1, day: 1 }, { year: today.year, month: today.month, day: 1 });
    }
    if (range.preset === "this-year") {
      return daySpan({ year: today.year, month: 1, day: 1 }, { year: today.year + 1, month: 1, day: 1 });
    }
    if (range.preset === "last-year") {
      return daySpan({ year: today.year - 1, month: 1, day: 1 }, { year: today.year, month: 1, day: 1 });
    }
    if (range.preset === "custom") {
      const from = parseDateParts(range.from);
      const to = parseDateParts(range.to);
      if (!from || !to) return { pending: true };
      if (dateStamp(to) < dateStamp(from)) return { pending: true };
      return daySpan(from, shiftDate(to, 1));
    }
    return null;
  }

  function rangeParams() {
    const bounds = rangeBounds();
    if (!bounds || bounds.pending) return bounds;
    return { from: bounds.from.toISOString(), to: bounds.to.toISOString() };
  }

  function rangeLabel() {
    const found = RANGE_OPTIONS.find(([value]) => value === range.preset);
    return found ? found[1] : "All time";
  }

  function rangeControls(prefix) {
    const from = parseDateParts(range.from);
    const to = parseDateParts(range.to);
    const summary = range.preset === "custom" && from && to
      ? `<button class="range-note" type="button" id="${prefix}Edit">${esc(dateStamp(from) === dateStamp(to) ? formatDay(from) : `${formatDay(from)} – ${formatDay(to)}`)}</button>`
      : "";
    return `
      <div class="range-controls" id="${prefix}Range">
        <label class="range-field">
          <span>Date</span>
          <select id="${prefix}Preset" class="range-select">
            ${RANGE_OPTIONS.map(([value, label]) => `<option value="${value}" ${value === range.preset ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        ${summary}
      </div>
    `;
  }

  function resetCustomSelect() {
    ["dashPreset", "msgPreset"].forEach((id) => {
      const select = document.getElementById(id);
      if (select) select.value = range.preset;
    });
  }

  function openCustomRange() {
    modalRoot.innerHTML = `
      <div class="modal-back">
        <form class="modal-card mini" id="customRangeForm">
          <h3>Custom range</h3>
          <p>Pick the dates. Each day runs from midnight through the end of that day, East Africa Time.</p>
          <label class="field"><span>From</span><input type="date" name="from" value="${esc((range.from || todayStamp()).slice(0, 10))}" required></label>
          <label class="field"><span>To</span><input type="date" name="to" value="${esc((range.to || todayStamp()).slice(0, 10))}" required></label>
          <p class="modal-error"></p>
          <div class="modal-actions">
            <button class="btn ghost" type="button" data-cancel>Cancel</button>
            <button class="btn primary" type="submit">Apply</button>
          </div>
        </form>
      </div>
    `;
    const input = modalRoot.querySelector("[name=from]");
    if (input) input.focus();
  }

  function syncRange(prefix, reload) {
    const node = document.getElementById(`${prefix}Range`);
    if (!node) return;
    node.outerHTML = rangeControls(prefix);
    bindRange(prefix, reload);
  }

  function bindRange(prefix, reload) {
    const select = document.getElementById(`${prefix}Preset`);
    const edit = document.getElementById(`${prefix}Edit`);
    if (!select) return;
    range.reload = reload;
    select.addEventListener("change", () => {
      if (select.value === "custom") {
        openCustomRange();
        return;
      }
      range.preset = select.value;
      syncRange(prefix, reload);
      reload();
    });
    if (edit) edit.addEventListener("click", () => openCustomRange());
  }

  function when(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-US", {
      timeZone: ZONE,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function renderDashboard() {
    view.innerHTML = `<p class="muted">Loading overview…</p>`;
    const bounds = rangeParams();
    const query = bounds && bounds.from ? `?${new URLSearchParams({ from: bounds.from, to: bounds.to })}` : "";
    const data = await api(`/api/admin/dashboard${query}`);
    setUnread(data.messages.unread);
    const max = Math.max(1, ...data.visits.series.map((item) => item.count));
    inbox.items = data.recent;
    const links = [
      ["content", "Site content"],
      ["stats", "Stats"],
      ["services", "Services"],
      ["products", "Products"],
      ["apps", "Entertainment"],
      ["process", "Process"],
      ["team", "Team"],
      ["testimonials", "Testimonials"],
      ["pricing", "Pricing"],
      ["technologies", "Technology"],
      ["faqs", "FAQ"],
    ];
    const unread = data.messages.unread;
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h2>${greeting()}</h2>
          <p class="muted">${unread ? `${unread} unread message${unread === 1 ? "" : "s"}.` : "No unread messages."} Edits show on the public site after a refresh.</p>
        </div>
        ${rangeControls("dash")}
      </div>
      <div class="stat-grid">
        <article class="stat-card"><span>${range.preset === "all" ? "Visits, 7 days" : `Visits, ${rangeLabel().toLowerCase()}`}</span><strong>${data.visits.week}</strong></article>
        <article class="stat-card"><span>Visits, all time</span><strong>${data.visits.total}</strong></article>
        <button class="stat-card" type="button" data-action="inbox" data-status="unread"><span>Unread messages</span><strong data-unread-count>${unread}</strong></button>
        <button class="stat-card" type="button" data-action="inbox" data-status="all"><span>Messages</span><strong>${data.messages.total}</strong></button>
      </div>
      <div class="overview-grid">
        <section class="card">
          <h3>Visits · ${esc(range.preset === "all" ? "Last 7 days" : rangeLabel())}</h3>
          ${bounds && bounds.pending ? `<p class="muted">Choose a start and end date.</p>` : ""}
          <div class="bars" style="grid-template-columns: repeat(${Math.max(data.visits.series.length, 1)}, minmax(0, 1fr))">
            ${data.visits.series.map((item) => `
              <div class="bar">
                <b>${item.count}</b>
                <i style="height:${item.count ? Math.max(8, Math.round((item.count / max) * 100)) : 0}%"></i>
                <em>${esc(item.label || weekday(item.day))}</em>
              </div>
            `).join("")}
          </div>
        </section>
        <section class="card">
          <h3>Content</h3>
          <div class="tiles">
            ${links.map(([key, label]) => `
              <button type="button" data-action="goto" data-target="${key}">
                <span>${esc(label)}</span>
                ${key === "content" ? "" : `<strong>${data.counts[key] || 0}</strong>`}
              </button>
            `).join("")}
          </div>
        </section>
      </div>
      <section class="card">
        <div class="section-head">
          <h3>Latest messages</h3>
          <button class="btn ghost" type="button" data-action="goto" data-target="messages">All messages</button>
        </div>
        ${bounds && bounds.pending ? `<p class="empty">Choose a start and end date.</p>` : data.recent.length ? `<div class="table-wrap flat"><table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Received</th>
              <th>Status</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.recent.map((message) => `
              <tr data-id="${message.id}" class="${message.is_read ? "" : "is-unread"}">
                <td>${esc(message.name)}${message.company ? `<small>${esc(message.company)}</small>` : ""}</td>
                <td>${message.service ? esc(message.service) : "—"}</td>
                <td>${esc(when(message.created_at))}</td>
                <td data-status>${readPill(message.is_read)}</td>
                <td class="col-actions">
                  <div class="row-actions">
                    <button class="text-btn" type="button" data-action="view-message" data-id="${message.id}">View</button>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table></div>` : `<p class="empty">No messages in this range.</p>`}
      </section>
    `;
    bindRange("dash", () => renderDashboard());
  }

  async function renderSettings() {
    view.innerHTML = `<p class="muted">Loading site content…</p>`;
    const [settings, schema] = await Promise.all([
      api("/api/admin/settings"),
      state.schema ? Promise.resolve(state.schema) : api("/api/admin/schema"),
    ]);
    state.schema = schema;
    view.innerHTML = `
      <form id="settingsForm">
        <div class="page-head">
          <div>
            <h2>Site content</h2>
            <p class="muted">Words, links, images, and which sections are on the page. Use {highlight} in a title to color those words.</p>
          </div>
        </div>
        <div class="jumps">
          ${schema.groups.map((group) => `<button type="button" data-action="jump" data-jump="set-${esc(group.id)}">${esc(group.title)}</button>`).join("")}
        </div>
        ${schema.groups.map((group) => settingsGroup(group, settings)).join("")}
        <div class="savebar"><button class="btn primary" type="submit">Save changes</button></div>
      </form>
    `;
  }

  function settingsGroup(group, settings) {
    const toggles = group.fields.filter((field) => field.type === "toggle");
    const rest = group.fields.filter((field) => field.type !== "toggle");
    return `
      <section class="card set-card" id="set-${esc(group.id)}">
        <h3>${esc(group.title)}</h3>
        ${group.intro ? `<p class="muted">${esc(group.intro)}</p>` : ""}
        ${toggles.length ? `<div class="toggle-grid">${toggles.map((field) => settingsControl(field, settings)).join("")}</div>` : ""}
        ${rest.length ? `<div class="form-grid">${rest.map((field) => settingsControl(field, settings)).join("")}</div>` : ""}
      </section>
    `;
  }

  function settingsControl(field, settings) {
    const value = settings[field.key] ?? "";
    const hint = field.hint ? `<small>${esc(field.hint)}</small>` : "";
    if (field.type === "toggle") {
      return `<label class="check"><input type="checkbox" name="${esc(field.key)}" ${value === "1" ? "checked" : ""}><span>${esc(field.label)}</span></label>`;
    }
    if (field.type === "textarea") {
      return `<label class="field wide"><span>${esc(field.label)}</span><textarea name="${esc(field.key)}" rows="4">${esc(value)}</textarea>${hint}</label>`;
    }
    if (field.type === "image") {
      const src = previewSrc(value);
      return `<div class="field wide"><span>${esc(field.label)}</span>
        <img class="thumb" data-preview="${esc(field.key)}" alt="" src="${esc(src)}" ${src ? "" : "hidden"}>
        <div class="upload-line">
          <input name="${esc(field.key)}" value="${esc(value)}" placeholder="https:// or /uploads/…">
          <label class="file-btn">Upload<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-upload="${esc(field.key)}" hidden></label>
        </div>
      </div>`;
    }
    const wide = /title|text|description|href|url|blurb|email|highlight/.test(field.key) ? " wide" : "";
    return `<label class="field${wide}"><span>${esc(field.label)}</span><input name="${esc(field.key)}" value="${esc(value)}" placeholder="${esc(field.placeholder || "")}">${hint}</label>`;
  }

  async function saveSettings(form) {
    const payload = {};
    state.schema.groups.forEach((group) => {
      group.fields.forEach((field) => {
        const input = form.elements[field.key];
        payload[field.key] = field.type === "toggle" ? (input.checked ? "1" : "0") : input.value.trim();
      });
    });
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    try {
      await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(payload) });
      toast("Saved. Refresh the public site to see it.");
    } finally {
      button.disabled = false;
    }
  }

  function itemTitle(item) {
    return item.label || item.title || item.name || item.question || "Untitled";
  }

  function itemDetail(pageName, item) {
    if (pageName === "stats") return `${item.value}${item.suffix || ""}`;
    if (pageName === "team") return item.role;
    if (pageName === "testimonials") return item.company || clip(item.quote, 80);
    if (pageName === "pricing") return `${item.amount || ""}${item.period || ""}`;
    if (pageName === "faqs") return clip(item.answer, 120);
    if (pageName === "technologies") return "";
    if (pageName === "apps") {
      const group = { bingo: "Bingo", keno: "Keno", spin: "Spin" }[item.family] || "Bingo";
      const where = { both: "Online & Offline", online: "Online", offline: "Offline", telegram: "Telegram" }[item.channel] || "Online & Offline";
      return [group, item.edition ? `${where} · ${item.edition}` : where].join(" · ");
    }
    return clip(item.description || item.bio || "");
  }

  async function renderCollection(pageName) {
    const spec = PAGES[pageName];
    view.innerHTML = `<p class="muted">Loading ${esc(spec.title.toLowerCase())}…</p>`;
    state.items = await api(`/api/admin/${pageName}`);
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h2>${esc(spec.title)}</h2>
          <p class="muted">${esc(spec.blurb)}</p>
        </div>
        <button class="btn primary" type="button" data-action="add">Add ${esc(spec.noun)}</button>
      </div>
      ${state.items.length ? `<div class="table-wrap"><table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            <th>Details</th>
            <th>Status</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.items.map((item, index) => `
            <tr class="${item.visible === false ? "hidden-item" : ""}">
              <td>${index + 1}</td>
              <td>${esc(itemTitle(item))}</td>
              <td class="clip-cell">${esc(itemDetail(pageName, item) || "—")}</td>
              <td>${statusPills(item)}</td>
              <td class="col-actions">
                <div class="row-actions">
                  <button class="text-btn" type="button" data-action="view" data-id="${item.id}">View</button>
                  <button class="text-btn" type="button" data-action="edit" data-id="${item.id}">Edit</button>
                  <button class="text-btn danger" type="button" data-action="delete" data-id="${item.id}">Delete</button>
                  <button class="text-btn" type="button" data-action="up" data-index="${index}" ${index === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
                  <button class="text-btn" type="button" data-action="down" data-index="${index}" ${index === state.items.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table></div>` : `<div class="card empty">Nothing here yet. Add the first ${esc(spec.noun)}.</div>`}
    `;
  }

  function statusPills(item) {
    const pills = [];
    if (item.visible === false) pills.push('<span class="pill warn">Hidden</span>');
    else if (item.visible) pills.push('<span class="pill">Visible</span>');
    if (item.featured) pills.push('<span class="pill">Featured</span>');
    return pills.join(" ") || "—";
  }

  function fieldReadout(field, item) {
    const value = item[field.key];
    if (field.type === "toggle") return value ? "Yes" : "No";
    if (field.type === "choice") {
      const match = (field.options || []).find((option) => option[0] === value);
      return esc(match ? match[1] : value || "—");
    }
    if (field.type === "lines") {
      const list = Array.isArray(value) ? value : [];
      return list.length ? list.map((line) => esc(line)).join("<br>") : "—";
    }
    if (field.type === "image") {
      const src = previewSrc(value);
      return src ? `<img class="thumb" alt="" src="${esc(src)}">` : "—";
    }
    if (field.type === "gallery") {
      const list = Array.isArray(value) ? value : [];
      return list.length ? `<div class="gallery-grid">${list.map((url) => `<img class="thumb" alt="" src="${esc(previewSrc(url))}">`).join("")}</div>` : "—";
    }
    if (field.type === "video") return value ? esc(value) : "—";
    const textValue = String(value ?? "").trim();
    return textValue ? esc(textValue) : "—";
  }

  function openViewer(item) {
    const spec = PAGES[state.page];
    if (!spec || !item) return;
    modalRoot.innerHTML = `
      <div class="modal-back">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="viewerTitle">
          <h3 id="viewerTitle">${esc(itemTitle(item))}</h3>
          <dl class="view-fields">
            ${spec.fields.map((field) => `
              <div>
                <dt>${esc(field.label)}</dt>
                <dd>${fieldReadout(field, item)}</dd>
              </div>
            `).join("")}
          </dl>
          <div class="modal-actions">
            <button class="btn ghost" type="button" data-cancel>Close</button>
            <button class="btn ghost" type="button" data-modal-action="edit-item" data-id="${item.id}">Edit</button>
            <button class="btn danger" type="button" data-modal-action="delete-item" data-id="${item.id}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  function fieldValue(field, item) {
    if (!item) {
      if (field.type === "toggle") return field.key !== "featured";
      if (field.key === "suffix") return "+";
      if (field.key === "button_text") return "Get Started";
      if (field.type === "lines" || field.type === "gallery") return [];
      return "";
    }
    return item[field.key];
  }

  function controlHtml(field, item) {
    const value = fieldValue(field, item);
    if (field.type === "toggle") {
      return `<label class="check"><input type="checkbox" name="${esc(field.key)}" ${value ? "checked" : ""}><span>${esc(field.label)}</span></label>`;
    }
    if (field.type === "choice") {
      const current = value || field.options[0][0];
      return `<label class="field"><span>${esc(field.label)}</span><select name="${esc(field.key)}">${field.options.map(([option, label]) => `<option value="${esc(option)}" ${option === current ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label>`;
    }
    if (field.type === "lines") {
      const textValue = Array.isArray(value) ? value.join("\n") : "";
      return `<label class="field wide"><span>${esc(field.label)}</span><textarea name="${esc(field.key)}" rows="5">${esc(textValue)}</textarea><small>One item per line.</small></label>`;
    }
    if (field.type === "textarea") {
      return `<label class="field wide"><span>${esc(field.label)}</span><textarea name="${esc(field.key)}" rows="4" ${field.required ? "required" : ""}>${esc(value || "")}</textarea></label>`;
    }
    if (field.type === "image") {
      const src = previewSrc(value);
      return `<div class="field wide"><span>${esc(field.label)}</span>
        <img class="thumb" data-preview="${esc(field.key)}" alt="" src="${esc(src)}" ${src ? "" : "hidden"}>
        <div class="upload-line">
          <input name="${esc(field.key)}" value="${esc(value || "")}" placeholder="https:// or upload">
          <label class="file-btn">Upload<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-upload="${esc(field.key)}" hidden></label>
        </div>
      </div>`;
    }
    if (field.type === "gallery") {
      const list = Array.isArray(value) ? value : [];
      return `<div class="field wide gallery-field" data-gallery="${esc(field.key)}">
        <span>${esc(field.label)}</span>
        <input type="hidden" name="${esc(field.key)}" value="${esc(JSON.stringify(list))}">
        <div class="gallery-grid">${galleryThumbs(list)}</div>
        <label class="file-btn">Add photos<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-gallery-upload="${esc(field.key)}" multiple hidden></label>
        <small>Up to 12. They show as a filmstrip on the site.</small>
      </div>`;
    }
    if (field.type === "video") {
      return `<div class="field wide"><span>${esc(field.label)}</span>
        <div class="upload-line">
          <input name="${esc(field.key)}" value="${esc(value || "")}" placeholder="${esc(field.placeholder || "https:// or upload")}">
          <label class="file-btn">Upload<input type="file" accept="video/mp4,video/webm" data-video-upload="${esc(field.key)}" hidden></label>
        </div>
        <small>MP4 or WebM under 40 MB, or a YouTube link.</small>
      </div>`;
    }
    const inputType = field.type === "int" ? "number" : "text";
    return `<label class="field ${field.wide ? "wide" : ""}"><span>${esc(field.label)}</span><input type="${inputType}" name="${esc(field.key)}" value="${esc(value ?? "")}" placeholder="${esc(field.placeholder || "")}" ${field.type === "int" ? 'min="0" step="1"' : ""} ${field.required ? "required" : ""}></label>`;
  }

  function openEditor(item) {
    const spec = PAGES[state.page];
    if (!spec) return;
    state.editorId = item ? item.id : null;
    modalRoot.innerHTML = `
      <div class="modal-back">
        <form class="modal-card" id="editorForm">
          <h3>${item ? "Edit" : "Add"} ${esc(spec.noun)}</h3>
          ${spec.fields.map((field) => controlHtml(field, item)).join("")}
          <p class="modal-error"></p>
          <div class="modal-actions">
            <button class="btn ghost" type="button" data-cancel>Cancel</button>
            <button class="btn primary" type="submit">${item ? "Save" : "Add"}</button>
          </div>
        </form>
      </div>
    `;
    const first = modalRoot.querySelector("input, textarea, select");
    if (first) first.focus();
  }

  function readEditor(form) {
    const body = {};
    PAGES[state.page].fields.forEach((field) => {
      const input = form.elements[field.key];
      if (field.type === "toggle") body[field.key] = input.checked;
      else if (field.type === "gallery") {
        try {
          const parsed = JSON.parse(input.value || "[]");
          body[field.key] = Array.isArray(parsed) ? parsed : [];
        } catch {
          body[field.key] = [];
        }
      }
      else if (field.type === "lines") body[field.key] = input.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      else if (field.type === "int") body[field.key] = Number(input.value);
      else body[field.key] = input.value.trim();
    });
    return body;
  }

  function closeModal() {
    if (modalRoot.querySelector("#customRangeForm")) resetCustomSelect();
    modalRoot.innerHTML = "";
    state.onConfirm = null;
  }

  function confirmDialog({ title, body, confirmLabel, tone = "danger", onConfirm }) {
    state.onConfirm = onConfirm;
    modalRoot.innerHTML = `
      <div class="modal-back">
        <form class="modal-card" id="confirmForm">
          <h3>${esc(title)}</h3>
          <p>${esc(body)}</p>
          <div class="modal-actions">
            <button class="btn ghost" type="button" data-cancel>Cancel</button>
            <button class="btn ${tone === "primary" ? "primary" : "danger"}" type="submit">${esc(confirmLabel)}</button>
          </div>
        </form>
      </div>
    `;
  }

  function askDeleteItem(id) {
    const item = state.items.find((entry) => entry.id === id);
    confirmDialog({
      title: `Delete ${item ? itemTitle(item) : "this item"}?`,
      body: "It will disappear from the public site.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await api(`/api/admin/${state.page}/${id}`, { method: "DELETE" });
        toast("Deleted.");
        await renderCollection(state.page);
      },
    });
  }

  async function moveItem(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= state.items.length) return;
    const ids = state.items.map((item) => item.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    await api(`/api/admin/${state.page}/reorder`, { method: "POST", body: JSON.stringify({ ids }) });
    const y = view.scrollTop;
    await renderCollection(state.page);
    view.scrollTop = y;
  }

  async function renderMessages() {
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Messages</h2>
          <p class="muted">Notes from the contact form. View opens the full note and marks it read.</p>
        </div>
        <button class="btn ghost" type="button" id="markAll">Mark all read</button>
      </div>
      <div class="msg-toolbar">
        <div class="filters" id="msgFilters">
          <button type="button" data-status="all">All</button>
          <button type="button" data-status="unread">Unread</button>
          <button type="button" data-status="read">Read</button>
        </div>
        <input class="search" id="msgSearch" placeholder="Search name, email, or message" value="${esc(inbox.q)}" />
        ${rangeControls("msg")}
      </div>
      <p class="msg-count" id="msgCount"></p>
      <div id="msgTable"></div>
    `;
    document.getElementById("msgSearch").addEventListener("input", (event) => {
      inbox.q = event.target.value;
      clearTimeout(inbox.timer);
      inbox.timer = setTimeout(() => loadMessages(), 220);
    });
    document.getElementById("msgFilters").addEventListener("click", (event) => {
      const button = event.target.closest("[data-status]");
      if (!button) return;
      inbox.status = button.dataset.status;
      loadMessages();
    });
    bindRange("msg", () => loadMessages());
    document.getElementById("markAll").addEventListener("click", () => {
      confirmDialog({
        title: "Mark all messages read?",
        body: "Every unread message will be marked as read.",
        confirmLabel: "Mark all read",
        tone: "primary",
        onConfirm: async () => {
          const result = await api("/api/admin/messages/read-all", { method: "PATCH" });
          setUnread(result.counts.unread);
          toast("All messages marked read.");
          await loadMessages();
        },
      });
    });
    await loadMessages();
  }

  function readPill(isRead) {
    return isRead ? '<span class="pill">Read</span>' : '<span class="pill warn">Unread</span>';
  }

  async function loadMessages() {
    const bounds = rangeParams();
    const table = document.getElementById("msgTable");
    const count = document.getElementById("msgCount");
    if (bounds && bounds.pending) {
      if (count) count.textContent = "Choose a start and end date.";
      if (table) table.innerHTML = `<div class="card empty">Choose a start and end date.</div>`;
      return;
    }
    const params = new URLSearchParams({ status: inbox.status, q: inbox.q });
    if (bounds && bounds.from) {
      params.set("from", bounds.from);
      params.set("to", bounds.to);
    }
    const data = await api(`/api/admin/messages?${params.toString()}`);
    inbox.items = data.messages;
    setUnread(data.counts.unread);
    document.querySelectorAll("#msgFilters button").forEach((button) => {
      button.classList.toggle("active", button.dataset.status === inbox.status);
    });
    if (!table) return;
    if (count) {
      const matched = Number(data.matched) || 0;
      const shown = data.messages.length;
      count.textContent = matched > shown
        ? `Showing the latest ${shown} of ${matched}`
        : `${matched} message${matched === 1 ? "" : "s"}`;
    }
    table.innerHTML = data.messages.length ? `<div class="table-wrap"><table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Category</th>
          <th>Message</th>
          <th>Received</th>
          <th>Status</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${data.messages.map((message) => `
          <tr data-id="${message.id}" class="${message.is_read ? "" : "is-unread"}">
            <td>${esc(message.name)}${message.company ? `<small>${esc(message.company)}</small>` : ""}</td>
            <td>${esc(message.email)}</td>
            <td>${message.service ? esc(message.service) : "—"}</td>
            <td class="clip-cell">${esc(clip(message.message, 80))}</td>
            <td>${esc(when(message.created_at))}</td>
            <td data-status>${readPill(message.is_read)}</td>
            <td class="col-actions">
              <div class="row-actions">
                <button class="text-btn" type="button" data-action="view-message" data-id="${message.id}">View</button>
                <button class="text-btn danger" type="button" data-action="delete-message" data-id="${message.id}">Delete</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table></div>` : `<div class="card empty">No messages in this view.</div>`;
    if (inbox.openOnLoad) {
      const id = inbox.selected;
      inbox.openOnLoad = false;
      if (data.messages.some((message) => message.id === id)) await openMessageModal(id);
    }
  }

  function paintMessageModal(message) {
    modalRoot.innerHTML = `
      <div class="modal-back">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="messageTitle">
          <h3 id="messageTitle">${esc(message.name)}</h3>
          <p class="meta">${esc(message.email)}${message.company ? ` · ${esc(message.company)}` : ""}${message.service ? ` · ${esc(message.service)}` : ""}<br>${esc(when(message.created_at))}</p>
          <p class="msg-body">${esc(message.message)}</p>
          <div class="modal-actions">
            <button class="btn ghost" type="button" data-cancel>Close</button>
            <a class="btn ghost" href="mailto:${esc(message.email)}">Reply</a>
            <button class="btn ghost" type="button" data-modal-action="toggle-read" data-id="${message.id}">${message.is_read ? "Mark unread" : "Mark read"}</button>
            <button class="btn danger" type="button" data-modal-action="delete-message" data-id="${message.id}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  async function setMessageReadState(message, isRead) {
    if (!message || message.is_read === isRead) return;
    const result = await api(`/api/admin/messages/${message.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_read: isRead }),
    });
    message.is_read = isRead;
    setUnread(result.counts.unread);
    const row = document.querySelector(`tr[data-id="${message.id}"]`);
    if (row) {
      row.classList.toggle("is-unread", !isRead);
      const status = row.querySelector("[data-status]");
      if (status) status.innerHTML = readPill(isRead);
    }
    const unreadStat = document.querySelector("[data-unread-count]");
    if (unreadStat) unreadStat.textContent = String(result.counts.unread);
    const toggle = modalRoot.querySelector("[data-modal-action='toggle-read']");
    if (toggle) toggle.textContent = isRead ? "Mark unread" : "Mark read";
  }

  async function openMessageModal(id) {
    const message = inbox.items.find((item) => item.id === id);
    if (!message) return;
    inbox.selected = id;
    paintMessageModal(message);
    if (!message.is_read) await setMessageReadState(message, true);
  }

  function deleteMessage(id) {
    confirmDialog({
      title: "Delete this message?",
      body: "This can't be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        const result = await api(`/api/admin/messages/${id}`, { method: "DELETE" });
        setUnread(result.counts.unread);
        inbox.selected = null;
        toast("Message deleted.");
        if (state.page === "dashboard") await renderDashboard();
        else await loadMessages();
      },
    });
  }

  function renderAccount() {
    view.innerHTML = `
      <div class="page-head">
        <div>
          <h2>Password</h2>
          <p class="muted">Signed in as ${esc(state.username)}. Use at least 8 characters.</p>
        </div>
      </div>
      <form class="card narrow" id="passwordForm">
        <label class="field"><span>Current password</span><input type="password" name="current" autocomplete="current-password" required></label>
        <label class="field"><span>New password</span><input type="password" name="next" autocomplete="new-password" minlength="8" required></label>
        <label class="field"><span>Confirm new password</span><input type="password" name="confirm" autocomplete="new-password" minlength="8" required></label>
        <button class="btn primary" type="submit">Update password</button>
      </form>
    `;
  }

  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("button");
    const error = document.getElementById("loginError");
    error.textContent = "";
    button.disabled = true;
    try {
      const result = await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username: form.username.value.trim(), password: form.password.value }),
      });
      state.username = result.username;
      state.mustChange = result.mustChange;
      state.page = "dashboard";
      form.reset();
      showApp();
    } catch (err) {
      error.textContent = err.message;
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await api("/api/admin/logout", { method: "POST" });
    showLogin();
  });

  document.getElementById("sidebar").addEventListener("click", (event) => {
    const toggle = event.target.closest(".nav-group-toggle");
    if (toggle) {
      const group = toggle.closest(".nav-group");
      setGroupCollapsed(group, !group.classList.contains("collapsed"));
      saveGroups();
      return;
    }
    const button = event.target.closest("[data-page]");
    if (button) go(button.dataset.page);
  });

  document.getElementById("securityBanner").addEventListener("click", (event) => {
    if (event.target.closest("[data-page]")) go("account");
  });

  const themeToggle = document.getElementById("themeToggle");

  function paintTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("maraki-theme", theme);
    if (themeToggle) {
      const next = theme === "dark" ? "light" : "dark";
      themeToggle.textContent = theme === "dark" ? "☀" : "☾";
      themeToggle.setAttribute("aria-label", `Switch to ${next} theme`);
    }
  }

  paintTheme(document.documentElement.dataset.theme || "dark");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      paintTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
    });
  }

  document.getElementById("navToggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("backdrop").classList.add("show");
  });

  document.getElementById("backdrop").addEventListener("click", closeSidebar);

  view.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || state.busy) return;
    const action = button.dataset.action;
    try {
      state.busy = true;
      if (action === "goto") go(button.dataset.target);
      if (action === "inbox") {
        inbox.status = button.dataset.status || "all";
        inbox.q = "";
        inbox.openOnLoad = false;
        go("messages");
      }
      if (action === "open-message") {
        inbox.selected = Number(button.dataset.id);
        inbox.status = "all";
        inbox.q = "";
        inbox.openOnLoad = true;
        go("messages");
      }
      if (action === "view") openViewer(state.items.find((item) => item.id === Number(button.dataset.id)));
      if (action === "view-message") await openMessageModal(Number(button.dataset.id));
      if (action === "delete-message") deleteMessage(Number(button.dataset.id));
      if (action === "jump") {
        const target = document.getElementById(button.dataset.jump);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (action === "add") openEditor(null);
      if (action === "edit") openEditor(state.items.find((item) => item.id === Number(button.dataset.id)));
      if (action === "up") await moveItem(Number(button.dataset.index), -1);
      if (action === "down") await moveItem(Number(button.dataset.index), 1);
      if (action === "delete") askDeleteItem(Number(button.dataset.id));
    } catch (err) {
      toast(err.message, "err");
    } finally {
      state.busy = false;
    }
  });

  view.addEventListener("submit", async (event) => {
    if (event.target.id === "settingsForm") {
      event.preventDefault();
      try {
        await saveSettings(event.target);
      } catch (err) {
        toast(err.message, "err");
      }
    }
    if (event.target.id === "passwordForm") {
      event.preventDefault();
      const form = event.target;
      const nextPassword = form.elements.next.value;
      const confirmPassword = form.elements.confirm.value;
      if (nextPassword !== confirmPassword) {
        toast("Those new passwords do not match.", "err");
        return;
      }
      const button = form.querySelector("button");
      button.disabled = true;
      try {
        await api("/api/admin/password", {
          method: "PUT",
          body: JSON.stringify({ currentPassword: form.elements.current.value, newPassword: nextPassword }),
        });
        state.mustChange = false;
        paintBanner();
        form.reset();
        toast("Password updated.");
      } catch (err) {
        toast(err.message, "err");
      } finally {
        button.disabled = false;
      }
    }
  });

  modalRoot.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-modal-action]");
    if (button) {
      const id = Number(button.dataset.id);
      const action = button.dataset.modalAction;
      try {
        if (action === "edit-item") openEditor(state.items.find((item) => item.id === id));
        if (action === "delete-item") askDeleteItem(id);
        if (action === "delete-message") deleteMessage(id);
        if (action === "toggle-read") {
          const message = inbox.items.find((item) => item.id === id);
          if (message) await setMessageReadState(message, !message.is_read);
        }
      } catch (err) {
        toast(err.message, "err");
      }
      return;
    }
    const remove = event.target.closest("[data-remove-photo]");
    if (remove) {
      const field = remove.closest(".gallery-field");
      const input = field.querySelector("input[type=hidden]");
      const urls = parseGallery(input.value).filter((_, index) => index !== Number(remove.dataset.removePhoto));
      input.value = JSON.stringify(urls);
      field.querySelector(".gallery-grid").innerHTML = galleryThumbs(urls);
      return;
    }
    if (event.target.classList.contains("modal-back") || event.target.closest("[data-cancel]")) closeModal();
  });

  modalRoot.addEventListener("submit", async (event) => {
    if (event.target.id === "customRangeForm") {
      event.preventDefault();
      const form = event.target;
      const error = form.querySelector(".modal-error");
      const from = parseDateParts(form.elements.from.value);
      const to = parseDateParts(form.elements.to.value);
      if (!from || !to) {
        error.textContent = "Choose a start and end date.";
        return;
      }
      if (dateStamp(to) < dateStamp(from)) {
        error.textContent = "The end date must be on or after the start date.";
        return;
      }
      range.from = form.elements.from.value;
      range.to = form.elements.to.value;
      range.preset = "custom";
      const reload = range.reload;
      closeModal();
      syncRange("dash", reload);
      syncRange("msg", reload);
      if (reload) reload();
      return;
    }
    if (event.target.id === "confirmForm") {
      event.preventDefault();
      const button = event.target.querySelector("[type=submit]");
      button.disabled = true;
      try {
        const action = state.onConfirm;
        closeModal();
        if (action) await action();
      } catch (err) {
        toast(err.message, "err");
      }
      return;
    }
    if (event.target.id !== "editorForm") return;
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("[type=submit]");
    const error = form.querySelector(".modal-error");
    button.disabled = true;
    error.textContent = "";
    try {
      const body = readEditor(form);
      if (state.editorId) {
        await api(`/api/admin/${state.page}/${state.editorId}`, { method: "PUT", body: JSON.stringify(body) });
        toast("Saved.");
      } else {
        await api(`/api/admin/${state.page}`, { method: "POST", body: JSON.stringify(body) });
        toast("Added.");
      }
      closeModal();
      const y = view.scrollTop;
      await renderCollection(state.page);
      view.scrollTop = y;
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false;
    }
  });

  function parseGallery(value) {
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function galleryThumbs(urls) {
    if (!urls.length) return `<p class="muted">No photos yet.</p>`;
    return urls.map((url, index) => `
      <figure>
        <img class="thumb" alt="" src="${esc(previewSrc(url))}">
        <button class="text-btn danger" type="button" data-remove-photo="${index}">Remove</button>
      </figure>
    `).join("");
  }

  document.addEventListener("change", async (event) => {
    const input = event.target;
    if (input.dataset && input.dataset.galleryUpload) {
      const files = [...(input.files || [])];
      const field = input.closest(".gallery-field");
      const hidden = field.querySelector("input[type=hidden]");
      const urls = parseGallery(hidden.value);
      try {
        for (const file of files) {
          if (urls.length >= 12) break;
          urls.push(await uploadFile(file));
        }
        hidden.value = JSON.stringify(urls);
        field.querySelector(".gallery-grid").innerHTML = galleryThumbs(urls);
        toast(files.length > 1 ? "Photos uploaded." : "Photo uploaded.");
      } catch (err) {
        toast(err.message, "err");
      } finally {
        input.value = "";
      }
      return;
    }
    if (input.dataset && input.dataset.videoUpload) {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        toast("Uploading video…");
        const url = await uploadFile(file, "video");
        input.closest("form").elements[input.dataset.videoUpload].value = url;
        toast("Video uploaded.");
      } catch (err) {
        toast(err.message, "err");
      } finally {
        input.value = "";
      }
      return;
    }
    if (!input.dataset || !input.dataset.upload || input.type !== "file") return;
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const url = await uploadFile(file);
      const form = input.closest("form");
      form.elements[input.dataset.upload].value = url;
      const preview = form.querySelector(`[data-preview="${input.dataset.upload}"]`);
      if (preview) {
        preview.src = url;
        preview.hidden = false;
      }
      toast("Image uploaded.");
    } catch (err) {
      toast(err.message, "err");
    } finally {
      input.value = "";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  async function boot() {
    try {
      const me = await api("/api/admin/me");
      state.username = me.username;
      state.mustChange = me.mustChange;
      showApp();
    } catch (err) {
      showLogin();
    }
  }

  restoreGroups();
  boot();
})();
