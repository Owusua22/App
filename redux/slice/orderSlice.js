/**
 * orderSlice.js — React Native / Expo
 * ---------------------------------------------------------------------------
 * Order, checkout, delivery, cancellation, and local-order state for mobile.
 * Uses AsyncStorage for persisted checkout/address drafts.
 *
 * Includes:
 *  - Friendly price-update rejection handling for checkout and delivery.
 *  - Cart-id validation through POST /Order/ValidateCart with cartId in the query
 *  - Order cancellation API support (UI must gate cancellation to
 *    "Order Placement" using its local status helper).
 * ---------------------------------------------------------------------------
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./axiosInstance";

const ORDER_PREFIX = "/Order";

export const ENDPOINTS = {
  GET_BY_DATE: `${ORDER_PREFIX}/GetOrdersByDate`,
  GET_BY_CUSTOMER: `${ORDER_PREFIX}/GetOrderByCustomer`,
  GET_BY_THIRD_PARTY: `${ORDER_PREFIX}/GetOrderByThirdParty`,
  CHECKOUT_DB_CART: `${ORDER_PREFIX}/CheckOutDbCart`,
  CHECKOUT_LOCAL_CART: `${ORDER_PREFIX}/CheckOutLocalStorageCart`,
  VALIDATE_CART: `${ORDER_PREFIX}/ValidateCart`,
  SALES_ORDER_GET: `${ORDER_PREFIX}/SalesOrderGet`,
  ORDER_ADDRESS: `${ORDER_PREFIX}/OrderAddress`,
  DELIVERY_UPDATE: `${ORDER_PREFIX}/OrderDeliveryUpdate`,
  GET_DELIVERY_ADDRESS: `${ORDER_PREFIX}/GetOrderDeliveryAddress`,
  UPDATE_TRANSITION: `${ORDER_PREFIX}/UpdateOrderTransition`,
  LIFECYCLE_GET: `${ORDER_PREFIX}/OrderLifeCycle-Get`,
  CANCEL_ORDER: `${ORDER_PREFIX}/CancelOrder`,
};

const CHECKOUT_DETAILS_KEY = "checkoutDetails";
const ORDER_ADDRESS_KEY = "orderAddressDetails";
const USER_ORDERS_KEY = "userOrders";

export const FRIENDLY_PRICE_UPDATE_MSG =
  "Heads up! Prices have been updated. Your cart has been cleared to reflect the latest prices. Please add your items again and place your order.";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const isTechnicalMessage = (message) => {
  if (!message) return false;
  const lower = String(message).toLowerCase();
  return (
    lower.includes("datareader") ||
    lower.includes("transaction failed") ||
    lower.includes("open datareader")
  );
};

const sanitizeBackendMessage = (message, fallback) => {
  if (!message) return fallback;
  if (isTechnicalMessage(message)) return FRIENDLY_PRICE_UPDATE_MSG;
  return message;
};

const toErrorPayload = (error, fallback) => {
  const data = error?.response?.data;
  const serverMessage =
    data?.message ??
    data?.responseMessage ??
    data?.response?.responseMessage ??
    (typeof data === "string" ? data : null);
  return sanitizeBackendMessage(serverMessage, error?.message || fallback);
};

const createValidationError = (message) => {
  const error = new Error(message);
  error.isClientValidation = true;
  return error;
};

const encodePart = (value) => encodeURIComponent(String(value));

const resolveOrderCode = (arg) => {
  if (typeof arg === "string" || typeof arg === "number") return arg;
  return arg?.OrderCode ?? arg?.orderCode ?? arg?.orderId ?? null;
};

const resolveCartId = (arg) => {
  if (typeof arg === "string" || typeof arg === "number") return arg;
  return arg?.cartId ?? arg?.CartId ?? null;
};

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

/**
 * Normalizes the several response shapes used by the API/proxy and detects
 * the backend's price-update failure response, including HTTP-200 failures.
 */
