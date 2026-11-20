// Page visit counter for the dashboard chart.
// Days are counted in the company's time zone (Company profile → Time zone).
const { query, execute, count } = require("./connection");
const { dayIn, addDays, dayKey, dayLabel } = require("../time");

async function recordVisit(zone) {
  const now = new Date();
  await execute("INSERT INTO visits (day, created_at) VALUES (?, ?)", [dayKey(dayIn(zone, now)), now.toISOString()]);
}

// Visits per day (or per month for long ranges) for the dashboard chart.
async function visitStats({ from = null, to = null, zone = "UTC" } = {}) {
  const total = await count("SELECT COUNT(*) AS count FROM visits");
  const today = dayIn(zone);
  const start = from ? dayIn(zone, new Date(from)) : addDays(today, -6);
  const end = to ? dayIn(zone, new Date(to)) : addDays(today, 1);
  const startKey = dayKey(start);
  const endKey = dayKey(end);
  const rows = await query(
    "SELECT day, COUNT(*) AS count FROM visits WHERE day >= ? AND day < ? GROUP BY day",
    [startKey, endKey]
  );

  let dayCount = 0;
  for (let walker = start; dayKey(walker) < endKey && dayCount < 400; walker = addDays(walker, 1)) dayCount += 1;

  // Long ranges: one bar per month.
  if (dayCount > 45) {
    const buckets = [];
    let cursor = { year: start.year, month: start.month, day: 1 };
    while (buckets.length < 24 && dayKey(cursor) < endKey) {
      buckets.push({ day: dayKey(cursor).slice(0, 7), label: dayLabel(cursor, { month: "short" }), count: 0 });
      cursor = cursor.month === 12 ? { year: cursor.year + 1, month: 1, day: 1 } : { year: cursor.year, month: cursor.month + 1, day: 1 };
    }
    rows.forEach((row) => {
      const bucket = buckets.find((item) => item.day === row.day.slice(0, 7));
      if (bucket) bucket.count += Number(row.count);
    });
    return { total, week: buckets.reduce((sum, item) => sum + item.count, 0), series: buckets };
  }

  // Otherwise one bar per day (weekday names for up to two weeks, day numbers after that).
  const counts = Object.fromEntries(rows.map((row) => [row.day, Number(row.count)]));
  const series = [];
  for (let cursor = start; dayKey(cursor) < endKey && series.length < 45; cursor = addDays(cursor, 1)) {
    const day = dayKey(cursor);
    series.push({
      day,
      label: dayCount <= 14 ? dayLabel(cursor, { weekday: "short" }) : String(cursor.day),
      count: counts[day] || 0,
    });
  }
  return { total, week: series.reduce((sum, item) => sum + item.count, 0), series };
}

module.exports = { recordVisit, visitStats };
