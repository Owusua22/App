import React from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Share,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";
import {
  removeFromWishlist,
  clearWishlist,
} from "../redux/wishlistSlice";
import { Octicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;

const WishlistScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const wishlist = useSelector((state) => state.wishlist.items);

  const formatPrice = (price) =>
    price
      ? price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00";

  const calculateDiscount = (oldPrice, price) => {
    return oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : 0;
  };

    const getValidImageURL = (imagePath) => {
    if (!imagePath) {
      return "https://via.placeholder.com/150";
    }
    return `https://smfteapi.salesmate.app/Media/Products_Images/${imagePath.split("\\").pop()}`;
  };


  // Share functionality
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: 'Check out my wishlist products!',
        title: 'My Wishlist',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  const handleRemove = (productID) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this product from your wishlist?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", onPress: () => dispatch(removeFromWishlist(productID)) },
      ]
    );
  };

  const handleClearWishlist = () => {
    Alert.alert(
      "Clear Wishlist", 
      "Are you sure you want to remove all items from your wishlist?", 
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Clear", 
          onPress: () => dispatch(clearWishlist())
        }
      ]
    );
  };

  if (!wishlist) {
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
        onPress={() =>
          navigation.navigate("ProductDetails", {
            productId: item.productID,
          })
        }
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

          <TouchableOpacity 
            style={styles.removeIconButton}
            onPress={() => handleRemove(item.productID)}
          >
            <AntDesign name="heart" size={16} color="#ff4757" />
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
       <FontAwesome name="heart-o"  size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Wishlist Items</Text>
      <Text style={styles.emptySubtitle}>
        Save products you love and they'll appear here for easy access
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
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <View style={styles.headerActions}>
          {wishlist.length > 0 && (
            <>
              <TouchableOpacity style={styles.headerActionButton} onPress={handleShare}>
                <Octicons name="share" size={20} color="black" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={handleClearWishlist}
              >
                <AntDesign name="delete" size={20} color="black" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Results Count */}
      {wishlist.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {wishlist.length} product{wishlist.length !== 1 ? "s" : ""} in wishlist
          </Text>
        </View>
      )}

      {/* Product Grid or Empty State */}
      {wishlist.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={wishlist}
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
    paddingHorizontal: 4,
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
    height: 140,
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
  removeIconButton: {
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

export default WishlistScreen;