export const getResponseMeta = (data) => {
  const code =
    data?.responseCode ?? data?.response?.responseCode ?? data?.code ?? "";
  const rawMessage =
    data?.responseMessage ??
    data?.response?.responseMessage ??
    data?.message ??
    data?.error ??
    "";
  const raw = String(rawMessage ?? "").trim();
  const lower = raw.toLowerCase();
  const isFailure =
    String(code).trim() === "0" ||
    lower.includes("datareader") ||
    lower.includes("transaction failed");

  return {
    code: String(code ?? "").trim(),
    rawMessage: raw,
    isFailure,
    raw: data,
  };
};

export const buildPriceUpdateRejection = (meta) => ({
  message: FRIENDLY_PRICE_UPDATE_MSG,
  rawMessage: meta?.rawMessage ?? "",
  responseCode: meta?.code || "0",
  raw: meta?.raw ?? null,
  isCheckoutFailure: true,
  isPriceUpdate: true,
});

/** Compatibility helper only; screens should keep their local cancellation gate. */
export const isOrderCancellable = (order) => {
  if (!order) return false;
  const status = String(
    order.orderCycle ??
      order.OrderCycle ??
      order.status ??
      order.Status ??
      order.orderStatus ??
      order.OrderStatus ??
      ""
  )
    .trim()
    .toLowerCase();
  return status === "order placement";
};

const getInitialLoadingStatus = () => ({
  orders: false,
  checkout: false,
  checkoutLocal: false,
  validateCart: false,
  deliveryAddress: false,
  deliveryUpdate: false,
  lifeCycle: false,
  salesOrder: false,
  cancelOrder: false,
});

const getInitialErrorState = () => ({
  orders: null,
  checkout: null,
  checkoutLocal: null,
  validateCart: null,
  deliveryAddress: null,
  deliveryUpdate: null,
  lifeCycle: null,
  salesOrder: null,
  cancelOrder: null,
});

const syncGlobalLoading = (state) => {
  state.loading = Object.values(state.loadingStatus).some(Boolean);
};

const setLoadingStatus = (state, key, value) => {
  if (!state.loadingStatus) state.loadingStatus = getInitialLoadingStatus();
  state.loadingStatus[key] = value;
  syncGlobalLoading(state);
};

const startLoading = (state, key) => {
  setLoadingStatus(state, key, true);
  if (!state.errorStatus) state.errorStatus = getInitialErrorState();
  state.errorStatus[key] = null;
};

const stopLoading = (state, key) => {
  setLoadingStatus(state, key, false);
};

const rejectLoading = (state, key, action, fallbackMessage) => {
  stopLoading(state, key);
  if (!state.errorStatus) state.errorStatus = getInitialErrorState();

  const payloadMessage =
    action?.payload?.message ??
    (typeof action?.payload === "string" ? action.payload : null) ??
    action?.error?.message ??
    fallbackMessage;
  const sanitized = sanitizeBackendMessage(payloadMessage, fallbackMessage);
  state.errorStatus[key] = sanitized;

  if (!state.error || typeof state.error !== "object") {
    state.error = getInitialErrorState();
  }
  state.error[key] = sanitized;
};

const asArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.orders)) return payload.orders;
  return [];
};

/* ── API thunks ───────────────────────────────────────────────────────────── */

export const fetchOrdersByDate = createAsyncThunk(
  "orders/fetchOrdersByDate",
  async ({ from, to }, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: `${ENDPOINTS.GET_BY_DATE}/${encodePart(from)}/${encodePart(to)}`,
        },
      });
      return data ?? [];
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to fetch orders by date")
      );
    }
  }
);

