import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import Feather from "@expo/vector-icons/Feather";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { fetchProductsByCategory } from "../redux/slice/productSlice";
import { addToCart } from "../redux/slice/cartSlice";
import { ProductCard, LoadingCard } from "./ProductCard";
import { preloadProductImages } from "../utils/ImageCache";

const CARD_MARGIN = 8;
const CARD_WIDTH = 170;
const MAX_DISPLAY_PRODUCTS = 10;
const EMPTY_PRODUCTS = [];

const CategoryProductCarousel = ({
  categoryId,
  title,
  headerIcon,
  headerIconFamily = "material",
  footerIcon,
  viewAllRoute,
  footerRoute = viewAllRoute,
  moreLabel,
}) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const productsByCategory = useSelector(
    (state) => state.products?.productsByCategory
  );
  const loading = useSelector((state) => Boolean(state.products?.loading));
  const cartId = useSelector((state) => state.cart?.cartId);
  const [addingToCart, setAddingToCart] = useState({});
  const requestedCategoryRef = useRef(null);

  const products = useMemo(() => {
    const categoryProducts = productsByCategory?.[categoryId];
    return Array.isArray(categoryProducts) ? categoryProducts : EMPTY_PRODUCTS;
  }, [productsByCategory, categoryId]);

  const displayProducts = useMemo(
    () => products.slice(0, MAX_DISPLAY_PRODUCTS),
    [products]
  );

  useEffect(() => {
    if (products.length > 0) {
      requestedCategoryRef.current = categoryId;
      return;
    }
    if (loading || requestedCategoryRef.current === categoryId) return;

    requestedCategoryRef.current = categoryId;
    dispatch(fetchProductsByCategory(categoryId));
  }, [categoryId, dispatch, loading, products.length]);

  useEffect(() => {
    if (!displayProducts.length) return;
    // Warm the native image cache for the first products before they are swiped into view.
    void preloadProductImages(displayProducts, {
      maxImages: 8,
      concurrency: 3,
    });
  }, [displayProducts]);

  const handleAddToCart = useCallback((product) => {
    setAddingToCart((previous) => ({
      ...previous,
      [product.productID]: true,
    }));

    dispatch(addToCart({
      cartId,
      productId: product.productID,
      price: product.price,
      quantity: 1,
    }))
      .unwrap()
      .then(() => {
        Alert.alert(
          "Success",
          `${product.productName} added to cart successfully!`
        );
      })
      .catch((error) => {
        Alert.alert(
          "Error",
          `Failed to add product to cart: ${error?.message || "Please try again."}`
        );
      })
      .finally(() => {
        setAddingToCart((previous) => {
          const next = { ...previous };
          delete next[product.productID];
          return next;
        });
      });
  }, [cartId, dispatch]);

  const handleProductPress = useCallback((productId) => {
    navigation.navigate("ProductDetails", { productId });
  }, [navigation]);

  const handleViewAll = useCallback(() => {
    navigation.navigate(viewAllRoute);
  }, [navigation, viewAllRoute]);

  const handleFooterPress = useCallback(() => {
    navigation.navigate(footerRoute);
  }, [navigation, footerRoute]);

  const renderProduct = useCallback(({ item, index }) => (
    <ProductCard
      product={item}
      index={index}
      onPress={handleProductPress}
      onAddToCart={handleAddToCart}
      isAddingToCart={addingToCart[item.productID]}
      showHotDeal
    />
  ), [addingToCart, handleAddToCart, handleProductPress]);

  const keyExtractor = useCallback(
    (item) => String(item.productID),
    []
  );

  const getItemLayout = useCallback((_, index) => ({
    length: CARD_WIDTH + CARD_MARGIN,
    offset: (CARD_WIDTH + CARD_MARGIN) * index,
    index,
  }), []);

  const shouldShowViewMore = !loading && products.length > MAX_DISPLAY_PRODUCTS;

  const renderLoadingCards = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.productList}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <LoadingCard key={`loading-${index}`} />
      ))}
    </ScrollView>
  );

  const renderMainProducts = () => (
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
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        ListFooterComponent={shouldShowViewMore ? (
          <TouchableOpacity
            style={styles.viewAllCard}
            onPress={handleFooterPress}
          >
            <View style={styles.viewAllContent}>
              <Icon name={footerIcon} size={32} color="#10B981" />
              <Text style={styles.viewAllText}>View More</Text>
              <Text style={styles.viewMoreSubtext}>
                {products.length - MAX_DISPLAY_PRODUCTS}+ {moreLabel}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.showroomContainer}>
        <View style={styles.showroomHeader}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <View style={styles.iconGlow} />
                <View style={styles.iconInner}>
                  {headerIconFamily === "feather" ? (
                    <Feather name={headerIcon} size={22} color="#fff" />
                  ) : (
                    <Icon name={headerIcon} size={24} color="#fff" />
                  )}
                </View>
              </View>
              <View style={styles.headerTextContainer}>
                <View style={styles.titleRow}>
                  <Text style={styles.showroomTitle}>{title}</Text>
                </View>
                <Text style={styles.showroomSubtitle}>Latest models &amp; deals</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewMoreButton}
              onPress={handleViewAll}
              activeOpacity={0.7}
            >
              <Text style={styles.viewMoreText}>View All</Text>
              <View style={styles.arrowContainer}>
                <Icon name="chevron-right" size={14} color="#10B981" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.backgroundPattern}>
            <View style={[styles.floatingDot, styles.dot1]} />
            <View style={[styles.floatingDot, styles.dot2]} />
            <View style={[styles.floatingDot, styles.dot3]} />
          </View>
        </View>

        {(loading && products.length === 0) || products.length === 0
          ? renderLoadingCards()
          : renderMainProducts()}
      </View>
    </View>
  );
};

export default React.memo(CategoryProductCarousel);

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
  viewAllCard: {
    width: CARD_WIDTH,
    height: 240,
    marginRight: CARD_MARGIN,
    marginLeft: 10,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#BBF7D0",
    borderStyle: "dashed",
  },
  viewAllContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  viewAllText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  viewMoreSubtext: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },
});
