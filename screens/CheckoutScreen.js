import React, { useEffect, useState } from "react";
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
  AppState,
} from "react-native";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { checkOutOrder, updateOrderDelivery } from "../redux/slice/orderSlice";
import { getHubtelCallbackById } from "../redux/slice/paymentSlice";
import { clearCart } from "../redux/slice/cartSlice";
import LocationsModal from "../components/Locations";

/** Format Cedi values with commas and 2 decimal places */
const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return `GH₵${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// AWS Lambda payment initiation URL (FrankoAPI → /PaymentSystem/InitiateHubtel)
const PAYMENT_API_URL =
  process.env.EXPO_PUBLIC_PAYMENT_API_URL ||
  "https://02yo3gbfxe.execute-api.us-east-1.amazonaws.com/default/FrankoAPI/?endpoint=%2FPaymentSystem%2FInitiateHubtel";

const CheckoutScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [customer, setCustomer] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientContactNumber, setRecipientContactNumber] =
    useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [shippingDetails, setShippingDetails] = useState({
    locationCharge: 0,
    isFree: false,
    isNA: false,
  });
  const [locationModalVisible, setLocationModalVisible] =
    useState(false);
  const [manualAddressVisible, setManualAddressVisible] =
    useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [paymentCheckInterval, setPaymentCheckInterval] =
    useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [usedOrderIds, setUsedOrderIds] = useState(new Set());
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // --- Helpers: delivery fee / method availability ---

  const isFreeDelivery = (deliveryFee) => {
    if (typeof deliveryFee !== "string") return false;
    const normalizedFee = deliveryFee.toLowerCase().trim();
    return (
      normalizedFee === "free delivery" ||
      normalizedFee === "free" ||
      normalizedFee.includes("free")
    );
  };

  const isNADelivery = (deliveryFee) => {
    return (
      deliveryFee === "N/A" ||
      deliveryFee === "n/a" ||
      deliveryFee === 0 ||
      deliveryFee === "0" ||
      deliveryFee === null ||
      deliveryFee === undefined
    );
  };

  const isCashOnDeliveryAvailable = () => {
    if (manualAddressVisible || !selectedLocation) return false;
    const fee = selectedLocation.town?.delivery_fee;
    return isFreeDelivery(fee);
  };

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

  // Generate unique APP order ID
  const generateOrderId = () => {
    let orderId;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      const firstPart = Math.floor(Math.random() * 900) + 100;
      const secondPart = Math.floor(Math.random() * 900) + 100;
      orderId = `APP-${firstPart}-${secondPart}`;
      attempts++;
    } while (usedOrderIds.has(orderId) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      const timestamp = Date.now().toString().slice(-6);
      orderId = `APP-${timestamp.slice(0, 3)}-${timestamp.slice(3)}`;
    }

    setUsedOrderIds((prev) => new Set([...prev, orderId]));
    return orderId;
  };

  // --- Initial load ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const customerJson = await AsyncStorage.getItem("customer");
        const customerData = customerJson ? JSON.parse(customerJson) : null;
        setCustomer(customerData || {});
        setRecipientName(
          customerData
            ? `${customerData.firstName} ${customerData.lastName}`
            : ""
        );
        setRecipientContactNumber(customerData?.contactNumber || "");

        const cartJson = await AsyncStorage.getItem("cartDetails");
        const cartData = cartJson ? JSON.parse(cartJson) : null;
        setCartItems(cartData?.cartItems || []);

        const savedLocationJson = await AsyncStorage.getItem(
          "selectedLocation"
        );
        const savedLocation = savedLocationJson
          ? JSON.parse(savedLocationJson)
          : null;

        if (savedLocation) {
          setSelectedLocation(savedLocation);
          const deliveryFee = savedLocation.town?.delivery_fee;

          setShippingDetails({
            locationCharge: deliveryFee,
            isFree: isFreeDelivery(deliveryFee),
            isNA: isNADelivery(deliveryFee),
          });
          setRecipientAddress(
            `${savedLocation.town.name}, ${savedLocation.region}`
          );
        } else {
          setRecipientAddress("");
          setShippingDetails({
            locationCharge: 0,
            isFree: false,
            isNA: true,
          });
        }

        const storedOrderIds = await AsyncStorage.getItem("usedOrderIds");
        if (storedOrderIds) {
          setUsedOrderIds(new Set(JSON.parse(storedOrderIds)));
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load data. Please try again.");
      }
    };

    fetchData();
  }, []);

  // Save used order IDs
  useEffect(() => {
    const saveUsedOrderIds = async () => {
      try {
        await AsyncStorage.setItem(
          "usedOrderIds",
          JSON.stringify([...usedOrderIds])
        );
      } catch {
        // Silent fail
      }
    };

    if (usedOrderIds.size > 0) {
      saveUsedOrderIds();
    }
  }, [usedOrderIds]);

  // AppState listener: re-check payment when app resumes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === "active" && appState === "background") {
        await checkPaymentStatusImmediate();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [appState]);

  // Poll backend via AWS callback result
  useEffect(() => {
    let intervalId;
    let hasRedirected = false;

    const checkHubtelStatus = async () => {
      const orderId =
        currentOrderId || (await AsyncStorage.getItem("pendingOrderId"));
      if (!orderId || paymentProcessing || hasRedirected) return;

      try {
        setPaymentProcessing(true);
        const action = await dispatch(getHubtelCallbackById(orderId));
        const response = action?.payload;

        if (response?.responseCode === "0000") {
          hasRedirected = true;
          if (intervalId) {
            clearInterval(intervalId);
            setPaymentCheckInterval(null);
          }

          await AsyncStorage.removeItem("pendingOrderId");
          await processPaymentSuccess(orderId);
          setCurrentOrderId(null);
          navigation.navigate("OrderPlacedScreen", { orderId });
        } else if (
          response?.responseCode === "2001" ||
          response?.responseCode === "2002"
        ) {
          hasRedirected = true;
          if (intervalId) {
            clearInterval(intervalId);
            setPaymentCheckInterval(null);
          }

          await AsyncStorage.removeItem("pendingOrderId");
          setCurrentOrderId(null);

          setTimeout(() => {
            navigation.navigate("OrderCancellationScreen");
          }, 500);
        }
      } catch {
        // Silent error handling
      } finally {
        setPaymentProcessing(false);
      }
    };

    if (
      ["Mobile Money", "Credit/Debit Card"].includes(paymentMethod) &&
      currentOrderId
    ) {
      intervalId = setInterval(checkHubtelStatus, 2000);
      setPaymentCheckInterval(intervalId);
      checkHubtelStatus();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [
    paymentMethod,
    currentOrderId,
    dispatch,
    navigation,
    paymentProcessing,
  ]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
      }
    };
  }, [paymentCheckInterval]);

  // Immediate payment status check
  const checkPaymentStatusImmediate = async () => {
    const orderId =
      currentOrderId || (await AsyncStorage.getItem("pendingOrderId"));
    if (!orderId || paymentProcessing) return;

    try {
      setPaymentProcessing(true);
      const action = await dispatch(getHubtelCallbackById(orderId));
      const response = action?.payload;

      if (response?.responseCode === "0000") {
        await AsyncStorage.removeItem("pendingOrderId");
        await processPaymentSuccess(orderId);
        setCurrentOrderId(null);
        navigation.navigate("OrderPlacedScreen", { orderId });
      } else if (
        response?.responseCode === "2001" ||
        response?.responseCode === "2002"
      ) {
        await AsyncStorage.removeItem("pendingOrderId");
        setCurrentOrderId(null);
        setTimeout(() => {
          navigation.navigate("OrderCancellationScreen");
        }, 500);
      }
    } catch {
      // Silent error handling
    } finally {
      setPaymentProcessing(false);
    }
  };

  // After successful payment (0000): dispatch checkout + address, clear cart + stored details
  const processPaymentSuccess = async (orderId) => {
    try {
      const checkoutJson = await AsyncStorage.getItem("checkoutDetails");
      const addressJson = await AsyncStorage.getItem("orderDeliveryDetails");

      const checkoutDetails = checkoutJson
        ? JSON.parse(checkoutJson)
        : null;
      const addressDetails = addressJson ? JSON.parse(addressJson) : null;

      if (checkoutDetails && addressDetails) {
        await dispatchOrderCheckout(orderId, checkoutDetails);
        await dispatchOrderAddress(orderId, addressDetails);

        // Clear cart and stored details
        dispatch(clearCart());
        await AsyncStorage.removeItem("cartDetails");
        await AsyncStorage.removeItem("cartId");
        await AsyncStorage.removeItem("cart");
        await AsyncStorage.removeItem("checkoutDetails");
        await AsyncStorage.removeItem("orderDeliveryDetails");
      }
    } catch (error) {
      console.error("processPaymentSuccess error:", error);
    }
  };

  const handleLocationSelect = async (locationData) => {
    try {
      setSelectedLocation(locationData);
      const deliveryFee = locationData.town?.delivery_fee;

      setShippingDetails({
        locationCharge: deliveryFee,
        isFree: isFreeDelivery(deliveryFee),
        isNA: isNADelivery(deliveryFee),
      });
      setRecipientAddress(
        `${locationData.town.name}, ${locationData.region}`
      );

      setManualAddressVisible(false);
      setPaymentMethod("");

      await AsyncStorage.setItem(
        "selectedLocation",
        JSON.stringify(locationData)
      );
      setLocationModalVisible(false);
    } catch {
      Alert.alert("Error", "Failed to save location. Please try again.");
    }
  };

  const handleManualAddressToggle = () => {
    const newVisible = !manualAddressVisible;
    setManualAddressVisible(newVisible);

    if (newVisible) {
      setSelectedLocation(null);
      setShippingDetails({
        locationCharge: 0,
        isFree: false,
        isNA: true,
      });
      setRecipientAddress("");
      setPaymentMethod("");
      AsyncStorage.removeItem("selectedLocation");
    }
  };

  const calculateTotalAmount = () => {
    const subtotal = cartItems.reduce(
      (total, item) => total + (item.amount || item.total || 0),
      0
    );
    const deliveryFee = getSafeDeliveryFee();

    if (
      manualAddressVisible ||
      isNADelivery(selectedLocation?.town?.delivery_fee)
    ) {
      return subtotal;
    }

    return subtotal + deliveryFee;
  };

  const handleCheckout = async () => {
    const isGuestName =
      recipientName.toLowerCase().trim() === "guest" ||
      recipientName.toLowerCase().trim() === "guest user" ||
      recipientName.toLowerCase().trim().includes("guest");

    if (isGuestName) {
      Alert.alert(
        "Please Enter Your Actual Name",
        "For delivery purposes, please enter your real name instead of 'Guest'.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!paymentMethod) {
      Alert.alert(
        "Payment Method Required",
        "Please select a payment method to continue with your order.",
        [{ text: "Got it" }]
      );
      return;
    }

    if (!recipientAddress.trim()) {
      Alert.alert(
        "Delivery Address Required",
        "Please add a valid delivery address to complete your order.",
        [
          {
            text: "Select Location",
            onPress: () => setLocationModalVisible(true),
          },
          {
            text: "Enter Manually",
            onPress: () => setManualAddressVisible(true),
          },
        ]
      );
      return;
    }

    if (!recipientName.trim()) {
      Alert.alert(
        "Recipient Name Required",
        "Please enter the recipient's name.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!recipientContactNumber.trim()) {
      Alert.alert(
        "Contact Number Required",
        "Please enter the recipient's contact number.",
        [{ text: "OK" }]
      );
      return;
    }

    setLoading(true);
    const orderId = generateOrderId();
    setCurrentOrderId(orderId);
    const orderDate = new Date().toISOString();

    const checkoutDetails = {
      Cartid: await AsyncStorage.getItem("cartId"),
      customerId: customer.customerAccountNumber,
      orderCode: orderId,
      PaymentMode: paymentMethod,
      PaymentAccountNumber: customer.contactNumber,
      customerAccountType: customer.accountType || "Customer",
      paymentService: paymentMethod === "Mobile Money" ? "Mtn" : "Visa",
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

    try {
      if (!["Mobile Money", "Credit/Debit Card"].includes(paymentMethod)) {
        await processDirectCheckout(orderId, checkoutDetails, addressDetails);
        Alert.alert(
          "Order Placed Successfully!",
          "Your order has been confirmed and is being processed."
        );
        navigation.navigate("OrderReceivedScreen");
      } else {
        await storeCheckoutDetailsLocally(checkoutDetails, addressDetails);

        const paymentUrl = await initiatePayment(
          checkoutDetails.totalAmount,
          cartItems,
          orderId
        );
        if (paymentUrl && isValidUrl(paymentUrl)) {
          await AsyncStorage.setItem("pendingOrderId", orderId);

          navigation.navigate("PaymentGatewayScreen", {
            url: paymentUrl,
            orderId,
          });
        } else {
          throw new Error("Invalid payment URL received");
        }
      }
    } catch (error) {
      Alert.alert(
        "Checkout Error",
        error.message || "An error occurred during checkout."
      );
      setCurrentOrderId(null);
    } finally {
      setLoading(false);
    }
  };

  const isValidUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    try {
      const urlObj = new URL(url);
      return (
        ["http:", "https:"].includes(urlObj.protocol) &&
        !url.includes("about:") &&
        !url.includes("srcdoc")
      );
    } catch {
      return false;
    }
  };

  // Direct checkout (non-Hubtel)
  const processDirectCheckout = async (
    orderId,
    checkoutDetails,
    addressDetails
  ) => {
    try {
      await dispatchOrderCheckout(orderId, checkoutDetails);
      await dispatchOrderAddress(orderId, addressDetails);
      dispatch(clearCart());
      await AsyncStorage.removeItem("cartDetails");
      await AsyncStorage.removeItem("cartId");
      await AsyncStorage.removeItem("cart");
    } catch {
      throw new Error("An error occurred during direct checkout.");
    }
  };

  const dispatchOrderCheckout = async (orderId, checkoutDetails) => {
    try {
      const cartId = await AsyncStorage.getItem("cartId");
      const checkoutPayload = {
        Cartid: cartId,
        ...checkoutDetails,
      };
      await dispatch(checkOutOrder(checkoutPayload)).unwrap();
    } catch {
      throw new Error("An error occurred during order checkout.");
    }
  };

  const dispatchOrderAddress = async (orderId, addressDetails) => {
    try {
      await dispatch(updateOrderDelivery(addressDetails)).unwrap();
    } catch {
      throw new Error("An error occurred while updating the order address.");
    }
  };

  const storeCheckoutDetailsLocally = async (
    checkoutDetails,
    addressDetails
  ) => {
    try {
      await AsyncStorage.setItem(
        "checkoutDetails",
        JSON.stringify(checkoutDetails)
      );
      await AsyncStorage.setItem(
        "orderDeliveryDetails",
        JSON.stringify(addressDetails)
      );
    } catch {
      throw new Error("Failed to store checkout details locally.");
    }
  };

  // NEW: initiate payment via AWS Lambda instead of direct Hubtel
  const initiatePayment = async (totalAmount, items, orderId) => {
    const payload = {
      totalAmount,
      cartItems: items,
      orderId,
    };

    try {
      const response = await fetch(PAYMENT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Identifier: "Franko", // must match Lambda CUSTOM_HEADER_NAME/VALUE
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} - ${text}`);
      }
      if (!text) {
        throw new Error("Empty response from payment API");
      }

      const result = JSON.parse(text);

      // Lambda returns { checkoutUrl, raw } or full Hubtel JSON
      if (result.checkoutUrl && isValidUrl(result.checkoutUrl)) {
        return result.checkoutUrl;
      }

      if (
        result.status === "Success" &&
        result.data &&
        result.data.checkoutUrl &&
        isValidUrl(result.data.checkoutUrl)
      ) {
        return result.data.checkoutUrl;
      }

      throw new Error(
        result.message || "Payment initiation via AWS failed."
      );
    } catch (error) {
      throw new Error(
        error.message || "Payment initiation via AWS failed. Please try again."
      );
    }
  };

  const getAvailablePaymentMethods = () => {
    const methods = ["Mobile Money", "Credit/Debit Card"];
    if (isCashOnDeliveryAvailable()) {
      methods.unshift("Cash on Delivery");
    }
    return methods;
  };

  const availablePaymentMethods = getAvailablePaymentMethods();

  const getPaymentIcon = (method) => {
    switch (method) {
      case "Mobile Money":
        return "phone-portrait-outline";
      case "Credit/Debit Card":
        return "card-outline";
      case "Cash on Delivery":
        return "cash-outline";
      default:
        return "wallet-outline";
    }
  };

  const subtotal = cartItems.reduce(
    (total, item) => total + (item.amount || item.total || 0),
    0
  );

  // --- Render ---

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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerText}>Checkout</Text>
          <Text style={styles.headerSubText}>
            Secure payment & fast delivery
          </Text>
        </View>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color="#BBF7D0"
          style={{ marginLeft: "auto" }}
        />
      </View>

       <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIconWrapper}>
              <Ionicons name="person-outline" size={18} color="#059669" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Delivery Information</Text>
              <Text style={styles.cardSubtitle}>
                Please provide accurate recipient details
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Recipient Name *</Text>
            <TextInput
              style={[
                styles.input,
                !recipientName.trim() && styles.inputError,
              ]}
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Enter your actual name (required for delivery)"
              placeholderTextColor="#9CA3AF"
            />
            {recipientName.toLowerCase().includes("guest") && (
              <View style={styles.warningCard}>
                <Ionicons
                  name="warning-outline"
                  size={16}
                  color="#F59E0B"
                />
                <Text style={styles.warningTextSmall}>
                  Please enter your actual name for delivery purposes
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Number *</Text>
            <TextInput
              style={[
                styles.input,
                !recipientContactNumber.trim() && styles.inputError,
              ]}
              value={recipientContactNumber}
              onChangeText={setRecipientContactNumber}
              keyboardType="phone-pad"
              placeholder="Enter contact number"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Delivery Address *</Text>

            {!manualAddressVisible ? (
              <>
                <View style={styles.addressContainer}>
                  <TextInput
                    style={[
                      styles.addressInput,
                      !recipientAddress.trim() && styles.inputError,
                    ]}
                    value={recipientAddress}
                    placeholder="Select delivery address"
                    placeholderTextColor="#9CA3AF"
                    editable={false}
                  />
                  <TouchableOpacity
                    style={styles.addressButton}
                    onPress={() => setLocationModalVisible(true)}
                  >
                    <Ionicons
                      name={recipientAddress ? "location" : "add-circle"}
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.addressButtonText}>
                      {recipientAddress ? "Change" : "Select"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {selectedLocation && (
                  <View
                    style={[
                      styles.deliveryInfoCard,
                      isFreeDelivery(selectedLocation.town?.delivery_fee) &&
                        styles.freeDeliveryCard,
                      (isNADelivery(
                        selectedLocation.town?.delivery_fee
                      ) ||
                        manualAddressVisible) &&
                        styles.naDeliveryCard,
                    ]}
                  >
                    <Ionicons
                      name={
                        isFreeDelivery(selectedLocation.town?.delivery_fee)
                          ? "gift-outline"
                          : isNADelivery(
                              selectedLocation.town?.delivery_fee
                            )
                          ? "information-circle-outline"
                          : "car-outline"
                      }
                      size={16}
                      color={
                        isFreeDelivery(selectedLocation.town?.delivery_fee)
                          ? "#10B981"
                          : isNADelivery(
                              selectedLocation.town?.delivery_fee
                            )
                          ? "#F59E0B"
                          : "#059669"
                      }
                    />
                    <Text
                      style={[
                        styles.deliveryInfoText,
                        isFreeDelivery(selectedLocation.town?.delivery_fee) &&
                          styles.freeDeliveryText,
                        (isNADelivery(
                          selectedLocation.town?.delivery_fee
                        ) ||
                          manualAddressVisible) &&
                          styles.naDeliveryText,
                      ]}
                    >
                      {formatDeliveryFeeDisplay() === "FREE"
                        ? "Free Delivery!"
                        : formatDeliveryFeeDisplay() ===
                          "Delivery charges may apply"
                        ? "Delivery charges may apply"
                        : `Delivery Fee: ${formatDeliveryFeeDisplay()}`}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.manualAddressContainer}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter your complete delivery address (House number, street, area, city)"
                  value={recipientAddress}
                  onChangeText={setRecipientAddress}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.manualAddressToggle}
              onPress={handleManualAddressToggle}
            >
              <View style={styles.toggleContent}>
                <Ionicons
                  name={
                    manualAddressVisible ? "location-outline" : "create-outline"
                  }
                  size={16}
                  color="#059669"
                />
                <Text style={styles.manualAddressToggleText}>
                  {manualAddressVisible
                    ? "Select from locations"
                    : "Enter address manually"}
                </Text>
              </View>
              <Ionicons
                name={manualAddressVisible ? "chevron-up" : "chevron-down"}
                size={16}
                color="#059669"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Order Note (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add special instructions for your order"
              value={orderNote}
              onChangeText={setOrderNote}
              multiline
              numberOfLines={3}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Payment Method Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIconWrapper}>
              <Ionicons name="wallet-outline" size={18} color="#059669" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Payment Method *</Text>
              <Text style={styles.cardSubtitle}>
                Choose how you’d like to pay
              </Text>
            </View>
          </View>

          {availablePaymentMethods.map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                styles.paymentOption,
                paymentMethod === method && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod(method)}
            >
              <View style={styles.paymentOptionLeft}>
                <View style={styles.paymentIconContainer}>
                  <Ionicons
                    name={getPaymentIcon(method)}
                    size={20}
                    color={paymentMethod === method ? "#059669" : "#6B7280"}
                  />
                </View>
                <Text
                  style={[
                    styles.paymentOptionText,
                    paymentMethod === method &&
                      styles.paymentOptionTextSelected,
                  ]}
                >
                  {method}
                </Text>
              </View>
              <View
                style={[
                  styles.radioButton,
                  paymentMethod === method && styles.radioButtonSelected,
                ]}
              >
                {paymentMethod === method && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Order Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIconWrapper}>
              <Ionicons name="receipt-outline" size={18} color="#059669" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Order Summary</Text>
              <Text style={styles.cardSubtitle}>
                Review items and total before payment
              </Text>
            </View>
          </View>

          {cartItems.length > 0 ? (
            cartItems.map((item, index) => {
              const backendBaseURL = "https://fte002n1.salesmate.app";

              const imageUrl = item.imagePath
                ? `${backendBaseURL}/Media/Products_Images/${item.imagePath
                    .split("\\")
                    .pop()}`
                : null;

              const itemAmount = item.amount || item.total || 0;

              return (
                <View
                  key={`${item.cartId}-${index}`}
                  style={styles.orderItem}
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.orderItemImage}
                    />
                  ) : (
                    <View style={styles.orderItemImagePlaceholder}>
                      <Ionicons
                        name="image-outline"
                        size={20}
                        color="#9CA3AF"
                      />
                    </View>
                  )}
                  <View style={styles.orderItemDetails}>
                    <Text style={styles.orderItemName}>
                      {item.productName}
                    </Text>
                    <Text style={styles.orderItemQty}>
                      Qty: {item.quantity}
                    </Text>
                  </View>
                  <Text style={styles.orderItemPrice}>
                    {formatCurrency(itemAmount)}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyCartText}>No items in your order</Text>
            </View>
          )}

          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Subtotal ({cartItems.length} item
                {cartItems.length !== 1 ? "s" : ""})
              </Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(subtotal)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text
                style={[
                  styles.summaryValue,
                  isFreeDelivery(selectedLocation?.town?.delivery_fee) &&
                    styles.freeDeliveryValue,
                  (isNADelivery(selectedLocation?.town?.delivery_fee) ||
                    manualAddressVisible) &&
                    styles.naDeliveryValue,
                ]}
              >
                {formatDeliveryFeeDisplay()}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(calculateTotalAmount())}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>


      {/* Place Order Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handleCheckout}
          disabled={loading}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color="#fff"
          />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  loadingText: {
    color: "#374151",
    marginTop: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
    borderRadius: 999,
  },
  headerTextContainer: {
    flexDirection: "column",
  },
  headerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubText: {
    color: "#D1FAE5",
    fontSize: 11,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardHeaderIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  addressContainer: {
    flexDirection: "row",
    gap: 10,
  },
  addressInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: "#1F2937",
    backgroundColor: "#F9FAFB",
  },
  addressButton: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  addressButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  deliveryInfoCard: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  freeDeliveryCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  naDeliveryCard: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  deliveryInfoText: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "500",
  },
  freeDeliveryText: {
    color: "#10B981",
    fontWeight: "600",
  },
  naDeliveryText: {
    color: "#92400E",
    fontWeight: "600",
  },
  manualAddressContainer: {
    marginTop: 8,
  },
  manualAddressToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 6,
  },
  toggleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  manualAddressToggleText: {
    color: "#059669",
    fontSize: 13,
    fontWeight: "600",
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: "#F9FAFB",
  },
  paymentOptionSelected: {
    borderColor: "#059669",
    backgroundColor: "#ECFDF5",
  },
  paymentOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  paymentIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  paymentOptionText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
  paymentOptionTextSelected: {
    color: "#059669",
    fontWeight: "700",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonSelected: {
    borderColor: "#059669",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#059669",
  },
  warningCard: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
  },
  warningTextSmall: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  orderItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },
  orderItemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 2,
  },
  orderItemQty: {
    fontSize: 12,
    color: "#6B7280",
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  emptyCart: {
    alignItems: "center",
    paddingVertical: 28,
  },
  emptyCartText: {
    fontSize: 15,
    color: "#9CA3AF",
    marginTop: 6,
  },
  summarySection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  freeDeliveryValue: {
    color: "#10B981",
    fontWeight: "600",
  },
  naDeliveryValue: {
    color: "#F59E0B",
    fontWeight: "600",
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#DC2626",
  },
  bottomSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  placeOrderButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: "#FCA5A5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    gap: 8,
  },
  placeOrderText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default CheckoutScreen;
