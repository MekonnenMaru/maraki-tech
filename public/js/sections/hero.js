// The first screen: headline, buttons, image and a live clock in the company's time zone.
import { esc, safeHref, safeSrc, externalAttrs, richTitle, twoDigits } from "../lib/html.js";

export function heroHtml(s) {
  const image = safeSrc(s.hero_image);
  const primary = safeHref(s.hero_primary_href, "#products");
  const secondary = safeHref(s.hero_secondary_href, "#contact");

  const media = image
    ? `<img src="${esc(image)}" alt="${esc(s.hero_image_alt || "")}" fetchpriority="high" />`
    : '<div class="hero-fallback"></div>';

  return `
    <div class="hero">
      <div class="hero-content reveal">
        ${s.badge ? `<div class="badge"><span class="badge-dot"></span>${esc(s.badge)}</div>` : ""}
        <h1>${richTitle(s.hero_title, s.hero_highlight)}</h1>
        ${s.hero_text ? `<p class="hero-text">${esc(s.hero_text)}</p>` : ""}
        <div class="hero-buttons">
          ${s.hero_primary_text ? `<a href="${esc(primary)}" class="btn btn-primary"${externalAttrs(primary)}>${esc(s.hero_primary_text)}</a>` : ""}
          ${s.hero_secondary_text ? `<a href="${esc(secondary)}" class="btn btn-secondary"${externalAttrs(secondary)}>${esc(s.hero_secondary_text)}</a>` : ""}
        </div>
      </div>
      <div class="hero-visual reveal">
        <div class="hero-glow" aria-hidden="true"></div>
        <div class="hero-image">
          ${media}
          <div class="hero-sheen" aria-hidden="true"></div>
        </div>
        ${clockHtml(s)}
      </div>
    </div>
  `;
}

/* ---------- Clock (Company profile → Time zone) ---------- */

function zoneOf(s) {
  const zone = String(s.time_zone || "UTC");
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return zone;
  } catch {
    return "UTC";
  }
}

// "Africa/Addis_Ababa" → "Addis Ababa"; plus the short zone name, e.g. "EAT" or "GMT+3".
function zoneLabels(zone) {
  const city = zone === "UTC" ? "UTC" : zone.split("/").pop().replace(/_/g, " ");
  const short = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "short" })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value || "";
  const long = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "long" })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value || "";
  return { city, short: short === city ? "" : short, long };
}

function clockHtml(s) {
  const zone = zoneOf(s);
  const { city, short } = zoneLabels(zone);
  const ticks = Array.from({ length: 60 }, (_, i) =>
    `<span class="clock-tick${i % 5 === 0 ? " major" : ""}" style="--i:${i}"></span>`
  ).join("");

  return `
    <div class="hero-clock" role="img" aria-label="Current time in ${esc(city)}" data-zone="${esc(zone)}">
      <div class="clock-face" aria-hidden="true">
        <div class="clock-ring"></div>
        <div class="clock-ring soft"></div>
        ${ticks}
        <div class="clock-hand hour" data-clock-hour></div>
        <div class="clock-hand minute" data-clock-minute></div>
        <div class="clock-hand second" data-clock-second>
          <span class="clock-second-tip"></span>
        </div>
        <div class="clock-hub"></div>
      </div>
      <div class="clock-readout">
        <div class="clock-time" data-clock-time>00:00:00</div>
        <div class="clock-zone">${esc([city, short].filter(Boolean).join(" · "))}</div>
      </div>
    </div>
  `;
}

function timeIn(zone) {
  const parts = {};
  new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(new Date())
    .forEach((part) => {
      parts[part.type] = part.value;
    });
  return { hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second) };
}

let clockTimer = null;

export function startHeroClock() {
  clearInterval(clockTimer);

  const clock = document.querySelector(".hero-clock");
  if (!clock) return;
  const zone = clock.dataset.zone || "UTC";
  const { city, long } = zoneLabels(zone);

  const hourHand = clock.querySelector("[data-clock-hour]");
  const minuteHand = clock.querySelector("[data-clock-minute]");
  const secondHand = clock.querySelector("[data-clock-second]");
  const readout = clock.querySelector("[data-clock-time]");

  const rotate = (hand, degrees) => {
    hand.style.transform = `translate(-50%, 0) rotate(${degrees}deg)`;
  };

  const paint = () => {
    const { hour, minute, second } = timeIn(zone);
    const text = `${twoDigits(hour)}:${twoDigits(minute)}:${twoDigits(second)}`;

    rotate(hourHand, (hour % 12) * 30 + minute * 0.5);
    rotate(minuteHand, minute * 6 + second * 0.1);
    rotate(secondHand, second * 6);
    readout.textContent = text;
    clock.setAttribute("aria-label", `Current time in ${city}, ${text} ${long}`);
  };

  paint();
  clockTimer = setInterval(paint, 1000);
}
