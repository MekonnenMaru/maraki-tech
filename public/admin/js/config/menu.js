// The sidebar menu. Each entry is [page id, label, icon].
// Page ids match a page file in ../pages or a list in lists.js.

export const MENU = [
  {
    title: "Main",
    items: [
      ["dashboard", "Overview", "dashboard"],
      ["messages", "Inbox", "inbox"],
      ["telegram", "Telegram alerts", "send"], // feature in src/telegram-bot/
    ],
  },
  {
    title: "Website",
    items: [
      ["profile", "Company profile", "building"],
      ["content", "Site settings", "settings"],
      ["privacy", "Privacy policy", "shield"],
      ["socials", "Social links", "share"],
      ["stats", "Stats", "chart"],
      ["services", "Services", "layers"],
      ["products", "Products", "box"],
      ["pricing", "Pricing", "tag"],
    ],
  },
  {
    title: "Company",
    items: [
      ["process", "Process", "steps"],
      ["team", "Team", "users"],
      ["testimonials", "Testimonials", "quote"],
      ["faqs", "FAQ", "help"],
      ["technologies", "Technology", "code"],
    ],
  },
  {
    title: "Apps",
    items: [["apps", "Entertainment", "game"]],
  },
  {
    title: "Account",
    items: [["account", "Password", "lock"]],
  },
];

export function pageLabel(id) {
  for (const group of MENU) {
    const found = group.items.find(([key]) => key === id);
    if (found) return found[1];
  }
  return "Admin";
}
