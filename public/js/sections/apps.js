// Entertainment apps (Bingo, Keno, Spin) shown in a pop-up window.
// Turned on/off in the admin under Visibility → "Entertainment apps".
import { esc, safeHref, externalAttrs, richTitle } from "../lib/html.js";

const FAMILIES = [
  ["bingo", "Bingo"],
  ["keno", "Keno"],
  ["spin", "Spin"],
];

const CHANNELS = {
  both: "Online & Offline",
  online: "Online",
  offline: "Offline",
  telegram: "Telegram",
};

/* ---------- Text helpers ---------- */

function channelLabel(app) {
  return CHANNELS[app.channel] || CHANNELS.both;
}

function fullName(app) {
  return app.edition ? `${app.name} · ${app.edition}` : app.name;
}

function shortName(app) {
  if (app.channel === "telegram") return app.edition || "Telegram";
  return String(app.name || "").replace(/\s*bingo\s*$/i, "").trim() || app.name;
}

function familyCaption(group) {
  if (group.id !== "bingo") return channelLabel(group.items[0]);
  const halls = group.items.some((app) => app.channel !== "telegram");
  const bots = group.items.some((app) => app.channel === "telegram");
  if (halls && bots) return "Halls & Telegram";
  return bots ? "Telegram" : "Hall layouts";
}

function tabCaption(app) {
  return app.channel === "telegram" ? "Telegram bot" : channelLabel(app);
}

// Hides taglines that only repeat what the chips already say.
function usefulTagline(app) {
  const tag = String(app.tagline || "").trim();
  if (!tag) return "";
  if (tag === channelLabel(app)) return "";
  if (app.edition && tag === app.edition) return "";
  if (app.channel === "telegram" && /telegram/i.test(tag)) return "";
  if (/^hall layout$/i.test(tag)) return "";
  return tag;
}