/** Creates the checkout order after ValidateCart has passed in the screen. */
export const checkOutOrder = createAsyncThunk(
  "orders/checkOutOrder",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/", payload, {
        params: { endpoint: ENDPOINTS.CHECKOUT_DB_CART },
        headers: { "Content-Type": "application/json" },
      });
      const meta = getResponseMeta(data);
      if (meta.isFailure) {
        // CheckOutDbCart is the order-creation call, not the cart price
        // validator. Report its failure normally; ValidateCart owns the
        // price-update decision and modal flow.
        return rejectWithValue({
          message: "Could not create the checkout order. Please try again.",
          responseCode: meta.code,
          rawMessage: meta.rawMessage,
          raw: data,
        });
      }
      return data;
    } catch (error) {
      const meta = getResponseMeta(error?.response?.data);
      if (meta.isFailure) {
        return rejectWithValue({
          message: "Could not create the checkout order. Please try again.",
          responseCode: meta.code,
          rawMessage: meta.rawMessage,
          raw: meta.raw,
        });
      }
      return rejectWithValue(toErrorPayload(error, "Failed to create checkout order"));
    }
  }
);

/** Mobile-only checkout for a locally stored cart. */
export const checkOutLocalStorageCart = createAsyncThunk(
  "orders/checkOutLocalStorageCart",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/", payload, {
        params: { endpoint: ENDPOINTS.CHECKOUT_LOCAL_CART },
        headers: { "Content-Type": "application/json" },
      });
      const meta = getResponseMeta(data);
      if (meta.isFailure) {
        return rejectWithValue(buildPriceUpdateRejection(meta));
      }
      return data;
    } catch (error) {
      const meta = getResponseMeta(error?.response?.data);
      if (meta.isFailure) {
        return rejectWithValue(buildPriceUpdateRejection(meta));
      }
      return rejectWithValue(
        toErrorPayload(error, "Failed to checkout local cart")
      );
    }
  }
);

/**
 * Validates a cart through POST /Order/ValidateCart?cartId={cartId}.
 * `cartId` is a single query parameter; it is not wrapped in a request array.
 */
export const validateCart = createAsyncThunk(
  "orders/validateCart",
  async (arg, { rejectWithValue }) => {
    try {
      const value = resolveCartId(arg);
      const cartId = value == null ? "" : String(value).trim();
      if (!cartId) throw createValidationError("cartId is required.");

      const { data } = await api.post("/", null, {
        params: {
          endpoint: ENDPOINTS.VALIDATE_CART,
          cartId,
        },
      });
      return data;
    } catch (error) {
      if (error?.isClientValidation) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue(toErrorPayload(error, "Failed to validate cart"));
    }
  }
);

/** Alias for callers that prefer the explicit thunk name. */
export const validateCartId = validateCart;

export const fetchOrdersByCustomer = createAsyncThunk(
  "orders/fetchOrdersByCustomerOrAgent",
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
      return data ?? [];
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to fetch orders"));
    }
  }
);

export const fetchOrdersByThirdParty = createAsyncThunk(
  "orders/fetchOrdersByThirdParty",
  async ({ from, to, ThirdPartyAccountNumber }, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: ENDPOINTS.GET_BY_THIRD_PARTY,
          from,
          to,
          ThirdPartyAccountNumber,
        },
      });
      return data ?? [];
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to fetch orders"));
    }
  }
);

export const updateOrderTransition = createAsyncThunk(
  "orders/updateOrderTransition",
  async ({ CycleName, OrderId }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/", null, {
        params: {
          endpoint: `${ENDPOINTS.UPDATE_TRANSITION}/${encodePart(
            CycleName
          )}/${encodePart(OrderId)}`,
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to update order transition")
      );
    }
  }
);

export const fetchOrderLifeCycle = createAsyncThunk(
  "orders/fetchOrderLifeCycle",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: { endpoint: ENDPOINTS.LIFECYCLE_GET },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to fetch order lifecycle")
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
          endpoint: `${ENDPOINTS.SALES_ORDER_GET}/${encodePart(orderId)}`,
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to fetch sales order")
      );
    }
  }
);

