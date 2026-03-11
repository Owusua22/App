// src/redux/slice/paymentSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = "https://smpayapi.salesmate.app/";
const PSP = "fte"; // constant PSP query parameter

// ------------------------
// Async Thunks with PSP query
// ------------------------

// 1️⃣ Debit Customer
export const debitCustomer = createAsyncThunk(
  "payment/debitCustomer",
  async ({ refNo, msisdn, amount, network, narration }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}PaymentPrompt/DebitCustomer?PSP=${PSP}`,
        {
          refNo,
          msisdn,
          amount,
          network,
          narration,
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 2️⃣ Validate Account
export const validateAccount = createAsyncThunk(
  "payment/validateAccount",
  async ({ msisdn, network }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}PaymentPrompt/ValidateAccount?PSP=${PSP}`,
        { msisdn, network }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 3️⃣ Check Transaction Status
export const checkTransactionStatus = createAsyncThunk(
  "payment/checkTransactionStatus",
  async ({ refNo }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}PaymentPrompt/CheckTransactionStatus?PSP=${PSP}`,
        { refNo }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 4️⃣ Debit by Customer Network Provider ID
export const debitByCustomerNetworkProviderId = createAsyncThunk(
  "payment/debitByCustomerNetworkProviderId",
  async ({ transactionNumber, contactNumber, customerNetworkProviderId, amount }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}PaymentPrompt/DebitbyCustomerNetworkProviderId?PSP=${PSP}`,
        {
          transactionNumber,
          contactNumber,
          customerNetworkProviderId,
          amountPaid: amount,
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 5️⃣ Get Account Hold Name
export const getAccountHoldName = createAsyncThunk(
  "payment/getAccountHoldName",
  async ({ msisdn, network }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}PaymentPrompt/AccountHoldName?PSP=${PSP}`,
        { msisdn, network }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ------------------------
// Slice (unchanged)
// ------------------------
const initialState = {
  debitCustomerData: null,
  validateAccountData: null,
  transactionStatus: null,
  debitNetworkData: null,
  accountHoldName: null,
  loading: false,
  error: null,
};

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    resetPaymentState: (state) => {
      state.debitCustomerData = null;
      state.validateAccountData = null;
      state.transactionStatus = null;
      state.debitNetworkData = null;
      state.accountHoldName = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Debit Customer
      .addCase(debitCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(debitCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.debitCustomerData = action.payload;
      })
      .addCase(debitCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Validate Account
      .addCase(validateAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.validateAccountData = action.payload;
      })
      .addCase(validateAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Check Transaction Status
      .addCase(checkTransactionStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkTransactionStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.transactionStatus = action.payload;
      })
      .addCase(checkTransactionStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Debit by Customer Network Provider ID
      .addCase(debitByCustomerNetworkProviderId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(debitByCustomerNetworkProviderId.fulfilled, (state, action) => {
        state.loading = false;
        state.debitNetworkData = action.payload;
      })
      .addCase(debitByCustomerNetworkProviderId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Account Hold Name
      .addCase(getAccountHoldName.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAccountHoldName.fulfilled, (state, action) => {
        state.loading = false;
        state.accountHoldName = action.payload;
      })
      .addCase(getAccountHoldName.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetPaymentState } = paymentSlice.actions;
export default paymentSlice.reducer;