function photosOf(app) {
  return (app.photos || [])
    .map((url) => String(url || ""))
    .filter((url) => (url.startsWith("/uploads/") && !url.includes("..")) || /^https:\/\//i.test(url));
}

/* ---------- HTML ---------- */

// The big media area: a video, the first photo, or a placeholder.
function mediaHtml(app) {
  const raw = String(app.video || "").trim();
  const video = safeHref(raw, "") || (raw.startsWith("/uploads/") ? raw : "");
  const title = `${esc(app.name)} video`;

  const youtube = video.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (youtube) {
    return `<iframe title="${title}" src="https://www.youtube.com/embed/${esc(youtube[1])}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }

  const vimeo = video.match(/vimeo\.com\/(\d+)/i);
  if (vimeo) {
    return `<iframe title="${title}" src="https://player.vimeo.com/video/${esc(vimeo[1])}" allowfullscreen></iframe>`;
  }

  if (video && (video.startsWith("/uploads/") || /\.(mp4|webm)(\?|#|$)/i.test(video))) {
    return `<video controls playsinline preload="metadata" src="${esc(video)}"></video>`;
  }

  const [firstPhoto] = photosOf(app);
  if (firstPhoto) return `<img class="shot" alt="${esc(app.name)}" src="${esc(firstPhoto)}">`;

  const mark = app.edition || shortName(app) || app.name || "?";
  return `
    <div class="app-placeholder" data-family="${esc(app.family || "bingo")}">
      <div class="app-placeholder-glow" aria-hidden="true"></div>
      <div class="app-placeholder-mark" aria-hidden="true">${esc(String(mark).slice(0, 12))}</div>
      <strong>${esc(fullName(app))}</strong>
      <span>${esc(channelLabel(app))}</span>
    </div>
  `;
}

function appPanelHtml(app, active) {
  const photos = photosOf(app);
  const href = safeHref(app.link, "");
  const hasVideo = !!String(app.video || "").trim();
  const tagline = usefulTagline(app);
  const id = esc(String(app.id));

  return `
    <article class="app-panel ${active ? "active" : ""}" data-app-panel="${id}" ${active ? "" : "hidden"}>
      <div class="app-frame">${mediaHtml(app)}</div>
      <div class="app-copy">
        <div class="app-chips">
          <span class="app-chip">${esc(channelLabel(app))}</span>
          ${app.edition ? `<span class="app-chip soft">${esc(app.edition)}</span>` : ""}
        </div>
        <h3>${esc(fullName(app))}</h3>
        ${tagline ? `<p class="app-tagline">${esc(tagline)}</p>` : ""}
        ${app.description ? `<p>${esc(app.description)}</p>` : ""}
        ${href ? `<a class="btn btn-primary" href="${esc(href)}"${externalAttrs(href)}>Open ${esc(app.name)}</a>` : ""}
      </div>
      ${photos.length || hasVideo ? `
        <div class="app-reel">
          ${hasVideo ? `<button type="button" class="reel-video" data-show-video="${id}">Video</button>` : ""}
          ${photos.map((url, index) => `
            <button type="button" data-shot="${esc(url)}" aria-label="Photo ${index + 1}">
              <img alt="" src="${esc(url)}">
            </button>
          `).join("")}
        </div>
      ` : ""}
    </article>
  `;
}

function tab(className, dataAttr, value, active, title, caption) {
  return `
    <button type="button" class="${className} ${active ? "active" : ""}" role="tab" ${dataAttr}="${esc(value)}" aria-selected="${active}">
      <strong>${esc(title)}</strong>
      <span>${esc(caption)}</span>
    </button>
  `;
}

function boardHtml(apps) {
  const groups = FAMILIES
    .map(([id, label]) => ({ id, label, items: apps.filter((app) => (app.family || "bingo") === id) }))
    .filter((group) => group.items.length);
  if (!groups.length) return "";

  return `
    <div class="apps-board">
      <div class="app-families" role="tablist">
        ${groups.map((group, i) => tab("app-family", "data-family", group.id, i === 0, group.label, familyCaption(group))).join("")}
      </div>
      ${groups.map((group, i) => `
        <div class="app-family-panel" data-family-panel="${esc(group.id)}" ${i === 0 ? "" : "hidden"}>
          ${group.items.length > 1 ? `
            <div class="app-switch" role="tablist">
              ${group.items.map((app, j) => tab("app-tab", "data-app", String(app.id), j === 0, shortName(app), tabCaption(app))).join("")}
            </div>
          ` : ""}
          ${group.items.map((app, j) => appPanelHtml(app, j === 0)).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

/* ---------- Pop-up window ---------- */

let returnFocusTo = null;

export function mountAppsModal(s, apps) {
  document.getElementById("appsModal")?.remove();
  if (!apps.length) return;

  const modal = document.createElement("div");
  modal.id = "appsModal";
  modal.className = "apps-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="apps-modal-back" data-close-apps>
      <div class="apps-dialog" role="dialog" aria-modal="true" aria-labelledby="appsModalTitle">
        <button class="apps-close" type="button" data-close-apps aria-label="Close">×</button>
        ${s.apps_label ? `<p class="section-label">${esc(s.apps_label)}</p>` : ""}
        <h2 id="appsModalTitle">${richTitle(s.apps_title || "Entertainment Apps", s.apps_highlight)}</h2>
        ${boardHtml(apps)}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  rememberVideos(modal);
  modal.addEventListener("click", handleModalClick);
}

export function openAppsModal() {
  const modal = document.getElementById("appsModal");
  if (!modal) return;
  returnFocusTo = document.activeElement;
  modal.hidden = false;
  document.body.classList.add("apps-open");
  modal.querySelector(".apps-close")?.focus();
}

export function closeAppsModal() {
  const modal = document.getElementById("appsModal");
  if (!modal || modal.hidden) return;
  pauseVideos(modal);
  modal.hidden = true;
  document.body.classList.remove("apps-open");
  returnFocusTo?.focus?.();
}

function pauseVideos(root) {
  root.querySelectorAll("video").forEach((video) => video.pause());
}

// Keeps a copy of each video so the "Video" button can bring it back after a photo was shown.
function rememberVideos(modal) {
  modal.querySelectorAll(".app-panel").forEach((panel) => {
    const frame = panel.querySelector(".app-frame");
    if (!frame.querySelector("video, iframe")) return;
    const copy = document.createElement("template");
    copy.dataset.videoHtml = "1";
    copy.innerHTML = frame.innerHTML;
    panel.appendChild(copy);
  });
}

function selectTab(tabs, panels, isActiveTab, isActivePanel) {
  tabs.forEach((item) => {
    const active = isActiveTab(item);
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", String(active));
  });
  panels.forEach((panel) => {
    const active = isActivePanel(panel);
    panel.hidden = !active;
    panel.classList.toggle("active", active);
    if (!active) pauseVideos(panel);
  });
}

function handleModalClick(event) {
  const modal = event.currentTarget;

  const family = event.target.closest(".app-family");
  if (family) {
    const id = family.dataset.family;
    selectTab(
      modal.querySelectorAll(".app-family"),
      modal.querySelectorAll(".app-family-panel"),
      (item) => item.dataset.family === id,
      (panel) => panel.dataset.familyPanel === id
    );
    return;
  }

  const appTab = event.target.closest(".app-tab");
  if (appTab) {
    const id = appTab.dataset.app;
    const scope = appTab.closest(".app-family-panel");
    selectTab(
      scope.querySelectorAll(".app-tab"),
      scope.querySelectorAll(".app-panel"),
      (item) => item.dataset.app === id,
      (panel) => panel.dataset.appPanel === id
    );
    return;
  }

  const shot = event.target.closest("[data-shot]");
  if (shot) {
    const panel = shot.closest(".app-panel");
    panel.querySelector(".app-frame").innerHTML = `<img class="shot" alt="" src="${esc(shot.dataset.shot)}">`;
    panel.querySelectorAll(".app-reel button").forEach((button) => button.classList.toggle("active", button === shot));
    return;
  }

  const videoButton = event.target.closest("[data-show-video]");
  if (videoButton) {
    const panel = videoButton.closest(".app-panel");
    const copy = panel.querySelector("[data-video-html]");
    if (copy) panel.querySelector(".app-frame").innerHTML = copy.innerHTML;
  }
}
