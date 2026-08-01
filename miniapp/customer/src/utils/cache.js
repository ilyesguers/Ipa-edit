/**
 * ⚡ Lightweight stale-while-revalidate cache for API requests.
 *
 * Fixes tab-switching lag: KEYS / ORDERS / PROFILE tabs used to fire a fresh
 * network request on every mount. Now the first visit caches the payload and
 * later visits resolve instantly from memory while a background refresh keeps
 * the data fresh (stale-while-revalidate pattern, like SWR / React Query).
 *
 * Optional localStorage persistence (`persist: true`) makes read-only data
 * (keys, orders) appear instantly even after a full app reload.
 */

const store = new Map(); // key -> { data, at }
const PERSIST_PREFIX = 'cache:';

const DEFAULT_TTL = 60 * 1000; // 60s

function readPersisted(key) {
  try {
    const raw = localStorage.getItem(`${PERSIST_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function writePersisted(key, data) {
  try {
    localStorage.setItem(`${PERSIST_PREFIX}${key}`, JSON.stringify({ data, at: Date.now() }));
  } catch (_) { /* storage full / private mode — ignore */ }
}

function dropPersisted(key) {
  try { localStorage.removeItem(`${PERSIST_PREFIX}${key}`); } catch (_) {}
}

/**
 * Fetch with cache. Resolves immediately with cached data when fresh.
 * When stale, resolves with the stale data and revalidates in the background.
 * When missing, performs the request and stores the result.
 */
export async function cachedFetch(key, fetcher, ttl = DEFAULT_TTL, { persist = false } = {}) {
  const hit = store.get(key) || (persist ? readPersisted(key) : null);

  // Fresh hit → instant resolve, zero network
  if (hit && Date.now() - hit.at < ttl) return hit.data;

  // Stale hit → return cached copy now, refresh in the background
  if (hit) {
    fetcher()
      .then((data) => {
        store.set(key, { data, at: Date.now() });
        if (persist) writePersisted(key, data);
      })
      .catch(() => {});
    return hit.data;
  }

  // Cold miss → fetch and cache
  const data = await fetcher();
  store.set(key, { data, at: Date.now() });
  if (persist) writePersisted(key, data);
  return data;
}

/** Force-refresh a key even when it's still fresh. */
export async function refreshCache(key, fetcher, ttl = DEFAULT_TTL, { persist = false } = {}) {
  const data = await fetcher();
  store.set(key, { data, at: Date.now() });
  if (persist) writePersisted(key, data);
  return data;
}

/** Drop a cached key (e.g. after a purchase so KEYS/ORDERS reload). */
export function invalidateCache(key) {
  store.delete(key);
  dropPersisted(key);
}

export function clearCache() {
  store.clear();
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PERSIST_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
}

/** Best-effort revalidate of a key (never throws). */
export function revalidate(key, fetcher, ttl = DEFAULT_TTL, opts = {}) {
  cachedFetch(key, fetcher, ttl, opts).catch(() => {});
}
