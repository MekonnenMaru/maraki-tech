const base = "http://localhost:3000";

async function main() {
  const health = await fetch(`${base}/api/health`);
  console.log("health", health.status, await health.json());

  const contentRes = await fetch(`${base}/api/content`);
  const content = await contentRes.json();
  console.log("content", contentRes.status, {
    brand: content.settings.brand_name,
    services: content.services.map((item) => item.title),
    products: content.products.map((item) => item.title),
    pricingShown: content.settings.show_pricing,
    plans: content.pricing.length,
    faqs: content.faqs.length,
  });

  const bad = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "A", email: "nope", message: "hi" }),
  });
  console.log("bad contact", bad.status, await bad.json());

  const sent = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Visitor",
      email: "visitor@example.com",
      company: "Example Co",
      service: "Software Development",
      message: "We need a payment dashboard for our stores.",
    }),
  });
  console.log("contact", sent.status, await sent.json());

  const honeypot = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Bot",
      email: "bot@example.com",
      message: "buy cheap followers now please",
      company_website: "http://spam.example",
    }),
  });
  console.log("honeypot", honeypot.status, await honeypot.json());

  const denied = await fetch(`${base}/api/admin/services`);
  console.log("admin locked", denied.status, await denied.json());

  const login = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const cookie = login.headers.get("set-cookie");
  console.log("login", login.status, await login.json());
  const sid = cookie.split(";")[0];

  const dash = await fetch(`${base}/api/admin/dashboard`, { headers: { cookie: sid } });
  const dashboard = await dash.json();
  console.log("dashboard", dash.status, {
    unread: dashboard.messages.unread,
    week: dashboard.visits.week,
    services: dashboard.counts.services,
  });

  const messages = await fetch(`${base}/api/admin/messages`, { headers: { cookie: sid } });
  const inbox = await messages.json();
  console.log(
    "inbox",
    inbox.messages.map((item) => item.name),
    "unread",
    inbox.counts.unread
  );
  for (const message of inbox.messages) {
    if (message.email === "visitor@example.com") {
      const gone = await fetch(`${base}/api/admin/messages/${message.id}`, {
        method: "DELETE",
        headers: { cookie: sid },
      });
      console.log("removed test message", gone.status);
    }
  }

  const created = await fetch(`${base}/api/admin/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: sid },
    body: JSON.stringify({
      icon: "✦",
      title: "Temporary Service",
      description: "Created by the smoke test and removed immediately.",
    }),
  });
  const service = await created.json();
  console.log("created", created.status, service.title, service.id);

  const removed = await fetch(`${base}/api/admin/services/${service.id}`, {
    method: "DELETE",
    headers: { cookie: sid },
  });
  console.log("deleted", removed.status, await removed.json());

  const home = await fetch(`${base}/`);
  const html = await home.text();
  console.log("home", home.status, html.includes('id="page"'), html.includes("/js/main.js"));

  const admin = await fetch(`${base}/admin`);
  const adminHtml = await admin.text();
  console.log("admin page", admin.status, adminHtml.includes("Maraki Admin"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
