// src/redux/slice/customerSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { setLoginFlow } from "./axiosInstance";
import { reset } from "../../services/navigationService";

const CUSTOMER_KEY = "customer";
const CUSTOMERS_KEY = "customers";

const loadCustomerFromStorage = async () => {
  try {
    const value = await AsyncStorage.getItem(CUSTOMER_KEY);
    if (!value) return null;
    const customer = JSON.parse(value);
    if (!customer || typeof customer !== "object") {
      await AsyncStorage.removeItem(CUSTOMER_KEY);
      return null;
    }
    return customer;
  } catch (e) {
    await AsyncStorage.removeItem(CUSTOMER_KEY);
    return null;
  }
};

const saveCustomerToStorage = async (customer) => {
  try {
    if (!customer) {
      await AsyncStorage.removeItem(CUSTOMER_KEY);
    } else {
      await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    }
  } catch (e) {
    console.warn("[CustomerSlice] Failed to save customer:", e);
  }
};

const loadCustomersFromStorage = async () => {
  try {
    const value = await AsyncStorage.getItem(CUSTOMERS_KEY);
    return value ? JSON.parse(value) : [];
  } catch { return []; }
};

const saveCustomersToStorage = async (customers) => {
  try {
    await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (e) {
    console.warn("[CustomerSlice] Failed to save customers:", e);
  }
};

const parseResponse = (data) => {
  if (typeof data === "string") {
    try { return JSON.parse(data); } catch { return data; }
  }
  return data;
};

const extractResponseInfo = (data) => {
  return {
    code: String(
      data?.response?.responseCode ||
      data?.ResponseCode ||
      data?.responseCode ||
      ""
    ),
    message:
      data?.response?.responseMessage ||
      data?.ResponseMessage ||
      data?.responseMessage ||
      "",
    status: data?.status,
    accessToken: data?.accessToken || data?.AccessToken || null,
    refreshToken: data?.refreshToken || data?.RefreshToken || null,
  };
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const logRequestFailure = (label, error) => {
  console.error(`[${label}] Request failed`);
  console.error(`[${label}] Status:`, error?.response?.status);
  console.error(`[${label}] Response body:`, JSON.stringify(error?.response?.data));
  console.error(`[${label}] Response headers:`, JSON.stringify(error?.response?.headers));
  console.error(`[${label}] Request URL:`, error?.config?.url);
  console.error(`[${label}] Request params:`, JSON.stringify(error?.config?.params));
  console.error(`[${label}] Request headers sent:`, JSON.stringify(error?.config?.headers));
};

const toErrorMessage = (error, fallback = "Something went wrong.") => {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  return (
    error?.response?.data?.response?.responseMessage ||
    error?.response?.data?.ResponseMessage ||
    error?.response?.data?.message ||
    error?.body?.message ||
    error?.message ||
    fallback
  );
};

const isUsableCachedProfile = (cached, contactNumber) =>
  Boolean(cached) &&
  cached.contactNumber === contactNumber &&
  Boolean(cached.firstName);

/* ======================================================================= */
/*  LOGOUT THUNK — now a real async thunk so .unwrap() is valid           */
/* ======================================================================= */
export const logoutCustomer = createAsyncThunk(
  "customers/logoutCustomer",
  async (_, { rejectWithValue }) => {
    try {
      await AsyncStorage.multiRemove([CUSTOMER_KEY, CUSTOMERS_KEY]);
      reset("Home");
      return true;
    } catch (error) {
      return rejectWithValue(toErrorMessage(error, "Failed to logout."));
    }
  }
);

/* ======================================================================= */
/*  CHECK AUTH                                                           */
/* ======================================================================= */
export const checkAuthStatus = createAsyncThunk(
  "customers/checkAuthStatus",
  async () => {
    try {
      const customer = await loadCustomerFromStorage();
      if (!customer) return { isAuthenticated: false, customer: null };
      if (!customer.accessToken) {
        await AsyncStorage.removeItem(CUSTOMER_KEY);
        return { isAuthenticated: false, customer: null };
      }
      return { isAuthenticated: true, customer };
    } catch (error) {
      await AsyncStorage.removeItem(CUSTOMER_KEY);
      return { isAuthenticated: false, customer: null };
    }
  }
);

/* ======================================================================= */
/*  CREATE CUSTOMER                                                       */
/* ======================================================================= */
export const createCustomer = createAsyncThunk(
  "customers/createCustomer",
  async (customerData, { rejectWithValue }) => {
    try {
      const response = await api.post("/", customerData, {
        params: { endpoint: "/Users/Customer-Post" },
        headers: { "Content-Type": "application/json" },
      });
      return parseResponse(response.data);
    } catch (error) {
      return rejectWithValue(toErrorMessage(error, "An unknown error occurred."));
    }
  }
);

/* ======================================================================= */
/*  FETCH ALL CUSTOMERS                                                   */
/* ======================================================================= */
export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/", { params: { endpoint: "/Users/Customer-Get" } });
      const data = parseResponse(response.data);
      if (Array.isArray(data)) await saveCustomersToStorage(data);
      return data;
    } catch (error) {
      const cached = await loadCustomersFromStorage();
      if (cached.length > 0) return cached;
      return rejectWithValue(toErrorMessage(error, "An unknown error occurred."));
    }
  }
);

