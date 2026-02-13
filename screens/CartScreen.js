import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
  RefreshControl,
  SafeAreaView,
} from "react-native";

import { useDispatch, useSelector } from "react-redux";
import {
  getCartById,
  updateCartItem,
  deleteCartItem,
} from "../redux/slice/cartSlice";
import { removeFromWishlist, addToWishlist } from "../redux/wishlistSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import SignupScreen from "./SignupScreen";

/* ---------- helpers ---------- */

const backendBaseURL = "https://ct002.frankotrading.com:444";

const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return (
    "GH₵ " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  );
};

const CartScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const { cartItems, loading, error } = useSelector((state) => state.cart);
  const wishlistItems = useSelector((state) => state.wishlist.items);

  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState({});
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [cartId, setCartId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  /* ---------- fetch cart ---------- */

  const fetchCartFromDB = useCallback(
    async (showLoader = true) => {
      try {
        const storedCartId = await AsyncStorage.getItem("cartId");
        if (storedCartId) {
          setCartId(storedCartId);

          if (showLoader) setIsInitialLoad(true);

          const result = await dispatch(
            getCartById(storedCartId)
          ).unwrap();

          if (result && Array.isArray(result)) {
            await AsyncStorage.setItem("cart", JSON.stringify(result));
          }

          if (showLoader) setIsInitialLoad(false);
        } else {
          setIsInitialLoad(false);
        }
      } catch (err) {
        console.error("Failed to fetch cart:", err);
        setIsInitialLoad(false);

        // fallback: local cart (if any)
        try {
          const localCart = await AsyncStorage.getItem("cart");
          if (localCart) {
            console.log("Loaded cart from local storage as fallback");
          }
        } catch (localError) {
          console.error("Failed to load local cart:", localError);
        }
      }
    },
    [dispatch]
  );

  useEffect(() => {
    fetchCartFromDB(true);
  }, [fetchCartFromDB]);

  useFocusEffect(
    useCallback(() => {
      if (!isInitialLoad && cartId) {
        fetchCartFromDB(false);
      }
    }, [cartId, isInitialLoad, fetchCartFromDB])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCartFromDB(false);
    setRefreshing(false);
  }, [fetchCartFromDB]);

  /* ---------- navigation ---------- */

  const handleGoBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Home");
  };

  /* ---------- quantity & delete ---------- */

  const handleQuantityChange = async (
    itemCartId,
    productId,
    newQuantity
  ) => {
    if (newQuantity < 1) {
      await handleDeleteItem(itemCartId, productId);
      return;
    }

    setUpdating((prev) => ({ ...prev, [productId]: true }));

    try {
      await dispatch(
        updateCartItem({
          cartId: itemCartId,
          productId,
          quantity: newQuantity,
        })
      ).unwrap();

      const result = await dispatch(
        getCartById(itemCartId)
      ).unwrap();

      if (result && Array.isArray(result)) {
        await AsyncStorage.setItem("cart", JSON.stringify(result));
      }
    } catch (err) {
      console.error("Failed to update quantity:", err);
      Alert.alert(
        "Error",
        "Failed to update item quantity. Please try again."
      );
      await fetchCartFromDB(false);
    } finally {
      setUpdating((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleDeleteItem = async (itemCartId, productId) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await dispatch(
                deleteCartItem({ cartId: itemCartId, productId })
              ).unwrap();

              const result = await dispatch(
                getCartById(itemCartId)
              ).unwrap();

              if (result && Array.isArray(result)) {
                await AsyncStorage.setItem(
                  "cart",
                  JSON.stringify(result)
                );
              } else {
                await AsyncStorage.setItem("cart", JSON.stringify([]));
              }
            } catch (err) {
              console.error("Failed to delete item:", err);
              Alert.alert(
                "Error",
                "Failed to remove item. Please try again."
              );
              await fetchCartFromDB(false);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  /* ---------- wishlist ---------- */

  const isItemInWishlist = (productId) =>
    wishlistItems.some((item) => item.productID === productId);

  const handleToggleWishlist = (item) => {
    const inWishlist = isItemInWishlist(item.productId);

    const productForWishlist = {
      productID: item.productId,
      productName: item.productName,
      price: item.price,
      productImage: item.imagePath,
      brandName: item.brandName || "",
      categoryName: item.categoryName || "",
      sellerName: item.sellerName || "",
    };

    if (inWishlist) {
      dispatch(removeFromWishlist(item.productId));
      Alert.alert("Removed", `${item.productName} removed from wishlist.`);
    } else {
      dispatch(addToWishlist(productForWishlist));
      Alert.alert("Added", `${item.productName} added to wishlist ❤️`);
    }
  };

  /* ---------- totals ---------- */

  const calculateSubtotal = () => {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    return cartItems.reduce((total, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return total + price * qty;
    }, 0);
  };

  const getTotalItems = () => {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    return cartItems.reduce(
      (total, item) => total + (Number(item.quantity) || 0),
      0
    );
  };

  /* ---------- checkout & signup ---------- */

  const handleCheckout = async () => {
    try {
      const userDetails = await AsyncStorage.getItem("customer");
      if (!userDetails) {
        setShowSignupModal(true);
        return;
      }

      await fetchCartFromDB(false);

      const cartData = {
        cartItems,
        subtotal: calculateSubtotal(),
        timestamp: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        "cartDetails",
        JSON.stringify(cartData)
      );
      navigation.navigate("Checkout");
    } catch (err) {
      console.error("Failed to handle checkout:", err);
      Alert.alert(
        "Error",
        "Failed to proceed to checkout. Please try again."
      );
    }
  };

  const handleSignupModalClose = async () => {
    setShowSignupModal(false);
    try {
      const userDetails = await AsyncStorage.getItem("customer");
      if (userDetails) {
        await fetchCartFromDB(false);

        const cartData = {
          cartItems,
          subtotal: calculateSubtotal(),
          timestamp: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
          "cartDetails",
          JSON.stringify(cartData)
        );
        navigation.navigate("Checkout");
      }
    } catch (err) {
      console.error("Failed to check user status after modal close:", err);
    }
  };

  /* ---------- share cart ---------- */

  const handleShare = async () => {
    try {
      const totalItems = getTotalItems();
      const subtotal = calculateSubtotal();

      const itemsList = (cartItems || [])
        .map((item) => {
          const lineTotal =
            (Number(item.price) || 0) * (Number(item.quantity) || 0);
          return `• ${item.productName} (${item.quantity}x) - ${formatCurrency(
            lineTotal
          )}`;
        })
        .join("\n");

      const shareContent = {
        title: "My Shopping Cart",
        message:
          `Check out my shopping cart from Franko! 🛒\n\n` +
          `${totalItems} item${
            totalItems !== 1 ? "s" : ""
          } - Total: ${formatCurrency(subtotal)}\n\n` +
          `Items:\n${itemsList}\n\n` +
          `Shop now on the Franko Trading app!`,
      };

      await Share.share(shareContent);
    } catch (err) {
      console.error("Error sharing cart:", err);
    }
  };

  /* ---------- item rendering ---------- */

  const renderCartItem = ({ item }) => {
    const imageUrl = item.imagePath
      ? `${backendBaseURL}/Media/Products_Images/${
          item.imagePath.split("\\").pop()
        }`
      : null;

    const inWishlist = isItemInWishlist(item.productId);
    const isUpdatingItem = updating[item.productId];
    const itemPrice = Number(item.price) || 0;
    const itemQuantity = Number(item.quantity) || 0;

    return (
      <View
        style={[
          styles.cartItem,
          isUpdatingItem && styles.cartItemUpdating,
        ]}
      >
        <View style={styles.productImageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <MaterialIcons name="image" size={30} color="#E5E7EB" />
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>

          <Text style={styles.productPrice}>
            {formatCurrency(itemPrice)}
          </Text>

          <View style={styles.quantityRow}>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.quantityButton, styles.quantityButtonLeft]}
                onPress={() =>
                  handleQuantityChange(
                    item.cartId,
                    item.productId,
                    itemQuantity - 1
                  )
                }
                disabled={isUpdatingItem || deleting}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="remove"
                  size={16}
                  color={
                    isUpdatingItem || deleting ? "#D1D5DB" : "#6B7280"
                  }
                />
              </TouchableOpacity>

              <View style={styles.quantityDisplay}>
                {isUpdatingItem ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <Text style={styles.quantityText}>{itemQuantity}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.quantityButton, styles.quantityButtonRight]}
                onPress={() =>
                  handleQuantityChange(
                    item.cartId,
                    item.productId,
                    itemQuantity + 1
                  )
                }
                disabled={isUpdatingItem || deleting}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="add"
                  size={16}
                  color={
                    isUpdatingItem || deleting ? "#D1D5DB" : "#6B7280"
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              inWishlist && styles.wishlistButtonActive,
            ]}
            onPress={() => handleToggleWishlist(item)}
            disabled={isUpdatingItem || deleting}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={inWishlist ? "favorite" : "favorite-border"}
              size={18}
              color={inWishlist ? "#EF4444" : "#9CA3AF"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteActionButton]}
            onPress={() => handleDeleteItem(item.cartId, item.productId)}
            disabled={isUpdatingItem || deleting}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="delete-outline"
              size={18}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* ---------- loading states ---------- */

  if (isInitialLoad) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading your cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (deleting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Updating cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------- render ---------- */

  const subtotal = calculateSubtotal();
  const totalItems = getTotalItems();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.Cartheader}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="#374151" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.cartIconContainer}>
            <MaterialIcons name="shopping-cart" size={22} color="#059669" />
            {totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
            activeOpacity={0.7}
            disabled={!cartItems || cartItems.length === 0}
          >
            <MaterialIcons
              name="ios-share"
              size={20}
              color={
                !cartItems || cartItems.length === 0
                  ? "#D1D5DB"
                  : "#6B7280"
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.container}>
       

        {cartItems && cartItems.length > 0 ? (
          <View style={styles.contentWrapper}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryHeaderText}>
                {totalItems} {totalItems === 1 ? "Item" : "Items"} in
                your cart
              </Text>
            </View>

            <FlatList
              data={cartItems}
              keyExtractor={(item, index) =>
                `${item.cartId}-${item.productId}-${index}`
              }
              renderItem={renderCartItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              style={styles.flatList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#059669"]}
                  tintColor="#059669"
                />
              }
            />

            {/* Bottom summary + checkout */}
            <View style={styles.bottomContainer}>
              <View style={styles.orderSummary}>
                <View style={styles.summaryDivider} />

                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(subtotal)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={handleCheckout}
                activeOpacity={0.9}
                disabled={loading}
              >
                <View style={styles.checkoutButtonContent}>
                  <View style={styles.checkoutButtonLeft}>
                    <MaterialIcons
                      name="shopping-bag"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.checkoutButtonText}>
                      Proceed to Checkout
                    </Text>
                  </View>
                  <MaterialIcons
                    name="arrow-forward"
                    size={18}
                    color="#FFFFFF"
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons
                name="shopping-cart"
                size={64}
                color="#E5E7EB"
              />
            </View>
            <Text style={styles.emptyCartText}>Your cart is empty</Text>
            <Text style={styles.emptyCartSubtext}>
              Discover amazing products and add them to your cart
            </Text>
            <TouchableOpacity
              style={styles.shopNowButton}
              onPress={handleGoBack}
              activeOpacity={0.8}
            >
              <Text style={styles.shopNowButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Signup Modal */}
      <SignupScreen
        visible={showSignupModal}
        onClose={handleSignupModalClose}
      />
    </SafeAreaView>
  );
};

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingBottom: 10,
  },
  Cartheader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  cartIconContainer: {
    position: "relative",
    marginRight: 8,
  },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
  },

  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
 

  summaryHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  summaryHeaderText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  contentWrapper: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 130,
  },

  cartItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 14,
    marginVertical: 6,
    borderRadius: 16,
    padding: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cartItemUpdating: {
    opacity: 0.6,
  },
  productImageContainer: {
    marginRight: 14,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  productImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "700",
    marginBottom: 10,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  quantityButton: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  quantityButtonLeft: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  quantityButtonRight: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  quantityDisplay: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },

  itemActions: {
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: "#F3F4F6",
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  wishlistButtonActive: {
    backgroundColor: "#FEF2F2",
  },
  deleteActionButton: {
    backgroundColor: "#FEF2F2",
  },

  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  orderSummary: {
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 6,
  },
  totalRow: {
    paddingTop: 2,
  },
  totalLabel: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 17,
    color: "#111827",
    fontWeight: "800",
  },
  checkoutButton: {
    backgroundColor: "#059669",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 22,
  },
  checkoutButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkoutButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.3,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyCartText: {
    fontSize: 22,
    color: "#374151",
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyCartSubtext: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  shopNowButton: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    ...Platform.select({
      ios: {
        shadowColor: "#059669",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  shopNowButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
});

export default CartScreen;