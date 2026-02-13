const store = new Map();

const now = () => Date.now();

const cleanup = () => {
  const time = now();
  for (const [key, entry] of store.entries()) {
    if (!entry || entry.expiresAt <= time) {
      store.delete(key);
    }
  }
};

export const getCache = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

export const setCache = (key, value, ttlMs = 30 * 1000, maxEntries = 200) => {
  cleanup();
  if (store.size >= maxEntries) {
    const oldestKey = store.keys().next().value;
    if (oldestKey) store.delete(oldestKey);
  }
  store.set(key, { value, expiresAt: now() + ttlMs });
};

export const invalidateCacheByPrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
};

