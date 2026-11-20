// Maraki Tech landing page — entry point.
//
// 1. Fetch all content from /api/content (everything is edited in the admin dashboard).
// 2. Build the page from the section files in ./sections.
// 3. Start the interactive features in ./features.
//
// To add a new section: create a file in ./sections, import it here,
// and add one line to the `sections` list in renderPage().

import { esc, logoMark, logoText } from "./lib/html.js";
import { visibleSections } from "./lib/visibility.js";
import { navHtml } from "./sections/nav.js";
import { heroHtml, startHeroClock } from "./sections/hero.js";
import { statsHtml } from "./sections/stats.js";
import { productsHtml } from "./sections/products.js";
import { mountAppsModal, openAppsModal, closeAppsModal } from "./sections/apps.js";
import {
  servicesHtml,
  processHtml,
  teamHtml,
  testimonialsHtml,
  pricingHtml,
  technologyHtml,
  faqHtml,
  toggleFaq,
} from "./sections/simple-sections.js";
import { contactHtml, sendContactForm } from "./sections/contact.js";
import { ctaHtml, footerHtml } from "./sections/footer.js";
import { startAnimations } from "./features/animations.js";
import { startTracking } from "./features/tracking.js";
import { startPageUi, hideLoader, updateOnScroll, scrollToSection } from "./features/page-ui.js";

function renderPage(data) {
  const s = data.settings;
  const show = visibleSections(data);
  const apps = show.apps ? data.apps : [];
  const products = show.products ? data.products : [];

  // Top to bottom, in the order they appear on the page.
  const sections = [
    heroHtml(s),
    show.stats && statsHtml(s, data.stats),
    show.solutions && servicesHtml(s, data.services),
    show.productsArea && productsHtml(s, products, apps),
    show.process && processHtml(s, data.process),
    show.team && teamHtml(s, data.team),
    show.testimonials && testimonialsHtml(s, data.testimonials),
    show.pricing && pricingHtml(s, data.pricing),
    show.tech && technologyHtml(s, data.technologies),
    show.faq && faqHtml(s, data.faqs),
    show.contact && contactHtml(s, data.services),
    show.cta && ctaHtml(s),
  ];

  document.getElementById("brandLockup").innerHTML = `${logoMark()}${esc(logoText(s))}`;
  document.getElementById("navLinks").innerHTML = navHtml(s, show);
  document.getElementById("page").innerHTML = sections.filter(Boolean).join("");
  document.getElementById("footer").innerHTML = footerHtml(s, show);

  mountAppsModal(s, apps);
  startHeroClock();
  startAnimations();
  startTracking(s);
  updateOnScroll();
}

function renderError() {
  document.getElementById("page").innerHTML = `
    <div class="load-error">
      <div>
        <div class="section-label">Connection</div>
        <h1 class="section-title">The page didn't load.</h1>
        <p class="section-description" style="margin: 18px auto 0;">Refresh and try again.</p>
      </div>
    </div>
  `;
}

/* ---------- One click handler for the whole page ---------- */

document.addEventListener("click", (event) => {
  const target = event.target;

  if (target.closest("[data-open-apps]")) return openAppsModal();

  const closer = target.closest("[data-close-apps]");
  if (closer && (closer.classList.contains("apps-close") || target === closer)) return closeAppsModal();

  const question = target.closest(".faq-question");
  if (question) return toggleFaq(question);

  const anchor = target.closest('a[href^="#"]');
  const section = anchor && document.querySelector(anchor.getAttribute("href"));
  if (section) {
    event.preventDefault();
    scrollToSection(section);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAppsModal();
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "contactForm") return;
  event.preventDefault();
  sendContactForm(event.target);
});

/* ---------- Start ---------- */

async function start() {
  startPageUi();
  try {
    const response = await fetch("/api/content", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Content request failed");
    renderPage(await response.json());
  } catch (error) {
    console.error(error);
    renderError();
  }
  hideLoader();
}

start();
