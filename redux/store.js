import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';
import productReducer from './slice/productSlice';
import brandReducer from './slice/brandSlice';
import categoryReducer from './slice/categorySlice';
import cartReducer from './slice/cartSlice';
import customerReducer, { silentLogoutAction, updateSessionTokens } from './slice/customerSlice';
import { registerAuthExpiredHandler, registerAuthUpdatedHandler } from './slice/axiosInstance';
import orderReducer, { clearOrderSession } from './slice/orderSlice';
import shippingReducer from './slice/shippingSlice';
import showroomReducer from "./slice/showroomSlice"
import advertismentReducer from './slice/advertismentSlice'
import paymentReducer, { resetPaymentState } from './slice/paymentSlice';
import wishlistReducer from './wishlistSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['cart', 'products', 'advertisment', 'categories', 'brands'], // Persist these reducers
};

const rootReducer = combineReducers({
  categories: categoryReducer,
  products: productReducer,
  brands: brandReducer,
showrooms: showroomReducer,
  cart: cartReducer,
  customer: customerReducer,
  order: orderReducer,
  shipping: shippingReducer,
  advertisment: advertismentReducer,
   payment: paymentReducer,
   wishlist : wishlistReducer
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Create the store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable serializable state check
      immutableCheck: false,    // Disable the immutable state check
    }),
});

// Never leave an expired customer's profile or orders in memory after 401.
registerAuthExpiredHandler(() => {
  store.dispatch(silentLogoutAction());
  store.dispatch(clearOrderSession());
  store.dispatch(resetPaymentState());
});
registerAuthUpdatedHandler((customer) => store.dispatch(updateSessionTokens(customer)));

export const persistor = persistStore(store); // Create the persistor