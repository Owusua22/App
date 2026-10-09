import { createWebSafeStyles } from '../theme/webSafeStyles';
import React, { useEffect, useState, memo, useCallback, useMemo } from "react";
import { View, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, FlatList } from 'react-native';
import Text from './AppText';
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { addToCart } from '../redux/slice/cartSlice';
import { addToWishlist } from '../redux/wishlistSlice';
import { Feather, FontAwesome } from "@expo/vector-icons";
import CatalogProductCard, { CATALOG_CARD_HEIGHT } from './CatalogProductCard';
import CachedImage from './CachedImage';
import frankoLogo from '../assets/frankoIcon.png';
import { preloadProductImages, resolveProductImageUri } from '../utils/ImageCache';

const CARD_MARGIN = 18; // 160px card + 10px left + 8px right
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

// Home shelves and related products share the same layout and cart placement
// as the full catalog grids. Keep the existing callback API for callers.
const ProductCard = memo(({ product, onPress, onAddToCart, isAddingToCart, index = 0, cardWidth = CARD_WIDTH }) => (
  <CatalogProductCard product={product} index={index} width={cardWidth} horizontal
    onPress={onPress} onAddToCart={onAddToCart} addingToCart={isAddingToCart} />
));

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
      void preloadProductImages(products.slice(3, 6), {
        maxImages: 3,
        concurrency: 1,
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

const styles = createWebSafeStyles({
  productCard: {
    backgroundColor: '#FFFFFF',
    width: 160,
    marginRight: 8,
    marginLeft: 10,
    marginBottom: 12,
    height: CATALOG_CARD_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBE9DF',
    shadowColor: '#163A29',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTouchable: { flex: 1 },
  imageContainer: { position: 'relative', height: 147, backgroundColor: '#F5FBF7', marginHorizontal: 6, marginTop: 6, borderRadius: 8, overflow: 'hidden' },
  imageLoadingContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5FBF7' },
  productImage: { width: '100%', height: '100%' },
  hiddenImage: { opacity: 0 },
  hotDealBadge: { position: 'absolute', top: 7, left: 7, backgroundColor: '#086942', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, zIndex: 2 },
  hotDealText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  discountBadge: { position: 'absolute', top: 7, right: 7, backgroundColor: '#B21F36', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, zIndex: 2 },
  discountText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  wishlistButton: { position: 'absolute', bottom: 7, right: 7, backgroundColor: '#FFFFFF', width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 10, zIndex: 3 },
  productInfo: { paddingHorizontal: 10, paddingTop: 9, paddingRight: 10 },
  productName: { fontSize: 12, color: '#263A2D', fontWeight: '600', lineHeight: 17, marginBottom: 7, minHeight: 34 },
  priceContainer: { gap: 3, paddingRight: 26 },
  productPrice: { fontSize: 15, color: '#086942', fontWeight: '900' },
  oldPrice: { fontSize: 10, color: '#99A69C', textDecorationLine: 'line-through' },
  addToCartButton: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#84e8b9', width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  addToCartButtonDisabled: { backgroundColor: '#8CB8A1' },

  loadingCard: {
    width: CARD_WIDTH,
    marginRight: CARD_MARGIN,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBE9DF',
    overflow: "hidden",
    height: CATALOG_CARD_HEIGHT,
    marginBottom: 12,
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
    opacity: 0.16,
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
