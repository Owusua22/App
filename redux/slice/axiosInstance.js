// src/redux/slice/axiosInstance.js (React Native)
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reset } from "../../services/navigationService";

const LAMBDA_BASE_URL =
  "https://02yo3gbfxe.execute-api.us-east-1.amazonaws.com/default/FrankoAPI";
const LAMBDA_HEADER_NAME = "Identifier";
const LAMBDA_HEADER_VALUE = "Franko";

const INACTIVITY_TIMEOUT = 3 * 24 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "lastActivityTimestamp";

let isLoginFlow = false;
let isRefreshing = false;
let refreshPromise = null;
let authExpiredHandler = null;
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
    params: config?.params,
    responseBody: response?.data,
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

export const silentLogout = async () => {
  try {
    await AsyncStorage.removeItem("customer");
    await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch (error) {
    console.error("[Auth error] Could not clear customer data:", error?.message || error);
  }
};

export const logoutAndRedirect = async () => {
  if (logoutInFlightPromise) return logoutInFlightPromise;

  logoutInFlightPromise = (async () => {
    await clearAuth();

    try {
      await authExpiredHandler?.();
    } catch (error) {
      console.error("[Auth error] Could not clear Redux auth state:", error?.message || error);
    }

    try {
      // Signup is the app's login/register screen. It is reset as the root so
      // an expired checkout cannot continue with the stale customer session.
      reset("Signup");
    } catch (error) {
      console.error("[Auth error] Could not open the sign-in screen:", error?.message || error);
    }
  })().finally(() => {
    logoutInFlightPromise = null;
  });

  return logoutInFlightPromise;
};

export const checkCustomerTokenValidity = async () => {
  try {
    const customer = await safeGetFromStorage("customer");
    if (!customer) {
      return { hasCustomer: false, hasValidToken: true, shouldLogout: false };
    }

    if (typeof customer.accessToken !== "string" || !customer.accessToken.trim()) {
      await silentLogout();
      return { hasCustomer: true, hasValidToken: false, shouldLogout: true };
    }

    return { hasCustomer: true, hasValidToken: true, shouldLogout: false };
  } catch (error) {
    console.error("[Auth error] Token validation failed:", error?.message || error);
    await silentLogout();
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
    await AsyncStorage.multiRemove([
      "customer",
      "customers",
      "user",
      "loginTime",
      LAST_ACTIVITY_KEY,
    ]);
  } catch (error) {
    console.error("[Auth error] Could not clear auth storage:", error?.message || error);
  }
};

export const forceCleanupStorage = async () => {
  await cleanupCorruptedEntries();
};

/* ─── Silent token refresh ─── */

const resetRefreshState = () => {
  isRefreshing = false;
  refreshPromise = null;
};

const silentRefreshToken = async () => {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const customer = await safeGetFromStorage("customer");
      if (!customer?.refreshToken) {
        resetRefreshState();
        return null;
      }

      const refreshConfig = {
        params: {
          endpoint: "/Users/CustomerRefreshToken",
          client: "app",
        },
        headers: {
          [LAMBDA_HEADER_NAME]: LAMBDA_HEADER_VALUE,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      };

      // Use plain axios to avoid running the refresh request through this
      // instance's 401 interceptor.
      const response = await axios.post(
        LAMBDA_BASE_URL,
        { refreshToken: customer.refreshToken },
        refreshConfig
      );

      let data = response.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          // The validation below reports a missing access token.
        }
      }

      const newAccessToken = data?.accessToken || data?.AccessToken;
      const newRefreshToken = data?.refreshToken || data?.RefreshToken;
      if (!newAccessToken) {
        console.error("[Auth error] Refresh response did not contain an access token", {
          endpoint: refreshConfig.params.endpoint,
          status: response.status,
          responseBody: response.data,
        });
        resetRefreshState();
        return null;
      }

      const updatedCustomer = {
        ...customer,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || customer.refreshToken,
      };

      await AsyncStorage.setItem("customer", JSON.stringify(updatedCustomer));
      await updateLastActivity();
      resetRefreshState();
      return newAccessToken;
    } catch (error) {
      logRequestError(error);
      resetRefreshState();
      return null;
    }
  })();

  return refreshPromise;
};

/* ─── Request interceptor ─── */

axiosInstance.interceptors.request.use(
  async (config) => {
    config.params = {
      ...(config.params || {}),
      client: "app",
    };
    config.headers = config.headers || {};

    if (!config.headers.Authorization && !isLoginFlow) {
      const inactive = await checkInactivityTimeout();
      if (inactive) {
        await logoutAndRedirect();
        return Promise.reject(
          new axios.Cancel("Session expired due to inactivity.")
        );
      }

      const tokenCheck = await checkCustomerTokenValidity();
      if (!tokenCheck.shouldLogout) {
        const token = await getCurrentToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          await updateLastActivity();
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
    updateLastActivity().catch(() => {});
    return response;
  },
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);

    logRequestError(error);
    const response = error?.response;
    const config = error?.config || response?.config;
    if (!response) return Promise.reject(error);

    if (response.status !== 401) return Promise.reject(error);
    // Invalid credentials during login/signup are normal form errors. A 401 on
    // any authenticated request (including checkout/password update) must run
    // refresh and then clear the session if refresh is rejected.
    if (isUnauthenticatedCredentialRequest(config)) {
      return Promise.reject(error);
    }

    if (config?._retried) {
      markAuthExpired(error);
      await logoutAndRedirect();
      return Promise.reject(error);
    }

    const newToken = await silentRefreshToken();
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
