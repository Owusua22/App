import { createWebSafeStyles } from '../theme/webSafeStyles';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Text from './AppText';
import CatalogProductCard, { CATALOG_CARD_HEIGHT, CATALOG_CARD_IMAGE_HEIGHT, getCatalogLayout } from './CatalogProductCard';
import CachedImage from "./CachedImage";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { fetchProducts } from "../redux/slice/productSlice";
import { useCatalogRevalidation } from '../hooks/useCatalogRevalidation';
import CatalogFetchNotice from './CatalogFetchNotice';
import { refreshCatalog } from '../utils/catalogRefresh';
import { addToCart } from "../redux/slice/cartSlice";
import { addToWishlist } from "../redux/wishlistSlice";
import frankoLogo from "../assets/frankoIcon.png";
import {
  preloadProductImages,
  resolveProductImageUri,
} from "../utils/ImageCache";

const MAX_GRID_WIDTH = 1100;
const CARD_WIDTH = 120;
const MIN_CARD_WIDTH = 120;
const CARD_MARGIN = 6;
const ROW_GAP = 12;
const CARD_HEIGHT = CATALOG_CARD_HEIGHT;
const IMAGE_HEIGHT = CATALOG_CARD_IMAGE_HEIGHT;
const COLORS = {
  green: "#086942",
  greenDark: "#086942",
  greenDeep: "#086942",
  greenLight: "#DCFCE7",
  greenTint: "#F0FDF4",
  greenBorder: "#BBF7D0",
  ink: "#111827",
  muted: "#64748B",
  line: "#E2E8F0",
  surface: "#FFFFFF",
  canvas: "#F7FAF7",
};