/** Preserve the original delivery fields and add the API's OrderCode key. */
export const updateOrderDelivery = createAsyncThunk(
  "orders/updateOrderDelivery",
  async ({ orderCode, ...payload }, { rejectWithValue }) => {
    try {
      const OrderCode = payload?.OrderCode ?? orderCode;
      if (!OrderCode) throw createValidationError("OrderCode is required.");

      const body = { ...payload, OrderCode };
      const { data } = await api.post("/", body, {
        params: {
          endpoint: `${ENDPOINTS.DELIVERY_UPDATE}/${encodePart(OrderCode)}`,
        },
        headers: { "Content-Type": "application/json" },
      });
      const meta = getResponseMeta(data);
      if (meta.isFailure) {
        return rejectWithValue({
          message: "Could not update order delivery. Please try again.",
          responseCode: meta.code,
          rawMessage: meta.rawMessage,
          raw: data,
        });
      }
      return data;
    } catch (error) {
      const meta = getResponseMeta(error?.response?.data);
      if (meta.isFailure) {
        return rejectWithValue({
          message: "Could not update order delivery. Please try again.",
          responseCode: meta.code,
          rawMessage: meta.rawMessage,
          raw: meta.raw,
        });
      }
      return rejectWithValue(
        toErrorPayload(error, "Failed to update order delivery")
      );
    }
  }
);

export const orderAddress = createAsyncThunk(
  "orders/orderAddress",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/", payload, {
        params: { endpoint: ENDPOINTS.ORDER_ADDRESS },
        headers: { "Content-Type": "application/json" },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to update order address")
      );
    }
  }
);

/** Backwards-compatible alias for older mobile screens. */
export const createOrderAddress = orderAddress;

export const fetchOrderDeliveryAddress = createAsyncThunk(
  "orders/fetchOrderDeliveryAddress",
  async (OrderCode, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: `${ENDPOINTS.GET_DELIVERY_ADDRESS}/${encodePart(OrderCode)}`,
        },
      });
      return data ?? null;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to fetch delivery address")
      );
    }
  }
);

/**
 * Cancels by OrderCode. The UI must only expose this action while the order is
 * in "Order Placement"; status gating remains local to the screen.
 */
export const cancelOrder = createAsyncThunk(
  "orders/cancelOrder",
  async (arg, { rejectWithValue }) => {
    try {
      const OrderCode = resolveOrderCode(arg);
      if (!OrderCode) throw createValidationError("OrderCode is required.");

      const { data } = await api.get("/", {
        params: {
          endpoint: `${ENDPOINTS.CANCEL_ORDER}/${encodePart(OrderCode)}`,
        },
      });
      return data;
    } catch (error) {
      if (error?.isClientValidation) {
        return rejectWithValue(error.message || "OrderCode is required.");
      }
      return rejectWithValue(toErrorPayload(error, "Failed to cancel order"));
    }
  }
);

/* ── AsyncStorage thunks ──────────────────────────────────────────────────── */

export const hydrateOrderDraft = createAsyncThunk(
  "orders/hydrateOrderDraft",
  async () => {
    try {
      const pairs = await AsyncStorage.multiGet([
        CHECKOUT_DETAILS_KEY,
        ORDER_ADDRESS_KEY,
      ]);
      const map = Object.fromEntries(pairs || []);
      return {
        checkoutDetails: safeParse(map?.[CHECKOUT_DETAILS_KEY], null),
        orderAddressDetails: safeParse(map?.[ORDER_ADDRESS_KEY], null),
      };
    } catch {
      return { checkoutDetails: null, orderAddressDetails: null };
    }
  }
);

