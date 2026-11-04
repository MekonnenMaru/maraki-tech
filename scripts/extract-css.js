const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html.html"), "utf8");
const match = html.match(/<style>([\s\S]*?)<\/style>/);

if (!match) {
  console.error("Could not find the style block in index.html.html");
  process.exit(1);
}

const outDir = path.join(root, "public", "css");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "style.css"), match[1].trim() + "\n");
console.log("Wrote public/css/style.css");
