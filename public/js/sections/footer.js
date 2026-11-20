// The closing call-to-action banner and the page footer.
import { esc, safeHref, externalAttrs, richTitle, logoMark, logoText, companyName } from "../lib/html.js";

export function ctaHtml(s) {
  const href = safeHref(s.cta_button_href, "#contact");
  return `
    <div class="cta-banner reveal">
      <div class="cta-inner">
        <h2>${richTitle(s.cta_title, s.cta_highlight)}</h2>
        ${s.cta_text ? `<p>${esc(s.cta_text)}</p>` : ""}
        ${s.cta_button ? `<a href="${esc(href)}" class="btn btn-primary"${externalAttrs(href)}>${esc(s.cta_button)}</a>` : ""}
      </div>
    </div>
  `;
}

function linkColumn(title, links) {
  const visible = links.filter((link) => link.show && link.label);
  if (!visible.length) return "";
  return `
    <div class="footer-col">
      <h4>${esc(title)}</h4>
      <ul>
        ${visible.map((link) => {
          const href = safeHref(link.href, "#");
          return `<li><a href="${esc(href)}"${externalAttrs(href)}>${esc(link.label)}</a></li>`;
        }).join("")}
      </ul>
    </div>
  `;
}

function socialLinks(s) {
  const socials = [
    [s.social_x, "X", "𝕏"],
    [s.social_linkedin, "LinkedIn", "in"],
    [s.social_github, "GitHub", "⌨"],
    [s.social_telegram, "Telegram", "✈"],
  ].filter(([url]) => safeHref(url));

  if (!socials.length) return "";
  return `
    <div class="footer-socials">
      ${socials.map(([url, name, icon]) => {
        const href = safeHref(url, "#");
        return `<a class="footer-social" href="${esc(href)}" title="${name}"${externalAttrs(href)}>${icon}</a>`;
      }).join("")}
    </div>
  `;
}

export function footerHtml(s, show) {
  return `
    <div class="footer-grid">
      <div class="footer-col">
        <div class="footer-logo">${logoMark()}${esc(logoText(s))}</div>
        ${s.footer_blurb ? `<p>${esc(s.footer_blurb)}</p>` : ""}
        ${socialLinks(s)}
      </div>
      ${linkColumn("Product", [
        { show: show.solutions, href: "#solutions", label: s.nav_solutions },
        { show: show.productsArea, href: "#products", label: s.nav_products },
        { show: show.pricing, href: "#pricing", label: s.nav_pricing },
        { show: show.tech, href: "#technology", label: "Technology" },
      ])}
      ${linkColumn("Company", [
        { show: show.team, href: "#developers", label: s.nav_team },
        { show: show.process, href: "#process", label: s.nav_process },
        { show: show.testimonials, href: "#testimonials", label: "Testimonials" },
        { show: show.faq, href: "#faq", label: "FAQ" },
      ])}
      ${linkColumn("Contact", [
        { show: !!s.email, href: `mailto:${s.email}`, label: s.email },
        { show: show.contact, href: "#contact", label: "Get a Quote" },
        { show: true, href: "/privacy", label: "Privacy" },
      ])}
    </div>
    <div class="footer-bottom">
      <div class="footer-bottom-inner">
        <div>© ${new Date().getFullYear()} <span class="footer-brand">${esc(companyName(s))}</span>. All rights reserved.</div>
        <div><a href="/privacy">Privacy</a> · <a href="/admin">Admin</a></div>
      </div>
    </div>
  `;
}
