// src/redux/slice/axiosInstance.js (React Native)
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { navigate, reset } from "../../services/navigationService";

const LAMBDA_BASE_URL =
  "https://02yo3gbfxe.execute-api.us-east-1.amazonaws.com/default/FrankoAPI";

const LAMBDA_HEADER_NAME = "Identifier";
const LAMBDA_HEADER_VALUE = "Franko";

// 3 days in milliseconds
const INACTIVITY_TIMEOUT = 3 * 24 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "lastActivityTimestamp";

// Login flow flag
let isLoginFlow = false;

// Refresh in progress flag to prevent multiple simultaneous refreshes
let isRefreshing = false;
let refreshPromise = null;

export const setLoginFlow = (value) => {
  isLoginFlow = value;
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
  const keys = ["customer", "user"];
  for (const key of keys) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === "[object Object]") {
        await AsyncStorage.removeItem(key);
      }
    } catch {}
  }
};

cleanupCorruptedEntries();

/* ─── Activity Tracking ─── */

export const updateLastActivity = async () => {
  try {
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {}
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

    const elapsed = Date.now() - lastActivity;
    const isExpired = elapsed > INACTIVITY_TIMEOUT;

    if (isExpired) {
      console.log("[Auth] Inactivity timeout reached:", Math.floor(elapsed / (1000 * 60 * 60)), "hours");
    }

    return isExpired;
  } catch {
    return false;
  }
};

/* ─── Axios Instance ─── */

const axiosInstance = axios.create({
  baseURL: LAMBDA_BASE_URL,
  timeout: 30000,
  headers: {
    [LAMBDA_HEADER_NAME]: LAMBDA_HEADER_VALUE,
  },
});

/* ─── Auth Utilities ─── */

