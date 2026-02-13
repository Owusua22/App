import React, { useEffect, useMemo, useState, useRef } from "react";
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
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductsByCategory } from "../../redux/slice/productSlice";
import { addToCart } from "../../redux/slice/cartSlice"; // Import addToCart action
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { removeFromWishlist, addToWishlist } from "../../redux/wishlistSlice";
import { FontAwesome } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { Octicons } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;

const MachineScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { productsByCategory = {}, loading: productsLoading } = useSelector(
    (state) => state.products
  );
  const cartId = useSelector((state) => state.cart.cartId); // Get cartId from Redux
  const wishlistItems = useSelector((state) => state.wishlist.items);

  const hardcodedCategoryId = "2cf502a2-e621-4ed1-9bd5-6cebc165d6fe" 

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
  const [currentScrollOffset, setCurrentScrollOffset] = useState(0);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    dispatch(fetchProductsByCategory(hardcodedCategoryId));
  }, [dispatch, hardcodedCategoryId]);

  // Check if we should restore scroll position when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const checkScrollRestore = async () => {
        try {
          const savedScrollPosition = await AsyncStorage.getItem("WashingMachineScreenScrollPosition");
          if (savedScrollPosition) {
            setCurrentScrollOffset(parseFloat(savedScrollPosition));
            setShouldRestoreScroll(true);
          }
        } catch (error) {
          console.log("Error checking scroll position:", error);
        }
      };

      checkScrollRestore();
      
      return () => {
        // Cleanup when leaving the screen
        setShouldRestoreScroll(false);
      };
    }, [])
  );

  // Restore scroll position after products are loaded
  useEffect(() => {
    if (shouldRestoreScroll && filteredProducts.length > 0) {
      setTimeout(() => {
        restoreScrollPosition();
      }, 300);
    }
  }, [filteredProducts, shouldRestoreScroll]);

  const restoreScrollPosition = async () => {
    try {
      if (currentScrollOffset > 0 && flatListRef.current && filteredProducts.length > 0) {
        flatListRef.current.scrollToOffset({ 
          offset: currentScrollOffset, 
          animated: false 
        });
        setShouldRestoreScroll(false);
      }
    } catch (error) {
      console.log("Error restoring scroll position:", error);
    }
  };

  // Track scroll position continuously
  const handleScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.y;
    setCurrentScrollOffset(offset);
  };

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

  const getValidImageURL = (imagePath) => {
    if (!imagePath) {
      return "https://via.placeholder.com/150";
    }
    return `https://ct002.frankotrading.com:444/Media/Products_Images/${imagePath
      .split("\\")
      .pop()}`;
  };

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

  // Handle product press with scroll position saving
  const handleProductPress = async (productId) => {
    try {
      // Save current scroll position before navigating
      if (flatListRef.current) {
        await AsyncStorage.setItem("WashingMachineScreenScrollPosition", currentScrollOffset.toString());
      }
    } catch (error) {
      console.log("Error saving scroll position:", error);
    }
    
    navigation.navigate("ProductDetails", { productId });
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

  // Share functionality
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: 'Check out these amazing WashingMachine at great prices!',
        url: 'https://your-app-link.com/WashingMachine', // Replace with your actual app link
        title: ' WashingMachine Collection',
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

  if (productsLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00cc66" />
      </View>
    );
  }

  const renderItem = ({ item, index }) => {
    const productImageURL = getValidImageURL(item.productImage);
    const discount =
      item.oldPrice > 0
        ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)
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
          <Image source={{ uri: productImageURL }} style={styles.productImage} />
          
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
    e.stopPropagation(); // Prevent navigation
    handleToggleWishlist(item);
  }}
>
  <FontAwesome
    name={
      wishlistItems.some((w) => w.productID === item.productID)
        ? "heart"
        : "heart-o"
    }
    size={16}
    color={
      wishlistItems.some((w) => w.productID === item.productID)
        ? "red"
        : "#666"
    }
  />
</TouchableOpacity>

        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>

          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>₵{formatPrice(item.price)}</Text>
            {item.oldPrice > 0 && (
              <Text style={styles.oldPrice}>₵{formatPrice(item.oldPrice)}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.addToCartButton,
            isAddingThisItem && styles.addToCartButtonDisabled
          ]}
          onPress={(e) => {
            e.stopPropagation(); // Prevent navigation when clicking cart button
            handleAddToCart(item);
          }}
          disabled={isAddingThisItem}
        >
          {isAddingThisItem ? (
            <ActivityIndicator size={14} color="white" />
          ) : (
            <AntDesign name="shopping-cart" size={14} color="white" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderModal = (visible, setVisible, title, children) => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <AntDesign name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Washing Machine</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleShare}>
            <Octicons name="share" size={20} color="black" />
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
        data={filteredProducts}
        keyExtractor={(item) => item.productID}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        renderItem={renderItem}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
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
                <AntDesign name="check" size={16} color="#007bff" />
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
                <AntDesign name="check" size={16} color="#007bff" />
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
                <AntDesign name="check" size={16} color="#007bff" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
    borderBottomColor: "#e0e0e0",
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
    borderBottomColor: "#e0e0e0",
    gap: 16,
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
    backgroundColor: "#16A34A",
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
    backgroundColor: "#16A34A",
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
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    alignItems: "center",
  },
  activeFilterTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
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
    color: "#007bff",
    fontWeight: "500",
  },
  resultsContainer: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  resultsText: {
    fontSize: 12,
    color: "#666",
  },
  listContainer: {
    padding: 4    ,
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  productCard: {
     backgroundColor: "#fff",
    padding: 6,
    borderRadius: 12,
    width: 165,
    marginRight: 8,
    marginLeft: 2,
    overeflow: "hidden",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 5,
    marginBottom: 20,
    height: 240
  },
  imageContainer: {
    position: "relative",
    height: 140,
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
    backgroundColor: "#ff4757",
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
    backgroundColor: "#ff6b35",
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
  },
  priceContainer: {
    flexDirection: "column",
    gap: 2,
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 14,
    color: "#2d3436",
    fontWeight: "bold",
  },
  oldPrice: {
    fontSize: 10,
    color: "#636e72",
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
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
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
    borderBottomColor: "#f0f0f0",
  },
  modalOptionSelected: {
    backgroundColor: "#f8f9ff",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#333",
  },
  modalOptionTextSelected: {
    color: "#007bff",
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
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
  },
  clearFiltersButton: {
    margin: 16,
    backgroundColor: "#ff4757",
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
export default MachineScreen;

