import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Share,
  Alert,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { Octicons } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;

const RecentlyViewedScreen = () => {
  const navigation = useNavigation();
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      try {
        const storedProducts = await AsyncStorage.getItem("recentProducts");
        if (storedProducts) {
          const parsedProducts = JSON.parse(storedProducts);
          setRecentlyViewed(Array.isArray(parsedProducts) ? parsedProducts : []);
        }
      } catch (error) {
        console.error("Error fetching recently viewed products:", error);
      }
      setLoading(false);
    };

    fetchRecentlyViewed();
  }, []);

  const formatPrice = (price) =>
    price ? price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) : "0.00";

  const calculateDiscount = (oldPrice, price) => {
    return oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  };

  const getValidImageURL = (imagePath) => {
    if (!imagePath) {
      return "https://via.placeholder.com/150";
    }
    return `https://fte002n1.salesmate.app/Media/Products_Images/${imagePath.split("\\").pop()}`;
  };

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
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  const renderItem = ({ item, index }) => {
    const productImageURL = getValidImageURL(item.productImage);
    const discount = calculateDiscount(item.oldPrice, item.price);
    const isNew = index < 3; // Mark first 3 items as "new"

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate("ProductDetails", { productId: item.productID })}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: productImageURL }} style={styles.productImage} />
          
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

          <TouchableOpacity style={styles.wishlistButton}>
            <FontAwesome name="heart-o" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>

          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>₵{formatPrice(item.price)}</Text>
            {item.oldPrice > 0 && (
              <Text style={styles.oldPrice}>₵{formatPrice(item.oldPrice)}</Text>
            )}
          </View>

        
        </View>
      </TouchableOpacity>
    );
  };

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
          data={recentlyViewed}
          keyExtractor={(item, index) => 
            item?.productID ? item.productID.toString() : index.toString()
          }
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          renderItem={renderItem}
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "black",
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
    borderBottomColor: "#e0e0e0",
  },
  resultsText: {
    fontSize: 12,
    color: "#666",
  },
  listContainer: {
    padding: 8,
  },
  row: {
    justifyContent: "space-between",
  
  },
   productCard: {
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 12,
    width: 165,
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
    position: "relative",
    height: 240,
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
    backgroundColor: "#ff4757",
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
    backgroundColor: "#ff6b35",
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
  },
  priceContainer: {
    flexDirection: "column",
    gap: 2,
    marginBottom: 6,
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
    backgroundColor: "#f8f9fa",
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
    backgroundColor: "#16A34A",
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