import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

import api from "./axiosInstance"; // 👈 your axios instance

// Async thunk for creating a new customer
export const createCustomer = createAsyncThunk(
  "customers/createCustomer",
  async (customerData, { rejectWithValue }) => {
    try {
      const response = await api.post("/Users/Customer-Post", customerData);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data ||
        "An unknown error occurred.";
      return rejectWithValue(errorMessage);
    }
  }
);


// Async thunk for fetching all customers
export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/Users/Customer-Get");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "An unknown error occurred."
      );
    }
  }
);


// Async thunk for login
export const loginCustomer = createAsyncThunk(
  "customers/loginCustomer",
  async ({ contactNumber, password }, { dispatch, rejectWithValue }) => {
    try {
      const customers = await dispatch(fetchCustomers()).unwrap();

      const matchingCustomer = customers.find(
        (c) => c.contactNumber === contactNumber && c.password === password
      );

      if (!matchingCustomer) {
        return rejectWithValue("No customer found with the provided credentials.");
      }

      await AsyncStorage.setItem("customer", JSON.stringify(matchingCustomer));
      return matchingCustomer;
    } catch (error) {
      return rejectWithValue(error.message || "An unknown error occurred.");
    }
  }
);

export const updateAccountStatus = createAsyncThunk(
  "customers/updateAccountStatus",
  async (_, { rejectWithValue }) => {
    try {
      const customer = await AsyncStorage.getItem("customer");

      if (!customer) return rejectWithValue("No customer found.");

      const parsedCustomer = JSON.parse(customer);
      const { customerAccountNumber } = parsedCustomer;

      if (!customerAccountNumber) {
        return rejectWithValue("Invalid customer data.");
      }

      const response = await api.post("/Users/Customer-Status", {
        accountNumber: customerAccountNumber,
        accountStatus: "0",
      });

      await AsyncStorage.removeItem("customer");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to update account status."
      );
    }
  }
);



// Initial state
const initialState = {
  currentCustomer: null,
  currentCustomerDetails: null,
  customerList: [],
  selectedCustomer: null, // Add this
  loading: false,
  error: null,
};


// Create the customer slice
const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    logoutCustomer: (state) => {
      state.currentCustomer = null;
      state.currentCustomerDetails = null;
      AsyncStorage.removeItem('customer'); // Clear from AsyncStorage on logout
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
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && action.payload.ResponseCode === '1') {
          const newCustomer = { ...action.meta.arg, ...action.payload };
          state.currentCustomer = newCustomer;
          AsyncStorage.setItem('customer', JSON.stringify(newCustomer)); // Store in AsyncStorage
        } else {
          state.error = action.payload?.message || "Failed to create customer.";
        }
      })
      
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "An unknown error occurred.";
      })
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customerList = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "An unknown error occurred.";
      })
      .addCase(loginCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCustomer = action.payload;
        state.currentCustomerDetails = action.payload;
      })
      .addCase(loginCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed.";
      })
      .addCase(updateAccountStatus.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateAccountStatus.fulfilled, (state) => {
        state.status = "succeeded";
        state.customerData = null; // Clear customer data from Redux
      })
      .addCase(updateAccountStatus.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to update account status.";
      });
  
  },
});

export const { logoutCustomer, clearCustomers, setCustomer, clearSelectedCustomer } = customerSlice.actions;

// Export the reducer
export default customerSlice.reducer;