import { createWebSafeStyles } from '../../theme/webSafeStyles';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import { View, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, useWindowDimensions, Modal, ScrollView, Share, Alert, Platform } from 'react-native';
import Text, { AppTextInput as TextInput } from '../../components/AppText';
import { useProgressiveCatalog } from '../../hooks/useProgressiveCatalog';
import CatalogProductCard, { getCatalogLayout } from '../../components/CatalogProductCard';
import CachedImage from '../../components/CachedImage';
import { useCatalogScroll } from '../../hooks/useCatalogScroll';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductsByBrand } from '../../redux/slice/productSlice';
import { useCatalogRevalidation } from '../../hooks/useCatalogRevalidation';
import CatalogFetchNotice from '../../components/CatalogFetchNotice';
import { refreshCatalog } from '../../utils/catalogRefresh';
import { getBrandCatalogPreview } from '../../utils/brandCatalogPreview';
import { addToCart } from '../../redux/slice/cartSlice';
import { AntDesign, MaterialIcons, Entypo } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { removeFromWishlist, addToWishlist } from '../../redux/wishlistSlice';
import { Ionicons } from '@expo/vector-icons';
import { Octicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const EMPTY_BRAND_PRODUCTS = [];

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

const CARD_MARGIN = SPACING.sm;
const CONTAINER_PADDING = SPACING.md;
const CARD_WIDTH = (screenWidth - (CONTAINER_PADDING * 2) - (CARD_MARGIN * 3)) / 2;

const BrandScreen = () => {
  const route = useRoute();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const { columns, cardWidth } = getCatalogLayout(viewportWidth);

  // ─── FIX: Capture brandId in a stable ref so it never goes undefined on re-render ───
  const brandId = useRef(route.params?.brandId || null);
  // Always keep the ref up-to-date if the route param legitimately changes (e.g. brand switch)
  useEffect(() => {
    if (route.params?.brandId) {
      brandId.current = route.params.brandId;
    }
  }, [route.params?.brandId]);

  const productsState = useSelector((state) => state.products || { products: [], loading: false });
  const brandsState = useSelector((state) => state.brands || { brands: [], loading: false });
  const cartId = useSelector((state) => state.cart.cartId);
  const wishlistItems = useSelector((state) => state.wishlist.items);

  const [selectedBrandId, setSelectedBrandId] = useState(brandId.current);
  useEffect(() => { if (route.params?.brandId) setSelectedBrandId(route.params.brandId); }, [route.params?.brandId]);
  const selectedBrand = brandsState.brands?.find((brand) => String(brand.brandId) === String(selectedBrandId)) || {};
  // The home brand strip knows the brand name even before the Brand list API
  // runs, so its saved products can still be matched by name if IDs are absent.
  const previewBrandName = selectedBrand.brandName ||
    (String(route.params?.brandId) === String(selectedBrandId) ? route.params?.brandName : undefined);
  // Do not hold back already-downloaded category/search products while the
  // dedicated brand request runs. Never write a partial preview into Redux.
  const savedBrandProducts = productsState.productsByBrand?.[selectedBrandId];
  const previewProducts = useMemo(() => savedBrandProducts === undefined
    ? getBrandCatalogPreview(productsState, selectedBrandId, previewBrandName)
    : EMPTY_BRAND_PRODUCTS,
  [savedBrandProducts, productsState.productsByCategory, productsState.productsByShowroom,
    productsState.products, productsState.paginatedProducts, selectedBrandId, previewBrandName]);
  const usingPreview = savedBrandProducts === undefined && previewProducts.length > 0;
  const brandProducts = savedBrandProducts ?? previewProducts;
  const [requestState, setRequestState] = useState({ brandId: null, complete: false, error: false });
  const [retrying, setRetrying] = useState(false);
  const requestComplete = requestState.brandId === selectedBrandId && requestState.complete;
  const requestError = requestState.brandId === selectedBrandId && requestState.error;
  const fetching = useCatalogRevalidation(`brand:${selectedBrandId}`, () => fetchProductsByBrand(selectedBrandId), {
    enabled: Boolean(selectedBrandId),
    onResult: (result) => setRequestState({ brandId: selectedBrandId, complete: true,
      error: Boolean(result?.error || (result === null && savedBrandProducts === undefined)) }),
  });
  const retryBrand = useCallback(() => {
    if (retrying || !selectedBrandId) return;
    setRetrying(true);
    setRequestState({ brandId: selectedBrandId, complete: false, error: false });
    void refreshCatalog(dispatch, `brand:${selectedBrandId}`, () => fetchProductsByBrand(selectedBrandId), { force: true })
      .then((result) => setRequestState({ brandId: selectedBrandId, complete: true, error: Boolean(result?.error) }))
      .catch(() => setRequestState({ brandId: selectedBrandId, complete: true, error: true }))
      .finally(() => setRetrying(false));
  }, [dispatch, retrying, selectedBrandId]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showBrandsDropdown, setShowBrandsDropdown] = useState(false);
  const [showSellersDropdown, setShowSellersDropdown] = useState(false);
  // Filtering is derived synchronously: cached cards paint on the first render
  // instead of waiting for an effect and a second render.
  const [sortBy, setSortBy] = useState('name');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [addingToCart, setAddingToCart] = useState({});
  const { listRef: flatListRef, onScroll: handleScroll, onContentSizeChange, rememberPosition } = useCatalogScroll(`brand:${selectedBrandId}`);

  // ─── Derived data ───────────────────────────────────────────────────────────
  const { categories, sellers } = useMemo(() => {
    const cats = [...new Set(brandProducts.map(p => p.category).filter(Boolean))];
    const sels = [...new Set(brandProducts.map(p => p.seller).filter(Boolean))];
    return { categories: cats, sellers: sels };
  }, [brandProducts]);

  const filteredProducts = useMemo(() => {
    let filtered = [...brandProducts];

    if (minPrice !== '' || maxPrice !== '') {
      const min = parseFloat(minPrice) || 0;
      const max = parseFloat(maxPrice) || Infinity;
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price) || 0;
        return price >= min && (maxPrice === '' || price <= max);
      });
    }

    if (selectedCategory !== '') {
      filtered = filtered.filter(product =>
        product.category && product.category.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    if (selectedSeller !== '') {
      filtered = filtered.filter(product =>
        product.seller && product.seller.toLowerCase().includes(selectedSeller.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        case 'price_high':
          return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
        case 'discount': {
          const discountA = a.oldPrice > a.price ? ((a.oldPrice - a.price) / a.oldPrice) * 100 : 0;
          const discountB = b.oldPrice > b.price ? ((b.oldPrice - b.price) / b.oldPrice) * 100 : 0;
          return discountB - discountA;
        }
        case 'newest':
          return new Date(b.createdDate || 0) - new Date(a.createdDate || 0);
        default:
          return (a.productName || '').localeCompare(b.productName || '');
      }
    });

    return filtered;
  }, [brandProducts, minPrice, maxPrice, sortBy, selectedCategory, selectedSeller]);
  const { visibleProducts, showMore, hasMore } = useProgressiveCatalog(filteredProducts, `brand:${selectedBrandId}`);

  const relatedBrands = selectedBrand?.categoryId
    ? brandsState.brands.filter((brand) => brand.categoryId === selectedBrand.categoryId)
    : [];

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const formatPrice = (price) => {
    const numPrice = parseFloat(price) || 0;
    return numPrice.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const fileName = imagePath.split(/[\\/]/).pop();
    if (imagePath.includes('\\') || imagePath.includes('F:') || imagePath.includes('D:')) {
      return `https://testing.frankotrading.com/Media/Products_Images/${fileName}`;
    }
    if (imagePath.startsWith('http')) return imagePath;
    return `https://testing.frankotrading.com/${imagePath}`;
  };

  const handleAddToCart = useCallback((product) => {
    const cartData = { cartId, productId: product.productID, price: product.price, quantity: 1 };
    setAddingToCart(prev => ({ ...prev, [product.productID]: true }));
    dispatch(addToCart(cartData))
      .unwrap()
      .then(() => Alert.alert('Success', `${product.productName} added to cart successfully!`))
      .catch((error) => Alert.alert('Error', `Failed to add product to cart: ${error.message}`))
      .finally(() => {
        setAddingToCart(prev => {
          const next = { ...prev };
          delete next[product.productID];
          return next;
        });
      });
  }, [cartId, dispatch]);

  const handleNavigateProduct = useCallback((productId) => {
    rememberPosition();
    navigation.navigate('ProductDetails', { productId, brandId: selectedBrandId });
  }, [navigation, rememberPosition, selectedBrandId]);

  const handleBackPress = useCallback(() => {
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    } catch (error) {
      navigation.navigate('Home');
    }
  }, [navigation]);

  const handleShare = useCallback(async () => {
    try {
      const brandName = previewBrandName || 'Brand';
      await Share.share({
        message: `Check out ${brandName} on Franko Trading! Amazing products available. Download the app to explore more!`,
        title: `${brandName} - Products on Franko Trading`,
      });
    } catch {
      Alert.alert('Error', 'Unable to share at the moment. Please try again.');
    }
  }, [previewBrandName]);

  const clearFilters = useCallback(() => {
    setMinPrice('');
    setMaxPrice('');
    setSelectedCategory('');
    setSelectedSeller('');
    setSortBy('name');
    setShowFilterModal(false);
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setShowSortDropdown(false);
    setShowBrandsDropdown(false);
    setShowSellersDropdown(false);
  }, []);

  const handleSortSelect = useCallback((sortOption) => {
    setSortBy(sortOption.key);
    setShowSortDropdown(false);
  }, []);

  const handleBrandSelect = useCallback((brand) => {
    setSelectedBrandId(brand.brandId);
    setShowBrandsDropdown(false);
    navigation.navigate('Brands', { brandId: brand.brandId });
  }, [navigation]);

  const handleToggleWishlist = useCallback((product) => {
    const isInWishlist = wishlistItems.some((w) => w.productID === product.productID);
    if (isInWishlist) {
      dispatch(removeFromWishlist(product.productID));
      Alert.alert('Removed', `${product.productName} removed from wishlist.`);
    } else {
      dispatch(addToWishlist(product));
      Alert.alert('Added', `${product.productName} added to wishlist ❤️`);
    }
  }, [dispatch, wishlistItems]);

  const sortOptions = [
    { key: 'name', label: 'Sort' },
    { key: 'price_low', label: 'Price (Low to High)' },
    { key: 'price_high', label: 'Price (High to Low)' },
    { key: 'discount', label: 'Highest Discount' },
    { key: 'newest', label: 'Newest First' },
  ];

  const getCurrentSortLabel = () =>
    sortOptions.find(o => o.key === sortBy)?.label || 'Sort';

  const getActiveFiltersCount = () => {
    let count = 0;
    if (minPrice !== '' || maxPrice !== '') count++;
    if (selectedCategory !== '') count++;
    if (selectedSeller !== '') count++;
    return count;
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────
  const renderProduct = useCallback(({ item, index }) => (
    <CatalogProductCard product={item} index={index} width={cardWidth}
      onPress={handleNavigateProduct} onAddToCart={handleAddToCart}
      addingToCart={Boolean(addingToCart[item.productID])} onWishlistPress={handleToggleWishlist} />
  ), [cardWidth, addingToCart, handleNavigateProduct, handleToggleWishlist, handleAddToCart]);

  const renderDropdown = (items, onSelect, selectedValue) => (
    <View style={styles.dropdown}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.dropdownItem, selectedValue === item.key && styles.selectedDropdownItem]}
          onPress={() => onSelect(item)}
        >
          <Text style={[styles.dropdownItemText, selectedValue === item.key && styles.selectedDropdownItemText]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBrandsDropdown = () => (
    <View style={styles.dropdown}>
      {relatedBrands.map((brand, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.dropdownItem, selectedBrandId === brand.brandId && styles.selectedDropdownItem]}
          onPress={() => handleBrandSelect(brand)}
        >
          <Text style={[styles.dropdownItemText, selectedBrandId === brand.brandId && styles.selectedDropdownItemText]}>
            {brand.brandName}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: viewportHeight * 0.78 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter & Sort</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <AntDesign name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.priceInputContainer}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min Price"
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                />
                <Text style={styles.priceSeparator}>to</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max Price"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
              </View>
            </View>

            {categories.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.filterChip, selectedCategory === '' && styles.filterChipSelected]}
                    onPress={() => setSelectedCategory('')}
                  >
                    <Text style={[styles.filterChipText, selectedCategory === '' && styles.filterChipTextSelected]}>All</Text>
                  </TouchableOpacity>
                  {categories.map((category, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.filterChip, selectedCategory === category && styles.filterChipSelected]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text style={[styles.filterChipText, selectedCategory === category && styles.filterChipTextSelected]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {sellers.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Seller</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.filterChip, selectedSeller === '' && styles.filterChipSelected]}
                    onPress={() => setSelectedSeller('')}
                  >
                    <Text style={[styles.filterChipText, selectedSeller === '' && styles.filterChipTextSelected]}>All</Text>
                  </TouchableOpacity>
                  {sellers.map((seller, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.filterChip, selectedSeller === seller && styles.filterChipSelected]}
                      onPress={() => setSelectedSeller(seller)}
                    >
                      <Text style={[styles.filterChipText, selectedSeller === seller && styles.filterChipTextSelected]}>
                        {seller}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilterModal(false)}>
              <LinearGradient
                colors={['#B21F36', '#B21F36']}
                style={styles.applyButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CatalogFetchNotice loading={fetching || retrying} hasCachedData={Boolean(brandProducts.length)} label="products" />
      {usingPreview && !requestError && (
        <View style={styles.previewNotice}></View>
      )}
      {requestError && (
        <TouchableOpacity onPress={retryBrand} style={styles.previewNotice} accessibilityRole="button">
         
        </TouchableOpacity>
      )}
      <View style={styles.brandheader}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText} numberOfLines={1}>
            {previewBrandName || 'Franko Trading'}
          </Text>
          {previewBrandName && (
            <Text style={styles.productCount}>
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleShare}>
            <Octicons name="share" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => { closeAllDropdowns(); setShowSortDropdown(v => !v); }}
        >
          <Text style={styles.filterButtonText}>{getCurrentSortLabel()}</Text>
          <Entypo name="chevron-down" size={16} color="#333" />
        </TouchableOpacity>

        {relatedBrands.length > 1 && (
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => { closeAllDropdowns(); setShowBrandsDropdown(v => !v); }}
          >
            <Text style={styles.filterButtonText}>Brands</Text>
            <Entypo name="chevron-down" size={16} color="#333" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.filterIconContainer}
          onPress={() => setShowFilterModal(true)}
        >
          <MaterialIcons name="tune" size={20} color="#333" />
          <Text style={styles.filterText}>Filter</Text>
          {getActiveFiltersCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {showSortDropdown && renderDropdown(sortOptions, handleSortSelect, sortBy)}
      {showBrandsDropdown && renderBrandsDropdown()}

      {!brandProducts.length && selectedBrandId && !requestError && (fetching || retrying || !requestComplete) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#086942" />
          <Text style={styles.loadingText}>Loading brand products...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySubtitle}>
            {getActiveFiltersCount() > 0
              ? 'Try adjusting your filters'
              : 'No products available for this brand'}
          </Text>
          {getActiveFiltersCount() > 0 && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
        style={styles.catalogGrid}
          data={visibleProducts}
        onEndReached={hasMore ? showMore : undefined}
        onEndReachedThreshold={0.35}
          keyExtractor={(item) => item.productID.toString()}
          renderItem={renderProduct}
          key={`columns-${columns}`}
          numColumns={columns}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          onContentSizeChange={onContentSizeChange}
          scrollEventThrottle={100}
          columnWrapperStyle={styles.productRow}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
        />
      )}

      {renderFilterModal()}
    </View>
  );
};

const styles = createWebSafeStyles({
  previewNotice: { backgroundColor: '#F0F8F3', paddingHorizontal: 16, paddingVertical: 6 },
  previewText: { fontSize: 11, color: '#086942', fontWeight: '600' },
  catalogGrid: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  container: {
    flex: 1,
    backgroundColor: '#F7FAF8',
  },
  brandheader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: SPACING.sm,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  productCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    padding: SPACING.sm,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  
    borderBottomColor: '#DCE8DF',
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.xl,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
    marginRight: SPACING.xs,
  },
  filterIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    position: 'relative',
  },
  filterText: {
    fontSize: 14,
    color: '#333',
    marginLeft: SPACING.xs,
  },
  filterBadge: {
    position: 'absolute',
    right: -SPACING.sm,
    top: -SPACING.sm,
    backgroundColor: '#B21F36',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF4EF',
  },
  selectedDropdownItem: {
    backgroundColor: '#E6FAEF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDropdownItemText: {
    color: '#B21F36',
    fontWeight: '600',
  },
  productsList: {
    paddingHorizontal: CONTAINER_PADDING,
    paddingVertical: SPACING.md,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  productCard: {
    borderWidth: 1,
    borderColor: '#DCE8DF',
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 12,
    width: CARD_WIDTH,
    ...(Platform.OS === 'android' && { overflow: 'hidden' }),
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 20,
  
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5E6DB',
    borderRadius: 12,
    shadowColor: '#173D29',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    backgroundColor: '#F4FAF6',
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    height: 160,
  
    backgroundColor: '#F2F9F4',
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  newBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: '#B21F36',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    zIndex: 2,
  },
  newBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  discountBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: '#B21F36',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    zIndex: 2,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  wishlistButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'white',
    padding: SPACING.sm,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    padding: SPACING.md,
  },
  productName: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: SPACING.sm,
    minHeight: 36,
  
    color: '#193C2A',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'column',
    gap: 2,
    marginBottom: SPACING.sm,
  },
  productPrice: {
    fontSize: 14,
    color: '#086942',
    fontWeight: '900',
  
    color: '#086942',
    fontWeight: '900',
  },
  oldPrice: {
    fontSize: 10,
    color: '#738579',
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: '#086942',
    padding: SPACING.sm,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  addToCartButtonDisabled: {
    backgroundColor: '#7dd3c0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.lg,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: SPACING.xxl,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  clearFiltersButton: {
    backgroundColor: '#B21F36',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.8,
  
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterSection: {
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: SPACING.lg,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#F7FAF8',
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  priceSeparator: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginHorizontal: SPACING.lg,
  },
  filterChip: {
    backgroundColor: '#F7FAF8',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipSelected: {
    backgroundColor: '#B21F36',
    borderColor: '#B21F36',
  },
  filterChipText: {
    fontSize: 14,
    color: '#333',
  },
  filterChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  clearButton: {
    flex: 1,
    padding: SPACING.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: SPACING.md,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default BrandScreen;