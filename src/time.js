// Dates in the company's time zone (Company profile → Time zone).
// A "day" is { year, month, day } as seen on a clock in that time zone.

// Any IANA time zone the server knows ("Africa/Addis_Ababa", "Europe/London", …), otherwise UTC.
function validZone(zone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return "UTC";
  }
}

// The calendar day (and weekday) of a moment, in a time zone.
function dayIn(zone, date = new Date()) {
  const parts = {};
  new Intl.DateTimeFormat("en-US", {
    timeZone: validZone(zone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  })
    .formatToParts(date)
    .forEach((part) => {
      parts[part.type] = part.value;
    });
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), weekday: parts.weekday };
}

function addDays(day, count) {
  const utc = new Date(Date.UTC(day.year, day.month - 1, day.day + count));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

// "2026-11-20"
function dayKey(day) {
  return `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
}

// Today's date in the time zone, "YYYY-MM-DD".
function todayIn(zone) {
  return dayKey(dayIn(zone));
}

// "Mon" / "Nov" for a calendar day (the same everywhere, so no time zone needed).
function dayLabel(day, options) {
  return new Date(Date.UTC(day.year, day.month - 1, day.day, 12)).toLocaleDateString("en-US", { timeZone: "UTC", ...options });
}

module.exports = { validZone, dayIn, addDays, dayKey, todayIn, dayLabel };
