import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  StyleSheet,
} from "react-native";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import { checkOutOrder, updateOrderDelivery } from "../redux/slice/orderSlice";
import { clearCart } from "../redux/slice/cartSlice";
import LocationsModal from "../components/Locations";

const CART_KEYS_TO_CLEAR = [
  "cart",
  "cartId",
  "cartDetails",
  "checkoutDetails",
  "orderDeliveryDetails",
  "pendingOrderId",
  "selectedLocation",
];

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return `GH₵${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const CheckoutScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  const hasFinalizedRef = useRef(false);

  const [customer, setCustomer] = useState({});
  const [cartItems, setCartItems] = useState([]);

  const [orderNote, setOrderNote] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientContactNumber, setRecipientContactNumber] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  const [loading, setLoading] = useState(false);

  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [manualAddressVisible, setManualAddressVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [usedOrderIds, setUsedOrderIds] = useState(new Set());

  // -----------------------------
  // Delivery helpers
  // -----------------------------
  const isFreeDelivery = (deliveryFee) => {
    if (typeof deliveryFee !== "string") return false;
    const normalizedFee = deliveryFee.toLowerCase().trim();
    return (
      normalizedFee === "free delivery" ||
      normalizedFee === "free" ||
      normalizedFee.includes("free")
    );
  };

  const isNADelivery = (deliveryFee) =>
    deliveryFee === "N/A" ||
    deliveryFee === "n/a" ||
    deliveryFee === 0 ||
    deliveryFee === "0" ||
    deliveryFee == null;

  const getSafeDeliveryFee = () => {
    if (manualAddressVisible || !selectedLocation) return 0;
    const fee = selectedLocation.town?.delivery_fee;

    if (isFreeDelivery(fee)) return 0;
    if (typeof fee === "number" && fee > 0) return fee;

    if (typeof fee === "string") {
      const parsed = parseFloat(fee);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    return 0;
  };

  const formatDeliveryFeeDisplay = () => {
    if (manualAddressVisible) return "Delivery charges may apply";
    if (!selectedLocation) return "N/A";

    const fee = selectedLocation.town?.delivery_fee;
    if (isFreeDelivery(fee)) return "FREE";
    if (typeof fee === "number" && fee > 0) return formatCurrency(fee);

    if (typeof fee === "string") {
      const parsed = parseFloat(fee);
      if (!isNaN(parsed) && parsed > 0) return formatCurrency(parsed);
    }

    return "Delivery charges may apply";
  };

  // -----------------------------
  // OrderId generation
  // -----------------------------
  const generateOrderId = () => {
    let orderId;
    let attempts = 0;

    do {
      const firstPart = Math.floor(Math.random() * 900) + 100;
      const secondPart = Math.floor(Math.random() * 900) + 100;
      orderId = `APP-${firstPart}-${secondPart}`;
      attempts++;
    } while (usedOrderIds.has(orderId) && attempts < 100);

    setUsedOrderIds((prev) => new Set([...prev, orderId]));
    return orderId;
  };

  // -----------------------------
  // Load initial data
  // -----------------------------
  useEffect(() => {
    (async () => {
      try {
        const customerJson = await AsyncStorage.getItem("customer");
        const customerData = customerJson ? JSON.parse(customerJson) : null;

        setCustomer(customerData || {});
        setRecipientName(
          customerData ? `${customerData.firstName} ${customerData.lastName}` : ""
        );
        setRecipientContactNumber(customerData?.contactNumber || "");

        // Prefer cartDetails if you store it; fallback to cart
        const cartDetailsJson = await AsyncStorage.getItem("cartDetails");
        if (cartDetailsJson) {
          const cartDetails = JSON.parse(cartDetailsJson);
          setCartItems(cartDetails?.cartItems || []);
        } else {
          const cartJson = await AsyncStorage.getItem("cart");
          setCartItems(cartJson ? JSON.parse(cartJson) : []);
        }

        const savedLocationJson = await AsyncStorage.getItem("selectedLocation");
        const savedLocation = savedLocationJson ? JSON.parse(savedLocationJson) : null;
        if (savedLocation) {
          setSelectedLocation(savedLocation);
          setRecipientAddress(`${savedLocation.town?.name}, ${savedLocation.region}`);
        }

        const storedOrderIds = await AsyncStorage.getItem("usedOrderIds");
        if (storedOrderIds) setUsedOrderIds(new Set(JSON.parse(storedOrderIds)));
      } catch {
        Alert.alert("Error", "Failed to load checkout data.");
      }
    })();
  }, []);

  // persist used ids
  useEffect(() => {
    if (usedOrderIds.size === 0) return;
    AsyncStorage.setItem("usedOrderIds", JSON.stringify([...usedOrderIds])).catch(() => {});
  }, [usedOrderIds]);

  // -----------------------------
  // Totals
  // -----------------------------
  const subtotal = cartItems.reduce(
    (total, item) => total + (item.amount || item.total || 0),
    0
  );

  const calculateTotalAmount = () => {
    const deliveryFee = getSafeDeliveryFee();
    if (manualAddressVisible || isNADelivery(selectedLocation?.town?.delivery_fee)) {
      return subtotal;
    }
    return subtotal + deliveryFee;
  };

  // -----------------------------
  // Storage helpers
  // -----------------------------
  const clearAllCartStorage = async () => {
    // ✅ remove everything cart/checkout/payment related
    await AsyncStorage.multiRemove(CART_KEYS_TO_CLEAR);
  };

  // -----------------------------
  // Backend dispatch helpers
  // -----------------------------
  const dispatchOrderCheckout = async (checkoutDetails) => {
    // Cartid is required by backend; prefer stored cartId
    const cartId = (await AsyncStorage.getItem("cartId")) || checkoutDetails.Cartid;

    const payload = {
      ...checkoutDetails,
      Cartid: cartId,
    };

    await dispatch(checkOutOrder(payload)).unwrap();
  };

  const dispatchOrderAddress = async (addressDetails) => {
    await dispatch(updateOrderDelivery(addressDetails)).unwrap();
  };

  // ✅ Finalize order - simplified for Cash on Delivery only
  const finalizeOrderSuccess = useCallback(
    async (orderId, checkoutDetails, addressDetails) => {
      if (!orderId || hasFinalizedRef.current) return;
      hasFinalizedRef.current = true;

      try {
        setLoading(true);

        // 1) backend checkout
        await dispatchOrderCheckout(checkoutDetails);

        // 2) backend address update
        await dispatchOrderAddress(addressDetails);

        // 3) clear redux + storage
        dispatch(clearCart());
        await clearAllCartStorage();

        // 4) navigate
        navigation.reset({
          index: 0,
          routes: [{ name: "OrderPlacedScreen", params: { orderId } }],
        });
      } catch (e) {
        hasFinalizedRef.current = false; // allow retry
        Alert.alert(
          "Order Processing Error",
          e?.message || "We couldn't finalize your order. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [dispatch, navigation]
  );

  // -----------------------------
  // Location handlers
  // -----------------------------
  const handleLocationSelect = async (locationData) => {
    setSelectedLocation(locationData);
    setRecipientAddress(`${locationData.town?.name}, ${locationData.region}`);
    setManualAddressVisible(false);
    await AsyncStorage.setItem("selectedLocation", JSON.stringify(locationData));
    setLocationModalVisible(false);
  };

  const handleManualAddressToggle = async () => {
    const newVisible = !manualAddressVisible;
    setManualAddressVisible(newVisible);

    if (newVisible) {
      setSelectedLocation(null);
      setRecipientAddress("");
      await AsyncStorage.removeItem("selectedLocation");
    }
  };

  // -----------------------------
  // Checkout click - simplified for Cash on Delivery
  // -----------------------------
  const handleCheckout = async () => {
    // validation
    const isGuestName =
      recipientName.toLowerCase().trim() === "guest" ||
      recipientName.toLowerCase().trim() === "guest user" ||
      recipientName.toLowerCase().trim().includes("guest");

    if (isGuestName) {
      Alert.alert("Please Enter Your Actual Name", "Please enter your real name.");
      return;
    }
    if (!recipientAddress.trim()) {
      Alert.alert("Delivery Address Required", "Please provide a delivery address.");
      return;
    }
    if (!recipientName.trim()) {
      Alert.alert("Recipient Name Required", "Please enter the recipient name.");
      return;
    }
    if (!recipientContactNumber.trim()) {
      Alert.alert("Contact Number Required", "Please enter the contact number.");
      return;
    }

    const orderId = generateOrderId();
    const orderDate = new Date().toISOString();
    const cartId = await AsyncStorage.getItem("cartId");

    const checkoutDetails = {
      Cartid: cartId,
      customerId: customer.customerAccountNumber,
      orderCode: orderId,
      PaymentMode: "Cash on Delivery",
      PaymentAccountNumber: customer.contactNumber,
      customerAccountType: customer.accountType || "Customer",
      paymentService: "Cash",
      totalAmount: calculateTotalAmount(),
      recipientName,
      recipientContactNumber,
      orderNote: orderNote || "N/A",
      orderDate,
    };

    const addressDetails = {
      orderCode: orderId,
      address: recipientAddress,
      Customerid: customer.customerAccountNumber,
      recipientName,
      recipientContactNumber,
      orderNote: orderNote || "N/A",
      geoLocation: "N/A",
    };

    // Direct checkout for Cash on Delivery
    await finalizeOrderSuccess(orderId, checkoutDetails, addressDetails);
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>Processing your order...</Text>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerText}>Checkout</Text>
          <Text style={styles.headerSubText}>Cash on Delivery</Text>
        </View>

        <Ionicons
          name="lock-closed-outline"
          size={20}
          color="#BBF7D0"
          style={{ marginLeft: "auto" }}
        />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Delivery Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>

          <Text style={styles.label}>Recipient Name *</Text>
          <TextInput
            style={styles.input}
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Enter recipient name"
          />

          <Text style={styles.label}>Contact Number *</Text>
          <TextInput
            style={styles.input}
            value={recipientContactNumber}
            onChangeText={setRecipientContactNumber}
            keyboardType="phone-pad"
            placeholder="Enter contact number"
          />

          <Text style={styles.label}>Delivery Address *</Text>
          {!manualAddressVisible ? (
            <View style={styles.addressRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={recipientAddress}
                editable={false}
                placeholder="Select delivery address"
              />
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() => setLocationModalVisible(true)}
              >
                <Ionicons name="location" size={18} color="#fff" />
                <Text style={styles.smallBtnText}>
                  {recipientAddress ? "Change" : "Select"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: "top" }]}
              value={recipientAddress}
              onChangeText={setRecipientAddress}
              multiline
              placeholder="Enter full delivery address"
            />
          )}

          <TouchableOpacity style={styles.toggle} onPress={handleManualAddressToggle}>
            <Text style={styles.toggleText}>
              {manualAddressVisible ? "Select from locations" : "Enter address manually"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Order Note (Optional)</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            value={orderNote}
            onChangeText={setOrderNote}
            multiline
            placeholder="Any note about the order?"
          />
        </View>

        {/* Payment Method - Cash on Delivery only */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <View style={styles.paymentInfo}>
            <Ionicons name="cash-outline" size={24} color="#059669" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.paymentTitle}>Cash on Delivery</Text>
             
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#059669" />
          </View>
        </View>

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          {cartItems.map((item, idx) => {
            const backendBaseURL = "https://ct002.frankotrading.com:444/";
            const imageUrl = item.imagePath
              ? `${backendBaseURL}/Media/Products_Images/${item.imagePath.split("\\").pop()}`
              : null;

            return (
              <View key={`${item.productId}-${idx}`} style={styles.itemRow}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.itemImage} />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Ionicons name="image-outline" size={18} color="#9CA3AF" />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>

                <Text style={styles.itemPrice}>
                  {formatCurrency(item.amount || item.total || 0)}
                </Text>
              </View>
            );
          })}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>{formatDeliveryFeeDisplay()}</Text>
          </View>

          <View style={[styles.summaryRow, { marginTop: 10 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(calculateTotalAmount())}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handleCheckout}
          disabled={loading}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
          <Text style={styles.placeOrderText}>
            Place Order • {formatCurrency(calculateTotalAmount())}
          </Text>
        </TouchableOpacity>
      </View>

      <LocationsModal
        isVisible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onLocationSelect={handleLocationSelect}
        selectedLocation={selectedLocation}
      />
    </View>
  );
};

export default CheckoutScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 20,
  },
  backButton: { marginRight: 10, padding: 4, borderRadius: 999 },
  headerTextContainer: { flexDirection: "column" },
  headerText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerSubText: { color: "#D1FAE5", fontSize: 11, marginTop: 2 },

  scrollView: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 12, color: "#111827" },

  label: { fontSize: 13, fontWeight: "700", marginTop: 10, marginBottom: 6, color: "#374151" },
  input: {
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
  },

  addressRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  smallBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  smallBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  toggle: { marginTop: 10 },
  toggleText: { color: "#059669", fontWeight: "700" },

  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "#059669",
  },
  paymentTitle: { fontSize: 15, fontWeight: "800", color: "#059669" },
  paymentDescription: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  itemImage: { width: 44, height: 44, borderRadius: 10 },
  itemImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: { fontSize: 13, fontWeight: "700", color: "#111827" },
  itemQty: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: "800", color: "#111827" },

  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  summaryLabel: { color: "#6B7280", fontWeight: "700" },
  summaryValue: { color: "#111827", fontWeight: "800" },
  totalLabel: { color: "#111827", fontWeight: "900", fontSize: 15 },
  totalValue: { color: "#DC2626", fontWeight: "900", fontSize: 15 },

  bottomSection: { backgroundColor: "#fff", padding: 14 },
  placeOrderButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  placeOrderText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  loadingOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(15,23,42,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingCard: { backgroundColor: "#fff", padding: 18, borderRadius: 16, alignItems: "center" },
  loadingText: { marginTop: 10, fontWeight: "700", color: "#111827" },
});