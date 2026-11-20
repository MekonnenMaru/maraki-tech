// Page visit counter for the dashboard chart. Days are counted in Nairobi time (EAT).
const { query, execute, count } = require("./connection");

function nairobiParts(date = new Date()) {
  const bag = {};
  new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date).forEach((part) => {
    bag[part.type] = part.value;
  });
  return { year: Number(bag.year), month: Number(bag.month), day: Number(bag.day), weekday: bag.weekday };
}

function shiftNairobi(parts, days) {
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

function dayKeyFromParts(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function dayKey(date) {
  return dayKeyFromParts(nairobiParts(date));
}

async function recordVisit() {
  const now = new Date();
  await execute("INSERT INTO visits (day, created_at) VALUES (?, ?)", [dayKey(now), now.toISOString()]);
}

// Visits per day (or per month for long ranges) for the dashboard chart.
async function visitStats({ from = null, to = null } = {}) {
  const total = await count("SELECT COUNT(*) AS count FROM visits");
  const today = nairobiParts();
  const start = from ? nairobiParts(new Date(from)) : shiftNairobi(today, -6);
  const end = to ? nairobiParts(new Date(to)) : shiftNairobi(today, 1);
  const startKey = dayKeyFromParts(start);
  const endKey = dayKeyFromParts(end);
  const rows = await query(
    "SELECT day, COUNT(*) AS count FROM visits WHERE day >= ? AND day < ? GROUP BY day",
    [startKey, endKey]
  );
  let dayCount = 0;
  let walker = start;
  while (dayKeyFromParts(walker) < endKey && dayCount < 400) {
    dayCount += 1;
    walker = shiftNairobi(walker, 1);
  }
  const monthly = dayCount > 45;

  if (monthly) {
    const buckets = [];
    let cursor = { year: start.year, month: start.month, day: 1 };
    while (buckets.length < 24) {
      const monthStart = dayKeyFromParts(cursor);
      const next = {
        year: cursor.month === 12 ? cursor.year + 1 : cursor.year,
        month: cursor.month === 12 ? 1 : cursor.month + 1,
        day: 1,
      };
      if (monthStart >= endKey) break;
      const labelDate = new Date(Date.UTC(cursor.year, cursor.month - 1, 1) - 3 * 60 * 60 * 1000);
      buckets.push({
        day: monthStart.slice(0, 7),
        label: labelDate.toLocaleDateString("en-US", { timeZone: "Africa/Nairobi", month: "short" }),
        count: 0,
      });
      cursor = next;
    }
    rows.forEach((row) => {
      const bucket = buckets.find((item) => item.day === row.day.slice(0, 7));
      if (bucket) bucket.count += Number(row.count);
    });
    return { total, week: buckets.reduce((sum, item) => sum + item.count, 0), series: buckets };
  }

  const counts = Object.fromEntries(rows.map((row) => [row.day, Number(row.count)]));
  const series = [];
  let cursor = start;
  while (dayKeyFromParts(cursor) < endKey && series.length < 45) {
    const day = dayKeyFromParts(cursor);
    const labelDate = new Date(Date.UTC(cursor.year, cursor.month - 1, cursor.day) - 3 * 60 * 60 * 1000);
    series.push({
      day,
      label: dayCount <= 14
        ? labelDate.toLocaleDateString("en-US", { timeZone: "Africa/Nairobi", weekday: "short" })
        : String(cursor.day),
      count: counts[day] || 0,
    });
    cursor = shiftNairobi(cursor, 1);
  }
  return { total, week: series.reduce((sum, item) => sum + item.count, 0), series };
}

module.exports = { recordVisit, visitStats };
