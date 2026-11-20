// The "Products" grid. When the Entertainment apps are switched on,
// an extra card opens them in a pop-up (see sections/apps.js).
import { esc, safeHref, externalAttrs, sectionHeading, twoDigits } from "../lib/html.js";

export function productsHtml(s, products, apps) {
  const cards = products.map((product, index) => productCard(product, index + 1));
  if (apps.length) cards.push(appsCard(s, products.length + 1));

  return `
    <section id="products">
      ${sectionHeading(s.products_label, s.products_title, s.products_highlight, s.products_text)}
      <div class="products">${cards.join("")}</div>
    </section>
  `;
}

function productCard(product, number) {
  const href = safeHref(product.link, "");
  const tag = href ? "a" : "div";
  const link = href ? ` href="${esc(href)}"${externalAttrs(href)}` : "";
  return `
    <${tag} class="product reveal"${link}>
      <div class="product-number">${twoDigits(number)} / PRODUCT</div>
      <h3>${esc(product.title)}</h3>
      <p>${esc(product.description)}</p>
      <div class="product-arrow">↗</div>
    </${tag}>
  `;
}

function appsCard(s, number) {
  return `
    <button type="button" class="product product-apps reveal" id="apps" data-open-apps>
      <div class="product-number">${twoDigits(number)} / PRODUCT</div>
      <h3>${esc(s.apps_title || "Entertainment Apps")}</h3>
      <p>${esc(s.apps_text || "")}</p>
      <span class="product-more">See more</span>
    </button>
  `;
}
