// The first screen: headline, buttons, image and the live Nairobi clock.
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
        ${clockHtml()}
      </div>
    </div>
  `;
}

/* ---------- Nairobi clock ---------- */

function clockHtml() {
  const ticks = Array.from({ length: 60 }, (_, i) =>
    `<span class="clock-tick${i % 5 === 0 ? " major" : ""}" style="--i:${i}"></span>`
  ).join("");

  return `
    <div class="hero-clock" role="img" aria-label="Current time in Nairobi">
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
        <div class="clock-zone">Nairobi · EAT</div>
      </div>
    </div>
  `;
}

function nairobiTime() {
  const parts = {};
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
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

  const hourHand = clock.querySelector("[data-clock-hour]");
  const minuteHand = clock.querySelector("[data-clock-minute]");
  const secondHand = clock.querySelector("[data-clock-second]");
  const readout = clock.querySelector("[data-clock-time]");

  const rotate = (hand, degrees) => {
    hand.style.transform = `translate(-50%, 0) rotate(${degrees}deg)`;
  };

  const paint = () => {
    const { hour, minute, second } = nairobiTime();
    const text = `${twoDigits(hour)}:${twoDigits(minute)}:${twoDigits(second)}`;

    rotate(hourHand, (hour % 12) * 30 + minute * 0.5);
    rotate(minuteHand, minute * 6 + second * 0.1);
    rotate(secondHand, second * 6);
    readout.textContent = text;
    clock.setAttribute("aria-label", `Current time in Nairobi, ${text} East Africa Time`);
  };

  paint();
  clockTimer = setInterval(paint, 1000);
}
