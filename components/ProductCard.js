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
import { addToCart } from "../redux/slice/cartSlice";
import { addToWishlist } from "../redux/wishlistSlice";
import { AntDesign, FontAwesome } from "@expo/vector-icons";
import CachedImage from "./CachedImage";
import frankoLogo from "../assets/frankoIcon.png";
import { preloadProductImages, resolveProductImageUri } from "../utils/ImageCache";

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
    cardHeight = 240,
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
          oldPrice > 0 ? formatCurrency(oldPrice) : null,
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
                  <ActivityIndicator size="large" color="#E63946" />
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
                <Text style={styles.discountText}>SALE</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.wishlistButton}
              onPress={handleWishlistPress}
            >
              <FontAwesome
                name={isInWishlist ? "heart" : "heart-o"}
                size={18}
                color={isInWishlist ? "red" : "#666"}
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
          >
            {isAddingToCart ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <AntDesign name="shopping-cart" size={14} color="white" />
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
    backgroundColor: "#fff",
    padding: 4,
    borderRadius: 12,
    width: 160,
    marginRight: 8,
    marginLeft: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 5,
    marginBottom: 20,
    height: 240,
  },

  cardTouchable: {
    flex: 1,
  },

  imageContainer: {
    position: "relative",
    height: 140,
  },

  imageLoadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    zIndex: 2,
  },

  productImage: {
    width: "100%",
    height: "100%",
  },

  hiddenImage: {
    opacity: 0,
  },

  hotDealBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#ff4757",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },

  hotDealText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#E63946",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 2,
  },

  discountText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  wishlistButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "white",
    padding: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
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

  loadingCard: {
    width: CARD_WIDTH,
    marginRight: CARD_MARGIN,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    height: 240,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginLeft: 10,
  },

  loadingImage: {
    height: 140,
    backgroundColor: "#f0f0f0",
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
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginBottom: 8,
    position: "relative",
    overflow: "hidden",
  },

  loadingPrice: {
    height: 12,
    width: "60%",
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    position: "relative",
    overflow: "hidden",
  },

  frankoLogo: {
    width: 60,
    height: 60,
    resizeMode: "contain",
    opacity: 0.1,
    tintColor: "#bbb",
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