/* ======================================================================= */
/*  GET CUSTOMER BY ID                                                    */
/* ======================================================================= */
export const getCustomerById = createAsyncThunk(
  "customers/getCustomerById",
  async (contactNumberOrObj, { rejectWithValue }) => {
    let contactNumber;
    let accessToken;

    if (typeof contactNumberOrObj === "string") {
      contactNumber = contactNumberOrObj;
    } else {
      contactNumber = contactNumberOrObj.contactNumber;
      accessToken = contactNumberOrObj.accessToken;
    }

    try {
      console.log("[getCustomerById] Fetching for:", contactNumber, "hasToken:", !!accessToken);

      const config = {
        params: {
          endpoint: "/Users/GetCustomerById",
          ContactNumber: contactNumber,
        },
      };

      if (accessToken) {
        config.headers = {
          Authorization: `Bearer ${accessToken}`,
        };
      }

      const response = await api.get("/", config);
      const rawData = parseResponse(response.data);
      console.log("[getCustomerById] Raw response type:", typeof rawData, Array.isArray(rawData));

      const data = Array.isArray(rawData) ? rawData[0] : rawData;

      if (!data || !data.contactNumber) {
        return rejectWithValue("No customer found with that contact number.");
      }

      console.log("[getCustomerById] Customer found:", data.contactNumber, "accountStatus:", data.accountStatus);
      return data;
    } catch (error) {
      logRequestFailure("getCustomerById", error);

      const cached = await loadCustomerFromStorage();

      if (isUsableCachedProfile(cached, contactNumber)) {
        console.log("[getCustomerById] Using cached customer data");
        return cached;
      }

      console.log("[getCustomerById] No usable cached profile - surfacing the real error");

      return rejectWithValue(toErrorMessage(error, "Failed to fetch customer."));
    }
  }
);

/* ======================================================================= */
/*  FETCH CUSTOMER AFTER AUTH (with retry)                                */
/* ======================================================================= */
const fetchCustomerAfterAuth = async (dispatch, { contactNumber, accessToken }) => {
  try {
    return await dispatch(getCustomerById({ contactNumber, accessToken })).unwrap();
  } catch (err) {
    console.log("[fetchCustomerAfterAuth] First attempt failed - retrying once...", err);
    await wait(600);
    return dispatch(getCustomerById({ contactNumber, accessToken })).unwrap();
  }
};

/* ======================================================================= */
/*  LOGIN CUSTOMER                                                        */
/* ======================================================================= */
export const loginCustomer = createAsyncThunk(
  "customers/loginCustomer",
  async ({ contactNumber, password }, { dispatch, rejectWithValue }) => {
    setLoginFlow(true);

    try {
      console.log("[loginCustomer] Calling API with:", { contactNumber });

      const loginResponse = await api.post(
        "/",
        { contactNumber, password, fullName: "N/A" },
        { params: { endpoint: "/Users/CustomerLogin" } }
      );

      const loginData = parseResponse(loginResponse.data);
      console.log("[loginCustomer] Response:", JSON.stringify(loginData));

      const { code, message, status, accessToken, refreshToken } = extractResponseInfo(loginData);
      console.log("[loginCustomer] Extracted - code:", code, "status:", status, "hasToken:", !!accessToken);

      const isSuccess = status === true && Boolean(accessToken);

      if (!isSuccess) {
        console.log("[loginCustomer] Login rejected by backend:", message || "(no message)");
        return rejectWithValue(message || "Login failed. Invalid credentials.");
      }

      console.log("[loginCustomer] Saving token to storage before fetching customer...");
      await AsyncStorage.setItem(
        CUSTOMER_KEY,
        JSON.stringify({
          contactNumber,
          accessToken,
          refreshToken,
        })
      );

      console.log("[loginCustomer] Fetching customer details...");
      const customer = await fetchCustomerAfterAuth(dispatch, { contactNumber, accessToken });

      console.log("[loginCustomer] Customer fetched, accountStatus:", customer?.accountStatus);

      const customerWithTokens = {
        ...customer,
        accessToken: accessToken || customer.accessToken,
        refreshToken: refreshToken || customer.refreshToken,
      };

      await saveCustomerToStorage(customerWithTokens);
      return customerWithTokens;
    } catch (error) {
      console.error("[loginCustomer] Error:", error);
      return rejectWithValue(toErrorMessage(error, "An unknown error occurred during login."));
    } finally {
      setLoginFlow(false);
    }
  }
);

