import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "./axiosInstance";

// helpers
const sortByNewest = (arr = []) =>
  [...arr].sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

const activeOnly = (arr = []) => arr.filter((p) => String(p.status) === "1");

/* ===========================
   ASYNC THUNKS (via AWS proxy)
=========================== */

// GET: all products (active)
export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: { endpoint: "/Product/Product-Get" },
      });
      return sortByNewest(activeOnly(data));
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

// GET: top 24 active products
export const fetchProduct = createAsyncThunk(
  "products/fetchProduct",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: { endpoint: "/Product/Product-Get" },
      });
      return sortByNewest(activeOnly(data)).slice(0, 24);
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

export const fetchProductsByBrand = createAsyncThunk(
  "products/fetchProductsByBrand",
  async (brandId, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: { endpoint: `/Product/Product-Get-by-Brand/${brandId}` },
      });
      return sortByNewest(data);
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

export const fetchProductsByShowroom = createAsyncThunk(
  "products/fetchProductsByShowroom",
  async (showRoomID, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: { endpoint: `/Product/Product-Get-by-ShowRoom/${showRoomID}` },
      });
      return { showRoomID, products: sortByNewest(data) };
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

export const fetchProductById = createAsyncThunk(
  "products/fetchProductById",
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: { endpoint: `/Product/Product-Get-by-Product_ID/${productId}` },
      });
      return data;
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

export const fetchPaginatedProducts = createAsyncThunk(
  "products/fetchPaginatedProducts",
  async ({ pageNumber, pageSize = 24 }, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: "/Product/Product-Get-Paginated",
          PageNumber: pageNumber,
          PageSize: pageSize,
        },
      });
      return sortByNewest(data);
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

export const fetchProductsByCategory = createAsyncThunk(
  "products/fetchProductsByCategory",
  async (categoryId, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: { endpoint: `/Product/Product-Get-by-Category/${categoryId}` },
      });
      return { categoryId, products: sortByNewest(data) };
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

export const fetchProductByShowroomAndRecord = createAsyncThunk(
  "products/fetchProductByShowroomAndRecord",
  async ({ showRoomCode, recordNumber }, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: "/Product/Product-Get-by-ShowRoom_RecordNumber",
          ShowRommCode: showRoomCode, // keep exact API param name
          RecordNumber: recordNumber,
        },
      });
      return { showRoomCode, products: sortByNewest(data) };
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

export const fetchPaginatedProductsByShowroom = createAsyncThunk(
  "products/fetchPaginatedProductsByShowroom",
  async ({ showRoomCode, pageNumber = 1, pageSize = 4 }, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/", {
        params: {
          endpoint: "/Product/Product-Get-by-ShowRoom-Pageinated",
          Code: showRoomCode,
          PageNumber: pageNumber,
          PageSize: pageSize,
        },
      });

      return { showRoomCode, pageNumber, products: sortByNewest(data) };
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

// POST: add product (via proxy)
export const addProduct = createAsyncThunk(
  "products/addProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const isFormData = productData instanceof FormData;

      const { data } = await api.post("/", productData, {
        params: { endpoint: "/Product/Product-Post" },
        headers: isFormData
          ? undefined // IMPORTANT: let axios set multipart boundary
          : { "Content-Type": "application/json" },
      });

      return data;
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

// POST: update product (via proxy)
export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const { Productid, ...rest } = productData;

      const { data } = await api.post("/", rest, {
        params: { endpoint: `/Product/Product_Put/${Productid}` },
        headers: { "Content-Type": "application/json" },
      });

      return data;
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
    }
  }
);

// POST: update product image (via proxy)
export const updateProductImage = createAsyncThunk(
  "products/updateProductImage",
  async ({ productID, imageFile }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("ProductId", productID);
      formData.append("ImageName", {
        uri: imageFile.uri,
        name: imageFile.name || "image.jpg",
        type: imageFile.type || "image/jpeg",
      });

      const { data } = await api.post("/", formData, {
        params: { endpoint: "/Product/Product-Image-Edit" },
        // DO NOT set Content-Type manually in RN multipart
      });

      return data;
    } catch (e) {
      return rejectWithValue(e.response?.data || e.message);
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