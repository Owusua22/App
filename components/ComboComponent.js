import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, resetProducts } from '../redux/slice/productSlice';
import { addToCart } from '../redux/slice/cartSlice';
import { addToWishlist } from '../redux/wishlistSlice';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import frankoLogo from '../assets/frankoIcon.png';

/* ─── Responsive Layout ───────────────────────────────── */
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Device size buckets
const isSmall  = SCREEN_W < 360;   // e.g. iPhone SE 1st gen
const isMedium = SCREEN_W >= 360 && SCREEN_W < 414; // most phones
const isLarge  = SCREEN_W >= 414;  // Plus / Pro Max / tablets

const SPACING = {
  xs:  isSmall ? 3  : 4,
  sm:  isSmall ? 6  : 8,
  md:  isSmall ? 10 : 12,
  lg:  isSmall ? 14 : 16,
  xl:  isSmall ? 18 : 20,
  xxl: isSmall ? 20 : 24,
};

// Container padding scales with screen width
const CONTAINER_PADDING = isSmall ? 10 : isMedium ? 12 : 16;
// Gap between the two columns
const COLUMN_GAP = isSmall ? 8 : 10;
// Each card takes exactly half the available space
const CARD_WIDTH =
  (SCREEN_W - CONTAINER_PADDING * 2 - COLUMN_GAP) / 2;

// Image height proportional to card width
const IMAGE_H = Math.round(CARD_WIDTH * 0.95);

/* ─── Price Formatter ─────────────────────────────────── */
/**
 * Formats a number as a price string with thousand separators.
 * e.g.  2000     → "2,000.00"
 *       12500.5  → "12,500.50"
 *       null/0   → "0.00"
 */
