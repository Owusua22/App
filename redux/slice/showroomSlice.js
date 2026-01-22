import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "./axiosInstance"; // ✅ AWS-proxy axios instance

const SHOWROOM_PREFIX = "/ShowRoom";
const ENDPOINTS = {
  GET_ALL: `${SHOWROOM_PREFIX}/Get-ShowRoom`,
  GET_HOME: `${SHOWROOM_PREFIX}/Get-HomePageShowRoom`,
};

// Async thunk for fetching all showrooms (via AWS proxy)
export const fetchShowrooms = createAsyncThunk(
  "showrooms/fetchShowrooms",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: ENDPOINTS.GET_ALL,
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data ||
          error.message ||
          "Failed to fetch showrooms"
      );
    }
  }
);

// Async thunk for fetching showrooms displayed on the home page (via AWS proxy)
export const fetchHomePageShowrooms = createAsyncThunk(
  "showrooms/fetchHomePageShowrooms",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: ENDPOINTS.GET_HOME,
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data ||
          error.message ||
          "Failed to fetch home page showrooms"
      );
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
