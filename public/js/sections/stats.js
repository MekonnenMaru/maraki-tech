// The row of numbers under the hero ("50+ Projects Delivered").
// Numbers count up when they scroll into view — see features/animations.js.
import { esc } from "../lib/html.js";

export function statsHtml(s, stats) {
  return `
    <div class="trusted reveal">
      ${s.trusted_label ? `<div class="trusted-label">${esc(s.trusted_label)}</div>` : ""}
      <div class="stats-grid">
        ${stats.map(statHtml).join("")}
      </div>
    </div>
  `;
}

function statHtml(stat) {
  // Some older labels start with "%" (e.g. "% Uptime") — the suffix already shows it.
  const label = String(stat.label || "").replace(/^\s*%\s*/, "");
  return `
    <div class="stat">
      <div class="stat-number" data-count="${esc(stat.value)}" data-suffix="${esc(stat.suffix)}">0</div>
      <div class="stat-label">${esc(label)}</div>
    </div>
  `;
}