export const storeLocalOrder = createAsyncThunk(
  "orders/storeLocalOrder",
  async (order, { rejectWithValue }) => {
    try {
      const raw = await AsyncStorage.getItem(USER_ORDERS_KEY);
      const parsed = safeParse(raw, []);
      const stored = Array.isArray(parsed) ? parsed : [];
      const index = stored.findIndex(
        (item) =>
          item.userId === order?.userId && item.orderId === order?.orderId
      );
      if (index !== -1) stored[index] = order;
      else stored.push(order);
      await AsyncStorage.setItem(USER_ORDERS_KEY, JSON.stringify(stored));
      return stored;
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to store local order");
    }
  }
);

export const fetchOrdersByUser = createAsyncThunk(
  "orders/fetchOrdersByUser",
  async (userId, { rejectWithValue }) => {
    try {
      const raw = await AsyncStorage.getItem(USER_ORDERS_KEY);
      const parsed = safeParse(raw, []);
      const stored = Array.isArray(parsed) ? parsed : [];
      return stored.filter((item) => item.userId === userId);
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to fetch local orders");
    }
  }
);

/* ── Slice ────────────────────────────────────────────────────────────────── */

const initialState = {
  orders: [],
  salesOrder: [],
  deliveryAddress: null,
  deliveryUpdate: null,
  lifeCycle: null,
  cancelResult: null,
  cartValidation: null,
  localOrders: [],
  checkoutDetails: null,
  orderAddressDetails: null,
  loading: false,
  loadingStatus: getInitialLoadingStatus(),
  error: getInitialErrorState(),
  errorStatus: getInitialErrorState(),
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    clearLocalStorage: (state) => {
      AsyncStorage.multiRemove([
        CHECKOUT_DETAILS_KEY,
        ORDER_ADDRESS_KEY,
        USER_ORDERS_KEY,
      ]).catch(() => {});
      state.checkoutDetails = null;
      state.orderAddressDetails = null;
      state.orders = [];
      state.localOrders = [];
    },

    saveCheckoutDetails: (state, action) => {
      const details = action.payload;
      state.checkoutDetails = details;
      AsyncStorage.setItem(CHECKOUT_DETAILS_KEY, JSON.stringify(details)).catch(
        () => {}
      );
    },

    saveAddressDetails: (state, action) => {
      const details = action.payload;
      state.orderAddressDetails = details;
      AsyncStorage.setItem(ORDER_ADDRESS_KEY, JSON.stringify(details)).catch(
        () => {}
      );
    },

    updateOrder: (state, action) => {
      const updated = action.payload;
      if (!updated) return;
      const updatedKey =
        updated._id ?? updated.orderCode ?? updated.OrderCode ?? updated.orderId;
      const index = state.orders.findIndex((order) => {
        const orderKey =
          order._id ?? order.orderCode ?? order.OrderCode ?? order.orderId;
        return orderKey === updatedKey;
      });
      if (index !== -1) {
        state.orders[index] = { ...state.orders[index], ...updated };
      }
    },

    clearOrders: (state) => {
      state.orders = [];
      state.salesOrder = [];
      state.deliveryAddress = null;
      state.deliveryUpdate = null;
      state.lifeCycle = null;
      state.cancelResult = null;
      state.cartValidation = null;
      state.localOrders = [];
      state.loading = false;
      state.loadingStatus = getInitialLoadingStatus();
      state.error = getInitialErrorState();
      state.errorStatus = getInitialErrorState();
    },

    clearError: (state) => {
      state.error = getInitialErrorState();
      state.errorStatus = getInitialErrorState();
    },

    clearLoading: (state) => {
      state.loading = false;
      state.loadingStatus = getInitialLoadingStatus();
    },

    resetCancelResult: (state) => {
      state.cancelResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateOrderDraft.fulfilled, (state, action) => {
        state.checkoutDetails = action.payload?.checkoutDetails ?? null;
        state.orderAddressDetails = action.payload?.orderAddressDetails ?? null;
      })

      /* fetchOrdersByDate */
      .addCase(fetchOrdersByDate.pending, (state) => {
        startLoading(state, "orders");
      })
      .addCase(fetchOrdersByDate.fulfilled, (state, action) => {
        stopLoading(state, "orders");
        state.orders = asArray(action.payload);
      })
      .addCase(fetchOrdersByDate.rejected, (state, action) => {
        rejectLoading(state, "orders", action, "Failed to fetch orders by date");
      })

      /* updateOrderTransition */
      .addCase(updateOrderTransition.pending, (state) => {
        startLoading(state, "orders");
      })
      .addCase(updateOrderTransition.fulfilled, (state, action) => {
        stopLoading(state, "orders");
        const updated = action.payload;
        const index = state.orders.findIndex(
          (order) =>
            (order.orderCode ?? order.OrderCode) ===
            (updated?.orderCode ?? updated?.OrderCode)
        );
        if (index !== -1) state.orders[index] = updated;
      })
      .addCase(updateOrderTransition.rejected, (state, action) => {
        rejectLoading(state, "orders", action, "Error updating order lifecycle");
      })

      /* fetchOrderLifeCycle */
      .addCase(fetchOrderLifeCycle.pending, (state) => {
        startLoading(state, "lifeCycle");
      })
      .addCase(fetchOrderLifeCycle.fulfilled, (state, action) => {
        stopLoading(state, "lifeCycle");
        state.lifeCycle = action.payload ?? null;
      })
      .addCase(fetchOrderLifeCycle.rejected, (state, action) => {
        rejectLoading(state, "lifeCycle", action, "Failed to fetch order lifecycle");
      })

      /* checkOutOrder creates the order after cart validation. */
      .addCase(checkOutOrder.pending, (state) => {
        startLoading(state, "orders");
        startLoading(state, "checkout");
      })
      .addCase(checkOutOrder.fulfilled, (state, action) => {
        stopLoading(state, "orders");
        stopLoading(state, "checkout");
        if (Array.isArray(action.payload)) state.orders = action.payload;
        state.checkoutDetails = action.payload ?? null;
      })
      .addCase(checkOutOrder.rejected, (state, action) => {
        rejectLoading(state, "orders", action, "Failed to create checkout order");
        rejectLoading(state, "checkout", action, "Failed to create checkout order");
      })

      /* checkOutLocalStorageCart */
      .addCase(checkOutLocalStorageCart.pending, (state) => {
        startLoading(state, "checkoutLocal");
      })
      .addCase(checkOutLocalStorageCart.fulfilled, (state, action) => {
        stopLoading(state, "checkoutLocal");
        state.checkoutDetails = action.payload ?? null;
      })
      .addCase(checkOutLocalStorageCart.rejected, (state, action) => {
        rejectLoading(
          state,
          "checkoutLocal",
          action,
          "Failed to checkout local cart"
        );
      })

      /* validateCart */
      .addCase(validateCart.pending, (state) => {
        state.cartValidation = null;
        startLoading(state, "validateCart");
      })
      .addCase(validateCart.fulfilled, (state, action) => {
        stopLoading(state, "validateCart");
        state.cartValidation = action.payload ?? null;
      })
      .addCase(validateCart.rejected, (state, action) => {
        state.cartValidation = null;
        rejectLoading(state, "validateCart", action, "Failed to validate cart");
      })

      /* orderAddress */
      .addCase(orderAddress.pending, (state) => {
        startLoading(state, "deliveryAddress");
      })
      .addCase(orderAddress.fulfilled, (state, action) => {
        stopLoading(state, "deliveryAddress");
        state.deliveryAddress = action.payload ?? null;
      })
      .addCase(orderAddress.rejected, (state, action) => {
        rejectLoading(
          state,
          "deliveryAddress",
          action,
          "Failed to save order address"
        );
      })

      /* fetchOrderDeliveryAddress */
      .addCase(fetchOrderDeliveryAddress.pending, (state) => {
        startLoading(state, "deliveryAddress");
      })
      .addCase(fetchOrderDeliveryAddress.fulfilled, (state, action) => {
        stopLoading(state, "deliveryAddress");
        state.deliveryAddress = action.payload ?? null;
      })
      .addCase(fetchOrderDeliveryAddress.rejected, (state, action) => {
        rejectLoading(
          state,
          "deliveryAddress",
          action,
          "Failed to fetch delivery address"
        );
      })

      /* updateOrderDelivery */
      .addCase(updateOrderDelivery.pending, (state) => {
        startLoading(state, "deliveryUpdate");
      })
      .addCase(updateOrderDelivery.fulfilled, (state, action) => {
        stopLoading(state, "deliveryUpdate");
        state.deliveryUpdate = action.payload ?? null;
      })
      .addCase(updateOrderDelivery.rejected, (state, action) => {
        rejectLoading(
          state,
          "deliveryUpdate",
          action,
          "Failed to update order delivery"
        );
      })

      /* fetchSalesOrderById */
      .addCase(fetchSalesOrderById.pending, (state) => {
        startLoading(state, "salesOrder");
      })
      .addCase(fetchSalesOrderById.fulfilled, (state, action) => {
        stopLoading(state, "salesOrder");
        state.salesOrder = Array.isArray(action.payload)
          ? action.payload
          : action.payload
          ? [action.payload]
          : [];
      })
      .addCase(fetchSalesOrderById.rejected, (state, action) => {
        rejectLoading(state, "salesOrder", action, "Failed to fetch sales order");
      })

      /* fetchOrdersByCustomer */
      .addCase(fetchOrdersByCustomer.pending, (state) => {
        startLoading(state, "orders");
      })
      .addCase(fetchOrdersByCustomer.fulfilled, (state, action) => {
        stopLoading(state, "orders");
        state.orders = asArray(action.payload);
      })
      .addCase(fetchOrdersByCustomer.rejected, (state, action) => {
        rejectLoading(state, "orders", action, "Failed to fetch orders");
      })

      /* fetchOrdersByThirdParty */
      .addCase(fetchOrdersByThirdParty.pending, (state) => {
        startLoading(state, "orders");
      })
      .addCase(fetchOrdersByThirdParty.fulfilled, (state, action) => {
        stopLoading(state, "orders");
        state.orders = asArray(action.payload);
      })
      .addCase(fetchOrdersByThirdParty.rejected, (state, action) => {
        rejectLoading(state, "orders", action, "Failed to fetch orders");
      })

      /* cancelOrder */
      .addCase(cancelOrder.pending, (state) => {
        startLoading(state, "cancelOrder");
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        stopLoading(state, "cancelOrder");
        state.cancelResult = action.payload ?? null;

        const requestedCode = resolveOrderCode(action.meta?.arg);
        if (requestedCode) {
          const index = state.orders.findIndex(
            (order) =>
              String(
                order.orderCode ?? order.OrderCode ?? order.orderId ?? ""
              ).trim() === String(requestedCode).trim()
          );
          if (index !== -1) {
            state.orders[index] = {
              ...state.orders[index],
              orderCycle: "Cancelled",
              OrderCycle: "Cancelled",
            };
          }
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        rejectLoading(state, "cancelOrder", action, "Failed to cancel order");
      })

      /* local-order storage */
      .addCase(storeLocalOrder.fulfilled, (state, action) => {
        state.localOrders = asArray(action.payload);
      })
      .addCase(fetchOrdersByUser.pending, (state) => {
        startLoading(state, "orders");
      })
      .addCase(fetchOrdersByUser.fulfilled, (state, action) => {
        stopLoading(state, "orders");
        state.localOrders = asArray(action.payload);
        state.orders = asArray(action.payload);
      })
      .addCase(fetchOrdersByUser.rejected, (state, action) => {
        rejectLoading(state, "orders", action, "Failed to fetch local orders");
      });
  },
});

