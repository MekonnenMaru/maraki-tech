// Links in the top menu.
import { esc } from "../lib/html.js";

export function navHtml(s, show) {
  const items = [
    [show.solutions, s.nav_solutions, "#solutions"],
    [show.productsArea, s.nav_products, "#products"],
    [show.process, s.nav_process, "#process"],
    [show.team, s.nav_team, "#developers"],
    [show.pricing, s.nav_pricing, "#pricing"],
  ];

  const links = items
    .filter(([visible, label]) => visible && label)
    .map(([, label, href]) => `<a href="${href}">${esc(label)}</a>`)
    .join("");

  const button = show.contact && s.nav_cta
    ? `<a href="#contact" class="nav-cta">${esc(s.nav_cta)}</a>`
    : "";

  return links + button;
}
