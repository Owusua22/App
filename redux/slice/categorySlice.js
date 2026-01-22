import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "./axiosInstance"; // ✅ AWS-proxy axios instance

const CATEGORIES_ENDPOINT = "/Category/Category-Get";

// -------------------- FETCH CATEGORIES (via AWS proxy) --------------------
export const fetchCategories = createAsyncThunk(
  "categories/fetchCategories",
  async (_, { rejectWithValue }) => {
    try {
      // ✅ Call Lambda root "/" and forward the real backend endpoint
      const { data } = await api.get("/", {
        params: {
          endpoint: CATEGORIES_ENDPOINT,
        },
      });

      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch categories"
      );
    }
  }
);

const categorySlice = createSlice({
  name: "categories",
  initialState: {
    categories: [],
    status: "idle", // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export default categorySlice.reducer;
