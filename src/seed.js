const { DEFAULT_SETTINGS } = require("./settings");

async function seed(db) {
  const settingsCount = await db.queryOne("SELECT COUNT(*) AS count FROM settings");
  if (Number(settingsCount?.count || 0) > 0) return;

  await db.withTransaction(async (tx) => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await tx.execute("INSERT INTO settings (`key`, value) VALUES (?, ?)", [key, value]);
    }

    const stats = [
      [50, "+", "Projects Delivered"],
      [30, "+", "Happy Clients"],
      [99, "%", "% Uptime"],
      [5, "+", "Years Experience"],
    ];
    for (const [index, row] of stats.entries()) {
      await tx.execute(
        "INSERT INTO stats (value, suffix, label, sort_order, visible) VALUES (?, ?, ?, ?, 1)",
        [...row, index]
      );
    }

    const services = [
      ["⌘", "Software Development", "Modern web applications, APIs, dashboards and custom business systems built around your needs."],
      ["$", "Payment Technology", "Digital payment and verification solutions designed for modern businesses."],
      ["⚡", "Automation", "Automate repetitive operations and connect systems to make your business faster and smarter."],
    ];
    for (const [index, row] of services.entries()) {
      await tx.execute(
        "INSERT INTO services (icon, title, description, sort_order, visible) VALUES (?, ?, ?, ?, 1)",
        [...row, index]
      );
    }

    const products = [
      ["Maraki Pay", "Payment verification and digital payment technology for modern businesses.", ""],
      ["Business Systems", "Custom platforms that help businesses manage their operations from one place.", ""],
    ];
    for (const [index, row] of products.entries()) {
      await tx.execute(
        "INSERT INTO products (title, description, link, sort_order, visible) VALUES (?, ?, ?, ?, 1)",
        [...row, index]
      );
    }

    const process = [
      ["Discover", "We listen, ask questions, and understand your goals, users, and constraints."],
      ["Design", "We map the architecture, design the experience, and plan every detail."],
      ["Build", "We develop, test, and iterate — shipping reliable software on schedule."],
      ["Launch & Scale", "We deploy, monitor, and support — helping your product grow with confidence."],
    ];
    for (const [index, row] of process.entries()) {
      await tx.execute(
        "INSERT INTO process_steps (title, description, sort_order, visible) VALUES (?, ?, ?, 1)",
        [...row, index]
      );
    }

    const team = [
      ["Abel Tesfaye", "Founder & Lead Engineer", "Full-stack architect focused on scalable systems and payment infrastructure.", ["Node.js", "TypeScript", "MySQL"], "A"],
      ["Sara Mekonnen", "Product & Frontend", "Crafts clean, fast interfaces that turn complex workflows into simple experiences.", ["React", "UI/UX", "CSS"], "S"],
      ["Daniel Bekele", "Backend & DevOps", "Builds reliable APIs and keeps our cloud infrastructure running smoothly at scale.", ["APIs", "Cloud", "DevOps"], "D"],
    ];
    for (const [index, row] of team.entries()) {
      await tx.execute(
        `INSERT INTO team_members
          (name, role, bio, skills, avatar_letter, avatar_image, sort_order, visible)
         VALUES (?, ?, ?, ?, ?, '', ?, 1)`,
        [row[0], row[1], row[2], JSON.stringify(row[3]), row[4], index]
      );
    }

    const quotes = [
      ["Maraki Tech delivered our payment platform ahead of schedule. Their attention to detail and communication were outstanding.", "Hanna Girma", "CEO, Addis Commerce", "H"],
      ["We needed a custom business system fast. Maraki built exactly what we needed — clean, scalable, and easy to use.", "Michael Assefa", "Founder, Nile Logistics", "M"],
      ["Their team feels like an extension of ours. Reliable, thoughtful, and genuinely invested in our success.", "Rahel Tadesse", "CTO, Sheba Fintech", "R"],
    ];
    for (const [index, row] of quotes.entries()) {
      await tx.execute(
        `INSERT INTO testimonials
          (quote, name, company, avatar_letter, avatar_image, sort_order, visible)
         VALUES (?, ?, ?, ?, '', ?, 1)`,
        [...row, index]
      );
    }

    const tech = ["Node.js", "TypeScript", "JavaScript", "React", "REST APIs", "MySQL", "PostgreSQL", "Cloud", "Docker", "Automation", "Payment Systems", "DevOps"];
    for (const [index, name] of tech.entries()) {
      await tx.execute(
        "INSERT INTO technologies (name, sort_order, visible) VALUES (?, ?, 1)",
        [name, index]
      );
    }

    const faqs = [
      ["What kind of projects do you take on?", "We build web applications, payment systems, business platforms, dashboards, APIs, and custom automation tools. If it's software that solves a real problem, we're interested."],
      ["How long does a typical project take?", "Small projects can be delivered in 1-2 weeks. Full-stack applications typically take 4-8 weeks depending on scope. We'll give you a clear timeline before we start."],
      ["Do you offer ongoing support?", "Yes. Every project includes a support period after launch, and we offer ongoing maintenance and scaling partnerships for clients who need long-term help."],
      ["How do we get started?", "Reach out through the contact form or email us at hello@maraki.tech. We'll schedule a call to discuss your goals, timeline, and budget — no pressure, no obligation."],
      ["Do you work with international clients?", "Absolutely. We work with clients across Africa, Europe, and North America. All communication is in English, and we're flexible with time zones."],
    ];
    for (const [index, row] of faqs.entries()) {
      await tx.execute(
        "INSERT INTO faqs (question, answer, sort_order, visible) VALUES (?, ?, ?, 1)",
        [...row, index]
      );
    }

    const plans = [
      ["Starter", "$1,500", "/project", "Perfect for small projects and MVPs.", ["Single-page or small web app", "Responsive design", "Basic API integration", "2 weeks delivery", "30 days support"], 0, "", "Get Started"],
      ["Growth", "$4,500", "/project", "For growing businesses that need more.", ["Full-stack web application", "Payment integration", "Admin dashboard", "Custom API development", "4-6 weeks delivery", "90 days support"], 1, "Most Popular", "Get Started"],
      ["Enterprise", "Custom", "", "Tailored solutions for complex needs.", ["Multi-platform systems", "Scalable cloud architecture", "Dedicated team", "DevOps & monitoring", "Ongoing partnership", "Priority support"], 0, "", "Contact Us"],
    ];
    for (const [index, row] of plans.entries()) {
      await tx.execute(
        `INSERT INTO pricing_plans
          (name, amount, period, description, features, featured, badge, button_text, sort_order, visible)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [row[0], row[1], row[2], row[3], JSON.stringify(row[4]), row[5], row[6], row[7], index]
      );
    }
  });
}

module.exports = { seed };
