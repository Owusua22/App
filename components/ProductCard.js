import React, { useEffect, useState, memo, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { addToCart } from '../redux/slice/cartSlice';
import { addToWishlist } from '../redux/wishlistSlice';
import { AntDesign, FontAwesome } from "@expo/vector-icons";
import CachedImage from './CachedImage';
import frankoLogo from '../assets/frankoIcon.png';
import { preloadProductImages, resolveProductImageUri } from '../utils/ImageCache';

const CARD_MARGIN = 8;
const CARD_WIDTH = 160;

const formatCurrency = (amount) => {
  const value = Number(amount) || 0;
  return `GH₵ ${value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
};

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

LoadingCard.displayName = "LoadingCard";

const ProductCard = memo(
  ({
    product,
    onPress,
    onAddToCart,
    isAddingToCart,
    index = 0,
    showHotDeal = true,
    cardWidth = CARD_WIDTH,
    cardHeight = 252,
  }) => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const cartId = useSelector((state) => state.cart?.cartId);
    const isInWishlist = useSelector((state) =>
      (state.wishlist?.items || []).some(
        (item) => item.productID === product.productID
      )
    );

    const cardData = useMemo(() => {
      const oldPrice = Number(product.oldPrice) || 0;
      const currentPrice = Number(product.price) || 0;
      const discount =
        oldPrice > currentPrice && oldPrice > 0
          ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100)
          : 0;
      return {
        discount,
        isHotDeal: showHotDeal && index < 3,
        imageUri: resolveProductImageUri(product.productImage),
        formattedPrice: formatCurrency(currentPrice),
        formattedOldPrice:
          oldPrice > currentPrice ? formatCurrency(oldPrice) : null,
      };
    }, [product, showHotDeal, index]);

    const imageSource = useMemo(
      () => (cardData.imageUri ? { uri: cardData.imageUri } : null),
      [cardData.imageUri]
    );

    const [imageStatus, setImageStatus] = useState(
      cardData.imageUri ? "loading" : "error"
    );

    useEffect(() => {
      setImageStatus(cardData.imageUri ? "loading" : "error");
    }, [cardData.imageUri]);

    const handleImageLoad = useCallback(() => setImageStatus("loaded"), []);
    const handleImageError = useCallback(() => setImageStatus("error"), []);

    const handleWishlistPress = useCallback(() => {
      if (isInWishlist) {
        Alert.alert("Info", `${product.productName} is already in your wishlist.`);
      } else {
        dispatch(addToWishlist(product));
        Alert.alert("Success", `${product.productName} added to your wishlist! ❤️`);
      }
    }, [isInWishlist, product, dispatch]);

    const handleProductPress = useCallback(() => {
      if (onPress) {
        onPress(product.productID);
      } else {
        navigation.navigate("ProductDetails", { productId: product.productID });
      }
    }, [onPress, product.productID, navigation]);

    const handleAddToCartPress = useCallback(
      (event) => {
        event?.stopPropagation?.();
        if (onAddToCart) {
          onAddToCart(product);
          return;
        }
        dispatch(
          addToCart({
            cartId,
            productId: product.productID,
            price: product.price,
            quantity: 1,
          })
        )
          .unwrap()
          .then(() =>
            Alert.alert("Success", `${product.productName} added to cart!`)
          )
          .catch((error) =>
            Alert.alert("Error", `Failed: ${error?.message || "Please retry."}`)
          );
      },
      [onAddToCart, product, cartId, dispatch]
    );

    return (
      <View style={[styles.productCard, { width: cardWidth, height: cardHeight }]}>
        <TouchableOpacity
          onPress={handleProductPress}
          activeOpacity={0.9}
          style={styles.cardTouchable}
        >
          <View style={styles.imageContainer}>
            {cardData.imageUri ? (
              <CachedImage
                source={imageSource}
                style={[styles.productImage, imageStatus !== "loaded" && styles.hiddenImage]}
                onLoad={handleImageLoad}
                onError={handleImageError}
                resizeMode="contain"
                priority={index < 3 ? "high" : "normal"}
                transition={120}
                recyclingKey={cardData.imageUri}
              />
            ) : null}

            {imageStatus !== "loaded" && (
              <View pointerEvents="none" style={styles.imageLoadingContainer}>
                {imageStatus === "loading" ? (
                  <ActivityIndicator size="large" color="#086942" />
                ) : (
                  <Image source={frankoLogo} style={styles.frankoLogo} />
                )}
              </View>
            )}

            {cardData.isHotDeal && (
              <View style={styles.hotDealBadge}>
                <Text style={styles.hotDealText}>NEW</Text>
              </View>
            )}

            {cardData.discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{cardData.discount}%</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.wishlistButton}
              onPress={handleWishlistPress}
              accessibilityRole="button"
              accessibilityLabel={isInWishlist ? "Already in wishlist" : `Save ${product.productName} to wishlist`}
            >
              <FontAwesome
                name={isInWishlist ? "heart" : "heart-o"}
                size={18}
                color={isInWishlist ? "#B21F36" : "#41604D"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.productName}
            </Text>
            <View style={styles.priceContainer}>
              <Text style={styles.productPrice}>{cardData.formattedPrice}</Text>
              {cardData.formattedOldPrice && (
                <Text style={styles.oldPrice}>{cardData.formattedOldPrice}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.addToCartButton,
              isAddingToCart && styles.addToCartButtonDisabled,
            ]}
            onPress={handleAddToCartPress}
            disabled={isAddingToCart}
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.productName} to cart`}
          >
            {isAddingToCart ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <AntDesign name="plus" size={19} color="white" />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  }
);

