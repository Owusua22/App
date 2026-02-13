import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Modal,
  Share,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Ionicons from "@expo/vector-icons/Ionicons";
import { AntDesign } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Octicons from "@expo/vector-icons/Octicons";

import { fetchProductsByCategory } from "../../redux/slice/productSlice";
import { addToCart } from "../../redux/slice/cartSlice";
import { removeFromWishlist, addToWishlist } from "../../redux/wishlistSlice";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Spacing (matching your brand screens)
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

const getValidImageURL = (imagePath) => {
  if (!imagePath) {
    return "https://via.placeholder.com/150";
  }
  return `https://ct002.frankotrading.com:444/Media/Products_Images/${imagePath
    .split("\\")
    .pop()}`;
};

const PhoneScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const { productsByCategory = {}, loading: productsLoading } = useSelector(
    (state) => state.products
  );
  const cartId = useSelector((state) => state.cart.cartId);
  const wishlistItems = useSelector((state) => state.wishlist.items);

  const hardcodedCategoryId = "51d1fff2-7b71-46aa-9b34-2e553a40e921";

  // Filter modals
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sellersModalVisible, setSellersModalVisible] = useState(false);
  const [brandsModalVisible, setBrandsModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Filters
  const [selectedSort, setSelectedSort] = useState("newest");
  const [selectedSellers, setSelectedSellers] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });

  // Add to cart loading per product
  const [addingToCart, setAddingToCart] = useState({});

  // Scroll restore
  const [currentScrollOffset, setCurrentScrollOffset] = useState(0);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);
  const flatListRef = useRef(null);

  /* ---------- fetch phones ---------- */

  useEffect(() => {
    dispatch(fetchProductsByCategory(hardcodedCategoryId));
  }, [dispatch, hardcodedCategoryId]);

  /* ---------- restore scroll on focus ---------- */

  useFocusEffect(
    useCallback(() => {
      const checkScrollRestore = async () => {
        try {
          const saved = await AsyncStorage.getItem(
            "phoneScreenScrollPosition"
          );
          if (saved) {
            setCurrentScrollOffset(parseFloat(saved));
            setShouldRestoreScroll(true);
          }
        } catch (e) {
          console.log("Error checking scroll position:", e);
        }
      };

      checkScrollRestore();

      return () => {
        setShouldRestoreScroll(false);
      };
    }, [])
  );

  useEffect(() => {
    if (shouldRestoreScroll && filteredProducts.length > 0) {
      setTimeout(() => {
        if (
          currentScrollOffset > 0 &&
          flatListRef.current &&
          filteredProducts.length > 0
        ) {
          flatListRef.current.scrollToOffset({
            offset: currentScrollOffset,
            animated: false,
          });
        }
        setShouldRestoreScroll(false);
      }, 250);
    }
  }, [filteredProducts, shouldRestoreScroll, currentScrollOffset]);

  const handleScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.y;
    setCurrentScrollOffset(offset);
  };

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

  /* ---------- sellers & brands ---------- */

  const { uniqueSellers, uniqueBrands } = useMemo(() => {
    const list = productsByCategory[hardcodedCategoryId] || [];
    const sellers = [
      ...new Set(list.map((p) => p.sellerName).filter(Boolean)),
    ];
    const brands = [
      ...new Set(list.map((p) => p.brandName).filter(Boolean)),
    ];
    return { uniqueSellers: sellers, uniqueBrands: brands };
  }, [productsByCategory, hardcodedCategoryId]);

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

  /* ---------- filtering & sorting ---------- */

  const filteredProducts = useMemo(() => {
    let list = productsByCategory[hardcodedCategoryId] || [];

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
    productsByCategory,
    hardcodedCategoryId,
    selectedSort,
    selectedSellers,
    selectedBrands,
    priceRange,
  ]);

  /* ---------- add to cart ---------- */

  const handleAddToCart = (product) => {
    if (!cartId) {
      Alert.alert(
        "Cart unavailable",
        "Unable to add items to cart at the moment."
      );
      return;
    }

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

  /* ---------- navigation actions ---------- */

  const handleProductPress = async (productId) => {
    try {
      if (flatListRef.current) {
        await AsyncStorage.setItem(
          "phoneScreenScrollPosition",
          currentScrollOffset.toString()
        );
      }
    } catch (err) {
      console.log("Error saving scroll position:", err);
    }

    navigation.navigate("ProductDetails", { productId });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          "Check out these amazing mobile phones at great prices on Franko Trading!",
        title: "Mobile Phones",
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

  if (productsLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loaderText}>Loading phones...</Text>
      </View>
    );
  }

  /* ---------- product card ---------- */

  const renderItem = ({ item, index }) => {
    const productImageURL = getValidImageURL(item.productImage);
    const discount =
      item.oldPrice > 0
        ? Math.round(
            ((item.oldPrice - item.price) / item.oldPrice) * 100
          )
        : 0;

    const isNew = index < 3;
    const isAddingThisItem = addingToCart[item.productID];

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item.productID)}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: productImageURL }}
            style={styles.productImage}
          />

          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}

          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>SALE</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.wishlistButton}
            onPress={(e) => {
              e.stopPropagation();
              handleToggleWishlist(item);
            }}
          >
            <FontAwesome
              name={isInWishlist(item.productID) ? "heart" : "heart-o"}
              size={16}
              color={isInWishlist(item.productID) ? "red" : "#666"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>

          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>
              {formatCurrency(item.price)}
            </Text>
            {item.oldPrice > 0 && (
              <Text style={styles.oldPrice}>
                {formatCurrency(item.oldPrice)}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.addToCartButton,
            isAddingThisItem && styles.addToCartButtonDisabled,
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleAddToCart(item);
          }}
          disabled={isAddingThisItem}
        >
          {isAddingThisItem ? (
            <ActivityIndicator size={14} color="#ffffff" />
          ) : (
            <AntDesign name="shopping-cart" size={14} color="#ffffff" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  /* ---------- generic modal wrapper ---------- */

  const renderModal = (visible, setVisible, title, children) => (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <AntDesign name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );

  /* ---------- UI ---------- */

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mobile Phones</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Octicons name="share" size={20} color="#111827" />
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

      {/* Active filters */}
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
                  color="#6b7280"
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
                  color="#6b7280"
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
        data={filteredProducts}
        keyExtractor={(item) => item.productID}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.productsList}
        renderItem={renderItem}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
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
              selectedSort === option.key &&
                styles.modalOptionSelected,
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
              <AntDesign name="check" size={16} color="#059669" />
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
              <AntDesign name="check" size={16} color="#059669" />
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
              <AntDesign name="check" size={16} color="#059669" />
            )}
          </TouchableOpacity>
        ))
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6b7280",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
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
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
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
    backgroundColor: "#059669",
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
    backgroundColor: "#059669",
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
    borderBottomColor: "#e5e7eb",
  },
  activeFilterTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e5e7eb",
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
    borderBottomColor: "#e5e7eb",
  },
  resultsText: {
    fontSize: 12,
    color: "#6b7280",
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
    backgroundColor: "#ffffff",
    padding: 6,
    borderRadius: 14,
    width: CARD_WIDTH,
    marginBottom: 16,
    shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 5,
  },
  imageContainer: {
    position: "relative",
    height: 150,
  
    borderRadius: 10,
    overflow: "hidden",
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
    backgroundColor: "#22c55e",
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
    color: "#111827",
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: SPACING.sm,
    minHeight: 36,
  },
  priceContainer: {
    flexDirection: "column",
    gap: 2,
  },
  productPrice: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
  },
  oldPrice: {
    fontSize: 10,
    color: "#6b7280",
    textDecorationLine: "line-through",
  },

  addToCartButton: {
    position: "absolute",
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: "#e11d48",
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
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
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
    borderBottomColor: "#f3f4f6",
  },
  modalOptionSelected: {
    backgroundColor: "#ecfdf5",
  },
  modalOptionText: {
    fontSize: 15,
    color: "#111827",
  },
  modalOptionTextSelected: {
    color: "#059669",
    fontWeight: "600",
  },

  filterSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
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
    backgroundColor: "#f3f4f6",
    paddingVertical: SPACING.sm,
    borderRadius: 10,
  },
  clearFiltersButton: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: "#059669",
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

export default PhoneScreen;