const formatPrice = (price) => {
  const n = Number(price) || 0;
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/* ─── Loading Skeleton Card ───────────────────────────── */
const LoadingCard = memo(() => (
  <View style={[styles.productCard, { width: CARD_WIDTH }]}>
    <View style={[styles.imageContainer, { height: IMAGE_H }]}>
      <Image source={frankoLogo} style={styles.frankoLogo} />
    </View>
    <View style={styles.productInfo}>
      <View style={styles.loadingTitle} />
      <View style={styles.loadingTitleShort} />
      <View style={styles.loadingPrice} />
    </View>
  </View>
));

/* ─── Product Card ────────────────────────────────────── */
const ProductCard = memo(
  ({
    product,
    index,
    onPress,
    onAddToCart,
    isAddingToCart,
    isInWishlist,
    onToggleWishlist,
    imageUri,
    discount,
    isNew,
  }) => {
    const [imageLoading, setImageLoading] = useState(true);

    const handleImageLoad  = useCallback(() => setImageLoading(false), []);
    const handleImageError = useCallback(() => setImageLoading(false), []);

    const handleCartPress = useCallback(
      (e) => { e.stopPropagation(); onAddToCart(product); },
      [onAddToCart, product]
    );

    const handleWishlistPress = useCallback(
      (e) => { e.stopPropagation(); onToggleWishlist(product, isInWishlist); },
      [onToggleWishlist, product, isInWishlist]
    );

    // Font sizes scale with screen
    const nameFontSize  = isSmall ? 11 : isMedium ? 12 : 13;
    const priceFontSize = isSmall ? 12 : isMedium ? 13 : 14;

    return (
      <TouchableOpacity
        style={[styles.productCard, { width: CARD_WIDTH }]}
        onPress={onPress}
        activeOpacity={0.88}
      >
        {/* ── Image ── */}
        <View style={[styles.imageContainer, { height: IMAGE_H }]}>
          {imageLoading && (
            <View style={styles.imageLoadingContainer}>
              <ActivityIndicator size="small" color="#FF6347" />
            </View>
          )}

          <Image
            source={{ uri: imageUri }}
            style={[styles.productImage, imageLoading && styles.hiddenImage]}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />

          {/* Badges */}
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

          {/* Wishlist */}
          <TouchableOpacity
            style={styles.wishlistButton}
            onPress={handleWishlistPress}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <FontAwesome
              name={isInWishlist ? 'heart' : 'heart-o'}
              size={isSmall ? 13 : 15}
              color={isInWishlist ? '#E63946' : '#888'}
            />
          </TouchableOpacity>
        </View>

        {/* ── Info ── */}
        <View style={styles.productInfo}>
          <Text
            style={[styles.productName, { fontSize: nameFontSize }]}
            numberOfLines={2}
          >
            {product.productName}
          </Text>

          <View style={styles.priceContainer}>
            <Text style={[styles.productPrice, { fontSize: priceFontSize }]}>
              ₵{formatPrice(product.price)}
            </Text>
            {product.oldPrice > 0 && (
              <Text style={styles.oldPrice}>
                ₵{formatPrice(product.oldPrice)}
              </Text>
            )}
          </View>
        </View>

        {/* ── Add-to-cart FAB ── */}
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            isAddingToCart && styles.addToCartButtonDisabled,
          ]}
          onPress={handleCartPress}
          disabled={isAddingToCart}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {isAddingToCart ? (
            <ActivityIndicator size={12} color="#fff" />
          ) : (
           <AntDesign name="shopping-cart" size={14} color="white" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  },
  // Custom comparator — only re-render when relevant props change
  (prev, next) =>
    prev.product.productID === next.product.productID &&
    prev.isAddingToCart    === next.isAddingToCart    &&
    prev.isInWishlist      === next.isInWishlist      &&
    prev.imageUri          === next.imageUri
);

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
const ComboComponent = () => {
  const dispatch      = useDispatch();
  const navigation    = useNavigation();
  const { products, loading } = useSelector((s) => s.products);
  const cartId        = useSelector((s) => s.cart.cartId);
  const wishlistItems = useSelector((s) => s.wishlist.items);

  const [addingToCart, setAddingToCart] = useState({});

  useFocusEffect(
    useCallback(() => {
      dispatch(resetProducts());
      dispatch(fetchProducts());
    }, [dispatch])
  );

  /* ── Derived data ── */
  const recentProducts = useMemo(() => {
    if (!products?.length) return [];
    return [...products]
      .sort((a, b) => {
        const da = new Date(b.dateCreated || b.createdAt || 0);
        const db = new Date(a.dateCreated || a.createdAt || 0);
        return da - db;
      })
      .slice(0, 10);
  }, [products]);

  const wishlistSet = useMemo(
    () => new Set(wishlistItems.map((i) => i.productID)),
    [wishlistItems]
  );

  const dataSource = useMemo(() => {
    if (loading || recentProducts.length === 0) {
      return Array.from({ length: 10 }, (_, idx) => ({
        isLoading: true,
        id: idx,
      }));
    }
    return recentProducts;
  }, [loading, recentProducts]);

  /* ── Handlers ── */
  const handleAddToCart = useCallback(
    (product) => {
      setAddingToCart((prev) => ({ ...prev, [product.productID]: true }));
      dispatch(
        addToCart({
          cartId,
          productId: product.productID,
          price: product.price,
          quantity: 1,
        })
      )
        .then(() =>
          Alert.alert('Added to Cart', `${product.productName} added to cart!`)
        )
        .catch((err) =>
          Alert.alert('Error', err.message || 'Failed to add product')
        )
        .finally(() =>
          setAddingToCart((prev) => {
            const next = { ...prev };
            delete next[product.productID];
            return next;
          })
        );
    },
    [dispatch, cartId]
  );

  const handleToggleWishlist = useCallback(
    (product, isInWishlist) => {
      if (isInWishlist) {
        Alert.alert('Info', `${product.productName} is already in your wishlist.`);
      } else {
        dispatch(addToWishlist(product));
        Alert.alert('Wishlist', `${product.productName} added to wishlist ❤️`);
      }
    },
    [dispatch]
  );

  const handleProductPress = useCallback(
    (product) =>
      navigation.navigate('ProductDetails', {
        productID: product.productID,
        productId:  product.productID,
      }),
    [navigation]
  );

  const handleViewAll = useCallback(
    () => navigation.navigate('Products'),
    [navigation]
  );

  /* ── FlatList helpers ── */
  const keyExtractor = useCallback(
    (item) => (item.isLoading ? `loading-${item.id}` : String(item.productID)),
    []
  );

  const renderItem = useCallback(
    ({ item: product, index }) => {
      if (product.isLoading) {
        return (
          <View style={styles.cardWrapper}>
            <LoadingCard />
          </View>
        );
      }

      const imageUri = `https://testing.frankotrading.com/Media/Products_Images/${product.productImage
        ?.split('\\')
        .pop()}`;
      const discount =
        product.oldPrice > 0
          ? Math.round(
              ((product.oldPrice - product.price) / product.oldPrice) * 100
            )
          : 0;

      return (
        <View style={styles.cardWrapper}>
          <ProductCard
            product={product}
            index={index}
            onPress={() => handleProductPress(product)}
            onAddToCart={handleAddToCart}
            isAddingToCart={!!addingToCart[product.productID]}
            isInWishlist={wishlistSet.has(product.productID)}
            onToggleWishlist={handleToggleWishlist}
            imageUri={imageUri}
            discount={discount}
            isNew={index < 3}
          />
        </View>
      );
    },
    [
      wishlistSet,
      addingToCart,
      handleProductPress,
      handleAddToCart,
      handleToggleWishlist,
    ]
  );

  /* ── List Header ── */
  const ListHeader = useMemo(
    () => (
      <View style={styles.header}>
        {/* Title block */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>New Arrivals</Text>
          <View style={styles.titleUnderline} />
          <Text style={styles.subtitle}>Fresh picks just for you</Text>
        </View>

        {/* View-all button */}
        <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
          <Text style={styles.viewAllText}>Shop All</Text>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>
    ),
    [handleViewAll]
  );

  /* ── Render ── */
  return (
    <View style={styles.container}>
      <FlatList
        data={dataSource}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        // Column wrapper just handles horizontal distribution
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={50}
        initialNumToRender={6}
        windowSize={5}
        scrollEventThrottle={16}
      />
    </View>
  );
};

/* ─── Styles ──────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: CONTAINER_PADDING,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: isSmall ? 20 : isMedium ? 22 : 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
  },
  titleUnderline: {
    width: isSmall ? 56 : 72,
    height: 3,
    backgroundColor: '#FF6347',
    borderRadius: 2,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: isSmall ? 12 : 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6347',
    paddingHorizontal: isSmall ? SPACING.md : SPACING.lg,
    paddingVertical: isSmall ? SPACING.xs + 2 : SPACING.sm,
    borderRadius: 20,
    shadowColor: '#FF6347',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    marginLeft: SPACING.md,
    alignSelf: 'center',
  },
  viewAllText: {
    fontSize: isSmall ? 12 : 13,
    fontWeight: '700',
    color: '#fff',
    marginRight: SPACING.xs,
  },
  arrowContainer: {
    backgroundColor: '#fff',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 11,
    color: '#FF6347',
    fontWeight: 'bold',
    lineHeight: 13,
  },

  /* Column layout */
  columnWrapper: {
    paddingHorizontal: CONTAINER_PADDING,
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },

  /* Wrapper gives each card consistent spacing */
  cardWrapper: {
    flex: 1,
    // Ensures the two cards share the row evenly without needing
    // explicit margins that might overflow on small screens
    maxWidth: CARD_WIDTH,
  },

  productCard: {
    backgroundColor: "#fff",
    padding: 2,
    borderRadius: 12,
    width: 150,
    marginRight: 8,
    marginLeft: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 5,
    marginBottom: 20,
    height: 240
  },

  /* Image area */
  imageContainer: {
    position: 'relative',
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  imageLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    zIndex: 2,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  hiddenImage: {
    opacity: 0,
  },

  /* Badges */
  newBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: '#EF4444',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 3,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: isSmall ? 8 : 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  discountBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: '#F97316',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 3,
  },
  discountText: {
    color: '#fff',
    fontSize: isSmall ? 8 : 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* Wishlist button */
  wishlistButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: '#fff',
    padding: SPACING.sm,
    borderRadius: 20,
    zIndex: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
    }),
  },

  /* Text info */
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
    marginBottom: 8,
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
    backgroundColor: "#f8a5aa",
  },
  addToCartButtonDisabled: {
    backgroundColor: '#93C5CB',
  },

  /* Loading skeleton */
  loadingTitle: {
    height: 13,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: SPACING.xs,
  },
  loadingTitleShort: {
    height: 13,
    width: '65%',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: SPACING.sm,
  },
  loadingPrice: {
    height: 11,
    width: '45%',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  frankoLogo: {
    width: CARD_WIDTH * 0.45,
    height: CARD_WIDTH * 0.45,
    resizeMode: 'contain',
    opacity: 0.08,
    tintColor: '#9CA3AF',
  },
});

export default ComboComponent;