ProductCard.displayName = "ProductCard";

const OptimizedProductList = memo(
  ({
    products = [],
    loading,
    onProductPress,
    onAddToCart,
    addingToCart = {},
    showLoadingCards = 6,
    showHotDeal = true,
  }) => {
    useEffect(() => {
      if (!products.length) return;
      void preloadProductImages(products.slice(0, 8), {
        maxImages: 8,
        concurrency: 3,
      });
    }, [products]);

    const renderItem = useCallback(
      ({ item, index }) => (
        <ProductCard
          product={item}
          index={index}
          onPress={onProductPress}
          onAddToCart={onAddToCart}
          isAddingToCart={Boolean(addingToCart[item.productID])}
          showHotDeal={showHotDeal}
        />
      ),
      [onProductPress, onAddToCart, addingToCart, showHotDeal]
    );

    const keyExtractor = useCallback(
      (item) => String(item.productID),
      []
    );

    const getItemLayout = useCallback(
      (_, index) => ({
        length: CARD_WIDTH + CARD_MARGIN,
        offset: (CARD_WIDTH + CARD_MARGIN) * index,
        index,
      }),
      []
    );

    if ((loading && products.length === 0) || products.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          {Array.from({ length: showLoadingCards }, (_, index) => (
            <LoadingCard key={`loading-${index}`} />
          ))}
        </View>
      );
    }

    return (
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productList}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_MARGIN}
        snapToAlignment="start"
        removeClippedSubviews
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={100}
      />
    );
  }
);

OptimizedProductList.displayName = "OptimizedProductList";

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: 160,
    marginRight: 8,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#EDF0E9',
    overflow: 'hidden',
    marginBottom: 16,
    height: 252,
  },
  cardTouchable: { flex: 1 },
  imageContainer: { position: 'relative', height: 135, backgroundColor: '#F5F8F3', margin: 7, borderRadius: 13, overflow: 'hidden' },
  imageLoadingContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F8F3' },
  productImage: { width: '100%', height: '100%' },
  hiddenImage: { opacity: 0 },
  hotDealBadge: { position: 'absolute', top: 7, left: 7, backgroundColor: '#0A6944', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, zIndex: 2 },
  hotDealText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  discountBadge: { position: 'absolute', top: 7, right: 7, backgroundColor: '#B21F36', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, zIndex: 2 },
  discountText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  wishlistButton: { position: 'absolute', bottom: 7, right: 7, backgroundColor: '#FFFFFF', width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 10, zIndex: 3 },
  productInfo: { paddingHorizontal: 11, paddingTop: 5, paddingRight: 13 },
  productName: { fontSize: 12, color: '#263A2D', fontWeight: '600', lineHeight: 17, marginBottom: 7, minHeight: 34 },
  priceContainer: { gap: 3, paddingRight: 26 },
  productPrice: { fontSize: 14, color: '#08613E', fontWeight: '800' },
  oldPrice: { fontSize: 10, color: '#99A69C', textDecorationLine: 'line-through' },
  addToCartButton: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#08613E', width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  addToCartButtonDisabled: { backgroundColor: '#8CB8A1' },

  loadingCard: {
    width: CARD_WIDTH,
    marginRight: CARD_MARGIN,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    height: 252,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EDF0E9",
    marginLeft: 10,
  },

  loadingImage: {
    height: 140,
    backgroundColor: "#EAF1E9",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },

  loadingContent: {
    padding: 12,
  },

  loadingTitle: {
    height: 16,
    backgroundColor: "#EAF1E9",
    borderRadius: 4,
    marginBottom: 8,
    position: "relative",
    overflow: "hidden",
  },

  loadingPrice: {
    height: 12,
    width: "60%",
    backgroundColor: "#EAF1E9",
    borderRadius: 4,
    position: "relative",
    overflow: "hidden",
  },

  frankoLogo: {
    width: 60,
    height: 60,
    resizeMode: "contain",
    opacity: 0.25,
  },

  productList: {
    paddingRight: 10,
    paddingVertical: 20,
  },

  loadingContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
});

export { ProductCard, LoadingCard, OptimizedProductList };
export default ProductCard;
