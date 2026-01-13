import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from "./axiosInstance"; // 👈 your axios instance

// Async thunk for fetching all showrooms
export const fetchShowrooms = createAsyncThunk(
  'showrooms/fetchShowrooms',
  async () => {
    try {
      const response = await api.get('/ShowRoom/Get-ShowRoom');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch showrooms';
    }
  }
);

// Async thunk for fetching showrooms displayed on the home page
export const fetchHomePageShowrooms = createAsyncThunk(
  'showrooms/fetchHomePageShowrooms',
  async () => {
    try {
      const response = await api.get('/ShowRoom/Get-HomePageShowRoom');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch home page showrooms';
    }
  }
);



// Create the showroom slice
const showroomSlice = createSlice({
  name: 'showrooms',
  initialState: {
    showrooms: [],
    homePageShowrooms: [], // Add state for home page showrooms
    loading: false,
    error: null,
  },
  reducers: {
    clearShowrooms: (state) => {
      state.showrooms = [];
      state.homePageShowrooms = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchShowrooms.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchShowrooms.fulfilled, (state, action) => {
        state.loading = false;
        state.showrooms = action.payload;
      })
      .addCase(fetchShowrooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchHomePageShowrooms.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchHomePageShowrooms.fulfilled, (state, action) => {
        state.loading = false;
        state.homePageShowrooms = action.payload;
      })
      .addCase(fetchHomePageShowrooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
  },
});

// Export actions and reducer
export const { clearShowrooms } = showroomSlice.actions;
export default showroomSlice.reducer;
