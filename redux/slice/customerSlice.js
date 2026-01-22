// src/redux/slice/customerSlice.js (React Native)
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./axiosInstance"; // Lambda-based axios instance (RN)

const CUSTOMER_KEY = "customer";

// -------------------------
// AsyncStorage helpers
// -------------------------
const loadCustomerFromStorage = async () => {
  try {
    const value = await AsyncStorage.getItem(CUSTOMER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
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
    console.warn("Failed to save customer:", e);
  }
};

// -------------------------
// Async Thunks (via Lambda)
// -------------------------

// Create a new customer
export const createCustomer = createAsyncThunk(
  "customers/createCustomer",
  async (customerData, { rejectWithValue }) => {
    try {
      const response = await api.post("/", customerData, {
        params: { endpoint: "/Users/Customer-Post" },
        headers: { "Content-Type": "application/json" },
      });

      // sometimes proxy returns string JSON
      const data =
        typeof response.data === "string"
          ? JSON.parse(response.data)
          : response.data;

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "An unknown error occurred."
      );
    }
  }
);

// Fetch all customers
export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/", {
        params: { endpoint: "/Users/Customer-Get" },
      });

      const data =
        typeof response.data === "string"
          ? JSON.parse(response.data)
          : response.data;

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "An unknown error occurred."
      );
    }
  }
);

// Get customer by contact number (exactly like web)
export const getCustomerById = createAsyncThunk(
  "customers/getCustomerById",
  async (contactNumber, { rejectWithValue }) => {
    try {
      const response = await api.get("/", {
        params: {
          endpoint: "/Users/GetCustomerById",
          contactNumber, // ✅ matches web
        },
      });

      let raw = response.data;
      if (typeof raw === "string") {
        try {
          raw = JSON.parse(raw);
        } catch {
          // keep as-is if not JSON
        }
      }

      const data = Array.isArray(raw) ? raw[0] : raw;

      if (!data || !data.contactNumber) {
        return rejectWithValue("No customer found with that contact number.");
      }

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "An unknown error occurred while fetching the customer."
      );
    }
  }
);

// Customer login (exactly like web)
export const loginCustomer = createAsyncThunk(
  "customers/loginCustomer",
  async ({ contactNumber, password }, { dispatch, rejectWithValue }) => {
    try {
      const loginResponse = await api.post(
        "/",
        {
          contactNumber,
          password,
          FullName: "N/A",
        },
        { params: { endpoint: "/Users/CustomerLogin" } }
      );

      let loginData = loginResponse.data;

      // 🔴 Backend may return JSON string
      if (typeof loginData === "string") {
        try {
          loginData = JSON.parse(loginData);
        } catch (e) {
          console.error("Failed to parse loginData JSON:", e, loginData);
          return rejectWithValue("Invalid response from server.");
        }
      }

      if (String(loginData?.ResponseCode) !== "1") {
        return rejectWithValue(
          loginData?.ResponseMessage || "Login failed. Invalid credentials."
        );
      }

      // ✅ Load full customer record
      const customer = await dispatch(getCustomerById(contactNumber)).unwrap();

      // ✅ Persist to AsyncStorage
      await saveCustomerToStorage(customer);

      return customer;
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "An unknown error occurred during login."
      );
    }
  }
);

// Update account status (deactivate) like web (RN version)
export const updateAccountStatus = createAsyncThunk(
  "customers/updateAccountStatus",
  async (arg, { getState, rejectWithValue }) => {
    try {
      // 1) from arg
      let accountNumber = arg?.accountNumber;

      // 2) from redux
      if (!accountNumber) {
        const state = getState();
        const current = state.customer?.currentCustomer;
        if (current?.customerAccountNumber) {
          accountNumber = current.customerAccountNumber;
        }
      }

      // 3) from AsyncStorage
      if (!accountNumber) {
        const stored = await loadCustomerFromStorage();
        if (stored?.customerAccountNumber) {
          accountNumber = stored.customerAccountNumber;
        }
      }

      if (!accountNumber) {
        return rejectWithValue("No customer account number found.");
      }

      const response = await api.post(
        "/",
        { accountNumber, accountStatus: "0" },
        { params: { endpoint: "/Users/Customer-Status" } }
      );

      await saveCustomerToStorage(null);
      return response.data;
    } catch (error) {
      console.error("Error updating account status:", error);
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data ||
          error.message ||
          "Failed to delete account."
      );
    }
  }
);

// -------------------------
// Slice
// -------------------------
const initialState = {
  currentCustomer: null,
  customerList: [],
  loading: false,
  error: null,
};

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    logoutCustomer: (state) => {
      state.currentCustomer = null;
      state.currentCustomerDetails = null;
      AsyncStorage.removeItem("customer").catch(() => {});
    },
     clearCustomers: (state) => {
      state.customerList = [];
    },
    setCustomer: (state, action) => {
      state.selectedCustomer = action.payload;
    },
    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // createCustomer
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        // Don’t force-set currentCustomer here; web doesn’t.
        // You can keep it if you want, but safest is to just keep response.
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      })

      // fetchCustomers
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customerList = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      })

      // getCustomerById
      .addCase(getCustomerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomerById.fulfilled, (state, action) => {
        state.loading = false;
        // keep details in currentCustomer (web returns customer)
        state.currentCustomer = action.payload;
      })
      .addCase(getCustomerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      })

      // loginCustomer
      .addCase(loginCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCustomer = action.payload;
      })
      .addCase(loginCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      })

      // updateAccountStatus
      .addCase(updateAccountStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAccountStatus.fulfilled, (state) => {
        state.loading = false;
        state.currentCustomer = null;
      })
      .addCase(updateAccountStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      });
  },
});

export const {
  logoutCustomer,
  clearCustomers,
  setCustomer,
  clearSelectedCustomer,
} = customerSlice.actions;

export default customerSlice.reducer;
