/**
 * NASA Data Cache Service
 * Provides localStorage caching with TTL, automatic serialization,
 * in-memory fallback, and offline recovery.
 */

const CACHE_PREFIX = 'lunarbase_nasa_cache_v1_';
const memoryFallback = new Map();

function isLocalStorageAvailable() {
  try {
    const testKey = '__lb_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const storageAvailable = typeof window !== 'undefined' && isLocalStorageAvailable();

/**
 * Stores data in the cache with a time-to-live.
 * @param {string} key Unique cache key
 * @param {*} data Data to cache
 * @param {number} ttlMs Time to live in milliseconds (default 1 hour)
 */
export function setCachedData(key, data, ttlMs = 3600000) {
  const payload = {
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMs,
    data
  };

  if (storageAvailable) {
    try {
      window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(payload));
      return;
    } catch {
      // localStorage may be full or restricted; fall back to memory
    }
  }
  memoryFallback.set(key, payload);
}

/**
 * Retrieves data from the cache.
 * @param {string} key
 * @param {boolean} ignoreExpiry If true, returns stale cached data when offline
 * @returns {*|null} Cached data or null if absent/expired
 */
export function getCachedData(key, ignoreExpiry = false) {
  let payload = null;

  if (storageAvailable) {
    try {
      const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (raw) {
        payload = JSON.parse(raw);
      }
    } catch {
      payload = null;
    }
  }

  if (!payload && memoryFallback.has(key)) {
    payload = memoryFallback.get(key);
  }

  if (!payload) {
    return null;
  }

  const isExpired = Date.now() > payload.expiresAt;
  if (isExpired && !ignoreExpiry) {
    return null;
  }

  return {
    data: payload.data,
    cachedAt: new Date(payload.timestamp).toISOString(),
    isStale: isExpired
  };
}

/**
 * Removes a specific key from cache.
 * @param {string} key
 */
export function removeCachedData(key) {
  if (storageAvailable) {
    try {
      window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch {}
  }
  memoryFallback.delete(key);
}

/**
 * Clears all LunarBase NASA cache entries.
 */
export function clearAllNasaCache() {
  if (storageAvailable) {
    try {
      const keysToRemove = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        window.localStorage.removeItem(k);
      }
    } catch {}
  }
  memoryFallback.clear();
}
