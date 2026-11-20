// Decides which sections appear on the page.
// A section shows when it is switched on in the admin (Visibility) AND has content.
// The page, the top menu and the footer all use this, so they always agree.

function isOn(settings, key) {
  return settings[key] === "1";
}

export function visibleSections(data) {
  const s = data.settings;
  const has = (list) => Array.isArray(list) && list.length > 0;

  const products = isOn(s, "show_products") && has(data.products);
  const apps = isOn(s, "show_apps") && has(data.apps);

  return {
    stats: isOn(s, "show_stats") && has(data.stats),
    solutions: isOn(s, "show_solutions") && has(data.services),
    products,
    apps,
    productsArea: products || apps,
    process: isOn(s, "show_process") && has(data.process),
    team: isOn(s, "show_team") && has(data.team),
    testimonials: isOn(s, "show_testimonials") && has(data.testimonials),
    pricing: isOn(s, "show_pricing") && has(data.pricing),
    tech: isOn(s, "show_tech") && has(data.technologies),
    faq: isOn(s, "show_faq") && has(data.faqs),
    contact: isOn(s, "show_contact"),
    cta: isOn(s, "show_cta"),
  };
}
