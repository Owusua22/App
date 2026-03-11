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
  AppState,
  Modal,
  Pressable,
} from "react-native";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import { checkOutOrder, updateOrderDelivery } from "../redux/slice/orderSlice";
import { debitCustomer, checkTransactionStatus } from "../redux/slice/paymentSlice";
import { clearCart } from "../redux/slice/cartSlice";
import LocationsModal from "../components/Locations";

// Network logos
const mtnLogo = require("../assets/momo.png");
const vodafoneLogo = require("../assets/voda.jpeg");
const airteltigoLogo = require("../assets/AT.png");
const frankoLogo = require("../assets/frankoIcon.png");

const CART_KEYS_TO_CLEAR = [
  "cart",
  "cartId",
  "cartDetails",
  "checkoutDetails",
  "orderDeliveryDetails",
  "pendingOrderId",
  "selectedLocation",
];

// ==================== CONSTANTS ====================

const SERVICE_CHARGE_RATE = 0.01; // 1%
const SERVICE_CHARGE_CAP = 20.0;  // Fixed ₵20.00 cap for amounts above ₵2,000
const SERVICE_CHARGE_THRESHOLD = 2000; // Threshold amount

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
  const pollingRef = useRef(null);
  const countdownRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Customer and cart state
  const [customer, setCustomer] = useState({});
  const [cartItems, setCartItems] = useState([]);

  // Form state
  const [paymentMethod, setPaymentMethod] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientContactNumber, setRecipientContactNumber] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  // Loading states
  const [loading, setLoading] = useState(false);
  const [payButtonLoading, setPayButtonLoading] = useState(false);

  // Location state
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [manualAddressVisible, setManualAddressVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Order tracking
  const [usedOrderIds, setUsedOrderIds] = useState(new Set());
  const [currentOrderId, setCurrentOrderId] = useState(null);

  // Payment modal state
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [timeoutCountdown, setTimeoutCountdown] = useState(25);

  // Mobile Money state
  const [momoNumber, setMomoNumber] = useState("233");
  const [selectedNetwork, setSelectedNetwork] = useState(null);

  // Pending checkout details for after payment
  const [pendingCheckoutDetails, setPendingCheckoutDetails] = useState(null);
  const [pendingAddressDetails, setPendingAddressDetails] = useState(null);

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

  const isCashOnDeliveryAvailable = () => {
    if (manualAddressVisible || !selectedLocation) return false;
    return isFreeDelivery(selectedLocation.town?.delivery_fee);
  };

  const getAvailablePaymentMethods = () => {
    const methods = ["Mobile Money"];
    if (isCashOnDeliveryAvailable()) methods.unshift("Cash on Delivery");
    return methods;
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case "Mobile Money":
        return "phone-portrait-outline";
      case "Cash on Delivery":
        return "cash-outline";
      default:
        return "wallet-outline";
    }
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

  // Persist used IDs
  useEffect(() => {
    if (usedOrderIds.size === 0) return;
    AsyncStorage.setItem("usedOrderIds", JSON.stringify([...usedOrderIds])).catch(() => {});
  }, [usedOrderIds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // -----------------------------
  // Totals & Service Charge
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

  /**
   * Service charge logic (DISPLAY ONLY — backend handles actual charge):
   * - Amount ≤ ₵2,000 → 1% of the total
   * - Amount > ₵2,000 → fixed flat ₵20.00 (capped, no further increase)
   */
  const calculateServiceCharge = () => {
    const baseAmount = calculateTotalAmount();
    if (baseAmount > SERVICE_CHARGE_THRESHOLD) {
      return SERVICE_CHARGE_CAP; // flat GH₵20.00
    }
    return baseAmount * SERVICE_CHARGE_RATE; // 1%
  };

  /**
   * Display-only total (amount + service charge).
   * Shown to user so they know what the MoMo prompt will look like.
   * NOT sent to backend — backend calculates its own charge.
   */
  const calculateDisplayTotalWithCharge = () => {
    return calculateTotalAmount() + calculateServiceCharge();
  };

  /**
   * Helper to get the service charge label for display
   */
  const getServiceChargeLabel = () => {
    const baseAmount = calculateTotalAmount();
    if (baseAmount > SERVICE_CHARGE_THRESHOLD) {
      return `Service Charge`;
    }
    return `Service Charge `;
  };

  // -----------------------------
  // Storage helpers
  // -----------------------------
  const storeCheckoutDetailsLocally = async (checkoutDetails, addressDetails) => {
    await AsyncStorage.setItem("checkoutDetails", JSON.stringify(checkoutDetails));
    await AsyncStorage.setItem("orderDeliveryDetails", JSON.stringify(addressDetails));
  };

  const clearAllCartStorage = async () => {
    await AsyncStorage.multiRemove(CART_KEYS_TO_CLEAR);
  };

  // -----------------------------
  // Backend dispatch helpers
  // -----------------------------
  const dispatchOrderCheckoutWithRetry = async (checkoutDetails, maxRetries = 3) => {
    const cartId = (await AsyncStorage.getItem("cartId")) || checkoutDetails.Cartid;
    const payload = { ...checkoutDetails, Cartid: cartId };

    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await dispatch(checkOutOrder(payload)).unwrap();
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }
    throw new Error(
      `Checkout failed after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`
    );
  };

  const dispatchOrderAddressWithRetry = async (addressDetails, maxRetries = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await dispatch(updateOrderDelivery(addressDetails)).unwrap();
        dispatch(clearCart());
        await clearAllCartStorage();
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }
    throw new Error(
      `Address update failed after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`
    );
  };

  const processDirectCheckout = async (orderId, checkoutDetails, addressDetails) => {
    await dispatchOrderCheckoutWithRetry(checkoutDetails);
    await dispatchOrderAddressWithRetry(addressDetails);
  };

  // -----------------------------
  // Mobile Money Validation
  // -----------------------------
  const isValidMomoNumber = () => {
    return /^233[1-9]\d{8}$/.test(momoNumber);
  };

  const startsWithZeroAfter233 = () => {
    return momoNumber.length > 3 && momoNumber[3] === "0";
  };

  const handleMomoNumberChange = (text) => {
    let value = text.replace(/[^0-9]/g, "");

    if (value.startsWith("0")) {
      value = "233" + value.slice(1);
    }

    if (!value.startsWith("233")) {
      value = "233";
    }

    if (value.length > 12) {
      value = value.slice(0, 12);
    }

    setMomoNumber(value);
  };

  // -----------------------------
  // Payment Polling
  // -----------------------------
  const startPolling = (orderId, checkoutDetails, addressDetails) => {
    let elapsed = 0;
    setTimeoutCountdown(25);

    countdownRef.current = setInterval(() => {
      setTimeoutCountdown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    pollingRef.current = setInterval(async () => {
      elapsed += 1000;

      try {
        const response = await dispatch(
          checkTransactionStatus({ refNo: orderId })
        ).unwrap();

        if (response?.responseMessage === "Successfully Processed Transaction") {
          clearInterval(pollingRef.current);
          clearInterval(countdownRef.current);
          setPaymentStatus("success");

          try {
            await processDirectCheckout(orderId, checkoutDetails, addressDetails);
            await AsyncStorage.removeItem("checkoutDetails");
            await AsyncStorage.removeItem("orderDeliveryDetails");

            setTimeout(() => {
              setIsPaymentModalVisible(false);
              navigation.reset({
                index: 0,
                routes: [{ name: "OrderPlacedScreen", params: { orderId } }],
              });
            }, 1500);
          } catch (e) {
            Alert.alert(
              "Order Processing Error",
              "Payment succeeded, but we could not process your order. Please contact support."
            );
          }
        }
      } catch {
        // Ignore polling errors
      }

      if (elapsed >= 25000) {
        clearInterval(pollingRef.current);
        clearInterval(countdownRef.current);
        setPaymentStatus("failed");

        setTimeout(() => {
          setIsPaymentModalVisible(false);
          AsyncStorage.removeItem("checkoutDetails");
          AsyncStorage.removeItem("orderDeliveryDetails");
          navigation.reset({
            index: 0,
            routes: [{ name: "OrderCancellationScreen" }],
          });
        }, 2000);
      }
    }, 1000);
  };

  // -----------------------------
  // Pay Now Handler (Mobile Money)
  // -----------------------------
  const handlePayNow = async () => {
    if (!isValidMomoNumber()) {
      Alert.alert("Invalid Number", "Please enter a valid 9-digit number after 233");
      return;
    }

    if (!selectedNetwork) {
      Alert.alert("Network Required", "Please select your network provider");
      return;
    }

    try {
      setPayButtonLoading(true);
      setPaymentStatus("pending");

      // Send ONLY the base amount to backend — backend adds its own service charge
      await dispatch(
        debitCustomer({
          refNo: currentOrderId,
          msisdn: momoNumber,
          amount: calculateTotalAmount(), // ← base amount only, NO service charge
          network: selectedNetwork,
          narration: "franko",
        })
      ).unwrap();

      startPolling(currentOrderId, pendingCheckoutDetails, pendingAddressDetails);
    } catch (error) {
      setPaymentStatus("failed");

      setTimeout(() => {
        setIsPaymentModalVisible(false);
        Alert.alert("Payment Failed", "Payment initiation failed. Please try again.");
        navigation.reset({
          index: 0,
          routes: [{ name: "OrderCancellationScreen" }],
        });
      }, 2000);
    } finally {
      setPayButtonLoading(false);
    }
  };

  // -----------------------------
  // Finalize Order (for non-MoMo)
  // -----------------------------
  const finalizeOrderSuccess = useCallback(
    async (orderId, { checkoutDetails, addressDetails }) => {
      if (!orderId || hasFinalizedRef.current) return;
      hasFinalizedRef.current = true;

      try {
        setLoading(true);
        await processDirectCheckout(orderId, checkoutDetails, addressDetails);

        navigation.reset({
          index: 0,
          routes: [{ name: "OrderPlacedScreen", params: { orderId } }],
        });
      } catch (e) {
        hasFinalizedRef.current = false;
        Alert.alert(
          "Order Processing Error",
          e?.message || "We couldn't finalize your order."
        );
      } finally {
        setLoading(false);
        setCurrentOrderId(null);
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
    setPaymentMethod("");
    await AsyncStorage.setItem("selectedLocation", JSON.stringify(locationData));
    setLocationModalVisible(false);
  };

  const handleManualAddressToggle = async () => {
    const newVisible = !manualAddressVisible;
    setManualAddressVisible(newVisible);

    if (newVisible) {
      setSelectedLocation(null);
      setRecipientAddress("");
      setPaymentMethod("");
      await AsyncStorage.removeItem("selectedLocation");
    }
  };

  // -----------------------------
  // Checkout click
  // -----------------------------
  const handleCheckout = async () => {
    const isGuestName =
      recipientName.toLowerCase().trim() === "guest" ||
      recipientName.toLowerCase().trim() === "guest user" ||
      recipientName.toLowerCase().trim().includes("guest");

    if (isGuestName) {
      Alert.alert("Please Enter Your Actual Name", "Please enter your real name.");
      return;
    }
    if (!paymentMethod) {
      Alert.alert("Payment Method Required", "Please select a payment method.");
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
    setCurrentOrderId(orderId);

    const orderDate = new Date().toISOString();
    const cartId = await AsyncStorage.getItem("cartId");

    // Send ONLY the base total amount — NO service charge to backend
    const checkoutDetails = {
      Cartid: cartId,
      customerId: customer.customerAccountNumber,
      orderCode: orderId,
      PaymentMode: paymentMethod,
      PaymentAccountNumber: customer.contactNumber,
      customerAccountType: customer.accountType || "Customer",
      paymentService: paymentMethod === "Mobile Money" ? "Mtn" : "Cash",
      totalAmount: calculateTotalAmount(), // ← base amount only
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
      setLoading(true);

      if (paymentMethod !== "Mobile Money") {
        await finalizeOrderSuccess(orderId, { checkoutDetails, addressDetails });
        return;
      }

      await storeCheckoutDetailsLocally(checkoutDetails, addressDetails);
      setPendingCheckoutDetails(checkoutDetails);
      setPendingAddressDetails(addressDetails);

      setMomoNumber("233");
      setSelectedNetwork(null);
      setPaymentStatus("input");
      setIsPaymentModalVisible(true);
    } catch (e) {
      hasFinalizedRef.current = false;
      setCurrentOrderId(null);
      Alert.alert("Checkout Error", e?.message || "Checkout failed.");
    } finally {
      setLoading(false);
    }
  };

  const availablePaymentMethods = getAvailablePaymentMethods();

  // -----------------------------
  // Network Selection Component
  // -----------------------------
  const NetworkOption = ({ network, label, sublabel, logo, isSelected, onSelect }) => (
    <TouchableOpacity
      style={[
        styles.networkOption,
        isSelected && styles.networkOptionSelected,
        network === "mtn" && isSelected && styles.networkMtnSelected,
        network === "vodafone" && isSelected && styles.networkVodaSelected,
        network === "airteltigo" && isSelected && styles.networkAtSelected,
      ]}
      onPress={() => onSelect(network)}
      activeOpacity={0.7}
    >
      <Image source={logo} style={styles.networkLogo} resizeMode="contain" />
      <View style={styles.networkTextContainer}>
        <Text style={styles.networkLabel}>{label}</Text>
        <Text style={styles.networkSublabel}>{sublabel}</Text>
      </View>
      {isSelected && (
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={
            network === "mtn"
              ? "#EAB308"
              : network === "vodafone"
              ? "#EF4444"
              : "#3B82F6"
          }
        />
      )}
    </TouchableOpacity>
  );

  // -----------------------------
  // Payment Modal Content
  // -----------------------------
  const renderPaymentModalContent = () => {
    return (
      <View style={styles.modalContent}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Image source={frankoLogo} style={styles.frankoLogo} resizeMode="contain" />
          <Text style={styles.modalTitle}>Franko Trading Limited</Text>
        </View>

        {/* Amount Display — shows total WITH service charge (display only) */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>You will be prompted to pay</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(calculateDisplayTotalWithCharge())}
          </Text>
          {calculateServiceCharge() > 0 && (
            <Text style={styles.amountBreakdown}>
              (Includes {formatCurrency(calculateServiceCharge())} service fee
              {calculateTotalAmount() > SERVICE_CHARGE_THRESHOLD ? " " : " "})
            </Text>
          )}
          <Text style={styles.orderRef}>Order Ref: {currentOrderId}</Text>
        </View>

        {/* Input Stage */}
        {paymentStatus === "input" && (
          <>
            {/* Step 1: Phone Number */}
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={styles.stepTitle}>Enter Your Mobile Money Number</Text>
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.momoInput}
                  placeholder="233XXXXXXXXX"
                  value={momoNumber}
                  onChangeText={handleMomoNumberChange}
                  keyboardType="phone-pad"
                  maxLength={12}
                />
              </View>
              <Text style={styles.inputHint}>
                Enter the phone number registered for Mobile Money
              </Text>
              
              {startsWithZeroAfter233() && (
                <Text style={styles.errorText}>
                  ⚠️ Do not begin the number with 0 after 233
                </Text>
              )}
              {momoNumber.length === 12 && !isValidMomoNumber() && !startsWithZeroAfter233() && (
                <Text style={styles.errorText}>
                  ⚠️ Please enter a valid 9-digit number after 233
                </Text>
              )}
              {isValidMomoNumber() && (
                <View style={styles.successContainer}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={styles.successText}>Valid mobile money number</Text>
                </View>
              )}
            </View>

            {/* Step 2: Network Selection */}
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Select your Mobile Money Network</Text>
              </View>

              <NetworkOption
                network="mtn"
                label="MTN"
                sublabel="MTN Mobile Money"
                logo={mtnLogo}
                isSelected={selectedNetwork === "mtn"}
                onSelect={setSelectedNetwork}
              />

              <NetworkOption
                network="vodafone"
                label="Vodafone"
                sublabel="Vodafone Cash"
                logo={vodafoneLogo}
                isSelected={selectedNetwork === "vodafone"}
                onSelect={setSelectedNetwork}
              />

              <NetworkOption
                network="airteltigo"
                label="AirtelTigo"
                sublabel="AirtelTigo Money"
                logo={airteltigoLogo}
                isSelected={selectedNetwork === "airteltigo"}
                onSelect={setSelectedNetwork}
              />
            </View>

            {/* Pay Button — shows display total, sends base amount */}
            <TouchableOpacity
              style={[
                styles.payButton,
                (!isValidMomoNumber() || !selectedNetwork || payButtonLoading) &&
                  styles.payButtonDisabled,
              ]}
              onPress={handlePayNow}
              disabled={!isValidMomoNumber() || !selectedNetwork || payButtonLoading}
              activeOpacity={0.8}
            >
              {payButtonLoading ? (
                <View style={styles.payButtonContent}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.payButtonText}>Sending payment request...</Text>
                </View>
              ) : (
                <View style={styles.payButtonContent}>
                  <Ionicons name="card-outline" size={22} color="#fff" />
                  <Text style={styles.payButtonText}>
                    Pay {formatCurrency(calculateDisplayTotalWithCharge())}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>📱 What happens next?</Text>
              <Text style={styles.instructionItem}>
                1. You will receive a payment prompt on your phone
              </Text>
            
              <Text style={styles.instructionItem}>
                2. Enter your Mobile Money PIN to approve
              </Text>
              <Text style={styles.instructionItem}>
                3. Wait for confirmation (usually takes 10-25 seconds)
              </Text>
              <Text style={styles.instructionItem}>
                4. Your order will be processed immediately after payment
              </Text>
              <Text style={styles.instructionTip}>
                💡 Tip: Keep your phone nearby to approve the payment
              </Text>
            </View>
          </>
        )}

        {/* Pending Stage */}
        {paymentStatus === "pending" && (
          <View style={styles.statusContainer}>
            <View style={styles.spinnerContainer}>
              <ActivityIndicator size="large" color="#059669" />
              <Ionicons
                name="phone-portrait-outline"
                size={32}
                color="#059669"
                style={styles.phoneIcon}
              />
            </View>
            <Text style={styles.statusTitle}>Payment Request Sent!</Text>
            <Text style={styles.statusSubtitle}>📱 Check your phone now</Text>
            <Text style={styles.statusText}>
              A payment prompt has been sent to
            </Text>
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentNumber}>{momoNumber}</Text>
              <Text style={styles.paymentNetwork}>
                Network: {selectedNetwork?.toUpperCase()}
              </Text>
              <Text style={styles.paymentAmount}>
                Amount: {formatCurrency(calculateDisplayTotalWithCharge())}
              </Text>
              <Text style={styles.paymentFeeNote}>
                (includes {formatCurrency(calculateServiceCharge())} service fee)
              </Text>
            </View>
          </View>
        )}

        {/* Success Stage */}
        {paymentStatus === "success" && (
          <View style={styles.statusContainer}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.statusText}>Your order is being processed...</Text>
          </View>
        )}

        {/* Failed Stage */}
        {paymentStatus === "failed" && (
          <View style={styles.statusContainer}>
            <Text style={styles.failedIcon}>❌</Text>
            <Text style={styles.failedTitle}>Payment Failed</Text>
            <Text style={styles.statusText}>The transaction was not completed</Text>
          </View>
        )}
      </View>
    );
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
          <Text style={styles.headerSubText}>Secure payment & fast delivery</Text>
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
            placeholder="Any instructions?"
          />
        </View>

        {/* Payment Methods */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Method *</Text>

          {availablePaymentMethods.map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                styles.paymentOption,
                paymentMethod === method && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod(method)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons
                  name={getPaymentIcon(method)}
                  size={20}
                  color={paymentMethod === method ? "#059669" : "#6B7280"}
                />
                <Text
                  style={[
                    styles.paymentText,
                    paymentMethod === method && styles.paymentTextSelected,
                  ]}
                >
                  {method}
                </Text>
              </View>

              {paymentMethod === method ? (
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
              ) : (
                <Ionicons name="ellipse-outline" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          ))}

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

          {/* Service Charge row (display only) */}
          {paymentMethod === "Mobile Money" && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{getServiceChargeLabel()}</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(calculateServiceCharge())}
              </Text>
            </View>
          )}

          <View style={[styles.summaryRow, { marginTop: 10 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {paymentMethod === "Mobile Money"
                ? formatCurrency(calculateDisplayTotalWithCharge())
                : formatCurrency(calculateTotalAmount())}
            </Text>
          </View>

          {/* Informational note */}
          {paymentMethod === "Mobile Money" && (
            <Text style={styles.totalNote}>
              * Service charge is applied by your mobile money provider
            </Text>
          )}
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
            Place Order •{" "}
            {paymentMethod === "Mobile Money"
              ? formatCurrency(calculateDisplayTotalWithCharge())
              : formatCurrency(calculateTotalAmount())}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Locations Modal */}
      <LocationsModal
        isVisible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onLocationSelect={handleLocationSelect}
        selectedLocation={selectedLocation}
      />

      {/* Payment Modal */}
      <Modal
        visible={isPaymentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (paymentStatus === "input") {
            clearInterval(countdownRef.current);
            setIsPaymentModalVisible(false);
            setPaymentStatus("idle");
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {paymentStatus === "input" && (
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  clearInterval(countdownRef.current);
                  setIsPaymentModalVisible(false);
                  setPaymentStatus("idle");
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {renderPaymentModalContent()}
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  paymentOption: {
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentOptionSelected: { borderColor: "#059669", backgroundColor: "#ECFDF5" },
  paymentText: { fontSize: 14, color: "#6B7280", fontWeight: "700" },
  paymentTextSelected: { color: "#059669" },

  serviceChargeNotice: {
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 10,
    marginTop: 5,
  },
  serviceChargeText: {
    color: "#1E40AF",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
  serviceChargeHint: {
    color: "#6B7280",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },

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
  totalNote: {
    color: "#9CA3AF",
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },

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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingCard: { backgroundColor: "#fff", padding: 18, borderRadius: 16, alignItems: "center" },
  loadingText: { marginTop: 10, fontWeight: "700", color: "#111827" },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: 10,
  },
  frankoLogo: {
    height: 48,
    width: 120,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
    marginTop: 8,
  },

  // Amount Display
  amountContainer: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
  },
  amountValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#059669",
    marginTop: 4,
  },
  amountBreakdown: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 6,
    textAlign: "center",
  },
  orderRef: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 6,
  },

  // Step Container
  stepContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  stepBadge: {
    backgroundColor: "#059669",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stepBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  // Input
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  momoInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 10,
    paddingVertical: 12,
  },
  inputHint: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
    marginTop: 6,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  successText: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
  },

  // Network Options
  networkOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  networkOptionSelected: {
    borderColor: "#059669",
    backgroundColor: "#F0FDF4",
  },
  networkMtnSelected: {
    borderColor: "#EAB308",
    backgroundColor: "#FEFCE8",
  },
  networkVodaSelected: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  networkAtSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  networkLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  networkTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  networkLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  networkSublabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },

  // Pay Button
  payButton: {
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  payButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  payButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },

  // Instructions
  instructionsContainer: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E40AF",
    marginBottom: 10,
  },
  instructionItem: {
    fontSize: 12,
    color: "#1E3A8A",
    marginBottom: 6,
    lineHeight: 18,
  },
  instructionTip: {
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: "600",
    marginTop: 8,
  },

  // Status Container
  statusContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  spinnerContainer: {
    position: "relative",
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  phoneIcon: {
    position: "absolute",
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginTop: 20,
  },
  statusSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
  paymentDetails: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: "center",
  },
  paymentNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  paymentNetwork: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  paymentAmount: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
    marginTop: 8,
  },
  paymentFeeNote: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },

  successIcon: {
    fontSize: 70,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#059669",
    marginTop: 16,
  },
  failedIcon: {
    fontSize: 70,
  },
  failedTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#EF4444",
    marginTop: 16,
  },
});