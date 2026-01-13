import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from './axiosInstance';


export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async () => {
    try {
      const response = await api.get("/Product/Product-Get");

      const products = response.data;

      const filteredProducts = products
        .filter(product => product.status == 1) // Loose equality for type mismatches
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

      return filteredProducts;
    } catch (error) {
      throw error;
    }
  }
);

export const fetchProduct = createAsyncThunk(
  "products/fetchProduct",
  async () => {
    try {
      const response = await api.get("/Product/Product-Get");

      const filteredProducts = response.data
        .filter(product => product.status == 1)
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
        .slice(0, 24);

      return filteredProducts;
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  }
);


export const fetchProductsByBrand = createAsyncThunk(
  "products/fetchProductsByBrand",
  async (brandId) => {
    const response = await api.get(`/Product/Product-Get-by-Brand/${brandId}`);
    return response.data.sort(
      (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
    );
  }
);

export const fetchProductsByShowroom = createAsyncThunk(
  "products/fetchProductsByShowroom",
  async (showRoomID) => {
    const response = await api.get(`/Product/Product-Get-by-ShowRoom/${showRoomID}`);
    return {
      showRoomID,
      products: response.data.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)),
    };
  }
);

export const fetchProductById = createAsyncThunk(
  "products/fetchProductById",
  async (productId) => {
    try {
      const response = await api.get(`/Product/Product-Get-by-Product_ID/${productId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
);

export const fetchPaginatedProducts = createAsyncThunk(
  "products/fetchPaginatedProducts",
  async ({ pageNumber, pageSize = 24 }, { rejectWithValue }) => {
    try {
      const response = await api.get("/Product/Product-Get-Paginated", {
        params: { PageNumber: pageNumber, PageSize: pageSize },
      });

      const sortedData = response.data.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );

      return sortedData;
    } catch (error) {
      console.error("Error fetching paginated products:", error);
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
export const fetchProductsByCategory = createAsyncThunk(
  "products/fetchProductsByCategory",
  async (categoryId) => {
    const response = await api.get(`/Product/Product-Get-by-Category/${categoryId}`);
    return {
      categoryId,
      products: response.data.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)),
    };
  }
);
export const fetchProductByShowroomAndRecord = createAsyncThunk(
  "products/fetchProductByShowroomAndRecord",
  async ({ showRoomCode, recordNumber }) => {
    try {
      const response = await api.get("/Product/Product-Get-by-ShowRoom_RecordNumber", {
        params: {
          ShowRommCode: showRoomCode, // keep parameter name as in API
          RecordNumber: recordNumber,
        },
      });

      const sortedProducts = response.data.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );

      return { showRoomCode, products: sortedProducts };
    } catch (error) {
      throw error;
    }
  }
);
export const fetchPaginatedProductsByShowroom = createAsyncThunk(
  "products/fetchPaginatedProductsByShowroom",
  async ({ showRoomCode, pageNumber = 1, pageSize = 4 }, { rejectWithValue }) => {
    try {
      const response = await api.get(
        "/Product/Product-Get-by-ShowRoom-Pageinated",
        {
          params: {
            Code: showRoomCode,
            PageNumber: pageNumber,
            PageSize: pageSize,
          },
        }
      );

      const sortedProducts = response.data.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );

      return {
        showRoomCode,
        pageNumber,
        products: sortedProducts,
      };
    } catch (error) {
      console.error("Showroom pagination error:", error);
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);


// Create the product slice
const productSlice = createSlice({
  name: 'products',
  initialState: {
    products: [],
    filteredProducts: [],
    productsByShowroom: {},
    productsByCategory: {},
     showroomPages: {},        // { KUMASI: [], ACCRA: [] }
  showroomLoading: {},      // { KUMASI: true, ACCRA: false }
  showroomError: {},  
    currentProduct: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearProducts: (state) => {
      state.products = [];
      state.filteredProducts = [];
      state.productsByShowroom = {};
      state.currentProduct = null;
      state.error = null;

    },
    setProductsCache: (state, action) => {
      const { brandId, products } = action.payload;
      state.productsCache[brandId] = products;
    },
   
    resetProducts: (state) => {
      state.products = [];
      state.filteredProducts = [];
      state.productsByShowroom = {};
      state.currentProduct = null;
      state.error = null;
    },
    
  },
  extraReducers: (builder) => {
    builder
    
    
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
   
      .addCase(fetchProductsByBrand.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductsByBrand.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProductsByBrand.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchProductsByShowroom.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductsByShowroom.fulfilled, (state, action) => {
        state.loading = false;
        const { showRoomID, products } = action.payload;
        state.productsByShowroom[showRoomID] = products;
      })
      .addCase(fetchProductsByShowroom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchProductsByCategory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        const { categoryId, products } = action.payload || {}; // Ensure action.payload is defined
      
        if (!categoryId) {
          console.error("categoryId is undefined:", action.payload);
          return;
        }
      
        // ✅ Ensure `state.productsByCategory` exists before modifying it
        if (!state.productsByCategory) {
          state.productsByCategory = {};
        }
      
        state.productsByCategory[categoryId] = products || []; // ✅ Fix: Always set a valid array
      })
      
      .addCase(fetchProductsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchPaginatedProducts.pending, (state) => {
        state.loading = true;
        state.error = null; // Reset error on new request
      })
      .addCase(fetchPaginatedProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload; // Assign fetched products
      })
      .addCase(fetchPaginatedProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch products'; // Set error message from action payload
      })
      .addCase(fetchProductByShowroomAndRecord.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductByShowroomAndRecord.fulfilled, (state, action) => {
        const { showRoomCode, products } = action.payload;
        state.productsByShowroom[showRoomCode] = products; // Store data by showroom
        state.loading = false;
      })
      .addCase(fetchProductByShowroomAndRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // PENDING
builder.addCase(fetchPaginatedProductsByShowroom.pending, (state, action) => {
  const { showRoomCode } = action.meta.arg;

  state.showroomLoading[showRoomCode] = true;
  state.showroomError[showRoomCode] = null;
});

// FULFILLED
builder.addCase(fetchPaginatedProductsByShowroom.fulfilled, (state, action) => {
  const { showRoomCode, pageNumber, products } = action.payload;

  state.showroomLoading[showRoomCode] = false;

  // First page → reset list (pull-to-refresh)
  if (pageNumber === 1) {
    state.showroomPages[showRoomCode] = products;
  } 
  // Next pages → append (infinite scroll)
  else {
    if (!state.showroomPages[showRoomCode]) {
      state.showroomPages[showRoomCode] = [];
    }
    state.showroomPages[showRoomCode].push(...products);
  }
});

// REJECTED
builder.addCase(fetchPaginatedProductsByShowroom.rejected, (state, action) => {
  const { showRoomCode } = action.meta.arg;

  state.showroomLoading[showRoomCode] = false;
  state.showroomError[showRoomCode] =
    action.payload || action.error.message || "Failed to load showroom products";
});

      
      },
});
// Export the reducer and actions
export const { clearProducts, setFilteredProducts, setProductsCache, resetProducts } = productSlice.actions;
export default productSlice.reducer;