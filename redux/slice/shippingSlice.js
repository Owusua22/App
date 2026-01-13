import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Define the API base URL
const API_BASE_URL = "https://smfteapi.salesmate.app";

// Async thunk for fetching all shipping countries
export const fetchShippingCountries = createAsyncThunk(
  'shipping/fetchShippingCountries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/Shipping/ShippingCountryGet`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "An unknown error occurred.");
    }
  }
);

// Async thunk for fetching shipping divisions based on country code
export const fetchShippingDivisions = createAsyncThunk(
  'shipping/fetchShippingDivisions',
  async (countryCode, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/Shipping/ShippingCountryDivisionGet${countryCode}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "An unknown error occurred.");
    }
  }
);

// Async thunk for fetching locations based on division
export const fetchShippingLocations = createAsyncThunk(
  'shipping/fetchShippingLocations',
  async (divisionCode, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/Shipping/ShippingLocation${divisionCode}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "An unknown error occurred.");
    }
  }
);

// Initial state
const initialState = {
  countries: [],
  divisions: [],
  locations: [],
  loading: false,
  error: null,
};

// Create the shipping slice
const shippingSlice = createSlice({
  name: 'shipping',
  initialState,
  reducers: {
    clearShippingData: (state) => {
      state.countries = [];
      state.divisions = [];
      state.locations = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch countries
      .addCase(fetchShippingCountries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShippingCountries.fulfilled, (state, action) => {
        state.loading = false;
        state.countries = action.payload;
      })
      .addCase(fetchShippingCountries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "An unknown error occurred.";
      })
      
      // Fetch divisions
      .addCase(fetchShippingDivisions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShippingDivisions.fulfilled, (state, action) => {
        state.loading = false;
        state.divisions = action.payload;
      })
      .addCase(fetchShippingDivisions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "An unknown error occurred.";
      })
      
      // Fetch locations
      .addCase(fetchShippingLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShippingLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload;
      })
      .addCase(fetchShippingLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || "An unknown error occurred.";
      });
  },
});

// Export the actions
export const { clearShippingData } = shippingSlice.actions;

// Export the reducer
export default shippingSlice.reducer;
