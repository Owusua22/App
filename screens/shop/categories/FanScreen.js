import { createWebSafeStyles } from '../../../theme/webSafeStyles';
import React, { useEffect, useMemo } from "react";
import { View, FlatList, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, useWindowDimensions, Platform } from 'react-native';
import Text from '../../../components/AppText';
import { useProgressiveCatalog } from '../../../hooks/useProgressiveCatalog';
import CatalogProductCard, { getCatalogLayout } from '../../../components/CatalogProductCard';
import CachedImage from '../../../components/CachedImage';
import { useCatalogScroll } from '../../../hooks/useCatalogScroll';
import { resolveProductImageUri } from '../../../utils/ImageCache';
import { useDispatch, useSelector } from "react-redux";
import { fetchProductsByCategory } from '../../../redux/slice/productSlice';
import { useCatalogRevalidation } from '../../../hooks/useCatalogRevalidation';
import CatalogFetchNotice from '../../../components/CatalogFetchNotice';
import { useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;

const FanScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const { columns, cardWidth } = getCatalogLayout(viewportWidth);
  const { listRef, onScroll, onContentSizeChange, rememberPosition } = useCatalogScroll('category:fan');

  const { productsByCategory = {}, loading: productsLoading } = useSelector(
    (state) => state.products
  );
const hardcodedCategoryId = "bbfdf52f-37a0-4b9d-9798-7c65cfad54e3"

  // Show cached items immediately; check the backend on focus/return.
  const fetching = useCatalogRevalidation(`category:${hardcodedCategoryId}`, () => fetchProductsByCategory(hardcodedCategoryId));

const filteredProducts = useMemo(() => {
  return (productsByCategory[hardcodedCategoryId] || [])
    .slice()
    .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
}, [productsByCategory, hardcodedCategoryId]);

  const formatPrice = (amount) =>
    amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const { visibleProducts, showMore, hasMore } = useProgressiveCatalog(filteredProducts, `category:${hardcodedCategoryId}`);

  if (productsLoading && !filteredProducts.length) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#086942" />
      </View>
    );
  }

  const renderItem = ({ item, index }) => (
    <CatalogProductCard product={item} index={index} width={cardWidth} onPress={(id) => { rememberPosition(); navigation.navigate("ProductDetails", { productId: id }); }} />
  );

  return (
    <View style={styles.container}>
      <CatalogFetchNotice loading={fetching} hasCachedData={Boolean(productsByCategory[hardcodedCategoryId]?.length)} label="products" />
      <FlatList
        ref={listRef}
        style={styles.catalogGrid}
        data={visibleProducts}
        onEndReached={hasMore ? showMore : undefined}
        onEndReachedThreshold={0.35}
        keyExtractor={(item) => String(item.productID)}
        key={`columns-${columns}`}
        numColumns={columns}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        scrollEventThrottle={100}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <TouchableOpacity
             onPress={() => navigation.goBack()}
              style={{ marginRight: 16 }}

            >
              <AntDesign name="arrowleft" size={24} color="#086942" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Fans</Text>
          </View>
        )}
        renderItem={renderItem}
      />
    </View>
  );
};

// ✅ Fixed: Missing closing `}` before `const styles`
const styles = createWebSafeStyles({
  catalogGrid: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#F7FAF8",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#DCE8DF",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#163A29",
  },
  row: {
    justifyContent: "space-between",
  },
  productCard: {
    borderWidth: 1,
    borderColor: '#DCE8DF',
    flex: 1,
    margin: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowColor: "#163A29",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
    transform: [{ scale: 1 }],
    maxWidth: "48%"
  ,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5E6DB',
    borderRadius: 12,
    shadowColor: '#173D29',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    backgroundColor: '#F4FAF6',
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 6,
  
    backgroundColor: '#F2F9F4',
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: "100%",
    height: 120,
    resizeMode: "contain",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#B21F36",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 12,
  },
  discountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  productName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  
    color: '#193C2A',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    color: "#086942",
    fontWeight: '900',
  
    color: '#086942',
    fontWeight: '900',
  },
  oldPrice: {
    fontSize: 10,
    color: "#aaa",
    textDecorationLine: "line-through",
  },

  showroomButton: {
    alignSelf: "flex-start",
    backgroundColor: "#086942",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  showroomButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  frankoLogo: {
    position: "absolute",
    bottom: 1,
    right: 2,
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
});

export default FanScreen;
