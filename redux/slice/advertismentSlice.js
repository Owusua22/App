import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "./axiosInstance"; // ✅ AWS-proxy axios instance

// Real backend prefix (SalesMate)
const API_PREFIX = "/Advertisment";
const GET_ADS_ENDPOINT = `${API_PREFIX}/GetAdvertisment`;

// -------------------- GET BY NAME (via AWS proxy) --------------------
export const getAdvertisment = createAsyncThunk(
  "advertisment/get",
  async (AdsName, { rejectWithValue }) => {
    try {
      // ✅ call Lambda root "/" and pass the real endpoint in params.endpoint
      const { data } = await api.get("/", {
        params: {
          endpoint: GET_ADS_ENDPOINT,
          AdsName, // forwarded as query param to backend
        },
      });

      return Array.isArray(data) ? data.slice(1) : [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch advertisements"
      );
    }
  }
);

// -------------------- HOME PAGE (via AWS proxy) --------------------
export const getHomePageAdvertisment = createAsyncThunk(
  "advertisment/getHomePage",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: GET_ADS_ENDPOINT,
          AdsName: "Home Page",
        },
      });

      return Array.isArray(data) ? data.slice(1) : [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch Home Page advertisements"
      );
    }
  }
);

// -------------------- BANNER (via AWS proxy) --------------------
export const getBannerPageAdvertisment = createAsyncThunk(
  "advertisment/getBannerPage",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: GET_ADS_ENDPOINT,
          AdsName: "Banner",
        },
      });

      return Array.isArray(data) ? data.slice(1) : [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch Banner advertisements"
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