export const {
  clearOrders,
  saveCheckoutDetails,
  saveAddressDetails,
  updateOrder,
  clearLocalStorage,
  clearError,
  clearLoading,
  resetCancelResult,
} = orderSlice.actions;

export default orderSlice.reducer;

/* ── Selectors ───────────────────────────────────────────────────────────── */

const sliceState = (state) => state?.orders ?? state?.order ?? {};

export const selectOrderSlice = (state) => sliceState(state);
export const selectOrders = (state) => sliceState(state).orders ?? [];
export const selectSalesOrder = (state) => sliceState(state).salesOrder ?? [];
export const selectDeliveryAddress = (state) =>
  sliceState(state).deliveryAddress ?? null;
export const selectDeliveryUpdate = (state) =>
  sliceState(state).deliveryUpdate ?? null;
export const selectOrderLifeCycle = (state) =>
  sliceState(state).lifeCycle ?? null;
export const selectCancelResult = (state) =>
  sliceState(state).cancelResult ?? null;
export const selectCartValidation = (state) =>
  sliceState(state).cartValidation ?? null;
export const selectCheckoutDetails = (state) =>
  sliceState(state).checkoutDetails ?? null;
export const selectAddressDetails = (state) =>
  sliceState(state).orderAddressDetails ?? null;