export const silentLogout = async () => {
  try {
    console.log("[Auth] Clearing customer data");
    await AsyncStorage.removeItem("customer");
    await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch (error) {
    console.error("[Auth] Error during logout:", error);
  }
};

export const logoutAndRedirect = async () => {
  try {
    console.log("[Auth] Logging out and redirecting to home");
    await AsyncStorage.removeItem("customer");
    await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
    reset("Home");
  } catch (error) {
    console.error("[Auth] Error during logout and redirect:", error);
  }
};

export const checkCustomerTokenValidity = async () => {
  try {
    const customer = await safeGetFromStorage("customer");
    if (!customer) {
      return { hasCustomer: false, hasValidToken: true, shouldLogout: false };
    }
    if (!customer.accessToken) {
      await silentLogout();
      return { hasCustomer: true, hasValidToken: false, shouldLogout: true };
    }
    if (typeof customer.accessToken !== "string" || !customer.accessToken.trim()) {
      await silentLogout();
      return { hasCustomer: true, hasValidToken: false, shouldLogout: true };
    }
    return { hasCustomer: true, hasValidToken: true, shouldLogout: false };
  } catch (error) {
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
  } catch {
    return null;
  }
};

export const hasValidAuth = async () => {
  const token = await getCurrentToken();
  return Boolean(token);
};

export const getCurrentAuth = async () => {
  try {
    const tokenCheck = await checkCustomerTokenValidity();
    if (tokenCheck.shouldLogout) return { type: null, data: null };

    const customer = await safeGetFromStorage("customer");
    const user = await safeGetFromStorage("user");

    if (customer?.accessToken?.trim()) return { type: "customer", data: customer };
    if (user?.accessToken?.trim()) return { type: "user", data: user };

    return { type: null, data: null };
  } catch {
    return { type: null, data: null };
  }
};

export const clearAuth = async () => {
  try {
    await AsyncStorage.multiRemove(["customer", "user", "loginTime", LAST_ACTIVITY_KEY]);
  } catch {}
};

export const forceCleanupStorage = async () => {
  await cleanupCorruptedEntries();
};

/* ─── Silent Token Refresh ─── */

const silentRefreshToken = async () => {
  // If already refreshing, wait for the existing refresh to complete
  if (isRefreshing && refreshPromise) {
    console.log("[Auth] Refresh already in progress, waiting...");
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const customer = await safeGetFromStorage("customer");

      if (!customer?.refreshToken) {
        console.log("[Auth] No refresh token available");
        isRefreshing = false;
        refreshPromise = null;
        return null;
      }

      console.log("[Auth] Silently refreshing token...");

      // Call refresh token endpoint directly (not through interceptor)
      const response = await axios.post(
        LAMBDA_BASE_URL,
        { refreshToken: customer.refreshToken },
        {
          params: {
            endpoint: "/Users/CustomerRefreshToken",
            client: "website",
          },
          headers: {
            [LAMBDA_HEADER_NAME]: LAMBDA_HEADER_VALUE,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      let data = response.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {}
      }

      const newAccessToken = data?.accessToken || data?.AccessToken;
      const newRefreshToken = data?.refreshToken || data?.RefreshToken;

      if (!newAccessToken) {
        console.log("[Auth] Refresh failed - no new token received");
        isRefreshing = false;
        refreshPromise = null;
        return null;
      }

      console.log("[Auth] Token refreshed successfully");

      // Update stored customer with new tokens
      const updatedCustomer = {
        ...customer,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || customer.refreshToken,
      };

      await AsyncStorage.setItem("customer", JSON.stringify(updatedCustomer));
      await updateLastActivity();

      isRefreshing = false;
      refreshPromise = null;

      return newAccessToken;
    } catch (error) {
      console.error("[Auth] Token refresh failed:", error?.message || error);
      isRefreshing = false;
      refreshPromise = null;
      return null;
    }
  })();

  return refreshPromise;
};

/* ─── Request Interceptor ─── */

axiosInstance.interceptors.request.use(
  async (config) => {
    config.params = {
      ...(config.params || {}),
      client: "website",
    };

    config.headers = config.headers || {};

    // Skip token handling if Authorization is already set
    if (!config.headers.Authorization) {
      if (isLoginFlow) {
        // Skip during login flow
      } else {
        // Check for 3-day inactivity first
        const isInactive = await checkInactivityTimeout();
        if (isInactive) {
          console.log("[Auth] User inactive for 3+ days - logging out");
          await logoutAndRedirect();
          return Promise.reject(new axios.Cancel("Session expired due to inactivity"));
        }

        const tokenCheck = await checkCustomerTokenValidity();
        if (!tokenCheck.shouldLogout) {
          const token = await getCurrentToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            // Update last activity on every authenticated request
            await updateLastActivity();
          }
        }
      }
    }

    if (config.data && !config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ─── Response Interceptor with Silent Refresh ─── */

axiosInstance.interceptors.response.use(
  (response) => {
    // Update activity on successful responses
    updateLastActivity().catch(() => {});
    return response;
  },
  async (error) => {
    const { response, config } = error;

    if (!response) {
      return Promise.reject(error);
    }

    const { status } = response;

    switch (status) {
      case 401: {
        // Skip during login flow
        if (isLoginFlow) {
          console.log("[Auth] 401 during login flow - skipping");
          break;
        }

        // Prevent infinite retry loops
        if (config._retried) {
          console.log("[Auth] 401 after retry - checking inactivity");
          
          // Check if inactive for 3 days
          const isInactive = await checkInactivityTimeout();
          if (isInactive) {
            console.log("[Auth] Inactive for 3+ days - logging out");
            await logoutAndRedirect();
          } else {
            console.log("[Auth] Token refresh failed but user is active - logging out");
            await logoutAndRedirect();
          }
          break;
        }

        // Try silent token refresh
        console.log("[Auth] 401 received - attempting silent token refresh...");

        const newToken = await silentRefreshToken();

        if (newToken) {
          console.log("[Auth] Token refreshed - retrying original request");

          // Mark as retried to prevent infinite loops
          config._retried = true;

          // Update the Authorization header with new token
          config.headers.Authorization = `Bearer ${newToken}`;

          // Retry the original request
          return axiosInstance(config);
        }

        // Refresh failed - check inactivity before logging out
        console.log("[Auth] Token refresh failed");
        const isInactive = await checkInactivityTimeout();
        if (isInactive) {
          console.log("[Auth] User inactive for 3+ days - logging out");
          await logoutAndRedirect();
        } else {
          // User is active but refresh failed - still logout
          // This means the refresh token itself is invalid
          console.log("[Auth] Refresh token invalid - logging out");
          await logoutAndRedirect();
        }
        break;
      }

      case 403:
        console.warn("Forbidden - insufficient permissions");
        break;

      case 429:
        console.warn("Too many requests - rate limited");
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        console.error("Server error:", status);
        break;

      default:
        break;
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;