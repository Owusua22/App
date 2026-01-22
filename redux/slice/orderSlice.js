import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./axiosInstance"; // ✅ AWS-proxy axios instance (Lambda baseURL)

// -------------------- Helpers --------------------
const sliceState = (state) => state.order ?? state.orders ?? {}; // supports reducer key "order" OR "orders"

const getErrorMessage = (action) =>
  action?.payload || action?.error?.message || "Something went wrong";

const normalizeOrdersResponse = (data) => {
  if (data === false || data == null) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.orders)) return data.orders;
  return [];
};

// ✅ real backend endpoints
const ORDER_PREFIX = "/Order";
const ENDPOINTS = {
  GET_BY_CUSTOMER: `${ORDER_PREFIX}/GetOrderByCustomer`,
  CHECKOUT_DB_CART: `${ORDER_PREFIX}/CheckOutDbCart`,
  CHECKOUT_LOCAL_CART: `${ORDER_PREFIX}/CheckOutLocalStorageCart`,
  SALES_ORDER_GET: `${ORDER_PREFIX}/SalesOrderGet`, // + /{id}
  ORDER_ADDRESS: `${ORDER_PREFIX}/OrderAddress`,
  DELIVERY_UPDATE: `${ORDER_PREFIX}/OrderDeliveryUpdate`, // + /{orderCode}
  GET_DELIVERY_ADDRESS: `${ORDER_PREFIX}/GetOrderDeliveryAddress`, // + /{OrderCode}
};

// -------------------- Thunks (ALL via AWS proxy) --------------------
export const fetchOrdersByCustomer = createAsyncThunk(
  "orders/fetchOrdersByCustomer",
  async ({ from, to, customerId }, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: ENDPOINTS.GET_BY_CUSTOMER,
          from,
          to,
          customerId,
        },
      });

      return normalizeOrdersResponse(data);
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch orders"
      );
    }
  }
);

export const checkOutOrder = createAsyncThunk(
  "orders/checkOutOrder",
  async (
    {
      Cartid,
      orderCode,
      customerId,
      PaymentMode,
      paymentService,
      PaymentAccountNumber,
      customerAccountType,
    },
    { rejectWithValue }
  ) => {
    try {
      const payload = {
        Cartid,
        orderCode,
        customerId,
        PaymentMode,
        paymentService,
        PaymentAccountNumber,
        customerAccountType,
      };

      const { data } = await api.post("/", payload, {
        params: { endpoint: ENDPOINTS.CHECKOUT_DB_CART },
        headers: { "Content-Type": "application/json" },
      });

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to checkout order"
      );
    }
  }
);

export const checkOutLocalStorageCart = createAsyncThunk(
  "orders/checkOutLocalStorageCart",
  async (
    {
      cartId,
      productId,
      price,
      quantity,
      customerid,
      orderDate,
      paymentMode,
      paymentService,
      paymentAccountNumber,
      customerAccountType,
    },
    { rejectWithValue }
  ) => {
    try {
      const payload = {
        cartId,
        productId,
        price,
        quantity,
        customerid,
        orderDate,
        paymentMode,
        paymentService,
        paymentAccountNumber,
        customerAccountType,
      };

      const { data } = await api.post("/", payload, {
        params: { endpoint: ENDPOINTS.CHECKOUT_LOCAL_CART },
        headers: { "Content-Type": "application/json" },
      });

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to checkout local cart"
      );
    }
  }
);

export const fetchSalesOrderById = createAsyncThunk(
  "orders/fetchSalesOrderById",
  async (orderId, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: `${ENDPOINTS.SALES_ORDER_GET}/${orderId}`,
        },
      });

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch sales order"
      );
    }
  }
);

export const createOrderAddress = createAsyncThunk(
  "orders/createOrderAddress",
  async (
    {
      customerId,
      OrderCode,
      address,
      geoLocation,
      RecipientName,
      RecipientContactNumber,
      orderNote,
    },
    { rejectWithValue }
  ) => {
    try {
      const requestData = {
        customerId,
        OrderCode,
        address,
        geoLocation,
        RecipientName,
        RecipientContactNumber,
        orderNote,
      };

      const { data } = await api.post("/", requestData, {
        params: { endpoint: ENDPOINTS.ORDER_ADDRESS },
        headers: { "Content-Type": "application/json" },
      });

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to create order address"
      );
    }
  }
);

export const updateOrderDelivery = createAsyncThunk(
  "orders/updateOrderDelivery",
  async (
    {
      orderCode,
      address,
      recipientName,
      recipientContactNumber,
      orderNote,
      geoLocation,
      Customerid,
    },
    { rejectWithValue }
  ) => {
    try {
      const payload = {
        orderCode,
        Customerid,
        address,
        recipientName,
        recipientContactNumber,
        orderNote,
        geoLocation,
      };

      const { data } = await api.post("/", payload, {
        params: {
          endpoint: `${ENDPOINTS.DELIVERY_UPDATE}/${orderCode}`,
        },
        headers: { "Content-Type": "application/json" },
      });

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to update delivery"
      );
    }
  }
);

export const fetchOrderDeliveryAddress = createAsyncThunk(
  "orders/fetchOrderDeliveryAddress",
  async (OrderCode, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: `${ENDPOINTS.GET_DELIVERY_ADDRESS}/${OrderCode}`,
        },
      });

      // API can return false => normalize to null
      return data ? data : null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch delivery address"
      );
    }
  }
);

