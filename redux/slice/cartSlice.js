import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import UUID from "react-native-uuid";
import api from "./axiosInstance";

// ✅ Real backend endpoints (SalesMate)
const CART_ADD = "/Cart/Add-To-Cart";
const CART_GET_BY_ID = "/Cart/Cart-GetbyID"; // + /{cartId}
const CART_UPDATE = "/Cart/Cart-Update";     // + /{cartId}/{productId}/{quantity}
const CART_DELETE = "/Cart/Cart-Delete";     // + /{cartId}/{productId}

// -------------------- ADD TO CART (via AWS proxy) --------------------
export const addToCart = createAsyncThunk(
  "cart/addToCart",
  async ({ productId, price, quantity }, { rejectWithValue, dispatch }) => {
    try {
      let cartId = await AsyncStorage.getItem("cartId");

      if (!cartId) {
        cartId = UUID.v4();
        await AsyncStorage.setItem("cartId", String(cartId));
      }

      // ✅ call Lambda root "/" and pass actual backend endpoint
      await api.post(
        "/",
        { cartId, productId, price, quantity },
        {
          params: { endpoint: CART_ADD },
          headers: { "Content-Type": "application/json" },
        }
      );

      const newCartItem = { cartId, productId, price, quantity };

      const cart = JSON.parse(await AsyncStorage.getItem("cart")) || [];
      cart.push(newCartItem);
      await AsyncStorage.setItem("cart", JSON.stringify(cart));

      const totalItems = cart.reduce((t, i) => t + (Number(i.quantity) || 0), 0);
      dispatch(loadCart({ cart, totalItems }));

      return newCartItem;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// -------------------- GET CART BY ID (via AWS proxy) --------------------
export const getCartById = createAsyncThunk(
  "cart/getCartById",
  async (cartId, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: `${CART_GET_BY_ID}/${cartId}`,
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// -------------------- UPDATE CART ITEM (via AWS proxy) --------------------
export const updateCartItem = createAsyncThunk(
  "cart/updateCartItem",
  async ({ cartId, productId, quantity }, { rejectWithValue, dispatch }) => {
    try {
      // your API uses POST with path params
      await api.post(
        "/",
        null,
        {
          params: {
            endpoint: `${CART_UPDATE}/${cartId}/${productId}/${quantity}`,
          },
        }
      );

      const cart = JSON.parse(await AsyncStorage.getItem("cart")) || [];
      const updatedCart = cart.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      );

      await AsyncStorage.setItem("cart", JSON.stringify(updatedCart));
      dispatch(loadCart());

      return { cartId, productId, quantity };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// -------------------- DELETE CART ITEM (via AWS proxy) --------------------
export const deleteCartItem = createAsyncThunk(
  "cart/deleteCartItem",
  async ({ cartId, productId }, { dispatch, rejectWithValue }) => {
    try {
      await api.post(
        "/",
        null,
        {
          params: {
            endpoint: `${CART_DELETE}/${cartId}/${productId}`,
          },
        }
      );

      const cart = JSON.parse(await AsyncStorage.getItem("cart")) || [];
      const updatedCart = cart.filter((i) => i.productId !== productId);
      await AsyncStorage.setItem("cart", JSON.stringify(updatedCart));

      dispatch(loadCart());
      return { cartId, productId };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// -------------------- CLEAR CART (local only) --------------------
export const clearCart = createAsyncThunk(
  "cart/clearCart",
  async (_, { rejectWithValue }) => {
    try {
      await AsyncStorage.removeItem("cart");
      await AsyncStorage.removeItem("cartId");
      return [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// -------------------- LOAD CART (local only) --------------------
export const loadCart = createAsyncThunk(
  "cart/loadCart",
  async (_, { rejectWithValue }) => {
    try {
      const cart = JSON.parse(await AsyncStorage.getItem("cart")) || [];
      const totalItems = cart.reduce((t, i) => t + (Number(i.quantity) || 0), 0);
      return { cart, totalItems };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Cart slice
const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    cartItems: [], // Renamed to cartItems for clarity
    cartId: null,
    loading: false,
    error: null,
    totalItems: 0, // Added totalItems to the state
  },
  reducers: {
    loadFromStorage(state, action) {
      state.cartItems = action.payload;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
    .addCase(loadCart.fulfilled, (state, action) => {
      state.cartItems = action.payload.cart;
      state.totalItems = action.payload.totalItems;
    })
    .addCase(addToCart.fulfilled, (state, action) => {
      const existingIndex = state.cartItems.findIndex(
        (item) => item.productId === action.payload.productId
      );
      if (existingIndex !== -1) {
        state.cartItems[existingIndex].quantity += action.payload.quantity;
      } else {
        state.cartItems.push(action.payload);
      }
      state.totalItems += action.payload.quantity;
    })

      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getCartById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCartById.fulfilled, (state, action) => {
        state.loading = false;
        state.cartItems = action.payload;
      })
      .addCase(getCartById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateCartItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.cartItems.findIndex(
          (item) => item.productId === action.payload.productId
        );
        if (index !== -1) {
          state.cartItems[index].quantity = action.payload.quantity;
        }
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteCartItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteCartItem.fulfilled, (state, action) => {
        state.loading = false;
        state.cartItems = state.cartItems.filter(
          (item) => item.productId !== action.payload.productId
        );
        state.totalItems = state.cartItems.reduce(
          (total, item) => total + item.quantity,
          0
        );
      })
      .addCase(deleteCartItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.cartItems = [];
        state.cartId = null;
        state.totalItems = 0; // Reset totalItems
      });
  },
});

export default cartSlice.reducer;