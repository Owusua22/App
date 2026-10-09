// src/redux/slice/axiosInstance.js (React Native)
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestAuthRedirect } from "../../services/navigationService";
import { beginSessionVersion, getSessionVersion, isSessionVersionCurrent, writeCustomer, clearCustomerStorage, getTokenExpiry, readAccessToken, readRefreshToken } from "./customerSessionStorage";

const LAMBDA_BASE_URL =
  "https://02yo3gbfxe.execute-api.us-east-1.amazonaws.com/default/FrankoAPI";
const LAMBDA_HEADER_NAME = "Identifier";
const LAMBDA_HEADER_VALUE = "Franko";

const INACTIVITY_TIMEOUT = 3 * 24 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "lastActivityTimestamp";

let isLoginFlow = false;
let refreshPromise = null;
let authExpiredHandler = null;
let authUpdatedHandler = null;
let logoutInFlightPromise = null;

export const setLoginFlow = (value) => {
  isLoginFlow = Boolean(value);
};

// Register a Redux-side session cleanup callback without importing the store
// here (which would create a circular dependency through customerSlice).
export const registerAuthExpiredHandler = (handler) => {
  authExpiredHandler = typeof handler === "function" ? handler : null;
  return () => {
    if (authExpiredHandler === handler) authExpiredHandler = null;
  };
};

// Keep the in-memory profile's tokens aligned with a successful silent refresh.
export const registerAuthUpdatedHandler = (handler) => {
  authUpdatedHandler = typeof handler === "function" ? handler : null;
};

/* ─── Storage helpers ─── */

const safeGetFromStorage = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    if (raw === "[object Object]") {
      await AsyncStorage.removeItem(key);
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
};

const cleanupCorruptedEntries = async () => {
  for (const key of ["customer", "user"]) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === "[object Object]") {
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // Storage cleanup is best-effort and intentionally quiet.
    }
  }
};

cleanupCorruptedEntries();

/* ─── Activity tracking ─── */