/* ======================================================================= */
/*  UPDATE ACCOUNT STATUS                                                 */
/* ======================================================================= */
export const updateAccountStatus = createAsyncThunk(
  "customers/updateAccountStatus",
  async ({ accountNumber, accountStatus }, { getState, rejectWithValue }) => {
    try {
      let accNum = accountNumber;
      if (!accNum) {
        const state = getState();
        accNum = state.customer?.currentCustomer?.customerAccountNumber;
      }
      if (!accNum) {
        const stored = await loadCustomerFromStorage();
        accNum = stored?.customerAccountNumber;
      }
      if (!accNum) return rejectWithValue("No customer account number found.");

      const response = await api.post(
        "/",
        { accountNumber: accNum, accountStatus: accountStatus || "0" },
        { params: { endpoint: "/Users/Customer-Status" } }
      );

      const data = parseResponse(response.data);
      const { code, message } = extractResponseInfo(data);

      if (code !== "1" && data?.status !== true) {
        return rejectWithValue(message || "Failed to update account status.");
      }

      if (accountStatus === "0") {
        await AsyncStorage.removeItem(CUSTOMER_KEY);
        await AsyncStorage.removeItem(CUSTOMERS_KEY);
      }

      return data;
    } catch (error) {
      return rejectWithValue(toErrorMessage(error, "Failed to update account status."));
    }
  }
);

/* ======================================================================= */
/*  UPDATE CUSTOMER PASSWORD                                              */
/* ======================================================================= */
export const updateCustomerPassword = createAsyncThunk(
  "customers/updateCustomerPassword",
  async ({ contactNumber, newPassword, customerData }, { dispatch, getState, rejectWithValue }) => {
    setLoginFlow(true);

    try {
      console.log("[updateCustomerPassword] Updating for:", contactNumber);

      const state = getState();
      const currentToken = state.customer?.currentCustomer?.accessToken;
      const storedCustomer = await loadCustomerFromStorage();
      const token = currentToken || storedCustomer?.accessToken;

      const payload = { ...customerData, password: newPassword, contactNumber };

      const config = {
        params: { endpoint: "/Users/Customer-Post" },
        headers: { "Content-Type": "application/json" },
      };

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const response = await api.post("/", payload, config);
      const data = parseResponse(response.data);
      console.log("[updateCustomerPassword] Response:", JSON.stringify(data));

      if (customerData?.customerAccountNumber) {
        try {
          await dispatch(updateAccountStatus({
            accountNumber: customerData.customerAccountNumber,
            accountStatus: "1",
          })).unwrap();
          console.log("[updateCustomerPassword] Account reactivated");
        } catch (e) {
          console.warn("[updateCustomerPassword] Failed to reactivate:", e);
        }
      }

      const updatedCustomer = await fetchCustomerAfterAuth(dispatch, { contactNumber, accessToken: token });

      return updatedCustomer;
    } catch (error) {
      return rejectWithValue(toErrorMessage(error, "Failed to update password."));
    } finally {
      setLoginFlow(false);
    }
  }
);

/* ======================================================================= */
/*  REFRESH TOKEN                                                         */
/* ======================================================================= */
export const refreshCustomerToken = createAsyncThunk(
  "customers/refreshToken",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const currentCustomer = state.customer?.currentCustomer;
      if (!currentCustomer?.refreshToken) return rejectWithValue("No refresh token available.");

      const response = await api.post(
        "/",
        { refreshToken: currentCustomer.refreshToken },
        { params: { endpoint: "/Users/CustomerRefreshToken" } }
      );

      const data = parseResponse(response.data);
      const updatedCustomer = {
        ...currentCustomer,
        accessToken: data.accessToken || currentCustomer.accessToken,
        refreshToken: data.refreshToken || currentCustomer.refreshToken,
      };

      await saveCustomerToStorage(updatedCustomer);
      return updatedCustomer;
    } catch (error) {
      return rejectWithValue(toErrorMessage(error, "Failed to refresh token."));
    }
  }
);

