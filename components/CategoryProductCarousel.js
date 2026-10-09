import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from './AppText';
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import Feather from "@expo/vector-icons/Feather";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { fetchProductsByCategory } from '../redux/slice/productSlice';
import { addToCart } from '../redux/slice/cartSlice';
import { ProductCard, LoadingCard } from './ProductCard';
import { preloadProductImages } from '../utils/ImageCache';
import { useCatalogRevalidation } from '../hooks/useCatalogRevalidation';
import { refreshCatalog } from '../utils/catalogRefresh';
import CatalogFetchNotice from './CatalogFetchNotice';

const CARD_MARGIN = 8;
const CARD_WIDTH = 160;
const CARD_STRIDE = CARD_WIDTH + 18; // card plus its 10px left and 8px right margins
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
  const [requestComplete, setRequestComplete] = useState(false);
  const [requestError, setRequestError] = useState(false);
  const fetching = useCatalogRevalidation(`category:${categoryId}`, () => fetchProductsByCategory(categoryId), {
    enabled: Boolean(categoryId),
    onResult: (result) => {
      setRequestComplete(true);
      setRequestError(Boolean(result?.error));
    },
  });
  const retry = useCallback(() => {
    setRequestError(false);
    setRequestComplete(false);
    void refreshCatalog(dispatch, `category:${categoryId}`, () => fetchProductsByCategory(categoryId), { force: true })
      .then((result) => setRequestError(Boolean(result?.error)))
      .catch(() => setRequestError(true))
      .finally(() => setRequestComplete(true));
  }, [dispatch, categoryId]);

  const products = useMemo(() => {
    const categoryProducts = productsByCategory?.[categoryId];
    return Array.isArray(categoryProducts) ? categoryProducts : EMPTY_PRODUCTS;
  }, [productsByCategory, categoryId]);

  const displayProducts = useMemo(
    () => products.slice(0, MAX_DISPLAY_PRODUCTS),
    [products]
  );

  useEffect(() => {
    if (!displayProducts.length) return;
    // Warm the native image cache for the first products before they are swiped into view.
    void preloadProductImages(displayProducts.slice(3, 6), {
      maxImages: 3,
      concurrency: 1,
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
    length: CARD_STRIDE,
    offset: CARD_STRIDE * index,
    index,
  }), []);

  const shouldShowViewMore = !loading && products.length > MAX_DISPLAY_PRODUCTS;

  const renderLoadingCards = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.productList}
    >
      {Array.from({ length: 3 }, (_, index) => (
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
        snapToInterval={CARD_STRIDE}
        snapToAlignment="start"
        removeClippedSubviews
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        ListFooterComponent={shouldShowViewMore ? (
          <TouchableOpacity
            style={styles.viewAllCard}
            onPress={handleFooterPress}
          >
            <View style={styles.viewAllContent}>
              <Icon name={footerIcon} size={32} color="#086942" />
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
                    <Feather name={headerIcon} size={22} color="#086942" />
                  ) : (
                    <Icon name={headerIcon} size={24} color="#086942" />
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
                <Icon name="chevron-right" size={14} color="#086942" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.backgroundPattern}>
            <View style={[styles.floatingDot, styles.dot1]} />
            <View style={[styles.floatingDot, styles.dot2]} />
            <View style={[styles.floatingDot, styles.dot3]} />
          </View>
        </View>

        <CatalogFetchNotice loading={fetching} hasCachedData={products.length > 0} label="products" />
        {products.length ? renderMainProducts() : fetching || !requestComplete
          ? renderLoadingCards()
          : requestError
            ? <TouchableOpacity onPress={retry} style={styles.emptyState} accessibilityRole="button"><Text style={styles.emptyText}>Could not load products. Tap to retry.</Text></TouchableOpacity>
            : <View style={styles.emptyState}><Text style={styles.emptyText}>Nothing here yet. Explore our other categories.</Text></View>}
      </View>
    </View>
  );
};

export default React.memo(CategoryProductCarousel);

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF' },
  showroomContainer: { backgroundColor: '#FFFFFF', marginVertical: 5 },
  showroomHeader: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 13, paddingBottom: 4 },
  backgroundPattern: { display: 'none' },
  floatingDot: { display: 'none' },
  dot1: {}, dot2: {}, dot3: {},
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#84e8b9', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  iconGlow: { display: 'none' },
  iconInner: { alignItems: 'center', justifyContent: 'center' },
  headerTextContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  showroomTitle: { color: '#172B24', fontWeight: '900', fontSize: 18, letterSpacing: -0.4 },
  showroomSubtitle: { color: '#86958A', fontSize: 10, marginTop: 3 },
  viewMoreButton: { flexDirection: 'row', alignItems: 'center' },
  viewMoreText: { color: '#086942', fontSize: 10, fontWeight: '900', marginRight: 2 },
  arrowContainer: { alignItems: 'center', justifyContent: 'center' },
  emptyState: { padding: 22, alignItems: 'center' },
  emptyText: { color: '#86958A', fontSize: 12, textAlign: 'center' },
  productList: {
    paddingRight: 10,
    paddingTop: 7,
    paddingBottom: 2,
  },
  viewAllCard: {
    width: CARD_WIDTH,
    height: 252,
    marginRight: CARD_MARGIN,
    marginLeft: 10,
    backgroundColor: "#E4F8EB",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#84e8b9",
    borderStyle: "dashed",
  },
  viewAllContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  viewAllText: {
    color: "#086942",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  viewMoreSubtext: {
    color: "#086942",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },
});
