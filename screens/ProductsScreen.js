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
  Platform,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { fetchPaginatedProducts } from "../redux/slice/productSlice";
import { addToCart } from "../redux/slice/cartSlice";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";
import { Ionicons } from '@expo/vector-icons';
import { removeFromWishlist, addToWishlist } from '../redux/wishlistSlice'; // Fixed import path
import { Octicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";

const screenWidth = Dimensions.get("window").width;

const ProductsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { products = [], loading: productsLoading } = useSelector(
    (state) => state.products || {}
  );
  const cartId = useSelector((state) => state.cart.cartId);
  const wishlistItems = useSelector((state) => state.wishlist.items || []); // Added fallback

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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [allProducts, setAllProducts] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const itemsPerPage = 24;

  useEffect(() => {
    if (currentPage === 1) {
      setAllProducts([]);
    }
    
    setLoadingMore(true);
    dispatch(fetchPaginatedProducts({ pageNumber: currentPage, pageSize: itemsPerPage })).then(
      (response) => {
        if (response.payload) {
          setAllProducts((prevProducts) =>
            currentPage === 1 ? response.payload : [...prevProducts, ...response.payload]
          );
          
          if (currentPage === 1 && shouldRestoreScroll) {
            setTimeout(() => {
              restoreScrollPosition();
            }, 300);
          }
        }
        setLoadingMore(false);
      }
    );
  }, [currentPage]);

  useFocusEffect(
    React.useCallback(() => {
      const checkScrollRestore = async () => {
        try {
          const savedScrollPosition = await AsyncStorage.getItem("productsScrollPosition");
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
        setShouldRestoreScroll(false);
      };
    }, [])
  );

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

  const handleScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.y;
    setCurrentScrollOffset(offset);
  };

  const { uniqueSellers, uniqueBrands } = useMemo(() => {
    const products = allProducts || [];
    const sellers = [...new Set(products.map(p => p.sellerName).filter(Boolean))];
    const brands = [...new Set(products.map(p => p.brandName).filter(Boolean))];
    return { uniqueSellers: sellers, uniqueBrands: brands };
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    let products = allProducts.filter(p => p.status !== "0") || [];

    if (selectedSellers.length > 0) {
      products = products.filter(p => selectedSellers.includes(p.sellerName));
    }

    if (selectedBrands.length > 0) {
      products = products.filter(p => selectedBrands.includes(p.brandName));
    }

    products = products.filter(p => 
      p.price >= priceRange.min && p.price <= priceRange.max
    );

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
  }, [allProducts, selectedSort, selectedSellers, selectedBrands, priceRange]);

  const formatPrice = (amount) =>
    amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getValidImageURL = (imagePath) => {
    if (!imagePath) {
      return "https://via.placeholder.com/150";
    }

    const fileName = imagePath.split(/[\\/]/).pop();

    if (imagePath.includes("\\") || imagePath.includes("F:") || imagePath.includes("D:")) {
      return `https://smfteapi.salesmate.app/Media/Products_Images/${fileName}`;
    }

    if (imagePath.startsWith("http")) return imagePath;

    return `https://smfteapi.salesmate.app/${imagePath}`;
  };

  const handleAddToCart = (product) => {
    const cartData = {
      cartId,
      productId: product.productID,
      price: product.price,
      quantity: 1,
    };

    setAddingToCart(prev => ({ ...prev, [product.productID]: true }));

    dispatch(addToCart(cartData))
      .then(() => {
        Alert.alert("Success", `${product.productName} added to cart successfully!`);
      })
      .catch((error) => {
        Alert.alert("Error", `Failed to add product to cart: ${error.message}`);
      })
      .finally(() => {
        setAddingToCart(prev => {
          const newState = { ...prev };
          delete newState[product.productID];
          return newState;
        });
      });
  };

  // Fixed handleToggleWishlist function
  const handleToggleWishlist = (product, event) => {
    // Prevent navigation when clicking wishlist button
    if (event) {
      event.stopPropagation();
    }

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

  const handleProductPress = async (productId) => {
    try {
      if (flatListRef.current) {
        await AsyncStorage.setItem("productsScrollPosition", currentScrollOffset.toString());
      }
    } catch (error) {
      console.log("Error saving scroll position:", error);
    }
    
    navigation.navigate("ProductDetails", { productId });
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: 'Check out these amazing products at great prices!',
        url: 'https://www.frankotrading.com/products',
        title: 'Products Collection',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  const sortOptions = [
    { key: "newest", label: "Newest First" },
    { key: "oldest", label: "Oldest First" },
    { key: "price_low", label: "Price: Low to High" },
    { key: "price_high", label: "Price: High to Low" },
    { key: "name_az", label: "Name: A to Z" },
    { key: "name_za", label: "Name: Z to A" },
  ];

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

  const clearAllFilters = () => {
    setSelectedSort("newest");
    setSelectedSellers([]);
    setSelectedBrands([]);
    setPriceRange({ min: 0, max: 10000 });
  };

  const handleLoadMore = () => {
    if (!loadingMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  if (loadingMore && currentPage === 1) {
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
    const isInWishlist = wishlistItems.some((w) => w.productID === item.productID);

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

          {/* Fixed wishlist button with onPress handler */}
          <TouchableOpacity 
            style={styles.wishlistButton}
            onPress={(e) => handleToggleWishlist(item, e)}
            activeOpacity={0.7}
          >
            <FontAwesome
              name={isInWishlist ? "heart" : "heart-o"}
              size={16}
              color={isInWishlist ? "red" : "#666"}
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
            e.stopPropagation();
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
         <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Products</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleShare}>
            <Octicons name="share" size={20} color="#333" />
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
        data={filteredProducts}
        keyExtractor={(item) => item.productID.toString()}
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          loadingMore && currentPage > 1 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#16A34A" />
              <Text style={styles.loadingMoreText}>Loading more products...</Text>
            </View>
          ) : null
        }
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
            <View style={styles.priceInputRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min price"
                value={priceRange.min.toString()}
                onChangeText={(text) => setPriceRange(prev => ({ ...prev, min: parseFloat(text) || 0 }))}
                keyboardType="numeric"
              />
              <Text style={styles.priceInputSeparator}>to</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max price"
                value={priceRange.max.toString()}
                onChangeText={(text) => setPriceRange(prev => ({ ...prev, max: parseFloat(text) || 10000 }))}
                keyboardType="numeric"
              />
            </View>
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
    padding: 4,
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
   productCard: {
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 12,
    width: (screenWidth / 2) - 20,
    marginRight: 8,
    marginLeft: 10,
    // overflow hidden only on Android
    ...(Platform.OS === "android" && { overflow: "hidden" }),
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 5,
    marginBottom: 20,
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
    backgroundColor: "#7dd3c0",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
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
  modalTitle: {fontSize: 18,
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
    marginBottom: 12,
  },
  priceInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "white",
  },
  priceInputSeparator: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
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

export default ProductsScreen;