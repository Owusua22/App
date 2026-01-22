// src/redux/slices/paymentSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "./axiosInstance"; // ✅ AWS-proxy axios instance (Lambda baseURL)

// Real backend routes
const PAYMENT_PREFIX = "/PaymentSystem";
const ENDPOINTS = {
  POST_HUBTEL_CALLBACK: `${PAYMENT_PREFIX}/PostHubtelCallBack`,
  GET_HUBTEL_CALLBACK_BY_ID: `${PAYMENT_PREFIX}/GetHubtelCallBackById`,
};

// Post Hubtel callback (via AWS proxy)
export const postHubtelCallback = createAsyncThunk(
  "payment/postHubtelCallback",
  async (responseData, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        "/",
        { responseData },
        {
          params: { endpoint: ENDPOINTS.POST_HUBTEL_CALLBACK },
          headers: { "Content-Type": "application/json" },
        }
      );

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Something went wrong"
      );
    }
  }
);

// Get Hubtel callback by Order ID (clientReference) (via AWS proxy)
export const getHubtelCallbackById = createAsyncThunk(
  "payment/getHubtelCallbackById",
  async (orderId, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: ENDPOINTS.GET_HUBTEL_CALLBACK_BY_ID,
          Orderid: orderId, // keep param name backend expects
        },
      });

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Something went wrong"
      );
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    callbackData: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearPaymentState: (state) => {
      state.callbackData = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // postHubtelCallback
      .addCase(postHubtelCallback.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(postHubtelCallback.fulfilled, (state, action) => {
        state.loading = false;
        state.callbackData = action.payload;
      })
      .addCase(postHubtelCallback.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // getHubtelCallbackById
      .addCase(getHubtelCallbackById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getHubtelCallbackById.fulfilled, (state, action) => {
        state.loading = false;
        state.callbackData = action.payload;
      })
      .addCase(getHubtelCallbackById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      
  },
});

export const { clearPaymentState } = paymentSlice.actions;

export default paymentSlice.reducer;
