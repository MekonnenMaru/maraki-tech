// Page chrome that is always there: the loader, scroll progress bar, sticky menu,
// mobile menu button, back-to-top button and the light/dark theme switch.

const navbar = document.getElementById("navbar");
const navLinks = document.getElementById("navLinks");
const menuButton = document.getElementById("menuBtn");
const progressBar = document.getElementById("scrollProgress");
const backToTop = document.getElementById("backToTop");
const themeButton = document.getElementById("themeToggle");

const NAV_HEIGHT = 78;

/* ---------- Loader ---------- */

export function hideLoader() {
  const loader = document.getElementById("pageLoader");
  loader.classList.add("hide");
  loader.setAttribute("aria-hidden", "true");
}

/* ---------- Scrolling ---------- */

// Highlights the menu link of the section currently on screen.
function markCurrentSection() {
  const links = [...navLinks.querySelectorAll('a[href^="#"]:not(.nav-cta)')];
  const line = window.scrollY + 140;
  let current = "";
  links.forEach((link) => {
    const section = document.querySelector(link.getAttribute("href"));
    if (section && section.offsetTop <= line) current = link.getAttribute("href");
  });
  links.forEach((link) => link.toggleAttribute("aria-current", link.getAttribute("href") === current));
}

export function updateOnScroll() {
  const y = window.scrollY;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  navbar.classList.toggle("scrolled", y > 30);
  progressBar.style.width = `${scrollable > 0 ? (y / scrollable) * 100 : 0}%`;
  backToTop.classList.toggle("visible", y > 500);
  markCurrentSection();
}

export function closeMobileMenu() {
  navLinks.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
}

// Smooth-scrolls to a section, leaving room for the fixed menu bar.
export function scrollToSection(section) {
  closeMobileMenu();
  window.scrollTo({ top: section.offsetTop - NAV_HEIGHT, behavior: "smooth" });
}

/* ---------- Theme ---------- */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("maraki-theme", theme);
  } catch {
    /* ignore */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f3f6f3" : "#050806");
  themeButton.textContent = theme === "dark" ? "☀" : "☾";
  themeButton.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
}

/* ---------- Start ---------- */

export function startPageUi() {
  applyTheme(document.documentElement.dataset.theme || "dark");
  themeButton.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  });

  menuButton.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });

  backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  let waiting = false;
  window.addEventListener(
    "scroll",
    () => {
      if (waiting) return;
      waiting = true;
      requestAnimationFrame(() => {
        updateOnScroll();
        waiting = false;
      });
    },
    { passive: true }
  );
}
