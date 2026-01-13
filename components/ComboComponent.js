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
  Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, resetProducts } from '../redux/slice/productSlice';
import { addToCart } from '../redux/slice/cartSlice';
import { addToWishlist } from "../redux/wishlistSlice";
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import frankoLogo from "../assets/frankoIcon.png";

const { width: screenWidth } = Dimensions.get('window');

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
const CARD_WIDTH = (screenWidth - (CONTAINER_PADDING * 2) - (CARD_MARGIN * 3)) / 2;

const formatPrice = (price) => {
  if (!price) return '0.00';
  return price.toFixed(2);
};

// Memoized Loading Card
const LoadingCard = memo(() => (
  <View style={styles.loadingCard}>
    <View style={styles.loadingImage}>
      <Image source={frankoLogo} style={styles.frankoLogo} />
    </View>
    <View style={styles.loadingContent}>
      <View style={styles.loadingTitle} />
      <View style={styles.loadingPrice} />
    </View>
  </View>
));

// Optimized Product Card with proper memoization
const ProductCard = memo(({ 
  product, 
  index, 
  onPress, 
  onAddToCart, 
  isAddingToCart, 
  isInWishlist, 
  onToggleWishlist,
  imageUri,
  discount,
  isNew
}) => {
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = useCallback(() => setImageLoading(false), []);
  const handleImageError = useCallback(() => setImageLoading(false), []);

  const handleCartPress = useCallback((e) => {
    e.stopPropagation();
    onAddToCart(product);
  }, [onAddToCart, product]);

  const handleWishlistPress = useCallback((e) => {
    e.stopPropagation();
    onToggleWishlist(product, isInWishlist);
  }, [onToggleWishlist, product, isInWishlist]);

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {imageLoading && (
          <View style={styles.imageLoadingContainer}>
            <ActivityIndicator size="large" color="#FF6347" />
          </View>
        )}
        
        <Image
          source={{ uri: imageUri }}
          style={[styles.productImage, imageLoading && styles.hiddenImage]}
          onLoad={handleImageLoad}
          onError={handleImageError}
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
          onPress={handleWishlistPress}
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
          {product.productName}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>
            ₵{formatPrice(product.price)}
          </Text>
          {product.oldPrice > 0 && (
            <Text style={styles.oldPrice}>
              ₵{formatPrice(product.oldPrice)}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.addToCartButton,
          isAddingToCart && styles.addToCartButtonDisabled,
        ]}
        onPress={handleCartPress}
        disabled={isAddingToCart}
      >
        {isAddingToCart ? (
          <ActivityIndicator size={14} color="white" />
        ) : (
          <AntDesign name="shopping-cart" size={14} color="white" />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.product.productID === nextProps.product.productID &&
    prevProps.isAddingToCart === nextProps.isAddingToCart &&
    prevProps.isInWishlist === nextProps.isInWishlist &&
    prevProps.imageUri === nextProps.imageUri
  );
});

const ComboComponent = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { products, loading } = useSelector((state) => state.products);
  const cartId = useSelector((state) => state.cart.cartId);
  const wishlistItems = useSelector((state) => state.wishlist.items);

  const [addingToCart, setAddingToCart] = useState({});

  useFocusEffect(
    useCallback(() => {
      dispatch(resetProducts());
      dispatch(fetchProducts());
    }, [dispatch])
  );

  // Memoize processed products
  const recentProducts = useMemo(() => {
    if (!products?.length) return [];
    
    return products
      .slice()
      .sort((a, b) => {
        const dateA = new Date(b.dateCreated || b.createdAt || 0);
        const dateB = new Date(a.dateCreated || a.createdAt || 0);
        return dateA - dateB;
      })
      .slice(0, 10);
  }, [products]);

  // Memoize wishlist lookup
  const wishlistSet = useMemo(() => {
    return new Set(wishlistItems.map(item => item.productID));
  }, [wishlistItems]);

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
        Alert.alert("Success", `${product.productName} added to cart!`);
      })
      .catch((err) => {
        Alert.alert("Error", err.message || "Failed to add product");
      })
      .finally(() => {
        setAddingToCart((prev) => {
          const next = { ...prev };
          delete next[product.productID];
          return next;
        });
      });
  }, [dispatch, cartId]);

  const handleToggleWishlist = useCallback((product, isInWishlist) => {
    if (isInWishlist) {
      Alert.alert("Info", `${product.productName} is already in wishlist.`);
    } else {
      dispatch(addToWishlist(product));
      Alert.alert("Added", `${product.productName} added to wishlist ❤️`);
    }
  }, [dispatch]);

  const handleProductPress = useCallback((product) => {
    navigation.navigate('ProductDetails', { 
      productID: product.productID,
      productId: product.productID
    });
  }, [navigation]);

  const handleViewAll = useCallback(() => {
    navigation.navigate('Products');
  }, [navigation]);

  // FlatList renderItem with pre-computed props
  const renderItem = useCallback(({ item: product, index }) => {
    if (product.isLoading) {
      return <LoadingCard />;
    }

    const imageUri = `https://fte002n1.salesmate.app/Media/Products_Images/${product.productImage?.split("\\").pop()}`;
    const discount = product.oldPrice > 0 
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;
    const isNew = index < 3;
    const isInWishlist = wishlistSet.has(product.productID);

    return (
      <ProductCard
        product={product}
        index={index}
        onPress={() => handleProductPress(product)}
        onAddToCart={handleAddToCart}
        isAddingToCart={addingToCart[product.productID]}
        isInWishlist={isInWishlist}
        onToggleWishlist={handleToggleWishlist}
        imageUri={imageUri}
        discount={discount}
        isNew={isNew}
      />
    );
  }, [wishlistSet, addingToCart, handleProductPress, handleAddToCart, handleToggleWishlist]);

  // Key extractor
  const keyExtractor = useCallback((item) => {
    return item.isLoading ? `loading-${item.id}` : item.productID.toString();
  }, []);

  // Get item layout for performance
  const getItemLayout = useCallback((data, index) => ({
    length: 160 + SPACING.md + 60, // approximate card height
    offset: (160 + SPACING.md + 60) * Math.floor(index / 2),
    index,
  }), []);

  // Data source
  const dataSource = useMemo(() => {
    if (loading || recentProducts.length === 0) {
      return Array(10).fill(null).map((_, idx) => ({ isLoading: true, id: idx }));
    }
    return recentProducts;
  }, [loading, recentProducts]);

  // Header component
  const ListHeaderComponent = useMemo(() => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>New Arrivals</Text>
        <View style={styles.titleUnderline} />
        <Text style={styles.subtitle}>Fresh picks just for you</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.viewAllButton} 
        onPress={handleViewAll}
      >
        <Text style={styles.viewAllText}>Shop All</Text>
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>→</Text>
        </View>
      </TouchableOpacity>
    </View>
  ), [handleViewAll]);

  return (
    <View style={styles.container}>
      <FlatList
        data={dataSource}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        ListHeaderComponent={ListHeaderComponent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={50}
        initialNumToRender={6}
        windowSize={5}
        scrollEventThrottle={16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.xxl,
    paddingHorizontal: CONTAINER_PADDING + SPACING.xs,
    marginTop: SPACING.lg,
  },
  titleContainer: {
    alignItems: 'flex-start',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  titleUnderline: {
    width: 80,
    height: 4,
    backgroundColor: '#FF6347',
    borderRadius: 2,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6347',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginRight: SPACING.sm,
  },
  arrowContainer: {
    backgroundColor: '#fff',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 12,
    color: '#FF6347',
    fontWeight: 'bold',
  },
  
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: CONTAINER_PADDING,
  },
   productCard: {
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 12,
    width: CARD_WIDTH,
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
    position: 'relative',
    height: 160,
    backgroundColor: '#f8f9fa',
  },
  
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
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
  
  newBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: '#ff4757',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    zIndex: 2,
  },
  
  newBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  discountBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: '#ff6b35',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    zIndex: 2,
  },
  
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  wishlistButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'white',
    padding: SPACING.sm,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  
  productInfo: {
    padding: SPACING.md,
  },
  
  productName: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: SPACING.sm,
    minHeight: 36,
  },
  
  priceContainer: {
    flexDirection: 'column',
    gap: 2,
    marginBottom: SPACING.sm,
  },
  
  productPrice: {
    fontSize: 14,
    color: '#2d3436',
    fontWeight: 'bold',
  },
  
  oldPrice: {
    fontSize: 10,
    color: '#636e72',
    textDecorationLine: 'line-through',
  },
  
  addToCartButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: '#E63946',
    padding: SPACING.sm,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  
  addToCartButtonDisabled: {
    backgroundColor: '#7dd3c0',
  },
  
  loadingCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: SPACING.md,
  },
  
  loadingImage: {
    height: 160,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  
  loadingContent: {
    padding: SPACING.md,
  },
  
  loadingTitle: {
    height: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: SPACING.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  
  loadingPrice: {
    height: 12,
    width: '60%',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  
  frankoLogo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    opacity: 0.1,
    tintColor: '#bbb',
  },
});

export default ComboComponent;