const buckets = new Map();

function bucket(name, key, windowMs) {
  const id = `${name}:${key}`;
  const now = Date.now();
  const hits = (buckets.get(id) || []).filter((time) => now - time < windowMs);
  if (!hits.length) buckets.delete(id);
  else buckets.set(id, hits);
  return { id, hits };
}

function limited(name, key, limit, windowMs) {
  return bucket(name, key, windowMs).hits.length >= limit;
}

function strike(name, key, windowMs) {
  const current = bucket(name, key, windowMs);
  current.hits.push(Date.now());
  buckets.set(current.id, current.hits);
}

function clear(name, key) {
  buckets.delete(`${name}:${key}`);
}

module.exports = { limited, strike, clear };
