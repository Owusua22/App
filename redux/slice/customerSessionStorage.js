import AsyncStorage from "@react-native-async-storage/async-storage";
import { decode as decodeBase64 } from "base-64";

export const CUSTOMER_KEY = "customer";
export const CUSTOMERS_KEY = "customers";
export const ACTIVITY_KEY = "lastActivityTimestamp";

const LEGACY_AUTH_KEYS = [
  "customer",
  "customers",
  "user",
  "loginTime",
  "loginStatus",
  "lastActivityTimestamp",
];

let storageQueue = Promise.resolve();
const serialize = (work) => {
  const result = storageQueue.then(work, work);
  storageQueue = result.catch(() => {});
  return result;
};

let sessionGeneration = 0;

export const getSessionVersion = () => sessionGeneration;

export const beginSessionVersion = () => {
  sessionGeneration += 1;
  return sessionGeneration;
};

export const isSessionVersionCurrent = (version) =>
  typeof version === "number" && version === sessionGeneration;

export const isSessionVersionStale = (version) =>
  typeof version === "number" && version !== sessionGeneration;

const decodeJwtPayload = (token) => {
  try {
    if (typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const bytes = decodeBase64(padded);
    const json = decodeURIComponent(
      Array.from(bytes, (byte) =>
        `%${byte.charCodeAt(0).toString(16).padStart(2, "0")}`
      ).join("")
    );
    const payload = JSON.parse(json);
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
};

export const getTokenExpiry = (token) => {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  return typeof exp === "number" && Number.isFinite(exp) && exp > 0
    ? exp * 1000
    : 0;
};

export const getTokenContactNumber = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const claim =
    payload.contactNumber ??
    payload.ContactNumber ??
    payload.customerAccountNumber ??
    payload.CustomerAccountNumber ??
    payload.sub ??
    payload.nameid ??
    payload.nameId;
  if (claim === null || claim === undefined) return null;
  const value = String(claim).trim();
  return value || null;
};

export const readAccessToken = (customer) => {
  const token = customer?.accessToken ?? customer?.AccessToken;
  return typeof token === "string" && token.trim() ? token.trim() : null;
};

export const readRefreshToken = (customer) => {
  const token = customer?.refreshToken ?? customer?.RefreshToken;
  return typeof token === "string" && token.trim() ? token.trim() : null;
};

export const isAccessTokenExpired = (token) => {
  const expiry = getTokenExpiry(token);
  return expiry > 0 && expiry <= Date.now();
};

export const hasValidToken = (customer) => {
  const token = readAccessToken(customer);
  if (!token) return false;
  return !isAccessTokenExpired(token);
};

export const hasExpiredToken = (customer) =>
  isAccessTokenExpired(readAccessToken(customer));

export const sanitizeCustomer = (customer) => {
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    return null;
  }
  const clean = { ...customer };
  for (const key of Object.keys(clean)) {
    if (key.toLowerCase().includes("password")) delete clean[key];
  }
  return clean;
};

const readJson = async (key) => {
  const value = await AsyncStorage.getItem(key);
  if (!value || value === "[object Object]") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const readCustomer = () =>
  serialize(async () => sanitizeCustomer(await readJson(CUSTOMER_KEY)));

export const readCustomers = () =>
  serialize(async () => {
    const parsed = await readJson(CUSTOMERS_KEY);
    return Array.isArray(parsed)
      ? parsed.map(sanitizeCustomer).filter(Boolean)
      : [];
  });

export const getLastActivity = () =>
  serialize(async () => {
    try {
      const timestamp = await AsyncStorage.getItem(ACTIVITY_KEY);
      return timestamp ? parseInt(timestamp, 10) || null : null;
    } catch {
      return null;
    }
  });

export const updateLastActivity = () =>
  serialize(async () => {
    try {
      await AsyncStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    } catch {
      /* activity tracking is best effort */
    }
  });

export const writeCustomer = (customer, isCurrent = () => true) =>
  serialize(async () => {
    if (!isCurrent() || !hasValidToken(customer)) {
      throw new Error("Session expired or changed.");
    }
    const clean = sanitizeCustomer(customer);
    await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(clean));
    if (!isCurrent()) {
      throw new Error("Session changed.");
    }
    return clean;
  });

export const writeCustomers = (customers, isCurrent = () => true) =>
  serialize(async () => {
    if (!isCurrent()) throw new Error("Session changed.");
    await AsyncStorage.setItem(
      CUSTOMERS_KEY,
      JSON.stringify(
        (Array.isArray(customers) ? customers : []).map(sanitizeCustomer).filter(Boolean)
      )
    );
    if (!isCurrent()) throw new Error("Session changed.");
  });

export const clearCustomerStorage = (isCurrent = () => true) =>
  serialize(async () => {
    if (!isCurrent()) throw new Error("Session changed.");
    await AsyncStorage.multiRemove(LEGACY_AUTH_KEYS);
    if (!isCurrent()) throw new Error("Session changed.");
  });

export const forceCleanupStorage = () =>
  serialize(async () => {
    await AsyncStorage.multiRemove([CUSTOMER_KEY, ...LEGACY_AUTH_KEYS]);
  });
