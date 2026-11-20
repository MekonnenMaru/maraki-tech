// The contact section: details on the left, form on the right.
// Sending the form saves a lead in the admin inbox and reports a Google Ads conversion.
import { esc, safeHref, telHref, sectionHeading } from "../lib/html.js";
import { campaignDetails, trackLead } from "../features/tracking.js";

function detailRow(icon, label, value, href) {
  if (!value) return "";
  const shown = href ? `<a href="${esc(href)}">${esc(value)}</a>` : esc(value);
  return `
    <div class="contact-item">
      <div class="contact-item-icon">${icon}</div>
      <div>
        <div class="contact-item-label">${label}</div>
        <div class="contact-item-value">${shown}</div>
      </div>
    </div>
  `;
}

function field({ id, name = id, label, type = "text", placeholder = "Optional", required = false, max, autocomplete }) {
  return `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <input type="${type}" id="${id}" name="${name}" placeholder="${placeholder}"${required ? " required" : ""} maxlength="${max}" autocomplete="${autocomplete}" />
    </div>
  `;
}

export function contactHtml(s, services) {
  const serviceOptions = services
    .map((service) => `<option value="${esc(service.title)}">${esc(service.title)}</option>`)
    .join("");

  return `
    <section id="contact">
      ${sectionHeading(s.contact_label, s.contact_title, s.contact_highlight, s.contact_text)}
      <div class="contact-wrapper">
        <div class="contact-info reveal">
          ${s.contact_aside_title ? `<h3>${esc(s.contact_aside_title)}</h3>` : ""}
          ${s.contact_aside_text ? `<p>${esc(s.contact_aside_text)}</p>` : ""}
          ${detailRow("✉", "Email", s.email, s.email ? safeHref(`mailto:${s.email}`) : "")}
          ${detailRow("☎", "Phone", s.phone, telHref(s.phone))}
          ${detailRow("◎", "Location", s.location, "")}
        </div>

        <form class="contact-form reveal" id="contactForm">
          <!-- Hidden trap field: real people never fill it, spam bots do. -->
          <div class="hp" aria-hidden="true">
            <label for="company_website">Website</label>
            <input id="company_website" name="company_website" tabindex="-1" autocomplete="off" />
          </div>

          <div class="form-row">
            ${field({ id: "name", label: "Full Name", placeholder: "Your name", required: true, max: 80, autocomplete: "name" })}
            ${field({ id: "email", label: "Email", type: "email", placeholder: "you@company.com", required: true, max: 160, autocomplete: "email" })}
          </div>
          <div class="form-row">
            ${field({ id: "company", label: "Company", max: 120, autocomplete: "organization" })}
            ${field({ id: "phone_contact", name: "phone", label: "Phone", type: "tel", max: 40, autocomplete: "tel" })}
          </div>
          <div class="form-row">
            ${field({ id: "country", label: "Country", placeholder: "Where are you based?", required: true, max: 80, autocomplete: "country-name" })}
            ${field({ id: "city", label: "City", max: 80, autocomplete: "address-level2" })}
          </div>

          <div class="form-group">
            <label for="service">Service</label>
            <select id="service" name="service">
              <option value="">Select a service</option>
              ${serviceOptions}
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="message">Message</label>
            <textarea id="message" name="message" placeholder="Tell us about your project..." required maxlength="4000"></textarea>
          </div>

          <button type="submit" class="form-submit">Send Message →</button>
          <p class="form-status" id="formStatus" role="status"></p>
          ${s.form_note ? `<p class="form-note">${esc(s.form_note)}</p>` : ""}
          <p class="form-privacy">By sending, you agree to our <a href="/privacy">Privacy Policy</a>.</p>
        </form>
      </div>
    </section>
  `;
}

// Stop waiting after this long, so the button never stays stuck on "Sending".
const SEND_TIMEOUT_MS = 20000;

export async function sendContactForm(form) {
  if (form.dataset.sending) return; // already sending: ignore double clicks / Enter presses
  form.dataset.sending = "1";

  const button = form.querySelector(".form-submit");
  const status = document.getElementById("formStatus");
  const buttonText = button.textContent;

  const showStatus = (kind, text) => {
    status.className = `form-status ${kind}`.trim();
    status.textContent = text;
  };

  // Spinner + disabled button while sending. `done` lets the button work again.
  const setButton = (text, { loading = false, disabled = false } = {}) => {
    button.textContent = text;
    button.disabled = disabled;
    button.classList.toggle("loading", loading);
    button.setAttribute("aria-busy", String(loading));
  };
  const done = () => {
    delete form.dataset.sending;
    setButton(buttonText);
  };

  setButton("Sending…", { loading: true, disabled: true });
  showStatus("", "");

  const payload = { ...Object.fromEntries(new FormData(form)), ...campaignDetails() };
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: timeout.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Could not send the message.");

    form.reset();
    trackLead();
    setButton("Message Sent ✓", { disabled: true });
    showStatus("ok", "Thanks. We'll get back to you within 24 hours.");
    setTimeout(done, 2200);
  } catch (error) {
    done();
    const message = error.name === "AbortError"
      ? "The connection is slow. Please check your internet and try again."
      : error.message === "Failed to fetch"
        ? "Could not reach the server. Please check your internet and try again."
        : error.message;
    showStatus("error", message);
  } finally {
    clearTimeout(timer);
  }
}
