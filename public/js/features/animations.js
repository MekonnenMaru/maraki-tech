// Fade-in on scroll (any element with class "reveal") and counting stat numbers.

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let revealWatcher = null;
let statsWatcher = null;

// Runs `action` once for each element the first time it scrolls into view.
function whenVisible(selector, threshold, action) {
  const watcher = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        action(entry.target);
        watcher.unobserve(entry.target);
      });
    },
    { threshold }
  );
  document.querySelectorAll(selector).forEach((el) => watcher.observe(el));
  return watcher;
}

function countUp(el) {
  const target = Number(el.dataset.count) || 0;
  const suffix = el.dataset.suffix || "";
  if (reducedMotion() || target <= 0) {
    el.textContent = `${target}${suffix}`;
    return;
  }

  const duration = 1200;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = `${Math.round(target * eased)}${suffix}`;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function startAnimations() {
  revealWatcher?.disconnect();
  statsWatcher?.disconnect();

  if (reducedMotion()) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
  } else {
    revealWatcher = whenVisible(".reveal", 0.12, (el) => el.classList.add("visible"));
  }
  statsWatcher = whenVisible(".stat-number", 0.5, countUp);
}