export const selectLocalOrders = (state) =>
  sliceState(state).localOrders ?? [];

export const selectOrderLoading = (state) => sliceState(state).loading ?? false;
export const selectIsAnyOrderLoading = (state) =>
  sliceState(state).loading ?? false;
export const selectOrderLoadingStatus = (state) =>
  sliceState(state).loadingStatus ?? {};

export const selectOrdersLoading = (state) =>
  sliceState(state).loadingStatus?.orders ?? false;
export const selectCheckoutLoading = (state) =>
  sliceState(state).loadingStatus?.checkout ?? false;
export const selectCheckoutLocalLoading = (state) =>
  sliceState(state).loadingStatus?.checkoutLocal ?? false;
export const selectValidateCartLoading = (state) =>
  sliceState(state).loadingStatus?.validateCart ?? false;
export const selectCartValidationLoading = selectValidateCartLoading;
export const selectSalesOrderLoading = (state) =>
  sliceState(state).loadingStatus?.salesOrder ?? false;
export const selectDeliveryAddressLoading = (state) =>
  sliceState(state).loadingStatus?.deliveryAddress ?? false;
export const selectDeliveryUpdateLoading = (state) =>
  sliceState(state).loadingStatus?.deliveryUpdate ?? false;
export const selectLifeCycleLoading = (state) =>
  sliceState(state).loadingStatus?.lifeCycle ?? false;
