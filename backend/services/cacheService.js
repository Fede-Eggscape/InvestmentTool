// Simple in-memory cache with TTL
const cache = new Map();

function get(key, options = {}) {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now > entry.expiresAt) {
    if (options.allowExpired) {
      return { ...entry.data, _stale: true };
    }
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function set(key, data, ttlMs) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    createdAt: Date.now(),
  });
}

function invalidate(key) {
  cache.delete(key);
}

function getStats() {
  const now = Date.now();
  const stats = {};
  for (const [key, entry] of cache.entries()) {
    stats[key] = {
      ttlRemaining: Math.max(0, entry.expiresAt - now),
      isExpired: now > entry.expiresAt,
    };
  }
  return stats;
}

module.exports = { get, set, invalidate, getStats };