// -------------------- Slice --------------------
const initialState = {
  orders: [],
  salesOrder: null,
  deliveryAddress: null,
  addressDetails: null,
  deliveryUpdate: null,
  checkoutResult: null,

  // IMPORTANT: these must ALWAYS be objects (never booleans/strings)
  loading: {
    orders: false,
    checkout: false,
    checkoutLocal: false,
    salesOrder: false,
    createAddress: false,
    deliveryAddress: false,
    deliveryUpdate: false,
  },
  error: {
    orders: null,
    checkout: null,
    checkoutLocal: null,
    salesOrder: null,
    createAddress: null,
    deliveryAddress: null,
    deliveryUpdate: null,
  },
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    // Keep name "clearOrders" for compatibility with your existing imports
    clearOrders(state) {
      state.orders = [];
      state.salesOrder = null;
      state.deliveryAddress = null;
      state.addressDetails = null;
      state.deliveryUpdate = null;
      state.checkoutResult = null;
      state.loading = { ...initialState.loading };
      state.error = { ...initialState.error };

      // Optional async cleanup
      AsyncStorage.removeItem("orders").catch(() => {});
    },

    clearLocalStorage(state) {
      AsyncStorage.removeItem("checkoutDetails").catch(() => {});
      AsyncStorage.removeItem("orderAddressDetails").catch(() => {});
      AsyncStorage.removeItem("userOrders").catch(() => {});

      state.orders = [];
      state.salesOrder = null;
      state.deliveryAddress = null;
      state.addressDetails = null;
      state.deliveryUpdate = null;
      state.checkoutResult = null;
      state.loading = { ...initialState.loading };
      state.error = { ...initialState.error };
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- Orders list ----
      .addCase(fetchOrdersByCustomer.pending, (state) => {
        state.loading.orders = true;
        state.error.orders = null;
      })
      .addCase(fetchOrdersByCustomer.fulfilled, (state, action) => {
        state.loading.orders = false;
        state.orders = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchOrdersByCustomer.rejected, (state, action) => {
        state.loading.orders = false;
        state.error.orders = getErrorMessage(action);
      })

      // ---- Checkout DB cart ----
      .addCase(checkOutOrder.pending, (state) => {
        state.loading.checkout = true;
        state.error.checkout = null;
      })
      .addCase(checkOutOrder.fulfilled, (state, action) => {
        state.loading.checkout = false;
        state.checkoutResult = action.payload ?? null;
      })
      .addCase(checkOutOrder.rejected, (state, action) => {
        state.loading.checkout = false;
        state.error.checkout = getErrorMessage(action);
      })

      // ---- Checkout Local cart ----
      .addCase(checkOutLocalStorageCart.pending, (state) => {
        state.loading.checkoutLocal = true;
        state.error.checkoutLocal = null;
      })
      .addCase(checkOutLocalStorageCart.fulfilled, (state, action) => {
        state.loading.checkoutLocal = false;
        state.checkoutResult = action.payload ?? null;
      })
      .addCase(checkOutLocalStorageCart.rejected, (state, action) => {
        state.loading.checkoutLocal = false;
        state.error.checkoutLocal = getErrorMessage(action);
      })

      // ---- Sales order ----
      .addCase(fetchSalesOrderById.pending, (state) => {
        state.loading.salesOrder = true;
        state.error.salesOrder = null;
      })
      .addCase(fetchSalesOrderById.fulfilled, (state, action) => {
        state.loading.salesOrder = false;
        state.salesOrder = action.payload ?? null;
      })
      .addCase(fetchSalesOrderById.rejected, (state, action) => {
        state.loading.salesOrder = false;
        state.error.salesOrder = getErrorMessage(action);
      })

      // ---- Address create ----
      .addCase(createOrderAddress.pending, (state) => {
        state.loading.createAddress = true;
        state.error.createAddress = null;
      })
      .addCase(createOrderAddress.fulfilled, (state, action) => {
        state.loading.createAddress = false;
        state.addressDetails = action.payload ?? null;
      })
      .addCase(createOrderAddress.rejected, (state, action) => {
        state.loading.createAddress = false;
        state.error.createAddress = getErrorMessage(action);
      })

      // ---- Delivery update ----
      .addCase(updateOrderDelivery.pending, (state) => {
        state.loading.deliveryUpdate = true;
        state.error.deliveryUpdate = null;
      })
      .addCase(updateOrderDelivery.fulfilled, (state, action) => {
        state.loading.deliveryUpdate = false;
        state.deliveryUpdate = action.payload ?? null;
      })
      .addCase(updateOrderDelivery.rejected, (state, action) => {
        state.loading.deliveryUpdate = false;
        state.error.deliveryUpdate = getErrorMessage(action);
      })

      // ---- Delivery address ----
      .addCase(fetchOrderDeliveryAddress.pending, (state) => {
        state.loading.deliveryAddress = true;
        state.error.deliveryAddress = null;
      })
      .addCase(fetchOrderDeliveryAddress.fulfilled, (state, action) => {
        state.loading.deliveryAddress = false;
        state.deliveryAddress = action.payload ?? null;
      })
      .addCase(fetchOrderDeliveryAddress.rejected, (state, action) => {
        state.loading.deliveryAddress = false;
        state.error.deliveryAddress = getErrorMessage(action);
      });
  },
});

// -------------------- Exports --------------------
export const { clearOrders, clearLocalStorage } = orderSlice.actions;
export default orderSlice.reducer;

// ✅ These names match your screen imports exactly:
export const selectOrders = (state) => sliceState(state).orders ?? [];
export const selectOrdersLoading = (state) => sliceState(state).loading?.orders ?? false;
export const selectOrdersError = (state) => sliceState(state).error?.orders ?? null;

// optional extra selectors
export const selectSalesOrder = (state) => sliceState(state).salesOrder;
export const selectDeliveryAddress = (state) => sliceState(state).deliveryAddress;