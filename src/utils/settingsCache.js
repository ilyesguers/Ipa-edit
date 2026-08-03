/**
 * ⚡ Tiny read-through cache for hot Settings keys.
 *
 * Several bot hot paths (the per-message middleware, the /start menu, the
 * payment screens) read the same settings for every interaction. MongoDB is
 * the source of truth — this cache only shields it from being hammered with
 * identical queries. TTL: 30s, so admin changes still feel near-instant.
 */
const Settings = require('../models/Settings');

const TTL_MS = 30 * 1000;
const store = new Map(); // key -> { value, expiresAt }

const getCached = async (key, defaultValue = null) => {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  try {
    const value = await Settings.get(key, defaultValue);
    store.set(key, { value, expiresAt: Date.now() + TTL_MS });
    return value;
  } catch (_) {
    // DB hiccup: never break the bot on a settings read.
    return hit ? hit.value : defaultValue;
  }
};

const invalidateSettings = (...keys) => {
  if (!keys.length) { store.clear(); return; }
  keys.forEach((k) => store.delete(k));
};

module.exports = { getCached, invalidateSettings, TTL_MS };
