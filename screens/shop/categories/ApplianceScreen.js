import { createWebSafeStyles } from '../../../theme/webSafeStyles';
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { Feather } from '@expo/vector-icons';
import { View, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, useWindowDimensions, Modal, Share, Alert, ScrollView, Platform } from 'react-native';
import Text from '../../../components/AppText';
import { useProgressiveCatalog } from '../../../hooks/useProgressiveCatalog';
import CatalogProductCard, { getCatalogLayout } from '../../../components/CatalogProductCard';
import CachedImage from '../../../components/CachedImage';
import { useCatalogScroll } from '../../../hooks/useCatalogScroll';
import { resolveProductImageUri } from '../../../utils/ImageCache';
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";

import { AntDesign } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { Octicons } from "@expo/vector-icons";

import { fetchProductsByCategory } from '../../../redux/slice/productSlice';
import { useCatalogRevalidation } from '../../../hooks/useCatalogRevalidation';
import CatalogFetchNotice from '../../../components/CatalogFetchNotice';
import { addToCart } from '../../../redux/slice/cartSlice';
import { removeFromWishlist, addToWishlist } from '../../../redux/wishlistSlice';

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Spacing (consistent with other category screens)
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
const CARD_WIDTH =
  (screenWidth - CONTAINER_PADDING * 2 - CARD_MARGIN * 3) / 2;

/* ---------- helpers ---------- */

const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return (
    "GH₵ " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  );
};

const getValidImageURL = resolveProductImageUri;

const ApplianceScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const { columns, cardWidth } = getCatalogLayout(viewportWidth);

  const { productsByCategory = {}, loading: productsLoading } = useSelector(
    (state) => state.products
  );
  const wishlistItems = useSelector((state) => state.wishlist.items);
  const cartId = useSelector((state) => state.cart.cartId);

  const hardcodedCategoryId = "9170b363-bb16-4980-83a1-7e3a3bbba964";

  // Modals
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sellersModalVisible, setSellersModalVisible] = useState(false);
  const [brandsModalVisible, setBrandsModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Filters
  const [selectedSort, setSelectedSort] = useState("newest");
  const [selectedSellers, setSelectedSellers] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });

  // Per‑product "add to cart" loading
  const [addingToCart, setAddingToCart] = useState({});

  // Scroll restore
  const { listRef: flatListRef, onScroll: handleScroll, onContentSizeChange, rememberPosition } = useCatalogScroll(`category:${hardcodedCategoryId}`);

  /* ---------- fetch products ---------- */

  // Show cached items immediately; check the backend on focus/return.
  const fetching = useCatalogRevalidation(`category:${hardcodedCategoryId}`, () => fetchProductsByCategory(hardcodedCategoryId));

  /* ---------- restore scroll on focus ---------- */


  const rawProducts = productsByCategory[hardcodedCategoryId] || [];

  // Unique sellers & brands
  const { uniqueSellers, uniqueBrands } = useMemo(() => {
    const sellers = [
      ...new Set(rawProducts.map((p) => p.sellerName).filter(Boolean)),
    ];
    const brands = [
      ...new Set(rawProducts.map((p) => p.brandName).filter(Boolean)),
    ];
    return { uniqueSellers: sellers, uniqueBrands: brands };
  }, [rawProducts]);

  // Filter + sort
  const filteredProducts = useMemo(() => {
    let list = [...rawProducts];

    if (selectedSellers.length > 0) {
      list = list.filter((p) => selectedSellers.includes(p.sellerName));
    }

    if (selectedBrands.length > 0) {
      list = list.filter((p) => selectedBrands.includes(p.brandName));
    }

    list = list.filter(
      (p) =>
        Number(p.price) >= priceRange.min &&
        Number(p.price) <= priceRange.max
    );

    switch (selectedSort) {
      case "newest":
        return [...list].sort(
          (a, b) =>
            new Date(b.dateCreated) - new Date(a.dateCreated)
        );
      case "oldest":
        return [...list].sort(
          (a, b) =>
            new Date(a.dateCreated) - new Date(b.dateCreated)
        );
      case "price_low":
        return [...list].sort((a, b) => a.price - b.price);
      case "price_high":
        return [...list].sort((a, b) => b.price - a.price);
      case "name_az":
        return [...list].sort((a, b) =>
          a.productName.localeCompare(b.productName)
        );
      case "name_za":
        return [...list].sort((a, b) =>
          b.productName.localeCompare(a.productName)
        );
      default:
        return list;
    }
  }, [
    rawProducts,
    selectedSort,
    selectedSellers,
    selectedBrands,
    priceRange,
  ]);

  // Restore scroll when list ready


  /* ---------- wishlist ---------- */

  const isInWishlist = (productID) =>
    wishlistItems.some((w) => w.productID === productID);

  const handleToggleWishlist = (product) => {
    const inWishlist = isInWishlist(product.productID);

    if (inWishlist) {
      dispatch(removeFromWishlist(product.productID));
      Alert.alert("Removed", `${product.productName} removed from wishlist.`);
    } else {
      dispatch(addToWishlist(product));
      Alert.alert("Added", `${product.productName} added to wishlist ❤️`);
    }
  };

  /* ---------- filter helpers ---------- */

  const toggleSeller = (seller) => {
    setSelectedSellers((prev) =>
      prev.includes(seller)
        ? prev.filter((s) => s !== seller)
        : [...prev, seller]
    );
  };

  const toggleBrand = (brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand)
        ? prev.filter((b) => b !== brand)
        : [...prev, brand]
    );
  };

  const clearAllFilters = () => {
    setSelectedSort("newest");
    setSelectedSellers([]);
    setSelectedBrands([]);
    setPriceRange({ min: 0, max: 100000 });
  };

  /* ---------- add to cart ---------- */

  const handleAddToCart = (product) => {
    const cartData = {
      cartId,
      productId: product.productID,
      price: product.price,
      quantity: 1,
    };

    setAddingToCart((prev) => ({
      ...prev,
      [product.productID]: true,
    }));

    dispatch(addToCart(cartData))
      .unwrap()
      .then(() => {
        Alert.alert(
          "Added to cart",
          `${product.productName} added to your cart.`
        );
      })
      .catch((error) => {
        Alert.alert(
          "Error",
          `Failed to add product to cart: ${error.message}`
        );
      })
      .finally(() => {
        setAddingToCart((prev) => {
          const copy = { ...prev };
          delete copy[product.productID];
          return copy;
        });
      });
  };

  /* ---------- navigation ---------- */

  const handleProductPress = (productId) => {
    rememberPosition();
    navigation.navigate("ProductDetails", { productId });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          "Upgrade your home with these amazing appliances from Franko Trading!",
        title: "Home Appliances",
      });
    } catch {
      Alert.alert("Error", "Unable to share at this time.");
    }
  };

  /* ---------- sort options ---------- */

  const sortOptions = [
    { key: "newest", label: "Newest First" },
    { key: "oldest", label: "Oldest First" },
    { key: "price_low", label: "Price: Low to High" },
    { key: "price_high", label: "Price: High to Low" },
    { key: "name_az", label: "Name: A to Z" },
    { key: "name_za", label: "Name: Z to A" },
  ];

  /* ---------- loading ---------- */

  const { visibleProducts, showMore, hasMore } = useProgressiveCatalog(filteredProducts, `category:${hardcodedCategoryId}`);

  if (productsLoading && !productsByCategory[hardcodedCategoryId]?.length) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#086942" />
        <Text style={styles.loaderText}>Loading appliances...</Text>
      </View>
    );
  }

  /* ---------- product card ---------- */

  const renderItem = ({ item, index }) => (
    <CatalogProductCard product={item} index={index} width={cardWidth} onPress={handleProductPress} onAddToCart={handleAddToCart} addingToCart={Boolean(addingToCart[item.productID])} onWishlistPress={handleToggleWishlist} />
  );

  /* ---------- generic modal ---------- */

  const renderModal = (visible, setVisible, title, children) => (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: viewportHeight * 0.78 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <AntDesign name="close" size={22} color="#163A29" />
            </TouchableOpacity>
          </View>
          <ScrollView style={[styles.modalBody, { maxHeight: viewportHeight * 0.6 }]}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );

  /* ---------- UI ---------- */

  return (
    <View style={styles.container}>
      <CatalogFetchNotice loading={fetching} hasCachedData={Boolean(productsByCategory[hardcodedCategoryId]?.length)} label="products" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#163A29" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home Appliances</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Octicons name="share" size={20} color="#163A29" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setSortModalVisible(true)}
        >
          <Text style={styles.filterText}>Sort</Text>
          <AntDesign name="down" size={12} color="#4b5563" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setBrandsModalVisible(true)}
        >
          <Text style={styles.filterText}>Brands</Text>
          <AntDesign name="down" size={12} color="#4b5563" />
          {selectedBrands.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {selectedBrands.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButtonPrimary}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.85}
        >
          <AntDesign name="filter" size={14} color="#ffffff" />
          <Text style={styles.filterTextPrimary}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Active filters row */}
      {(selectedSellers.length > 0 || selectedBrands.length > 0) && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {selectedSellers.map((seller) => (
              <TouchableOpacity
                key={seller}
                style={styles.activeFilterTag}
                onPress={() => toggleSeller(seller)}
              >
                <Text style={styles.activeFilterText}>
                  Seller: {seller}
                </Text>
                <AntDesign
                  name="close"
                  size={12}
                  color="#738579"
                />
              </TouchableOpacity>
            ))}
            {selectedBrands.map((brand) => (
              <TouchableOpacity
                key={brand}
                style={styles.activeFilterTag}
                onPress={() => toggleBrand(brand)}
              >
                <Text style={styles.activeFilterText}>
                  Brand: {brand}
                </Text>
                <AntDesign
                  name="close"
                  size={12}
                  color="#738579"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={clearAllFilters}
          >
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results text */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredProducts.length} product
          {filteredProducts.length !== 1 ? "s" : ""} found
        </Text>
      </View>

      {/* Products grid */}
      <FlatList
        ref={flatListRef}
        style={styles.catalogGrid}
        data={visibleProducts}
        onEndReached={hasMore ? showMore : undefined}
        onEndReachedThreshold={0.35}
        keyExtractor={(item) => String(item.productID)}
        key={`columns-${columns}`}
        numColumns={columns}
        columnWrapperStyle={styles.productRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.productsList}
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
      {renderModal(
        sortModalVisible,
        setSortModalVisible,
        "Sort by",
        sortOptions.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.modalOption,
              selectedSort === opt.key && styles.modalOptionSelected,
            ]}
            onPress={() => {
              setSelectedSort(opt.key);
              setSortModalVisible(false);
            }}
          >
            <Text
              style={[
                styles.modalOptionText,
                selectedSort === opt.key &&
                  styles.modalOptionTextSelected,
              ]}
            >
              {opt.label}
            </Text>
            {selectedSort === opt.key && (
              <AntDesign name="check" size={16} color="#086942" />
            )}
          </TouchableOpacity>
        ))
      )}

      {/* Sellers Modal */}
      {renderModal(
        sellersModalVisible,
        setSellersModalVisible,
        "Filter by sellers",
        uniqueSellers.map((seller) => (
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
        ))
      )}

      {/* Brands Modal */}
      {renderModal(
        brandsModalVisible,
        setBrandsModalVisible,
        "Filter by brands",
        uniqueBrands.map((brand) => (
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
        ))
      )}

      {/* Filter Modal (price range) */}
      {renderModal(
        filterModalVisible,
        setFilterModalVisible,
        "Advanced filters",
        <View>
          <Text style={styles.filterSectionTitle}>Price range</Text>
          <View style={styles.priceRangeContainer}>
            <Text style={styles.priceRangeText}>
              {formatCurrency(priceRange.min)} -{" "}
              {formatCurrency(priceRange.max)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={clearAllFilters}
          >
            <Text style={styles.clearFiltersText}>Clear all filters</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

/* ---------- styles ---------- */

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
    backgroundColor: "#F7FAF8",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    color: "#738579",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#163A29",
    flex: 1,
    textAlign: "center",
    marginHorizontal: SPACING.lg,
  },
  headerActions: {
    flexDirection: "row",
  },
  headerActionButton: {
    padding: SPACING.sm,
  },

  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
  
    borderBottomColor: '#DCE8DF',
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  filterText: {
    fontSize: 13,
    color: "#374151",
    marginRight: SPACING.xs,
  },
  filterBadge: {
    position: "absolute",
    top: -SPACING.sm,
    right: -SPACING.sm,
    backgroundColor: "#086942",
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  filterButtonPrimary: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: "#086942",
  },
  filterTextPrimary: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "600",
    marginLeft: SPACING.xs,
  },

  activeFiltersContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
  },
  activeFilterTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5EEE6",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    marginRight: SPACING.sm,
  },
  activeFilterText: {
    fontSize: 11,
    color: "#4b5563",
    marginRight: SPACING.xs,
  },
  clearAllButton: {
    marginLeft: "auto",
  },
  clearAllText: {
    fontSize: 11,
    color: "#ef4444",
    fontWeight: "600",
  },

  resultsContainer: {
    backgroundColor: "#ffffff",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
  },
  resultsText: {
    fontSize: 12,
    color: "#738579",
  },

  productsList: {
    paddingHorizontal: CONTAINER_PADDING,
    paddingVertical: SPACING.md,
  },
  productRow: {
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },

  productCard: {
    borderWidth: 1,
    borderColor: '#DCE8DF',
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 12,
    width: CARD_WIDTH,
    marginBottom: 16,
    shadowColor: '#163A29',
  shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  
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
    height: 150,
 
    borderRadius: 10,
    overflow: "hidden",
  
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
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: "#086942",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
  },
  newBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  discountBadge: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: "#ef4444",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
  },
  discountText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  wishlistButton: {
    position: "absolute",
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: "#ffffff",
    padding: SPACING.sm,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },

  productInfo: {
    padding: SPACING.md,
  },
  productName: {
    fontSize: 13,
    color: "#163A29",
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: SPACING.sm,
    minHeight: 36,
  
    color: '#193C2A',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: "column",
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

  addToCartButton: {
    position: "absolute",
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: '#086942',
    padding: SPACING.sm,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addToCartButtonDisabled: {
    backgroundColor: "#f9a8d4",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.7,
  
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#163A29",
  },
  modalBody: {
    maxHeight: screenHeight * 0.5,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "#EFF4EF",
  },
  modalOptionSelected: {
    backgroundColor: "#E6FAEF",
  },
  modalOptionText: {
    fontSize: 15,
    color: "#163A29",
  },
  modalOptionTextSelected: {
    color: "#086942",
    fontWeight: "600",
  },

  filterSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#163A29",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  priceRangeContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  priceRangeText: {
    fontSize: 13,
    color: "#4b5563",
    textAlign: "center",
    backgroundColor: "#EFF4EF",
    paddingVertical: SPACING.sm,
    borderRadius: 10,
  },
  clearFiltersButton: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: "#086942",
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: "center",
  },
  clearFiltersText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default ApplianceScreen;