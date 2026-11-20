// Sections that are just a heading plus a list of cards.
// Each function receives the settings (s) and the rows from the admin dashboard.
import { esc, sectionHeading, avatar, twoDigits } from "../lib/html.js";

export function servicesHtml(s, services) {
  return `
    <section id="solutions">
      ${sectionHeading(s.solutions_label, s.solutions_title, s.solutions_highlight, s.solutions_text)}
      <div class="services">
        ${services.map((service) => `
          <div class="service reveal">
            ${service.icon ? `<div class="service-icon">${esc(service.icon)}</div>` : ""}
            <h3>${esc(service.title)}</h3>
            <p>${esc(service.description)}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

export function processHtml(s, steps) {
  return `
    <section id="process">
      ${sectionHeading(s.process_label, s.process_title, s.process_highlight, s.process_text)}
      <div class="process-grid">
        ${steps.map((step, index) => `
          <div class="process-step reveal">
            <div class="process-number">${twoDigits(index + 1)}</div>
            <h3>${esc(step.title)}</h3>
            <p>${esc(step.description)}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

export function teamHtml(s, team) {
  return `
    <section id="developers">
      ${sectionHeading(s.team_label, s.team_title, s.team_highlight, s.team_text)}
      <div class="developers">
        ${team.map((person) => `
          <div class="developer reveal">
            ${avatar(person, "developer-avatar")}
            <h3>${esc(person.name)}</h3>
            <div class="developer-role">${esc(person.role)}</div>
            <p class="developer-bio">${esc(person.bio)}</p>
            <div class="developer-skills">
              ${(person.skills || []).map((skill) => `<span class="skill">${esc(skill)}</span>`).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

export function testimonialsHtml(s, quotes) {
  return `
    <section id="testimonials">
      ${sectionHeading(s.testimonials_label, s.testimonials_title, s.testimonials_highlight, s.testimonials_text)}
      <div class="testimonials">
        ${quotes.map((quote) => `
          <div class="testimonial reveal">
            <div class="testimonial-quote">"</div>
            <p class="testimonial-text">${esc(quote.quote)}</p>
            <div class="testimonial-author">
              ${avatar(quote, "testimonial-avatar")}
              <div>
                <div class="testimonial-name">${esc(quote.name)}</div>
                <div class="testimonial-company">${esc(quote.company)}</div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

export function pricingHtml(s, plans) {
  return `
    <section id="pricing">
      ${sectionHeading(s.pricing_label, s.pricing_title, s.pricing_highlight, s.pricing_text)}
      <div class="pricing">
        ${plans.map((plan) => `
          <div class="price-card${plan.featured ? " featured" : ""} reveal">
            ${plan.badge ? `<div class="price-badge">${esc(plan.badge)}</div>` : ""}
            <div class="price-name">${esc(plan.name)}</div>
            <div class="price-amount">${esc(plan.amount)}${plan.period ? `<span>${esc(plan.period)}</span>` : ""}</div>
            ${plan.description ? `<p class="price-desc">${esc(plan.description)}</p>` : ""}
            <ul class="price-features">
              ${(plan.features || []).map((feature) => `<li>${esc(feature)}</li>`).join("")}
            </ul>
            <a class="price-btn" href="#contact">${esc(plan.button_text || "Get Started")}</a>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

export function technologyHtml(s, technologies) {
  return `
    <section id="technology">
      ${sectionHeading(s.tech_label, s.tech_title, s.tech_highlight, s.tech_text)}
      <div class="tech-box reveal">
        ${technologies.map((tech) => `<span class="tech">${esc(tech.name)}</span>`).join("")}
      </div>
    </section>
  `;
}

export function faqHtml(s, faqs) {
  return `
    <section id="faq">
      ${sectionHeading(s.faq_label, s.faq_title, s.faq_highlight, s.faq_text)}
      <div class="faq-list">
        ${faqs.map((faq) => `
          <div class="faq-item reveal">
            <button class="faq-question" type="button">
              ${esc(faq.question)}
              <span class="faq-icon" aria-hidden="true">+</span>
            </button>
            <div class="faq-answer"><p>${esc(faq.answer)}</p></div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

// Opens one FAQ answer at a time.
export function toggleFaq(question) {
  const item = question.closest(".faq-item");
  const wasOpen = item.classList.contains("open");
  document.querySelectorAll(".faq-item.open").forEach((node) => node.classList.remove("open"));
  if (!wasOpen) item.classList.add("open");
}
