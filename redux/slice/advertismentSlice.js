import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "./axiosInstance"; // 👈 your axios instance

// API root inside SalesMate
const API_PREFIX = "/Advertisment";

// -------------------- GET BY NAME --------------------
export const getAdvertisment = createAsyncThunk(
  "advertisment/get",
  async (AdsName, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `${API_PREFIX}/GetAdvertisment`,
        {
          params: { AdsName }, // axios handles encoding
        }
      );

      return Array.isArray(response.data) ? response.data.slice(1) : [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to fetch advertisements"
      );
    }
  }
);

// -------------------- HOME PAGE --------------------
export const getHomePageAdvertisment = createAsyncThunk(
  "advertisment/getHomePage",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `${API_PREFIX}/GetAdvertisment`,
        {
          params: { AdsName: "Home Page" },
        }
      );

      return Array.isArray(response.data) ? response.data.slice(1) : [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to fetch Home Page advertisements"
      );
    }
  }
);

// -------------------- BANNER --------------------
export const getBannerPageAdvertisment = createAsyncThunk(
  "advertisment/getBannerPage",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `${API_PREFIX}/GetAdvertisment`,
        {
          params: { AdsName: "Banner" },
        }
      );

      return Array.isArray(response.data) ? response.data.slice(1) : [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to fetch Banner advertisements"
      );
    }
  }
);

const advertismentSlice = createSlice({
  name: "advertisment",
  initialState: {
    advertisments: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAdvertisment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAdvertisment.fulfilled, (state, action) => {
        state.loading = false;
        state.advertisments = action.payload;
      })
      .addCase(getAdvertisment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(getHomePageAdvertisment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getHomePageAdvertisment.fulfilled, (state, action) => {
        state.loading = false;
        state.advertisments = action.payload;
      })
      .addCase(getHomePageAdvertisment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(getBannerPageAdvertisment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBannerPageAdvertisment.fulfilled, (state, action) => {
        state.loading = false;
        state.advertisments = action.payload;
      })
      .addCase(getBannerPageAdvertisment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default advertismentSlice.reducer;
