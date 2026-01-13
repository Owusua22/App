import { createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helpers
const saveWishlist = async (wishlist) => {
  try {
    await AsyncStorage.setItem('wishlist', JSON.stringify(wishlist));
  } catch (e) {
    console.error('Error saving wishlist', e);
  }
};

const loadWishlist = async () => {
  try {
    const data = await AsyncStorage.getItem('wishlist');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading wishlist', e);
    return [];
  }
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { items: [] },
  reducers: {
    setWishlist: (state, action) => {
      state.items = action.payload;
    },
    addToWishlist: (state, action) => {
      const exists = state.items.find(
        item => item.productID === action.payload.productID
      );
      if (!exists) {
        state.items.push(action.payload);
        // Persist right here
        saveWishlist(state.items);
      }
    },
    removeFromWishlist: (state, action) => {
      state.items = state.items.filter(item => item.productID !== action.payload);
      saveWishlist(state.items); // persist after remove
    },
    clearWishlist: (state) => {
      state.items = [];
      saveWishlist([]); // persist after clear
    },
  },
});

export const { setWishlist, addToWishlist, removeFromWishlist, clearWishlist } =
  wishlistSlice.actions;
export default wishlistSlice.reducer;

// Load persisted wishlist on app start
export const loadWishlistFromStorage = () => async (dispatch) => {
  const wishlist = await loadWishlist();
  dispatch(setWishlist(wishlist));
};
