import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { fetchProductsByCategory } from "../redux/slice/productSlice";
import { addToCart } from "../redux/slice/cartSlice";
import Feather from '@expo/vector-icons/Feather';
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { ProductCard, LoadingCard } from "./ProductCard"; // Import the shared components

const hardcodedCategoryId = "51d1fff2-7b71-46aa-9b34-2e553a40e921";
const CARD_MARGIN = 8;
const CARD_WIDTH = 170;

// Optimized PhonesComponent
const PhonesComponent = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { productsByCategory = {}, loading } = useSelector((state) => state.products);
  const cartId = useSelector((state) => state.cart.cartId);
  const [addingToCart, setAddingToCart] = useState({});

  const products = productsByCategory[hardcodedCategoryId] || [];

  useEffect(() => {
    if (!products || products.length === 0) {
      dispatch(fetchProductsByCategory(hardcodedCategoryId));
    }
  }, [dispatch, products]);

  // Memoized callbacks for better performance
  const handleAddToCart = useCallback((product) => {
    const cartData = {
      cartId,
      productId: product.productID,
      price: product.price,
      quantity: 1,
    };

    setAddingToCart((prev) => ({ ...prev, [product.productID]: true }));

    dispatch(addToCart(cartData))
      .then(() => {
        Alert.alert("Success", `${product.productName} added to cart successfully!`);
      })
      .catch((error) => {
        Alert.alert("Error", `Failed to add product to cart: ${error.message}`);
      })
      .finally(() => {
        setAddingToCart((prev) => {
          const newState = { ...prev };
          delete newState[product.productID];
          return newState;
        });
      });
  }, [cartId, dispatch]);

  const handleProductPress = useCallback((productId) => {
    navigation.navigate('ProductDetails', { productId });
  }, [navigation]);

  const handleViewMore = useCallback(() => {
    navigation.navigate("Phones");
  }, [navigation]);

  // Render item function for FlatList (memoized)
  const renderProduct = useCallback(({ item, index }) => {
    return (
      <ProductCard
        product={item}
        index={index}
        onPress={handleProductPress}
        onAddToCart={handleAddToCart}
        isAddingToCart={addingToCart[item.productID]}
        showNew={true} // This will show "NEW" badge for first 3 items
      />
    );
  }, [handleProductPress, handleAddToCart, addingToCart]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item) => item.productID, []);

  // Get item layout for better performance
  const getItemLayout = useCallback((data, index) => ({
    length: CARD_WIDTH + CARD_MARGIN,
    offset: (CARD_WIDTH + CARD_MARGIN) * index,
    index,
  }), []);

  const shouldShowViewMore = () => {
    if (loading) return false;
    return products.length > 10;
  };

  // Render loading cards
  const renderLoadingCards = () => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productList}
      >
        {Array(6).fill().map((_, idx) => (
          <LoadingCard key={`loading-${idx}`} />
        ))}
      </ScrollView>
    );
  };

  // Render main product list
  const renderMainProducts = () => {
    const displayProducts = products.slice(0, 10);

    return (
      <View>
        <FlatList
          data={displayProducts}
          renderItem={renderProduct}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productList}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + CARD_MARGIN}
          snapToAlignment="start"
          removeClippedSubviews={true}
          initialNumToRender={4}
          maxToRenderPerBatch={6}
          windowSize={10}
          updateCellsBatchingPeriod={50}
          ListFooterComponent={() => 
            shouldShowViewMore() ? (
              <TouchableOpacity 
                style={styles.viewAllCard} 
                onPress={handleViewMore}
              >
                <View style={styles.viewAllContent}>
                  <Icon name="cellphone" size={32} color="#10B981" />
                  <Text style={styles.viewAllText}>View More</Text>
                  <Text style={styles.viewMoreSubtext}>
                    {products.length - 10}+ more phones
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null
          }
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.showroomContainer}>
        {/* Modern E-commerce Header - Similar to Explore */}
        <View style={styles.showroomHeader}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <View style={styles.iconGlow} />
                <View style={styles.iconInner}>
                  <Feather name="smartphone" size={22} color="#fff" />
                </View>
              </View>
              <View style={styles.headerTextContainer}>
                <View style={styles.titleRow}>
                  <Text style={styles.showroomTitle}>Smart Phones</Text>
                </View>
                <Text style={styles.showroomSubtitle}>Latest models & deals</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.viewMoreButton}
              onPress={handleViewMore}
              activeOpacity={0.7}
            >
              <Text style={styles.viewMoreText}>View All</Text>
              <View style={styles.arrowContainer}>
                <Icon name="chevron-right" size={14} color="#10B981" />
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Animated Background Elements */}
          <View style={styles.backgroundPattern}>
            <View style={[styles.floatingDot, styles.dot1]} />
            <View style={[styles.floatingDot, styles.dot2]} />
            <View style={[styles.floatingDot, styles.dot3]} />
          </View>
        </View>

        {/* Enhanced Product List with Performance Optimization */}
        {(loading && products.length === 0) || products.length === 0
          ? renderLoadingCards()
          : renderMainProducts()
        }
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  
  showroomContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 8,
  },
  
  showroomHeader: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    position: "relative",
    overflow: "hidden",
  },

  // Background Pattern
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  floatingDot: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#10B981",
    opacity: 0.1,
  },

  dot1: {
    top: 15,
    right: 80,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  dot2: {
    top: 35,
    right: 60,
    opacity: 0.08,
  },

  dot3: {
    top: 25,
    right: 100,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.06,
  },

  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
    position: "relative",
  },
  
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  iconGlow: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#10B981",
    opacity: 0.2,
  },

  iconInner: {
    justifyContent: "center",
    alignItems: "center",
  },
  
  headerTextContainer: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  
  showroomTitle: { 
    color: "#111827", 
    fontWeight: "800", 
    fontSize: 22,
    letterSpacing: -0.5,
    marginRight: 8,
  },
  
  showroomSubtitle: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  viewMoreText: { 
    color: "#059669", 
    fontSize: 12, 
    fontWeight: "700",
    letterSpacing: 0.3,
    marginRight: 4,
  },

  arrowContainer: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  
  productList: { 
    paddingRight: 10,
    paddingVertical: 20,
  },

  // View More Card (matching original style with green theme)
  viewAllCard: {
    width: CARD_WIDTH,
    height: 240,
    marginRight: CARD_MARGIN,
    marginLeft: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#BBF7D0',
    borderStyle: 'dashed',
  },
  
  viewAllContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  
  viewAllText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  
  viewMoreSubtext: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default PhonesComponent;