/* ======================================================================= */
/*  SLICE                                                                 */
/* ======================================================================= */
const initialState = {
  currentCustomer: null,
  customerList: [],
  selectedCustomer: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  isAuthChecked: false,
};

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    silentLogoutAction: (state) => {
      state.currentCustomer = null;
      state.selectedCustomer = null;
      state.isAuthenticated = false;
      AsyncStorage.removeItem("customer").catch(() => {});
    },
    setCurrentCustomer: (state, action) => {
      state.currentCustomer = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearCustomers: (state) => { state.customerList = []; },
    setCustomer: (state, action) => { state.selectedCustomer = action.payload; },
    clearSelectedCustomer: (state) => { state.selectedCustomer = null; },
    setAuthenticated: (state, action) => { state.isAuthenticated = action.payload; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuthStatus.pending, (s) => { s.loading = true; })
      .addCase(checkAuthStatus.fulfilled, (s, a) => {
        s.loading = false; s.isAuthChecked = true;
        s.currentCustomer = a.payload.customer; s.isAuthenticated = a.payload.isAuthenticated;
      })
      .addCase(checkAuthStatus.rejected, (s) => {
        s.loading = false; s.isAuthChecked = true; s.currentCustomer = null; s.isAuthenticated = false;
      })

      .addCase(createCustomer.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(createCustomer.fulfilled, (s) => { s.loading = false; s.error = null; })
      .addCase(createCustomer.rejected, (s, a) => { s.loading = false; s.error = a.payload || a.error?.message; })

      .addCase(fetchCustomers.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchCustomers.fulfilled, (s, a) => {
        s.loading = false; s.customerList = Array.isArray(a.payload) ? a.payload : []; s.error = null;
      })
      .addCase(fetchCustomers.rejected, (s, a) => { s.loading = false; s.error = a.payload || a.error?.message; })

      .addCase(getCustomerById.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(getCustomerById.fulfilled, (s, a) => {
        s.loading = false; s.error = null;
        if (!s.currentCustomer || !s.isAuthenticated) {
          s.currentCustomer = a.payload;
          s.isAuthenticated = true;
        }
      })
      .addCase(getCustomerById.rejected, (s, a) => { s.loading = false; s.error = a.payload || a.error?.message; })

      .addCase(loginCustomer.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(loginCustomer.fulfilled, (s, a) => {
        s.loading = false; s.currentCustomer = a.payload; s.isAuthenticated = true; s.error = null;
      })
      .addCase(loginCustomer.rejected, (s, a) => { s.loading = false; s.error = a.payload || a.error?.message; })

      .addCase(updateAccountStatus.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(updateAccountStatus.fulfilled, (s, a) => {
        s.loading = false; s.error = null;
        if (a.meta?.arg?.accountStatus === "0") { s.currentCustomer = null; s.isAuthenticated = false; }
      })
      .addCase(updateAccountStatus.rejected, (s, a) => { s.loading = false; s.error = a.payload || a.error?.message; })

      .addCase(updateCustomerPassword.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(updateCustomerPassword.fulfilled, (s, a) => {
        s.loading = false; s.currentCustomer = a.payload; s.isAuthenticated = true; s.error = null;
      })
      .addCase(updateCustomerPassword.rejected, (s, a) => { s.loading = false; s.error = a.payload || a.error?.message; })

      .addCase(refreshCustomerToken.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(refreshCustomerToken.fulfilled, (s, a) => { s.loading = false; s.currentCustomer = a.payload; s.error = null; })
      .addCase(refreshCustomerToken.rejected, (s, a) => { s.loading = false; s.error = a.payload || a.error?.message; })

      /* ====== LOGOUT THUNK STATES ====== */
      .addCase(logoutCustomer.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(logoutCustomer.fulfilled, (s) => {
        s.loading = false;
        s.currentCustomer = null;
        s.selectedCustomer = null;
        s.isAuthenticated = false;
        s.error = null;
      })
      .addCase(logoutCustomer.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload || a.error?.message || "Failed to logout.";
        s.currentCustomer = null;
        s.selectedCustomer = null;
        s.isAuthenticated = false;
      });
  },
});

export const {
  silentLogoutAction, setCurrentCustomer,
  clearCustomers, setCustomer, clearSelectedCustomer, setAuthenticated, clearError,
} = customerSlice.actions;

export const selectCurrentCustomer = (s) => s.customer.currentCustomer;
export const selectCustomerList = (s) => s.customer.customerList;
export const selectCustomerLoading = (s) => s.customer.loading;
export const selectCustomerError = (s) => s.customer.error;
export const selectIsAuthenticated = (s) => s.customer.isAuthenticated;
export const selectIsAuthChecked = (s) => s.customer.isAuthChecked;

export default customerSlice.reducer;