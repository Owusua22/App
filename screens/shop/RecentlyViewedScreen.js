import { createWebSafeStyles } from '../../theme/webSafeStyles';
import React, { useCallback, useState } from "react";
import { View, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions, Share, Alert, Platform } from 'react-native';
import Text from '../../components/AppText';
import CatalogProductCard, { getCatalogLayout } from '../../components/CatalogProductCard';
import CachedImage from '../../components/CachedImage';
import { useCatalogScroll } from '../../hooks/useCatalogScroll';
import { resolveProductImageUri } from '../../utils/ImageCache';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { Octicons } from "@expo/vector-icons";


const RecentlyViewedScreen = () => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { columns, cardWidth } = getCatalogLayout(width);
  const { listRef, onScroll, onContentSizeChange, rememberPosition } = useCatalogScroll('recently-viewed');
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    const fetchRecentlyViewed = async () => {
      try {
        const storedProducts = await AsyncStorage.getItem("recentProducts");
        if (!active) return;
        const parsedProducts = storedProducts ? JSON.parse(storedProducts) : [];
        setRecentlyViewed(Array.isArray(parsedProducts) ? parsedProducts : []);
      } catch (error) {
        console.error("Error fetching recently viewed products:", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchRecentlyViewed();
    return () => { active = false; };
  }, []));

  const formatPrice = (price) =>
    price ? price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) : "0.00";

  const calculateDiscount = (oldPrice, price) => {
    return oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  };

  const getValidImageURL = resolveProductImageUri;

  // Share functionality
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: 'Check out my recently viewed products!',
        title: 'Recently Viewed Products',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  // Clear recently viewed products
  const clearRecentlyViewed = async () => {
    Alert.alert(
      "Clear Recently Viewed",
      "Are you sure you want to clear all recently viewed products?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Clear",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("recentProducts");
              setRecentlyViewed([]);
            } catch (error) {
              console.error("Error clearing recently viewed:", error);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#086942" />
      </View>
    );
  }

  const renderItem = ({ item, index }) => (
    <CatalogProductCard product={item} index={index} width={cardWidth}
      onPress={(id) => { rememberPosition(); navigation.navigate('ProductDetails', { productId: id }); }} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <AntDesign name="clockcircleo" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Recently Viewed Items</Text>
      <Text style={styles.emptySubtitle}>
        Products you view will appear here for easy access
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.browseButtonText}>Start Browsing</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recently Viewed</Text>
        <View style={styles.headerActions}>
          {recentlyViewed.length > 0 && (
            <>
              <TouchableOpacity style={styles.headerActionButton} onPress={handleShare}>
                <Octicons name="share" size={20} color="black" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionButton} onPress={clearRecentlyViewed}>
                <AntDesign name="delete" size={20} color="black" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Results Count */}
      {recentlyViewed.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {recentlyViewed.length} product{recentlyViewed.length !== 1 ? 's' : ''} recently viewed
          </Text>
        </View>
      )}

      {/* Product Grid or Empty State */}
      {recentlyViewed.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          ref={listRef}
          onScroll={onScroll}
          onContentSizeChange={onContentSizeChange}
          scrollEventThrottle={100}
          style={styles.listFrame}
          data={recentlyViewed}
          keyExtractor={(item, index) => 
            item?.productID ? item.productID.toString() : index.toString()
          }
          numColumns={columns}
          key={`columns-${columns}`}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          renderItem={renderItem}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
        />
      )}
    </View>
  );
};

const styles = createWebSafeStyles({
  container: {
    flex: 1,
 
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",

  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 2,
    paddingTop: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#163A29",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerActionButton: {
    padding: 4,
  },
  resultsContainer: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
  },
  resultsText: {
    fontSize: 12,
    color: "#666",
  },
  listFrame: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  listContainer: {
    paddingHorizontal: 12,
  },
  row: {
    justifyContent: "space-between",
  
  },
   productCard: {
    borderWidth: 1,
    borderColor: '#DCE8DF',
    backgroundColor: "#FFFFFF",
    padding: 6,
    borderRadius: 12,
    width: 165,
    marginRight: 8,
    marginLeft: 10,
    // overflow hidden only on Android
    ...(Platform.OS === "android" && { overflow: "hidden" }),
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 14,
  
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
    borderRadius: 8,
    overflow: "hidden",
    height: 158,
  
    backgroundColor: '#F2F9F4',
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#B21F36",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  newBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#B21F36",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 2,
  },
  discountText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  wishlistButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "white",
    padding: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    padding: 12,
    paddingBottom: 8,
    flex: 1,
  },
  productName: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: 6,
    minHeight: 36,
  
    color: '#193C2A',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: "column",
    gap: 2,
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 14,
    color: '#086942',
    fontWeight: '900',
  
    color: '#086942',
    fontWeight: '900',
  },
  oldPrice: {
    fontSize: 10,
    color: "#738579",
    textDecorationLine: "line-through",
  },
  brandContainer: {
    alignSelf: "flex-start",
    marginTop: "auto",
  },
  brandText: {
    fontSize: 11,
    color: "#74b9ff",
    fontWeight: "500",
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#F7FAF8",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  browseButton: {
    backgroundColor: "#086942",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  browseButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RecentlyViewedScreen;