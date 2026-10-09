// Shared, in-memory request coordination. Persisted Redux data can paint at once,
// but must never be interpreted as proof that the backend hasn't changed.
export const CATALOG_MAX_AGE_MS = 2 * 60 * 1000;
const lastSuccess = new Map();
const lastAttempt = new Map();
const inFlight = new Map();

export const refreshCatalog = (dispatch, key, action, { maxAgeMs = CATALOG_MAX_AGE_MS, force = false } = {}) => {
  if (inFlight.has(key)) return inFlight.get(key);
  const now = Date.now();
  if (!force && lastSuccess.has(key) && now - lastSuccess.get(key) < maxAgeMs) return null;
  // On a disconnected device keep cached content, without hammering the API.
  if (!force && lastAttempt.has(key) && now - lastAttempt.get(key) < 15_000) return null;
  lastAttempt.set(key, now);
  const request = Promise.resolve()
    .then(() => dispatch(action()))
    .then((result) => {
      if (result && !result.error) lastSuccess.set(key, Date.now());
      return result;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
};

// Called after a successful product write in this app; the next read is fresh.
export const invalidateCatalog = () => lastSuccess.clear();
