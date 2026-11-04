(function () {
  "use strict";

  const page = document.getElementById("page");
  const footer = document.getElementById("footer");
  const navLinks = document.getElementById("navLinks");
  const navbar = document.getElementById("navbar");
  const menuBtn = document.getElementById("menuBtn");
  const scrollProgress = document.getElementById("scrollProgress");
  const backToTop = document.getElementById("backToTop");
  const started = performance.now();

  let revealObserver = null;
  let statObserver = null;

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeHref(url, fallback) {
    const value = String(url || "").trim();
    if (!value) return fallback;
    if (/^#[A-Za-z][\w-]*$/.test(value)) return value;
    if (value.startsWith("/") && !value.startsWith("//") && !value.includes("..")) return value;
    if (/^mailto:[^\s]+$/i.test(value)) return value;
    if (/^tel:\+?[\d]+$/i.test(value)) return value;
    if (/^https?:\/\//i.test(value)) return value;
    return fallback;
  }

  function safeSrc(url) {
    const value = String(url || "").trim();
    if (value.startsWith("/uploads/") && !value.includes("..")) return value;
    if (/^https?:\/\//i.test(value)) return value;
    return "";
  }

  function externalAttrs(url) {
    return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : "";
  }

  function telHref(phone) {
    const compact = String(phone || "").replace(/[^\d+]/g, "");
    return /^\+?\d{6,}$/.test(compact) ? `tel:${compact}` : "";
  }

  function richTitle(title, highlight) {
    const accent = highlight ? `<span>${esc(highlight)}</span>` : "";
    const source = String(title || "");
    const token = "{highlight}";
    const at = source.indexOf(token);
    if (at >= 0) {
      return `${esc(source.slice(0, at))}${accent}${esc(source.slice(at + token.length))}`;
    }
    return `${esc(source)}${highlight ? ` ${accent}` : ""}`;
  }

  function logoMark() {
    return '<span class="logo-mark" aria-hidden="true"><span class="ring"></span><span class="dot"></span></span>';
  }

  function on(settings, key) {
    return settings[key] === "1";
  }

  function head(label, title, highlight, text) {
    return `
      <div class="reveal">
        ${label ? `<div class="section-label">${esc(label)}</div>` : ""}
        <h2 class="section-title">${richTitle(title, highlight)}</h2>
        ${text ? `<p class="section-description">${esc(text)}</p>` : ""}
      </div>
    `;
  }

  function letter(person) {
    const explicit = String(person.avatar_letter || "").trim();
    if (explicit) return explicit.slice(0, 2);
    return String(person.name || "?").trim().slice(0, 1).toUpperCase() || "?";
  }

  function avatar(person, className) {
    const src = safeSrc(person.avatar_image);
    if (src) return `<div class="${className}"><img src="${esc(src)}" alt=""></div>`;
    return `<div class="${className}">${esc(letter(person))}</div>`;
  }

  function render(data) {
    const s = data.settings;
    document.title = s.meta_title || "Maraki Tech";
    const description = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (description) description.setAttribute("content", s.meta_description || "");
    if (ogTitle) ogTitle.setAttribute("content", s.meta_title || "");
    if (ogDescription) ogDescription.setAttribute("content", s.meta_description || "");

    const products = on(s, "show_products") ? data.products : [];
    const apps = on(s, "show_apps") && data.apps ? data.apps : [];

    document.getElementById("brandLockup").innerHTML = `${logoMark()}${esc(s.brand_name || "MARAKI")}`;
    navLinks.innerHTML = navHtml(data);
    page.innerHTML = [
      heroHtml(s),
      on(s, "show_stats") && data.stats.length ? statsHtml(s, data.stats) : "",
      on(s, "show_solutions") && data.services.length ? servicesHtml(s, data.services) : "",
      products.length || apps.length ? productsHtml(s, products, apps) : "",
      on(s, "show_process") && data.process.length ? processHtml(s, data.process) : "",
      on(s, "show_team") && data.team.length ? teamHtml(s, data.team) : "",
      on(s, "show_testimonials") && data.testimonials.length ? quotesHtml(s, data.testimonials) : "",
      on(s, "show_pricing") && data.pricing.length ? pricingHtml(s, data.pricing) : "",
      on(s, "show_tech") && data.technologies.length ? techHtml(s, data.technologies) : "",
      on(s, "show_faq") && data.faqs.length ? faqHtml(s, data.faqs) : "",
      on(s, "show_contact") ? contactHtml(s, data.services) : "",
      on(s, "show_cta") ? ctaHtml(s) : "",
    ].join("");
    footer.innerHTML = footerHtml(data);
    mountApps(s, apps);
    bindApps();
    setupReveal();
    setupStats();
    updateScroll();
  }

  function navHtml(data) {
    const s = data.settings;
    const items = [
      [on(s, "show_solutions") && data.services.length, s.nav_solutions, "#solutions"],
      [on(s, "show_products") && data.products.length, s.nav_products, "#products"],
      [on(s, "show_apps") && data.apps && data.apps.length, s.nav_apps, "#apps"],
      [on(s, "show_process") && data.process.length, s.nav_process, "#process"],
      [on(s, "show_team") && data.team.length, s.nav_team, "#developers"],
      [on(s, "show_pricing") && data.pricing.length, s.nav_pricing, "#pricing"],
      [on(s, "show_contact"), s.nav_contact, "#contact"],
    ];
    const links = items
      .filter((item) => item[0] && item[1])
      .map((item) => `<a href="${esc(item[2])}">${esc(item[1])}</a>`)
      .join("");
    const cta = on(s, "show_contact") && s.nav_cta
      ? `<a href="#contact" class="nav-cta">${esc(s.nav_cta)}</a>`
      : "";
    return links + cta;
  }

  function heroHtml(s) {
    const src = safeSrc(s.hero_image);
    const primary = safeHref(s.hero_primary_href, "#products");
    const secondary = safeHref(s.hero_secondary_href, "#contact");
    const media = src
      ? `<img src="${esc(src)}" alt="${esc(s.hero_image_alt || "")}" fetchpriority="high" />`
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
          <div class="hero-image">${media}</div>
          <div class="orbit-system" aria-hidden="true">
            <div class="orbit-ring"></div>
            <div class="meteor"><div class="meteor-tail"></div><div class="meteor-dot"></div></div>
            <div class="core-ring"></div>
          </div>
          <div class="floating-card card-top">
            <div class="mini-label">${esc(s.float_top_label)}</div>
            <div class="mini-value">${esc(s.float_top_value)}</div>
          </div>
          <div class="floating-card card-bottom">
            <div class="mini-label">${esc(s.float_bottom_label)}</div>
            <div class="mini-value">${esc(s.float_bottom_value)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function statsHtml(s, stats) {
    return `
      <div class="trusted reveal">
        ${s.trusted_label ? `<div class="trusted-label">${esc(s.trusted_label)}</div>` : ""}
        <div class="stats-grid">
          ${stats.map((stat) => `
            <div class="stat">
              <div class="stat-number" data-count="${esc(stat.value)}" data-suffix="${esc(stat.suffix)}">0</div>
              <div class="stat-label">${esc(stat.label)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function servicesHtml(s, services) {
    return `
      <section id="solutions">
        ${head(s.solutions_label, s.solutions_title, s.solutions_highlight, s.solutions_text)}
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

  function mediaFrame(app) {
    const video = safeHref(app.video, "") || (String(app.video || "").startsWith("/uploads/") ? app.video : "");
    const photos = (app.photos || []).map((url) => previewMedia(url)).filter(Boolean);
    const poster = photos[0] || "";
    if (video && /(?:youtube\.com|youtu\.be)/i.test(video)) {
      const match = video.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
      if (match) {
        return `<iframe title="${esc(app.name)} video" src="https://www.youtube.com/embed/${esc(match[1])}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      }
    }
    if (video && /vimeo\.com\/(\d+)/i.test(video)) {
      const id = video.match(/vimeo\.com\/(\d+)/i)[1];
      return `<iframe title="${esc(app.name)} video" src="https://player.vimeo.com/video/${esc(id)}" allowfullscreen></iframe>`;
    }
    if (video && (video.startsWith("/uploads/") || /\.(mp4|webm)(\?|#|$)/i.test(video))) {
      return `<video controls playsinline preload="metadata" src="${esc(video)}"></video>`;
    }
    if (poster) return `<img class="shot" alt="${esc(app.name)}" src="${esc(poster)}">`;
    const family = String(app.family || "bingo");
    const mark = app.edition || shortAppName(app) || app.name || "?";
    return `
      <div class="app-placeholder" data-family="${esc(family)}">
        <div class="app-placeholder-glow" aria-hidden="true"></div>
        <div class="app-placeholder-mark" aria-hidden="true">${esc(String(mark).slice(0, 12))}</div>
        <strong>${esc(appLabel(app))}</strong>
        <span>${esc(channelLabel(app))}</span>
      </div>
    `;
  }

  function previewMedia(url) {
    const value = String(url || "");
    if (value.startsWith("/uploads/") && !value.includes("..")) return value;
    if (/^https:\/\//i.test(value)) return value;
    return "";
  }

  const APP_FAMILIES = [
    ["bingo", "Bingo"],
    ["keno", "Keno"],
    ["spin", "Spin"],
  ];

  const APP_CHANNELS = {
    both: "Online & Offline",
    online: "Online",
    offline: "Offline",
    telegram: "Telegram",
  };

  function appGroups(apps) {
    return APP_FAMILIES.map(([id, label]) => ({
      id,
      label,
      items: apps.filter((app) => String(app.family || "bingo") === id),
    })).filter((group) => group.items.length);
  }

  function channelLabel(app) {
    return APP_CHANNELS[app.channel] || "Online & Offline";
  }

  function appLabel(app) {
    return app.edition ? `${app.name} · ${app.edition}` : app.name;
  }

  function shortAppName(app) {
    if (app.channel === "telegram") return app.edition || "Telegram";
    return String(app.name || "").replace(/\s*bingo\s*$/i, "").trim() || app.name;
  }

  function familyCaption(group) {
    if (group.id !== "bingo") return channelLabel(group.items[0]);
    const halls = group.items.some((app) => app.channel !== "telegram");
    const bots = group.items.some((app) => app.channel === "telegram");
    if (halls && bots) return "Halls & Telegram";
    if (bots) return "Telegram";
    return "Hall layouts";
  }

  function tabCaption(app) {
    if (app.channel === "telegram") return "Telegram bot";
    return channelLabel(app);
  }

  function usefulTagline(app) {
    const tag = String(app.tagline || "").trim();
    if (!tag) return "";
    if (tag === channelLabel(app)) return "";
    if (app.edition && tag === app.edition) return "";
    if (app.channel === "telegram" && /telegram/i.test(tag)) return "";
    if (/^hall layout$/i.test(tag)) return "";
    return tag;
  }

  function appPanelHtml(app, active) {
    const photos = (app.photos || []).map((url) => previewMedia(url)).filter(Boolean);
    const href = safeHref(app.link, "");
    const hasVideo = !!String(app.video || "").trim();
    const tagline = usefulTagline(app);
    return `
      <article class="app-panel ${active ? "active" : ""}" data-app-panel="${esc(String(app.id))}" ${active ? "" : "hidden"}>
        <div class="app-frame">${mediaFrame(app)}</div>
        <div class="app-copy">
          <div class="app-chips">
            <span class="app-chip">${esc(channelLabel(app))}</span>
            ${app.edition ? `<span class="app-chip soft">${esc(app.edition)}</span>` : ""}
          </div>
          <h3>${esc(appLabel(app))}</h3>
          ${tagline ? `<p class="app-tagline">${esc(tagline)}</p>` : ""}
          ${app.description ? `<p>${esc(app.description)}</p>` : ""}
          ${href ? `<a class="btn btn-primary" href="${esc(href)}"${externalAttrs(href)}>Open ${esc(app.name)}</a>` : ""}
        </div>
        ${photos.length || hasVideo ? `
          <div class="app-reel">
            ${hasVideo ? `<button type="button" class="reel-video" data-show-video="${esc(String(app.id))}">Video</button>` : ""}
            ${photos.map((url, shot) => `
              <button type="button" data-shot="${esc(url)}" aria-label="Photo ${shot + 1}">
                <img alt="" src="${esc(url)}">
              </button>
            `).join("")}
          </div>
        ` : ""}
      </article>
    `;
  }

  function appsBoard(apps) {
    const groups = appGroups(apps);
    if (!groups.length) return "";
    return `
      <div class="apps-board">
        <div class="app-families" role="tablist">
          ${groups.map((group, index) => `
            <button type="button" class="app-family ${index === 0 ? "active" : ""}" role="tab" data-family="${esc(group.id)}" aria-selected="${index === 0 ? "true" : "false"}">
              <strong>${esc(group.label)}</strong>
              <span>${esc(familyCaption(group))}</span>
            </button>
          `).join("")}
        </div>
        ${groups.map((group, groupIndex) => `
          <div class="app-family-panel" data-family-panel="${esc(group.id)}" ${groupIndex === 0 ? "" : "hidden"}>
            ${group.items.length > 1 ? `
              <div class="app-switch" role="tablist">
                ${group.items.map((app, index) => `
                  <button type="button" class="app-tab ${index === 0 ? "active" : ""}" role="tab" data-app="${esc(String(app.id))}" aria-selected="${index === 0 ? "true" : "false"}">
                    <strong>${esc(shortAppName(app))}</strong>
                    <span>${esc(tabCaption(app))}</span>
                  </button>
                `).join("")}
              </div>
            ` : ""}
            ${group.items.map((app, index) => appPanelHtml(app, index === 0)).join("")}
          </div>
        `).join("")}
      </div>
    `;
  }

  function mountApps(s, apps) {
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
          ${appsBoard(apps)}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  let appsReturnFocus = null;

  function openApps() {
    const modal = document.getElementById("appsModal");
    if (!modal) return;
    appsReturnFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("apps-open");
    const close = modal.querySelector(".apps-close");
    if (close) close.focus();
  }

  function closeApps() {
    const modal = document.getElementById("appsModal");
    if (!modal || modal.hidden) return;
    modal.querySelectorAll("video").forEach((node) => node.pause());
    modal.hidden = true;
    document.body.classList.remove("apps-open");
    if (appsReturnFocus && typeof appsReturnFocus.focus === "function") appsReturnFocus.focus();
  }

  function bindApps() {
    const root = document.getElementById("appsModal");
    if (!root || root.dataset.bound) return;
    root.dataset.bound = "1";
    root.addEventListener("click", (event) => {
      const family = event.target.closest("[data-family]");
      if (family) {
        const id = family.dataset.family;
        root.querySelectorAll(".app-family").forEach((item) => {
          const on = item.dataset.family === id;
          item.classList.toggle("active", on);
          item.setAttribute("aria-selected", on ? "true" : "false");
        });
        root.querySelectorAll(".app-family-panel").forEach((panel) => {
          const on = panel.dataset.familyPanel === id;
          panel.hidden = !on;
          if (!on) panel.querySelectorAll("video").forEach((node) => node.pause());
        });
        return;
      }
      const tab = event.target.closest(".app-tab");
      if (tab) {
        const id = tab.dataset.app;
        const familyPanel = tab.closest(".app-family-panel") || root;
        familyPanel.querySelectorAll(".app-tab").forEach((item) => {
          const on = item.dataset.app === id;
          item.classList.toggle("active", on);
          item.setAttribute("aria-selected", on ? "true" : "false");
        });
        familyPanel.querySelectorAll(".app-panel").forEach((panel) => {
          const on = panel.dataset.appPanel === id;
          panel.hidden = !on;
          panel.classList.toggle("active", on);
          if (!on) panel.querySelectorAll("video").forEach((node) => node.pause());
        });
        return;
      }
      const shot = event.target.closest("[data-shot]");
      if (shot) {
        const panel = shot.closest(".app-panel");
        const frame = panel.querySelector(".app-frame");
        frame.innerHTML = `<img class="shot" alt="" src="${shot.dataset.shot}">`;
        panel.querySelectorAll(".app-reel button").forEach((button) => button.classList.toggle("active", button === shot));
        return;
      }
      const videoButton = event.target.closest("[data-show-video]");
      if (!videoButton) return;
      const panel = videoButton.closest(".app-panel");
      const stored = panel.querySelector("[data-video-html]");
      if (stored) panel.querySelector(".app-frame").innerHTML = stored.innerHTML;
    });
    root.querySelectorAll(".app-panel").forEach((panel) => {
      const frame = panel.querySelector(".app-frame");
      if (!frame.querySelector("video, iframe")) return;
      const keep = document.createElement("template");
      keep.dataset.videoHtml = "1";
      keep.innerHTML = frame.innerHTML;
      panel.appendChild(keep);
    });
  }

  function productsHtml(s, products, apps) {
    const entertainment = apps.length
      ? `
        <button type="button" class="product product-apps reveal" id="apps" data-open-apps>
          <div class="product-number">${String(products.length + 1).padStart(2, "0")} / PRODUCT</div>
          <h3>Entertainment Apps</h3>
          <p>${esc(s.apps_text || "Bingo, Keno, and Spin — online and offline. Bingo includes named hall layouts and Telegram Normal and Super.")}</p>
          <span class="product-more">See more</span>
        </button>
      `
      : "";
    return `
      <section id="products">
        ${head(s.products_label, s.products_title, s.products_highlight, s.products_text)}
        <div class="products">
          ${products.map((product, index) => {
            const href = safeHref(product.link, "");
            const tag = href ? "a" : "div";
            const attrs = href ? ` href="${esc(href)}"${externalAttrs(href)}` : "";
            const number = String(index + 1).padStart(2, "0");
            return `
              <${tag} class="product reveal"${attrs}>
                <div class="product-number">${number} / PRODUCT</div>
                <h3>${esc(product.title)}</h3>
                <p>${esc(product.description)}</p>
                <div class="product-arrow">↗</div>
              </${tag}>
            `;
          }).join("")}
          ${entertainment}
        </div>
      </section>
    `;
  }

  function processHtml(s, steps) {
    return `
      <section id="process">
        ${head(s.process_label, s.process_title, s.process_highlight, s.process_text)}
        <div class="process-grid">
          ${steps.map((step, index) => `
            <div class="process-step reveal">
              <div class="process-number">${String(index + 1).padStart(2, "0")}</div>
              <h3>${esc(step.title)}</h3>
              <p>${esc(step.description)}</p>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function teamHtml(s, team) {
    return `
      <section id="developers">
        ${head(s.team_label, s.team_title, s.team_highlight, s.team_text)}
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

  function quotesHtml(s, quotes) {
    return `
      <section id="testimonials">
        ${head(s.testimonials_label, s.testimonials_title, s.testimonials_highlight, s.testimonials_text)}
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

  function pricingHtml(s, plans) {
    return `
      <section id="pricing">
        ${head(s.pricing_label, s.pricing_title, s.pricing_highlight, s.pricing_text)}
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

  function techHtml(s, technologies) {
    return `
      <section id="technology">
        ${head(s.tech_label, s.tech_title, s.tech_highlight, s.tech_text)}
        <div class="tech-box reveal">
          ${technologies.map((tech) => `<span class="tech">${esc(tech.name)}</span>`).join("")}
        </div>
      </section>
    `;
  }

  function faqHtml(s, faqs) {
    return `
      <section id="faq">
        ${head(s.faq_label, s.faq_title, s.faq_highlight, s.faq_text)}
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

  function contactItem(icon, label, value, href) {
    if (!value) return "";
    const inner = href ? `<a href="${esc(href)}">${esc(value)}</a>` : esc(value);
    return `
      <div class="contact-item">
        <div class="contact-item-icon">${icon}</div>
        <div>
          <div class="contact-item-label">${label}</div>
          <div class="contact-item-value">${inner}</div>
        </div>
      </div>
    `;
  }

  function contactHtml(s, services) {
    const options = services
      .map((service) => `<option value="${esc(service.title)}">${esc(service.title)}</option>`)
      .join("");
    const mail = s.email ? safeHref(`mailto:${s.email}`, "") : "";
    const phone = telHref(s.phone);

    return `
      <section id="contact">
        ${head(s.contact_label, s.contact_title, s.contact_highlight, s.contact_text)}
        <div class="contact-wrapper">
          <div class="contact-info reveal">
            ${s.contact_aside_title ? `<h3>${esc(s.contact_aside_title)}</h3>` : ""}
            ${s.contact_aside_text ? `<p>${esc(s.contact_aside_text)}</p>` : ""}
            ${contactItem("✉", "Email", s.email, mail)}
            ${contactItem("☎", "Phone", s.phone, phone)}
            ${contactItem("◎", "Location", s.location, "")}
          </div>
          <form class="contact-form reveal" id="contactForm">
            <div class="hp" aria-hidden="true">
              <label for="company_website">Website</label>
              <input id="company_website" name="company_website" tabindex="-1" autocomplete="off" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="name">Full Name</label>
                <input type="text" id="name" name="name" placeholder="Your name" required maxlength="80" />
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" placeholder="you@company.com" required maxlength="160" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="company">Company</label>
                <input type="text" id="company" name="company" placeholder="Optional" maxlength="120" />
              </div>
              <div class="form-group">
                <label for="service">Service</label>
                <select id="service" name="service">
                  <option value="">Select a service</option>
                  ${options}
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="message">Message</label>
              <textarea id="message" name="message" placeholder="Tell us about your project..." required maxlength="4000"></textarea>
            </div>
            <button type="submit" class="form-submit">Send Message →</button>
            <p class="form-status" id="formStatus" role="status"></p>
            ${s.form_note ? `<p class="form-note">${esc(s.form_note)}</p>` : ""}
          </form>
        </div>
      </section>
    `;
  }

  function ctaHtml(s) {
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

  function footerColumn(title, links) {
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

  function footerHtml(data) {
    const s = data.settings;
    const socials = [
      [s.social_x, "X", "𝕏"],
      [s.social_linkedin, "LinkedIn", "in"],
      [s.social_github, "GitHub", "⌨"],
      [s.social_telegram, "Telegram", "✈"],
    ].filter((item) => safeHref(item[0], ""));

    return `
      <div class="footer-grid">
        <div class="footer-col">
          <div class="footer-logo">${logoMark()}${esc(s.brand_name || "MARAKI")}</div>
          ${s.footer_blurb ? `<p>${esc(s.footer_blurb)}</p>` : ""}
          ${socials.length ? `
            <div class="footer-socials">
              ${socials.map((item) => {
                const href = safeHref(item[0], "#");
                return `<a class="footer-social" href="${esc(href)}" title="${esc(item[1])}"${externalAttrs(href)}>${item[2]}</a>`;
              }).join("")}
            </div>
          ` : ""}
        </div>
        ${footerColumn("Product", [
          { show: on(s, "show_solutions") && data.services.length, href: "#solutions", label: s.nav_solutions },
          { show: on(s, "show_products") && data.products.length, href: "#products", label: s.nav_products },
          { show: on(s, "show_apps") && data.apps && data.apps.length, href: "#apps", label: s.nav_apps || "Apps" },
          { show: on(s, "show_pricing") && data.pricing.length, href: "#pricing", label: s.nav_pricing },
          { show: on(s, "show_tech") && data.technologies.length, href: "#technology", label: "Technology" },
        ])}
        ${footerColumn("Company", [
          { show: on(s, "show_team") && data.team.length, href: "#developers", label: s.nav_team },
          { show: on(s, "show_process") && data.process.length, href: "#process", label: s.nav_process },
          { show: on(s, "show_testimonials") && data.testimonials.length, href: "#testimonials", label: "Testimonials" },
          { show: on(s, "show_faq") && data.faqs.length, href: "#faq", label: "FAQ" },
        ])}
        ${footerColumn("Contact", [
          { show: !!s.email, href: `mailto:${s.email}`, label: s.email },
          { show: on(s, "show_contact"), href: "#contact", label: "Get a Quote" },
          { show: on(s, "show_contact"), href: "#contact", label: "Support" },
        ])}
      </div>
      <div class="footer-bottom">
        <div class="footer-bottom-inner">
          <div>© ${new Date().getFullYear()} <span class="footer-brand">${esc(s.footer_brand || "Maraki Tech")}</span>. All rights reserved.</div>
          <div>${esc(s.footer_tagline || "")} · <a href="/admin">Admin</a></div>
        </div>
      </div>
    `;
  }

  function setupReveal() {
    if (revealObserver) revealObserver.disconnect();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
      return;
    }
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
  }

  function setupStats() {
    if (statObserver) statObserver.disconnect();
    statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          statObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll(".stat-number").forEach((el) => statObserver.observe(el));
  }

  function animateCount(el) {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || "";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || target <= 0) {
      el.textContent = `${target}${suffix}`;
      return;
    }
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function updateScroll() {
    const scrollY = window.scrollY;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    navbar.classList.toggle("scrolled", scrollY > 30);
    scrollProgress.style.width = `${height > 0 ? (scrollY / height) * 100 : 0}%`;
    backToTop.classList.toggle("visible", scrollY > 500);

    const links = [...navLinks.querySelectorAll('a[href^="#"]:not(.nav-cta)')];
    let current = "";
    const marker = scrollY + 140;
    links.forEach((link) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (target && target.offsetTop <= marker) current = link.getAttribute("href");
    });
    links.forEach((link) => {
      if (link.getAttribute("href") === current) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  function hideLoader() {
    const delay = Math.max(0, 380 - (performance.now() - started));
    setTimeout(() => {
      const loader = document.getElementById("pageLoader");
      loader.classList.add("hide");
      loader.setAttribute("aria-hidden", "true");
    }, delay);
  }

  function showError() {
    page.innerHTML = `
      <div class="load-error">
        <div>
          <div class="section-label">Connection</div>
          <h1 class="section-title">The page didn't load.</h1>
          <p class="section-description" style="margin: 18px auto 0;">Refresh and try again.</p>
        </div>
      </div>
    `;
    hideLoader();
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-open-apps]")) {
      openApps();
      return;
    }
    const closer = event.target.closest("[data-close-apps]");
    if (closer && (closer.classList.contains("apps-close") || event.target === closer)) {
      closeApps();
      return;
    }

    const question = event.target.closest(".faq-question");
    if (question) {
      const item = question.closest(".faq-item");
      const open = item.classList.contains("open");
      document.querySelectorAll(".faq-item").forEach((node) => node.classList.remove("open"));
      if (!open) item.classList.add("open");
      return;
    }

    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;
    const target = document.querySelector(anchor.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    navLinks.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    window.scrollTo({ top: target.offsetTop - 78, behavior: "smooth" });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeApps();
  });

  document.addEventListener("submit", async (event) => {
    if (event.target.id !== "contactForm") return;
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector(".form-submit");
    const status = document.getElementById("formStatus");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Sending...";
    status.className = "form-status";
    status.textContent = "";

    const payload = {
      name: form.name.value,
      email: form.email.value,
      company: form.company.value,
      service: form.service.value,
      message: form.message.value,
      company_website: form.company_website.value,
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send the message.");
      form.reset();
      button.textContent = "Message Sent ✓";
      status.className = "form-status ok";
      status.textContent = "Thanks. We'll get back to you within 24 hours.";
      setTimeout(() => {
        button.textContent = original;
        button.disabled = false;
      }, 2200);
    } catch (error) {
      button.textContent = original;
      button.disabled = false;
      status.className = "form-status error";
      status.textContent = error.message;
    }
  });

  const themeToggle = document.getElementById("themeToggle");

  function paintTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("maraki-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f3f6f3" : "#050806");
    if (themeToggle) {
      const next = theme === "dark" ? "light" : "dark";
      themeToggle.textContent = theme === "dark" ? "☀" : "☾";
      themeToggle.setAttribute("aria-label", `Switch to ${next} theme`);
    }
  }

  paintTheme(document.documentElement.dataset.theme || "dark");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      paintTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
    });
  }

  menuBtn.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateScroll();
      ticking = false;
    });
  }, { passive: true });

  async function load() {
    try {
      const response = await fetch("/api/content", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("load failed");
      render(await response.json());
      hideLoader();
    } catch (error) {
      showError();
    }
  }

  load();
})();