const formatPrice = (price) => {
  const value = Number(price) || 0;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getErrorMessage = (error) => {
  if (typeof error === "string") return error;
  return (
    error?.message ??
    error?.response?.data?.message ??
    error?.responseMessage ??
    "Please try again."
  );
};

const LoadingCard = memo(
  ({
    cardWidth = CARD_WIDTH,
    cardHeight = CARD_HEIGHT,
    imageHeight = IMAGE_HEIGHT,
  }) => (
    <View
      style={[
        styles.productCard,
        styles.loadingCard,
        { width: cardWidth, height: cardHeight },
      ]}
      accessible
      accessibilityLabel="Loading product"
    >
      <View style={[styles.loadingImage, { height: imageHeight }]}>
        <CachedImage
          source={frankoLogo}
          style={styles.frankoLogo}
          accessibilityLabel="Franko Trading logo"
        />
      </View>
      <View style={styles.loadingContent}>
        <View style={styles.loadingTitle} />
        <View style={styles.loadingTitleShort} />
        <View style={styles.loadingPrice} />
      </View>
    </View>
  )
);

const ProductCard = memo(({ product, onPress, onAddToCart, isAddingToCart, onToggleWishlist, isInWishlist, cardWidth }) => (
  <CatalogProductCard product={product} width={cardWidth}
    onPress={() => onPress(product)} onAddToCart={onAddToCart} addingToCart={isAddingToCart}
    onWishlistPress={(item) => onToggleWishlist(item, isInWishlist)} />
));

const ComboComponent = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();

  const productsState = useSelector((state) => state.products ?? {});
  const products = Array.isArray(productsState.products) ? productsState.products : [];
  const reduxLoading = Boolean(productsState.loading);
  const reduxError = productsState.error;
  const cartId = useSelector((state) => state.cart?.cartId);
  const wishlistItems = useSelector((state) =>
    Array.isArray(state.wishlist?.items) ? state.wishlist.items : []
  );

  const [addingToCart, setAddingToCart] = useState({});
  const [requestComplete, setRequestComplete] = useState(products.length > 0);
  const [requestError, setRequestError] = useState(false);
  const [listWidth, setListWidth] = useState(0);
  const fetching = useCatalogRevalidation('products:all', () => fetchProducts(), {
    onResult: (result) => {
      if (result?.error) setRequestError(true);
      else setRequestError(false);
      setRequestComplete(true);
    },
  });

  // Match the same 2/3/4-column card widths used by the category screens.
  const gridWidth = Math.min(listWidth || windowWidth, 1100);
  const horizontalPadding = 12;
  const { columns: numColumns, cardWidth } = getCatalogLayout(gridWidth);
  const imageHeight = IMAGE_HEIGHT;
  const cardHeight = CARD_HEIGHT;
  const isSmall = gridWidth < 360;
  const titleFontSize = isSmall ? 22 : gridWidth >= 700 ? 30 : 25;

  const loadProducts = useCallback(() => {
    setRequestError(false);
    void refreshCatalog(dispatch, 'products:all', () => fetchProducts(), { force: true })
      .then((result) => setRequestError(Boolean(result?.error)))
      .catch(() => setRequestError(true))
      .finally(() => setRequestComplete(true));
  }, [dispatch]);

  const recentProducts = useMemo(() => {
    if (!products.length) return [];
    return [...products]
      .sort((a, b) => {
        const dateA = new Date(a.dateCreated || a.createdAt || 0).getTime();
        const dateB = new Date(b.dateCreated || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [products]);

  useEffect(() => {
    if (!recentProducts.length) return;
    // Warm the first visible products in the native cache without blocking UI.
    void preloadProductImages(recentProducts.slice(0, 8), {
      maxImages: 8,
      concurrency: 3,
    });
  }, [recentProducts]);

  const wishlistSet = useMemo(
    () => new Set(wishlistItems.map((item) => item?.productID).filter(Boolean)),
    [wishlistItems]
  );

  const hasNetworkError = Boolean(reduxError || requestError);
  const hasProducts = recentProducts.length > 0;
  // Keep cached products visible during refreshes/errors instead of unmounting
  // the cards and forcing their remote images to load again.
  const isLoading = !hasProducts && (reduxLoading || !requestComplete);
  const showSkeletons = !hasProducts;
  const showStatusNotice = !isLoading && (hasNetworkError || !hasProducts);

  const dataSource = useMemo(() => {
    if (!showSkeletons) return recentProducts;
    return Array.from({ length: numColumns * 2 }, (_, id) => ({
      isLoading: true,
      id,
    }));
  }, [numColumns, recentProducts, showSkeletons]);

  const handleAddToCart = useCallback(
    async (product) => {
      const productId = product?.productID;
      if (!productId || addingToCart[productId]) return;
      if (!cartId) {
        Alert.alert("Cart unavailable", "Please refresh your cart and try again.");
        return;
      }

      setAddingToCart((previous) => ({ ...previous, [productId]: true }));
      try {
        await dispatch(
          addToCart({
            cartId,
            productId,
            price: product.price,
            quantity: 1,
          })
        ).unwrap();
        Alert.alert("Added to Cart", `${product.productName} added to cart.`);
      } catch (error) {
        Alert.alert("Couldn’t add item", getErrorMessage(error));
      } finally {
        setAddingToCart((previous) => {
          const next = { ...previous };
          delete next[productId];
          return next;
        });
      }
    },
    [addingToCart, cartId, dispatch]
  );

  const handleToggleWishlist = useCallback(
    (product, isInWishlist) => {
      if (isInWishlist) {
        Alert.alert("Wishlist", `${product.productName} is already saved.`);
        return;
      }
      dispatch(addToWishlist(product));
      Alert.alert("Wishlist", `${product.productName} added to your wishlist.`);
    },
    [dispatch]
  );

  const handleProductPress = useCallback(
    (product) => {
      navigation.navigate("ProductDetails", {
        productID: product.productID,
        productId: product.productID,
      });
    },
    [navigation]
  );

  const handleViewAll = useCallback(() => navigation.navigate("Products"), [navigation]);

  const keyExtractor = useCallback(
    (item, index) => (item.isLoading ? `loading-${item.id}` : String(item.productID ?? index)),
    []
  );

  const renderItem = useCallback(
    ({ item: product, index }) => {
      const itemWrapperStyle = [
        styles.cardWrapper,
        {
          width: cardWidth,
          marginBottom: numColumns === 1 ? ROW_GAP : 0,
        },
      ];

      if (product.isLoading) {
        return (
          <View style={itemWrapperStyle}>
            <LoadingCard
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              imageHeight={imageHeight}
            />
          </View>
        );
      }

      const imageUri = resolveProductImageUri(product.productImage);
      const oldPrice = Number(product.oldPrice) || 0;
      const currentPrice = Number(product.price) || 0;
      const discount =
        oldPrice > currentPrice && oldPrice > 0
          ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100)
          : 0;

      return (
        <View style={itemWrapperStyle}>
          <ProductCard
            product={product}
            onPress={handleProductPress}
            onAddToCart={handleAddToCart}
            isAddingToCart={Boolean(addingToCart[product.productID])}
            isInWishlist={wishlistSet.has(product.productID)}
            onToggleWishlist={handleToggleWishlist}
            imageUri={imageUri}
            discount={discount}
            isNew={index < 3}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            imageHeight={imageHeight}
          />
        </View>
      );
    },
    [
      addingToCart,
      cardHeight,
      cardWidth,
      handleAddToCart,
      handleProductPress,
      handleToggleWishlist,
      imageHeight,
      numColumns,
      wishlistSet,
      ROW_GAP,
    ]
  );

  const ListHeader = useMemo(
    () => (
      <>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.eyebrow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrowText}>JUST LANDED</Text>
            </View>
            <Text style={[styles.title, { fontSize: titleFontSize }]}>New arrivals</Text>
            <View style={styles.titleUnderline} />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View products products"
            activeOpacity={0.85}
            style={[styles.viewAllButton, isSmall && styles.viewAllButtonSmall]}
            onPress={handleViewAll}
          >
            <Text style={styles.viewAllText}>View products</Text>
            <View style={styles.arrowContainer}>
              <FontAwesome name="arrow-right" size={12} color={COLORS.greenDark} />
            </View>
          </TouchableOpacity>
        </View>

        {showStatusNotice && (
          <View style={styles.statusNotice}>
            <View style={styles.statusLogoWrap}>
              <CachedImage source={frankoLogo} style={styles.statusLogo} />
            </View>
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>
                {hasNetworkError ? "Connection issue" : "No new arrivals yet"}
              </Text>
              <Text style={styles.statusSubtitle}>
                {hasNetworkError
                  ? "Check your connection and try again."
                  : "We’ll check again for fresh products."}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Retry loading products"
              activeOpacity={0.82}
              style={styles.retryButton}
              onPress={loadProducts}
            >
              <FontAwesome name="refresh" size={12} color={COLORS.surface} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    ),
    [
      handleViewAll,
      hasNetworkError,
      isSmall,
      loadProducts,
      showStatusNotice,
      titleFontSize,
    ]
  );

  return (
    <View style={styles.container}>
      <CatalogFetchNotice loading={fetching} hasCachedData={products.length > 0} label="products" />
      <FlatList
        key={`new-arrivals-${numColumns}`}
        style={styles.list}
        onLayout={(event) => setListWidth(event.nativeEvent.layout.width)}
        contentContainerStyle={[styles.gridContent, { paddingHorizontal: horizontalPadding }]}
        data={dataSource}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        ListHeaderComponent={ListHeader}
        columnWrapperStyle={
          numColumns > 1
            ? [styles.columnWrapper, { marginBottom: ROW_GAP }]
            : undefined
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === "android"}
        maxToRenderPerBatch={numColumns * 3}
        updateCellsBatchingPeriod={50}
        initialNumToRender={numColumns * 2}
        windowSize={5}
        scrollEventThrottle={16}
      />
    </View>
  );
};

export default ComboComponent;

const styles = createWebSafeStyles({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: COLORS.canvas,
    paddingHorizontal: 0,
  },
  list: {
    width: "100%",
    maxWidth: MAX_GRID_WIDTH,
    alignSelf: "center",
  },
  gridContent: {
    paddingTop: 0,
    paddingBottom: 28,
  },
  header: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 18,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-start",
    paddingRight: 8,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  eyebrowText: {
    color: COLORS.greenDark,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: {
    color: COLORS.ink,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  titleUnderline: {
    width: 54,
    height: 3,
    marginTop: 5,
    marginBottom: 5,
    borderRadius: 2,
    backgroundColor: COLORS.green,
  },
  subtitle: {
    color: COLORS.muted,
    fontWeight: "500",
  },
  viewAllButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: COLORS.green,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.greenDark,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  viewAllButtonSmall: {
    minHeight: 38,
    gap: 6,
    paddingHorizontal: 10,
  },
  viewAllText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: "800",
  },
  arrowContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  statusNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    padding: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    backgroundColor: COLORS.surface,
  },
  statusLogoWrap: {
    width: 42,
    height: 42,
    marginRight: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.greenTint,
  },
  statusLogo: {
    width: 29,
    height: 29,
    resizeMode: "contain",
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  statusTitle: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  statusSubtitle: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  retryButton: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: COLORS.greenDark,
  },
  retryText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: "800",
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  cardWrapper: {
    flexShrink: 0,
  },
  productCard: {
    position: "relative",
    padding: 2,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 5,
  },
  loadingCard: {
    borderRadius: 14,
  },
  cardTouchable: {
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    height: IMAGE_HEIGHT,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  loadingImage: {
    height: IMAGE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.greenTint,
  },
  loadingContent: {
    flex: 1,
    padding: 12,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  hiddenImage: {
    opacity: 0,
  },
  imageLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(240,253,244,0.96)",
  },
  frankoLogo: {
    width: 60,
    height: 60,
    resizeMode: "contain",
    opacity: 0.78,
  },
  imageSpinner: {
    position: "absolute",
    bottom: 8,
  },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.green,
    zIndex: 2,
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.greenDark,
    zIndex: 2,
  },
  badgeText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  wishlistButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    padding: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 3,
  },
  productInfo: {
    flex: 1,
    padding: 12,
  },
  productName: {
    minHeight: 36,
    marginBottom: 8,
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  priceContainer: {
    minHeight: 31,
    flexDirection: "column",
    gap: 2,
  },
  productPrice: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  oldPrice: {
    color: COLORS.muted,
    fontSize: 10,
    textDecorationLine: "line-through",
  },
  addToCartButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    padding: 8,
    borderRadius: 999,
    backgroundColor: COLORS.green,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 4,
  },
  addToCartButtonDisabled: {
    backgroundColor: COLORS.greenLight,
  },
  loadingTitle: {
    width: "92%",
    height: 16,
    marginBottom: 8,
    borderRadius: 4,
    backgroundColor: "#E7EFE8",
  },
  loadingTitleShort: {
    width: "66%",
    height: 12,
    marginBottom: 12,
    borderRadius: 4,
    backgroundColor: "#E7EFE8",
  },
  loadingPrice: {
    width: "60%",
    height: 12,
    borderRadius: 4,
    backgroundColor: "#DCE9DE",
  },
});