export const selectCancelOrderLoading = (state) =>
  sliceState(state).loadingStatus?.cancelOrder ?? false;

export const selectOrderErrors = (state) =>
  sliceState(state).errorStatus ?? sliceState(state).error ?? {};
export const selectOrdersError = (state) =>
  sliceState(state).errorStatus?.orders ?? sliceState(state).error?.orders ?? null;
export const selectCheckoutError = (state) =>
  sliceState(state).errorStatus?.checkout ??
  sliceState(state).error?.checkout ??
  null;
export const selectValidateCartError = (state) =>
  sliceState(state).errorStatus?.validateCart ??
  sliceState(state).error?.validateCart ??
  null;
export const selectCartValidationError = selectValidateCartError;
export const selectSalesOrderError = (state) =>
  sliceState(state).errorStatus?.salesOrder ?? null;
export const selectDeliveryAddressError = (state) =>
  sliceState(state).errorStatus?.deliveryAddress ?? null;
export const selectDeliveryUpdateError = (state) =>
  sliceState(state).errorStatus?.deliveryUpdate ?? null;
export const selectLifeCycleError = (state) =>
  sliceState(state).errorStatus?.lifeCycle ?? null;
export const selectCancelOrderError = (state) =>
  sliceState(state).errorStatus?.cancelOrder ?? null;
