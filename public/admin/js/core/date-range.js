// The "Date" filter used on the Overview and Inbox pages.
// All days run midnight to midnight in Nairobi time (EAT, UTC+3).
import { esc } from "./util.js";
import { icon } from "./icons.js";
import { openModal, closeModal, modalElement } from "./modal.js";
import { registerChanges, registerForms } from "./actions.js";

export const ZONE = "Africa/Nairobi";

const OPTIONS = [
  ["all", "All time"],
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["this-week", "This week"],
  ["last-week", "Last week"],
  ["this-month", "This month"],
  ["last-month", "Last month"],
  ["this-year", "This year"],
  ["last-year", "Last year"],
  ["custom", "Custom…"],
];

const WEEKDAY = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

// Shared by both pages, so switching pages keeps the same range.
const range = { preset: "all", from: "", to: "" };
let reload = () => {};

/* ---------- Date math (in Nairobi time) ---------- */

export function nairobiNow(date = new Date()) {
  const parts = {};
  new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .forEach((part) => {
      parts[part.type] = part.value;
    });
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    weekday: parts.weekday,
  };
}

function addDays(day, count) {
  const utc = new Date(Date.UTC(day.year, day.month - 1, day.day + count));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

function midnight(day) {
  return new Date(Date.UTC(day.year, day.month - 1, day.day) - 3 * 60 * 60 * 1000);
}

function parseDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").slice(0, 10));
  if (!match) return null;
  const day = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const check = new Date(Date.UTC(day.year, day.month - 1, day.day));
  if (check.getUTCMonth() + 1 !== day.month || check.getUTCDate() !== day.day) return null;
  return day;
}

const dayNumber = (day) => day.year * 10000 + day.month * 100 + day.day;
const pad = (n) => String(n).padStart(2, "0");

function todayText() {
  const today = nairobiNow();
  return `${today.year}-${pad(today.month)}-${pad(today.day)}`;
}

function shortDate(day) {
  return midnight(day).toLocaleDateString("en-US", { timeZone: ZONE, month: "short", day: "numeric" });
}

export function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { timeZone: ZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/* ---------- The selected range ---------- */

// Returns { from, to } as ISO strings, null for "All time", or { pending: true }.
export function rangeQuery() {
  const today = nairobiNow();
  const span = (start, end) => ({ from: midnight(start).toISOString(), to: midnight(end).toISOString() });
  const weekStart = addDays(today, -WEEKDAY[today.weekday]);

  switch (range.preset) {
    case "today": return span(today, addDays(today, 1));
    case "yesterday": return span(addDays(today, -1), today);
    case "this-week": return span(weekStart, addDays(weekStart, 7));
    case "last-week": return span(addDays(weekStart, -7), weekStart);
    case "this-month": return span({ ...today, day: 1 }, { year: today.year, month: today.month + 1, day: 1 });
    case "last-month": return span({ year: today.year, month: today.month - 1, day: 1 }, { ...today, day: 1 });
    case "this-year": return span({ year: today.year, month: 1, day: 1 }, { year: today.year + 1, month: 1, day: 1 });
    case "last-year": return span({ year: today.year - 1, month: 1, day: 1 }, { year: today.year, month: 1, day: 1 });
    case "custom": {
      const from = parseDay(range.from);
      const to = parseDay(range.to);
      if (!from || !to || dayNumber(to) < dayNumber(from)) return { pending: true };
      return span(from, addDays(to, 1));
    }
    default: return null;
  }
}

export function rangeLabel() {
  if (range.preset === "custom") {
    const from = parseDay(range.from);
    const to = parseDay(range.to);
    if (from && to) return dayNumber(from) === dayNumber(to) ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`;
  }
  return (OPTIONS.find(([value]) => value === range.preset) || OPTIONS[0])[1];
}

export function isAllTime() {
  return range.preset === "all";
}

/* ---------- The control ---------- */

// Renders the date picker. `onChange` reloads the page's data.
export function rangePicker(onChange) {
  reload = onChange;
  return `
    <label class="range-picker">
      ${icon("calendar")}
      <select data-change="range-preset" aria-label="Date range">
        ${OPTIONS.map(([value, label]) => {
          const text = value === "custom" && range.preset === "custom" ? rangeLabel() : label;
          return `<option value="${value}" ${value === range.preset ? "selected" : ""}>${esc(text)}</option>`;
        }).join("")}
      </select>
    </label>
  `;
}

function openCustomRange(select) {
  openModal(
    `
    <form data-form="custom-range">
      <h3>Custom range</h3>
      <p class="muted">Each day runs from midnight to midnight, East Africa Time.</p>
      <div class="form-grid two">
        <label class="field"><span>From</span><input type="date" name="from" value="${esc(range.from || todayText())}" required></label>
        <label class="field"><span>To</span><input type="date" name="to" value="${esc(range.to || todayText())}" required></label>
      </div>
      <p class="form-error" role="alert"></p>
      <div class="modal-actions">
        <button class="btn ghost" type="button" data-action="close-modal">Cancel</button>
        <button class="btn primary" type="submit">Apply</button>
      </div>
    </form>
  `,
    {
      size: "small",
      // Cancelled → put the dropdown back on the previous choice.
      whenClosed: () => {
        if (select.isConnected) select.value = range.preset;
      },
    }
  );
}

registerChanges({
  "range-preset": (select) => {
    if (select.value === "custom") return openCustomRange(select);
    range.preset = select.value;
    reload();
  },
});

registerForms({
  "custom-range": (form) => {
    const from = parseDay(form.elements.from.value);
    const to = parseDay(form.elements.to.value);
    const error = modalElement().querySelector(".form-error");
    if (!from || !to) return (error.textContent = "Choose a start and end date.");
    if (dayNumber(to) < dayNumber(from)) return (error.textContent = "The end date must be on or after the start date.");
    range.preset = "custom";
    range.from = form.elements.from.value;
    range.to = form.elements.to.value;
    closeModal();
    reload();
  },
});
