import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "./axiosInstance"; // ✅ AWS-proxy axios instance

// Real backend route
const BRANDS_ENDPOINT = "/Brand/Get-Brand";

// -------------------- FETCH BRANDS (via AWS proxy) --------------------
export const fetchBrands = createAsyncThunk(
  "brand/fetchBrands",
  async (_, { rejectWithValue }) => {
    try {
      // ✅ Call Lambda root and pass the real endpoint
      const { data } = await api.get("/", {
        params: {
          endpoint: BRANDS_ENDPOINT,
        },
      });

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch brands"
      );
    }
  }
);
const brandSlice = createSlice({
  name: "brands",
  initialState: {
    brands: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrands.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.loading = false;
        state.brands = action.payload;
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default brandSlice.reducer;