export const updateLastActivity = async () => {
  try {
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {
    // Activity tracking must not fail a request.
  }
};

export const getLastActivity = async () => {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch {
    return null;
  }
};

export const checkInactivityTimeout = async () => {
  try {
    const lastActivity = await getLastActivity();
    if (!lastActivity) return false;
    return Date.now() - lastActivity > INACTIVITY_TIMEOUT;
  } catch {
    return false;
  }
};

/* ─── Error-only HTTP logging ─── */

const getRequestUrl = (config) => {
  const url = config?.url || "";
  if (/^https?:\/\//i.test(url)) return url;

  const baseURL = (config?.baseURL || LAMBDA_BASE_URL).replace(/\/$/, "");
  return `${baseURL}/${url.replace(/^\//, "")}`;
};

const logRequestError = (error) => {
  const config = error?.config || error?.response?.config;
  const response = error?.response;

  console.error("[HTTP error] Request failed", {
    method: config?.method?.toUpperCase(),
    url: getRequestUrl(config),
    endpoint: config?.params?.endpoint,
    status: response?.status,
    code: error?.code,
    message: error?.message || "Request failed without an error message.",
    // Never log request params, bodies, tokens or backend response bodies.
  });
};

const markAuthExpired = (error) => {
  if (error && typeof error === "object") {
    error.isAuthError = true;
    error.authExpired = true;
    error.authMessage = "Your session expired. Please sign in again.";
  }
  return error;
};

const isUnauthenticatedCredentialRequest = (config) => {
  const endpoint = String(config?.params?.endpoint || "").toLowerCase();
  const hasAuthorization = Boolean(config?.headers?.Authorization);
  return (
    endpoint.includes("customerlogin") ||
    (endpoint.includes("customer-post") && !hasAuthorization)
  );
};

/* ─── Axios instance ─── */

const axiosInstance = axios.create({
  baseURL: LAMBDA_BASE_URL,
  timeout: 30000,
  headers: {
    [LAMBDA_HEADER_NAME]: LAMBDA_HEADER_VALUE,
  },
});

/* ─── Auth utilities ─── */

export const silentLogout = async () => logoutAndRedirect();

export const logoutAndRedirect = async () => {
  if (logoutInFlightPromise) return logoutInFlightPromise;

  // Invalidate in-flight refreshes synchronously, before any storage await.
  const version = beginSessionVersion();
  logoutInFlightPromise = (async () => {
    try {
      // Hide personal data in Redux immediately, even if storage is slow.
      authExpiredHandler?.();
    } catch (error) {
      console.error("[Auth error] Could not clear Redux auth state:", error?.message || error);
    }
    await clearAuth();
    if (isSessionVersionCurrent(version)) requestAuthRedirect();
  })().finally(() => { logoutInFlightPromise = null; });

  return logoutInFlightPromise;
};

// An incomplete legacy customer record is not an authenticated session. Do
// not open the sign-in modal for a first-time guest on public catalog calls.
const clearGuestStub = async () => {
  authExpiredHandler?.();
  await clearAuth();
};

export const checkCustomerTokenValidity = async () => {
  try {
    const customer = await safeGetFromStorage("customer");
    if (!customer) {
      return { hasCustomer: false, hasValidToken: true, shouldLogout: false };
    }

    if (!readAccessToken(customer)) {
      return { hasCustomer: true, hasValidToken: false,
        shouldLogout: Boolean(readRefreshToken(customer)), shouldCleanGuest: !readRefreshToken(customer) };
    }

    return { hasCustomer: true, hasValidToken: true, shouldLogout: false };
  } catch (error) {
    console.error("[Auth error] Token validation failed:", error?.message || error);
    return { hasCustomer: false, hasValidToken: false, shouldLogout: true };
  }
};

export const getCurrentToken = async () => {
  try {
    const tokenCheck = await checkCustomerTokenValidity();
    if (tokenCheck.shouldLogout) return null;

    const customer = await safeGetFromStorage("customer");
    const user = await safeGetFromStorage("user");

    if (customer?.accessToken?.trim()) return customer.accessToken;
    if (user?.accessToken?.trim()) return user.accessToken;
    return null;
  } catch (error) {
    console.error("[Auth error] Could not read the current token:", error?.message || error);
    return null;
  }
};

export const hasValidAuth = async () => Boolean(await getCurrentToken());

export const getCurrentAuth = async () => {
  try {
    const tokenCheck = await checkCustomerTokenValidity();
    if (tokenCheck.shouldLogout) return { type: null, data: null };

    const customer = await safeGetFromStorage("customer");
    const user = await safeGetFromStorage("user");

    if (customer?.accessToken?.trim()) return { type: "customer", data: customer };
    if (user?.accessToken?.trim()) return { type: "user", data: user };
    return { type: null, data: null };
  } catch (error) {
    console.error("[Auth error] Could not read the current auth state:", error?.message || error);
    return { type: null, data: null };
  }
};

export const clearAuth = async () => {
  try {
    // Serialized against token refresh writes, so an old refresh cannot
    // restore a customer after this removal finishes.
    await clearCustomerStorage();
  } catch (error) {
    console.error("[Auth error] Could not clear auth storage:", error?.message || error);
  }
  try {
    await AsyncStorage.multiRemove([
      "checkoutDetails", "orderAddressDetails", "orderDeliveryDetails",
      "pendingOrderId", "selectedLocation", "shippingDetails",
      "userOrders", "usedOrderIds",
    ]);
  } catch (error) {
    console.error("[Auth error] Could not clear checkout drafts:", error?.message || error);
  }
};

export const forceCleanupStorage = async () => {
  await cleanupCorruptedEntries();
};

/* ─── Silent token refresh ─── */

const silentRefreshToken = async () => {
  if (refreshPromise) return refreshPromise;
  const version = getSessionVersion();
  refreshPromise = (async () => {
    const customer = await safeGetFromStorage("customer");
    const refreshToken = readRefreshToken(customer);
    if (!refreshToken || (getTokenExpiry(refreshToken) > 0 && getTokenExpiry(refreshToken) <= Date.now())) {
      return null; // No usable refresh credential: session really has expired.
    }

    try {
      // Plain axios: the refresh request must never recursively intercept itself.
      const response = await axios.post(
        LAMBDA_BASE_URL,
        { refreshToken },
        { params: { endpoint: "/Users/CustomerRefreshToken", client: "app" },
          headers: { [LAMBDA_HEADER_NAME]: LAMBDA_HEADER_VALUE, "Content-Type": "application/json" },
          timeout: 15000 }
      );
      let data = response.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { /* invalid response */ }
      }
      const accessToken = data?.accessToken || data?.AccessToken;
      if (!accessToken) return null;
      if (!isSessionVersionCurrent(version)) return null;
      const updated = { ...customer, accessToken, refreshToken: data?.refreshToken || data?.RefreshToken || refreshToken };
      try {
        await writeCustomer(updated, () => isSessionVersionCurrent(version));
      } catch (error) {
        if (!isSessionVersionCurrent(version)) return null;
        throw error;
      }
      if (isSessionVersionCurrent(version)) authUpdatedHandler?.(updated);
      return accessToken;
    } catch (error) {
      if (!isSessionVersionCurrent(version)) return null;
      // Only a rejected/invalid refresh credential is proof of expiry.
      // Do not destroy a session for offline, timeout or server errors.
      if ([400, 401, 403].includes(error?.response?.status)) return null;
      throw error;
    }
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
};

// Also used at launch/resume: refresh an expired access token while the app is
// active; an expired refresh token or explicit rejection signs out instead.
export const checkActiveSession = async ({ logoutIfExpiredWhileAway = false } = {}) => {
  const customer = await safeGetFromStorage("customer");
  if (!customer) return false;
  const accessToken = readAccessToken(customer);
  if (!accessToken) {
    if (readRefreshToken(customer)) await logoutAndRedirect();
    else await clearGuestStub();
    return false;
  }
  if (await checkInactivityTimeout()) {
    await logoutAndRedirect();
    return false;
  }
  const refreshToken = readRefreshToken(customer);
  if (getTokenExpiry(refreshToken) > 0 && getTokenExpiry(refreshToken) <= Date.now()) {
    await logoutAndRedirect();
    return false;
  }
  // Some legacy logins have an access token but no refresh credential; keep
  // them until the access token actually expires or the server rejects it.
  if (!refreshToken && getTokenExpiry(accessToken) > Date.now()) return true;
  const accessExpiry = getTokenExpiry(accessToken);
  if (accessExpiry > 0 && accessExpiry <= Date.now()) {
    // A token that expired while the app was away belongs to an inactive
    // session. Do not take the user into Orders/Checkout with stale identity.
    const lastActivity = await getLastActivity();
    if (logoutIfExpiredWhileAway && lastActivity && lastActivity < accessExpiry) {
      await logoutAndRedirect();
      return false;
    }
    try {
      const newToken = await silentRefreshToken();
      if (!newToken && !logoutInFlightPromise) await logoutAndRedirect();
      return Boolean(newToken);
    } catch {
      // Network outage: keep the session and retry on next authenticated call.
      return false;
    }
  }
  return true;
};

/* ─── Request interceptor ─── */

axiosInstance.interceptors.request.use(
  async (config) => {
    config.params = {
      ...(config.params || {}),
      client: "app",
    };
    config.headers = config.headers || {};
    config._authVersion = getSessionVersion();

    if (!config.headers.Authorization && !isLoginFlow && !isUnauthenticatedCredentialRequest(config)) {
      const tokenCheck = await checkCustomerTokenValidity();
      if (tokenCheck.shouldLogout) {
        await logoutAndRedirect();
        return Promise.reject(markAuthExpired(new axios.Cancel("Session expired.")));
      }
      if (tokenCheck.shouldCleanGuest) await clearGuestStub();
      const customer = await safeGetFromStorage("customer");
      const token = readAccessToken(customer) || (await getCurrentToken());
      if (token) {
        // Proactively renew known-expired JWTs, avoiding an avoidable 401.
        if (getTokenExpiry(token) > 0 && getTokenExpiry(token) <= Date.now()) {
          try {
            const renewed = await silentRefreshToken();
            if (!renewed) {
              if (!isSessionVersionCurrent(config._authVersion)) {
                return Promise.reject(markAuthExpired(new axios.Cancel("Previous session expired.")));
              }
              await logoutAndRedirect();
              return Promise.reject(markAuthExpired(new axios.Cancel("Session expired.")));
            }
            config.headers.Authorization = `Bearer ${renewed}`;
          } catch {
            // Transient refresh failure: do not log out. Let the call fail normally.
            config.headers.Authorization = `Bearer ${token}`;
          }
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }

    if (config.data && !config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    // Intentionally no outgoing-request log: successful calls stay silent.
    return config;
  },
  (error) => {
    logRequestError(error);
    return Promise.reject(error);
  }
);

/* ─── Response interceptor ─── */

axiosInstance.interceptors.response.use(
  (response) => {
    // Intentionally no success log.
    return response;
  },
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);

    if (error?.response?.status !== 401) logRequestError(error);
    const response = error?.response;
    const config = error?.config || response?.config;
    if (!response) return Promise.reject(error);

    if (response.status !== 401) return Promise.reject(error);
    if (config?._authVersion !== undefined && !isSessionVersionCurrent(config._authVersion)) {
      return Promise.reject(markAuthExpired(error)); // Old request from a signed-out session.
    }
    // Invalid credentials during login/signup are normal form errors. A 401 on
    // any authenticated request (including checkout/password update) must run
    // refresh and then clear the session if refresh is rejected.
    if (isUnauthenticatedCredentialRequest(config)) {
      return Promise.reject(error);
    }

    const current = await safeGetFromStorage("customer");
    if (!current) return Promise.reject(error);
    const sentToken = String(config?.headers?.Authorization || "").replace(/^Bearer\s+/i, "");
    const latestToken = readAccessToken(current);
    if (sentToken && latestToken && sentToken !== latestToken && !config?._retried) {
      config._retried = true;
      config.headers.Authorization = `Bearer ${latestToken}`;
      return axiosInstance(config);
    }

    if (config?._retried) {
      markAuthExpired(error);
      await logoutAndRedirect();
      return Promise.reject(error);
    }

    let newToken;
    try {
      newToken = await silentRefreshToken();
    } catch {
      // A transient refresh failure must not erase the stored session.
      return Promise.reject(error);
    }
    if (config?._authVersion !== undefined && !isSessionVersionCurrent(config._authVersion)) {
      return Promise.reject(markAuthExpired(error));
    }
    if (newToken && config) {
      config._retried = true;
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${newToken}`;
      return axiosInstance(config);
    }

    // The access token was rejected and the refresh token could not renew it.
    // Mark the original error for thunks/screens, clear Redux + storage, and
    // send the user to the login form before checkout can continue.
    markAuthExpired(error);
    await logoutAndRedirect();
    return Promise.reject(error);
  }
);

export default axiosInstance;
