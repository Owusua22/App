import { createWebSafeStyles } from '../../../theme/webSafeStyles';
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Feather } from '@expo/vector-icons';
import { View, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, useWindowDimensions, Platform, Modal, Share, Alert, ScrollView } from 'react-native';
import Text from '../../../components/AppText';
import { useProgressiveCatalog } from '../../../hooks/useProgressiveCatalog';
import CatalogProductCard, { getCatalogLayout } from '../../../components/CatalogProductCard';
import CachedImage from '../../../components/CachedImage';
import { useCatalogScroll } from '../../../hooks/useCatalogScroll';
import { resolveProductImageUri } from '../../../utils/ImageCache';
import { useDispatch, useSelector } from "react-redux";
import { fetchProductsByCategory } from '../../../redux/slice/productSlice';
import { useCatalogRevalidation } from '../../../hooks/useCatalogRevalidation';
import CatalogFetchNotice from '../../../components/CatalogFetchNotice';
import { addToCart } from '../../../redux/slice/cartSlice'; // Import addToCart action
import { useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";
import { removeFromWishlist, addToWishlist } from '../../../redux/wishlistSlice';
const screenWidth = Dimensions.get("window").width;

const ComboScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const { columns, cardWidth } = getCatalogLayout(viewportWidth);
  const { productsByCategory = {}, loading: productsLoading } = useSelector(
    (state) => state.products
  );
  const cartId = useSelector((state) => state.cart.cartId); // Get cartId from Redux
  const wishlistItems = useSelector((state) => state.wishlist.items);

  const hardcodedCategoryId = "4bdb194e-b308-4fd2-981d-e2c94736c773" 

  // State for filters and modals
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sellersModalVisible, setSellersModalVisible] = useState(false);
  const [brandsModalVisible, setBrandsModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  
  // Filter states
  const [selectedSort, setSelectedSort] = useState("newest");
  const [selectedSellers, setSelectedSellers] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });

  // Add to cart loading state for individual products
  const [addingToCart, setAddingToCart] = useState({});

  // Scroll position restoration states
  const { listRef: flatListRef, onScroll: handleScroll, onContentSizeChange, rememberPosition } = useCatalogScroll(`category:${hardcodedCategoryId}`);

  // Show cached items immediately; check the backend on focus/return.
  const fetching = useCatalogRevalidation(`category:${hardcodedCategoryId}`, () => fetchProductsByCategory(hardcodedCategoryId));

  // Check if we should restore scroll position when screen comes into focus

  // Restore scroll position after products are loaded



  // Track scroll position continuously

  // Get unique sellers and brands from products
  const { uniqueSellers, uniqueBrands } = useMemo(() => {
    const products = productsByCategory[hardcodedCategoryId] || [];
    const sellers = [...new Set(products.map(p => p.sellerName).filter(Boolean))];
    const brands = [...new Set(products.map(p => p.brandName).filter(Boolean))];
    return { uniqueSellers: sellers, uniqueBrands: brands };
  }, [productsByCategory, hardcodedCategoryId]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let products = productsByCategory[hardcodedCategoryId] || [];

    // Apply seller filter
    if (selectedSellers.length > 0) {
      products = products.filter(p => selectedSellers.includes(p.sellerName));
    }

    // Apply brand filter
    if (selectedBrands.length > 0) {
      products = products.filter(p => selectedBrands.includes(p.brandName));
    }

    // Apply price range filter
    products = products.filter(p => 
      p.price >= priceRange.min && p.price <= priceRange.max
    );

    // Apply sorting
    switch (selectedSort) {
      case "newest":
        return products.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
      case "oldest":
        return products.sort((a, b) => new Date(a.dateCreated) - new Date(b.dateCreated));
      case "price_low":
        return products.sort((a, b) => a.price - b.price);
      case "price_high":
        return products.sort((a, b) => b.price - a.price);
      case "name_az":
        return products.sort((a, b) => a.productName.localeCompare(b.productName));
      case "name_za":
        return products.sort((a, b) => b.productName.localeCompare(a.productName));
      default:
        return products;
    }
  }, [productsByCategory, hardcodedCategoryId, selectedSort, selectedSellers, selectedBrands, priceRange]);


  const formatPrice = (amount) =>
    amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Add to cart functionality
  const handleAddToCart = (product) => {
    const cartData = {
      cartId,
      productId: product.productID,
      price: product.price,
      quantity: 1,
    };

    // Set loading state for this specific product
    setAddingToCart(prev => ({ ...prev, [product.productID]: true }));

    dispatch(addToCart(cartData))
      .unwrap()
      .then(() => {
        Alert.alert("Success", `${product.productName} added to cart successfully!`);
      })
      .catch((error) => {
        Alert.alert("Error", `Failed to add product to cart: ${error.message}`);
      })
      .finally(() => {
        // Remove loading state for this product
        setAddingToCart(prev => {
          const newState = { ...prev };
          delete newState[product.productID];
          return newState;
        });
      });
  };
  const handleToggleWishlist = (product) => {
  const isInWishlist = wishlistItems.some(
    (w) => w.productID === product.productID
  );

  if (isInWishlist) {
    dispatch(removeFromWishlist(product.productID));
    Alert.alert("Removed", `${product.productName} removed from wishlist.`);
  } else {
    dispatch(addToWishlist(product));
    Alert.alert("Added", `${product.productName} added to wishlist ❤️`);
  }
};

  // Handle product press with scroll position saving
  const handleProductPress = (productId) => {
    rememberPosition();
    navigation.navigate("ProductDetails", { productId });
  };

  // Share functionality
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: 'Check out these amazing Combo at great prices!',
     
        title: ' Combo Collection',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  // Sort options
  const sortOptions = [
    { key: "newest", label: "Newest First" },
    { key: "oldest", label: "Oldest First" },
    { key: "price_low", label: "Price: Low to High" },
    { key: "price_high", label: "Price: High to Low" },
    { key: "name_az", label: "Name: A to Z" },
    { key: "name_za", label: "Name: Z to A" },
  ];

  // Toggle selection helpers
  const toggleSeller = (seller) => {
    setSelectedSellers(prev => 
      prev.includes(seller) 
        ? prev.filter(s => s !== seller)
        : [...prev, seller]
    );
  };

  const toggleBrand = (brand) => {
    setSelectedBrands(prev => 
      prev.includes(brand) 
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedSort("newest");
    setSelectedSellers([]);
    setSelectedBrands([]);
    setPriceRange({ min: 0, max: 10000 });
  };

  const { visibleProducts, showMore, hasMore } = useProgressiveCatalog(filteredProducts, `category:${hardcodedCategoryId}`);

  if (productsLoading && !productsByCategory[hardcodedCategoryId]?.length) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#086942" />
      </View>
    );
  }

  const renderItem = ({ item, index }) => (
    <CatalogProductCard product={item} index={index} width={cardWidth} onPress={handleProductPress} onAddToCart={handleAddToCart} addingToCart={Boolean(addingToCart[item.productID])} onWishlistPress={handleToggleWishlist} />
  );

  const renderModal = (visible, setVisible, title, children) => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: viewportHeight * 0.78 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <AntDesign name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={[styles.modalBody, { maxHeight: viewportHeight * 0.6 }]}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <CatalogFetchNotice loading={fetching} hasCachedData={Boolean(productsByCategory[hardcodedCategoryId]?.length)} label="products" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <AntDesign name="arrowleft" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Combo Deals</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleShare}>
            <AntDesign name="sharealt" size={20} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setSortModalVisible(true)}
        >
          <Text style={styles.filterText}>Sort</Text>
          <AntDesign name="down" size={12} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setBrandsModalVisible(true)}
        >
          <Text style={styles.filterText}>Brands</Text>
          <AntDesign name="down" size={12} color="#666" />
          {selectedBrands.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{selectedBrands.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.filterButtonPrimary}
          onPress={() => setFilterModalVisible(true)}
        >
          <AntDesign name="filter" size={14} color="white" />
          <Text style={styles.filterTextPrimary}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {(selectedSellers.length > 0 || selectedBrands.length > 0) && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedSellers.map(seller => (
              <TouchableOpacity 
                key={seller}
                style={styles.activeFilterTag}
                onPress={() => toggleSeller(seller)}
              >
                <Text style={styles.activeFilterText}>Seller: {seller}</Text>
                <AntDesign name="close" size={12} color="#666" />
              </TouchableOpacity>
            ))}
            {selectedBrands.map(brand => (
              <TouchableOpacity 
                key={brand}
                style={styles.activeFilterTag}
                onPress={() => toggleBrand(brand)}
              >
                <Text style={styles.activeFilterText}>Brand: {brand}</Text>
                <AntDesign name="close" size={12} color="#666" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Product Grid */}
      <FlatList
        ref={flatListRef}
        style={styles.catalogGrid}
        data={visibleProducts}
        onEndReached={hasMore ? showMore : undefined}
        onEndReachedThreshold={0.35}
        keyExtractor={(item) => String(item.productID)}
        key={`columns-${columns}`}
        numColumns={columns}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        renderItem={renderItem}
        onScroll={handleScroll}
        onContentSizeChange={onContentSizeChange}
        scrollEventThrottle={100}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
      />

      {/* Sort Modal */}
      {renderModal(sortModalVisible, setSortModalVisible, "Sort By", (
        <>
          {sortOptions.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.modalOption,
                selectedSort === option.key && styles.modalOptionSelected
              ]}
              onPress={() => {
                setSelectedSort(option.key);
                setSortModalVisible(false);
              }}
            >
              <Text style={[
                styles.modalOptionText,
                selectedSort === option.key && styles.modalOptionTextSelected
              ]}>
                {option.label}
              </Text>
              {selectedSort === option.key && (
                <AntDesign name="check" size={16} color="#086942" />
              )}
            </TouchableOpacity>
          ))}
        </>
      ))}

      {/* Sellers Modal */}
      {renderModal(sellersModalVisible, setSellersModalVisible, "Filter by Sellers", (
        <>
          {uniqueSellers.map(seller => (
            <TouchableOpacity
              key={seller}
              style={styles.modalOption}
              onPress={() => toggleSeller(seller)}
            >
              <Text style={styles.modalOptionText}>{seller}</Text>
              {selectedSellers.includes(seller) && (
                <AntDesign name="check" size={16} color="#086942" />
              )}
            </TouchableOpacity>
          ))}
        </>
      ))}

      {/* Brands Modal */}
      {renderModal(brandsModalVisible, setBrandsModalVisible, "Filter by Brands", (
        <>
          {uniqueBrands.map(brand => (
            <TouchableOpacity
              key={brand}
              style={styles.modalOption}
              onPress={() => toggleBrand(brand)}
            >
              <Text style={styles.modalOptionText}>{brand}</Text>
              {selectedBrands.includes(brand) && (
                <AntDesign name="check" size={16} color="#086942" />
              )}
            </TouchableOpacity>
          ))}
        </>
      ))}

      {/* Filter Modal */}
      {renderModal(filterModalVisible, setFilterModalVisible, "Advanced Filters", (
        <View>
          <Text style={styles.filterSectionTitle}>Price Range</Text>
          <View style={styles.priceRangeContainer}>
            <Text style={styles.priceRangeText}>
              ₵{formatPrice(priceRange.min)} - ₵{formatPrice(priceRange.max)}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.clearFiltersButton}
            onPress={clearAllFilters}
          >
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};
const styles = createWebSafeStyles({
  catalogGrid: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  container: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 2,
    paddingTop: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "black",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerActionButton: {
    padding: 4,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
    gap: 16,
  
    borderBottomColor: '#DCE8DF',
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  filterText: {
    fontSize: 14,
    color: "#666",
  },
  filterBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#086942",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  filterButtonPrimary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#086942",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    marginLeft: "auto",
  },
  filterTextPrimary: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
  },
  activeFiltersContainer: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
    flexDirection: "row",
    alignItems: "center",
  },
  activeFilterTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF4EF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    gap: 4,
  },
  activeFilterText: {
    fontSize: 12,
    color: "#666",
  },
  clearAllButton: {
    marginLeft: "auto",
  },
  clearAllText: {
    fontSize: 12,
    color: "#086942",
    fontWeight: "500",
  },
  resultsContainer: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
  },
  resultsText: {
    fontSize: 12,
    color: "#666",
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  row: {
    justifyContent: "space-between",
  },
  productCard: {
    borderWidth: 1,
    borderColor: '#DCE8DF',
     backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 12,
    width: 165,
    marginRight: 8,
    marginLeft: 2,
    overeflow: "hidden",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 20,
    height: 240
  ,
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
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    height: 148,
  
    backgroundColor: '#F2F9F4',
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#B21F36",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  newBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#B21F36",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 2,
  },
  discountText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  wishlistButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "white",
    padding: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    padding: 12,
    paddingBottom: 8,
  },
  productName: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: 6,
    minHeight: 36,
  
    color: '#193C2A',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: "column",
    gap: 2,
    marginBottom: 6,
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
    color: "#738579",
    textDecorationLine: "line-through",
  },
  brandContainer: {
    alignSelf: "flex-start",
  },
  brandText: {
    fontSize: 11,
    color: "#74b9ff",
    fontWeight: "500",
  },
 addToCartButton: {
    position: "absolute",
    bottom: 2,
    right: 8,
    backgroundColor: "#E63946",
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  addToCartButtonDisabled: {
    backgroundColor: "#7dd3c0", // Lighter shade when disabled
  },
  frankoLogo: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 24,
    height: 24,
    resizeMode: "contain",
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalBody: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EFF4EF",
  },
  modalOptionSelected: {
    backgroundColor: "#f8f9ff",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#333",
  },
  modalOptionTextSelected: {
    color: "#086942",
    fontWeight: "500",
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    padding: 16,
    paddingBottom: 8,
  },
  priceRangeContainer: {
    padding: 16,
    paddingTop: 0,
  },
  priceRangeText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    backgroundColor: "#EFF4EF",
    padding: 12,
    borderRadius: 8,
  },
  clearFiltersButton: {
    margin: 16,
    backgroundColor: "#B21F36",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  clearFiltersText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ComboScreen;

