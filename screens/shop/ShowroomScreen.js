import { createWebSafeStyles } from '../../theme/webSafeStyles';
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { Feather } from '@expo/vector-icons';
import { View, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, useWindowDimensions, Modal, Share, Alert, ScrollView, Platform } from 'react-native';
import Text from '../../components/AppText';
import { useProgressiveCatalog } from '../../hooks/useProgressiveCatalog';
import CatalogProductCard, { getCatalogLayout } from '../../components/CatalogProductCard';
import CachedImage from '../../components/CachedImage';
import { useCatalogScroll } from '../../hooks/useCatalogScroll';
import { resolveProductImageUri } from '../../utils/ImageCache';
import { useDispatch, useSelector } from "react-redux";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";

import Ionicons from "@expo/vector-icons/Ionicons";
import { AntDesign } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Octicons from "@expo/vector-icons/Octicons";

import { fetchProductsByShowroom } from '../../redux/slice/productSlice';
import { useCatalogRevalidation } from '../../hooks/useCatalogRevalidation';
import CatalogFetchNotice from '../../components/CatalogFetchNotice';
import { fetchShowrooms } from '../../redux/slice/showroomSlice';
import { addToCart } from '../../redux/slice/cartSlice';
import { removeFromWishlist, addToWishlist } from '../../redux/wishlistSlice';

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Spacing (same as PhoneScreen)
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
  return "GH₵ " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const getValidImageURL = resolveProductImageUri;

/* ---------- component ---------- */

const ShowroomScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const { columns, cardWidth } = getCatalogLayout(viewportWidth);
  const route = useRoute();

  const { showRoomID, showRoomName, showRoomLogo } = route.params || {};

  const { productsByShowroom = {}, loading: productsLoading } = useSelector(
    (state) => state.products
  );
  const { showrooms = [] } = useSelector((state) => state.showrooms);
  const cartId = useSelector((state) => state.cart.cartId);
  const wishlistItems = useSelector((state) => state.wishlist.items);

  // Modals
  const [sortModalVisible, setSortModalVisible] = useState(false);
  
  const [brandsModalVisible, setBrandsModalVisible] = useState(false);
  const [categoriesModalVisible, setCategoriesModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Filters
  const [selectedSort, setSelectedSort] = useState("newest");

  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 200000 });

  // Add to cart loading per product
  const [addingToCart, setAddingToCart] = useState({});

  // Scroll restore
  const { listRef: flatListRef, onScroll: handleScroll, onContentSizeChange, rememberPosition } = useCatalogScroll(`showroom:${showRoomID}`);

  /* ---------- data fetch ---------- */

  const fetching = useCatalogRevalidation(`showroom:${showRoomID}`, () => fetchProductsByShowroom(showRoomID), { enabled: Boolean(showRoomID) });
  useEffect(() => { dispatch(fetchShowrooms()); }, [dispatch]);

  /* ---------- restore scroll on focus ---------- */


  const products = productsByShowroom[showRoomID] || [];




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

  /* ---------- showroom meta ---------- */

  const selectedShowroom = showrooms.find(
    (s) => s.showRoomID === showRoomID
  );
  const displayShowroomName =
    selectedShowroom?.showRoomName || showRoomName || "Showroom";


  const {  uniqueBrands, uniqueCategories } = useMemo(() => {
    const list = products;

    const brands = [
      ...new Set(list.map((p) => p.brandName).filter(Boolean)),
    ];
    const categories = [
      ...new Set(list.map((p) => p.categoryName).filter(Boolean)),
    ];
    return { uniqueBrands: brands, uniqueCategories: categories };
  }, [products]);



  const toggleBrand = (brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand)
        ? prev.filter((b) => b !== brand)
        : [...prev, brand]
    );
  };

  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const clearAllFilters = () => {
    setSelectedSort("newest");

    setSelectedBrands([]);
    setSelectedCategories([]);
    setPriceRange({ min: 0, max: 200000 });
  };

  /* ---------- filtering & sorting ---------- */

  const filteredProducts = useMemo(() => {
    let list = products;


    if (selectedBrands.length > 0) {
      list = list.filter((p) => selectedBrands.includes(p.brandName));
    }

    if (selectedCategories.length > 0) {
      list = list.filter((p) => selectedCategories.includes(p.categoryName));
    }

    list = list.filter(
      (p) =>
        Number(p.price) >= priceRange.min &&
        Number(p.price) <= priceRange.max
    );

    switch (selectedSort) {
      case "newest":
        return [...list].sort(
          (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
        );
      case "oldest":
        return [...list].sort(
          (a, b) => new Date(a.dateCreated) - new Date(b.dateCreated)
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
    products,
    selectedSort,

    selectedBrands,
    selectedCategories,
    priceRange,
  ]);


  const hasActiveFilters =

    selectedBrands.length > 0 ||
    selectedCategories.length > 0 ||
    priceRange.min !== 0 ||
    priceRange.max !== 200000;

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
          const clone = { ...prev };
          delete clone[product.productID];
          return clone;
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
        message: `Check out products from ${displayShowroomName} on Franko Trading!`,
        title: displayShowroomName,
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

  const { visibleProducts, showMore, hasMore } = useProgressiveCatalog(filteredProducts, `showroom:${showRoomID}`);

  if (productsLoading && !products.length) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#086942" />
        <Text style={styles.loaderText}>Loading products...</Text>
      </View>
    );
  }

  /* ---------- product card ---------- */

  const renderItem = ({ item, index }) => (
    <CatalogProductCard product={item} index={index} width={cardWidth} onPress={handleProductPress} onAddToCart={handleAddToCart} addingToCart={Boolean(addingToCart[item.productID])} onWishlistPress={handleToggleWishlist} />
  );

  /* ---------- generic modal wrapper ---------- */

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
      <CatalogFetchNotice loading={fetching} hasCachedData={Boolean(products.length)} label="products" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#163A29" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayShowroomName}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Octicons name="share" size={20} color="#163A29" />
          </TouchableOpacity>
          {showRoomLogo ? (
            <CachedImage
              source={{ uri: showRoomLogo }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                marginLeft: SPACING.xs,
              }}
            />
          ) : null}
        </View>
      </View>

      {/* Filter bar (matching PhoneScreen style, with added Sellers & Categories) */}
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
          style={styles.filterButton}
          onPress={() => setCategoriesModalVisible(true)}
        >
          <Text style={styles.filterText}>Categories</Text>
          <AntDesign name="down" size={12} color="#4b5563" />
          {selectedCategories.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {selectedCategories.length}
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

      {/* Active filters */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
           
            {selectedBrands.map((brand) => (
              <TouchableOpacity
                key={`brand-${brand}`}
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

            {selectedCategories.map((category) => (
              <TouchableOpacity
                key={`cat-${category}`}
                style={styles.activeFilterTag}
                onPress={() => toggleCategory(category)}
              >
                <Text style={styles.activeFilterText}>
                  Category: {category}
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

      {/* Results count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredProducts.length} product
          {filteredProducts.length !== 1 ? "s" : ""} found
        </Text>
      </View>

      {/* Grid */}
      <FlatList
        ref={flatListRef}
        style={styles.catalogGrid}
        data={visibleProducts}
        onEndReached={hasMore ? showMore : undefined}
        onEndReachedThreshold={0.35}
        keyExtractor={(item) => item.productID.toString()}
        key={`columns-${columns}`}
        numColumns={columns}
        columnWrapperStyle={styles.productRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.productsList}
        renderItem={renderItem}
        onScroll={handleScroll}
        onContentSizeChange={onContentSizeChange}
        scrollEventThrottle={100}
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
      />

      {/* Sort Modal */}
      {renderModal(
        sortModalVisible,
        setSortModalVisible,
        "Sort by",
        sortOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.modalOption,
              selectedSort === option.key && styles.modalOptionSelected,
            ]}
            onPress={() => {
              setSelectedSort(option.key);
              setSortModalVisible(false);
            }}
          >
            <Text
              style={[
                styles.modalOptionText,
                selectedSort === option.key &&
                  styles.modalOptionTextSelected,
              ]}
            >
              {option.label}
            </Text>
            {selectedSort === option.key && (
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
        uniqueBrands.length === 0 ? (
          <Text style={styles.modalOptionText}>No brands found.</Text>
        ) : (
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
        )
      )}

      {/* Categories Modal */}
      {renderModal(
        categoriesModalVisible,
        setCategoriesModalVisible,
        "Filter by categories",
        uniqueCategories.length === 0 ? (
          <Text style={styles.modalOptionText}>No categories found.</Text>
        ) : (
          uniqueCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={styles.modalOption}
              onPress={() => toggleCategory(category)}
            >
              <Text style={styles.modalOptionText}>{category}</Text>
              {selectedCategories.includes(category) && (
                <AntDesign name="check" size={16} color="#086942" />
              )}
            </TouchableOpacity>
          ))
        )
      )}

      {/* Filter Modal (price range placeholder) */}
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
    paddingVertical: SPACING.md,
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
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionButton: {
    padding: SPACING.sm,
  },

  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    backgroundColor: "#ffffff",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
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
    position: "relative",
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
    gap: 2,
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

export default ShowroomScreen;