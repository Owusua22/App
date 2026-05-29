// src/screens/PaymentHelpScreen.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
  Platform,
  ScrollView,
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch } from "react-redux";
import { checkTransactionStatus } from "../redux/slice/paymentSlice";
import { checkOutOrder, updateOrderDelivery } from "../redux/slice/orderSlice";
import { clearCart } from "../redux/slice/cartSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const mtnLogo      = require("../assets/momo.png");
const vodafoneLogo = require("../assets/voda.jpeg");
const atLogo       = require("../assets/AT.png");

/* ═══════════════════════════════════════════════════════════
 *  CONSTANTS — mirrors web Checkout.jsx exactly
 * ═══════════════════════════════════════════════════════════ */
const CART_KEYS_TO_CLEAR = [
  "cart", "cartId", "cartDetails", "checkoutDetails",
  "pendingOrderId", "selectedLocation", "orderDeliveryDetails",
];

const AUTO_CHECK_DELAY_MS = 120_000; // 2 minutes — same as web AUTO_CHECK_DELAY_MS

/* ─── Colour System ───────────────────────────────────── */
const C = {
  primary:      "#059669",
  primaryDark:  "#047857",
  primaryDeep:  "#064E3B",
  primaryLight: "#34D399",
  primaryGhost: "#ECFDF5",
  bg:           "#F8FAFC",
  surface:      "#FFFFFF",
  textMain:     "#0F172A",
  textSub:      "#64748B",
  textMuted:    "#94A3B8",
  border:       "#E2E8F0",
  borderLight:  "#F1F5F9",
  borderHair:   "#E5E7EB",
  danger:       "#EF4444",
  dangerDark:   "#DC2626",
  dangerGhost:  "#FEF2F2",
  warning:      "#F59E0B",
  warningDark:  "#D97706",
  warningGhost: "#FFFBEB",
  success:      "#10B981",
  successGhost: "#ECFDF5",
  white:        "#FFFFFF",
  overlay:      "rgba(15,23,42,0.6)",

  mtn:       { accent: "#F59E0B", dark: "#D97706", bg: "#FFFBEB", border: "#FDE68A", gradient: ["#F59E0B", "#EF8C0B"] },
  vodafone:  { accent: "#EF4444", dark: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5", gradient: ["#EF4444", "#DC2626"] },
  airteltigo:{ accent: "#3B82F6", dark: "#2563EB", bg: "#EFF6FF", border: "#93C5FD", gradient: ["#3B82F6", "#2563EB"] },
};

/* ─── Helpers ─────────────────────────────────────────── */
const fmt = (v) => {
  const n = Number(v) || 0;
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const itemImageUri = (p) =>
  p ? `https://testing.frankotrading.com/Media/Products_Images/${p.split("\\").pop()}` : null;

const formatMomo = (num) => {
  if (!num) return "";
  const c = num.replace(/\D/g, "");
  if (c.length === 12) return `+${c.slice(0,3)} ${c.slice(3,6)} ${c.slice(6,9)} ${c.slice(9)}`;
  if (c.length === 10) return `${c.slice(0,3)} ${c.slice(3,6)} ${c.slice(6)}`;
  return c;
};

/**
 * Exact match — mirrors web Checkout.jsx isPaymentSuccess
 * code === "01" AND message includes "successfully" + "processed" + "transaction"
 */
const isPaymentSuccess = (response) => {
  if (!response) return false;
  const code = response.responseCode;
  const msg  = (response.responseMessage || "").toLowerCase().trim();
  const result = code === "01" && msg.includes("successfully") && msg.includes("processed") && msg.includes("transaction");
  console.log("[PaymentHelp][isPaymentSuccess]", { responseCode: code, responseMessage: response.responseMessage, result });
  return result;
};

const formatAutoCheckTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

/* ─── Network Config ──────────────────────────────────── */
const NETWORK_CONFIG = {
  mtn: {
    name: "MTN Mobile Money", short: "MTN MoMo",
    logo: mtnLogo, theme: C.mtn, ussd: "*170#",
    steps: [
      { icon: "keypad-outline",               title: "Dial *170#",       desc: "Open dialer & enter USSD code" },
      { icon: "menu-outline",                  title: "Select Option 6",  desc: "Choose 'My Wallet'" },
      { icon: "checkmark-circle-outline",      title: "Select Option 3",  desc: "Navigate to 'My Approvals'" },
      { icon: "lock-closed-outline",           title: "Enter MoMo PIN",   desc: "4-digit PIN to see pending requests" },
      { icon: "search-outline",                title: "Find Transaction",  desc: "Look for 'Franko Trading' in the list" },
      { icon: "checkmark-done-circle-outline", title: "Approve Payment",  desc: "Select YES to confirm payment" },
    ],
    tip: "Open MTN MoMo app → Tap 'Approve' or notification → Confirm with PIN",
  },
  vodafone: {
    name: "Vodafone Cash", short: "Vodafone Cash",
    logo: vodafoneLogo, theme: C.vodafone, ussd: "*110#",
    steps: [
      { icon: "keypad-outline",               title: "Dial *110#",       desc: "Open dialer & enter USSD code" },
      { icon: "menu-outline",                  title: "Select Option 4",  desc: "Choose 'Make Payments'" },
      { icon: "checkmark-circle-outline",      title: "Select Option 8",  desc: "Navigate to 'Pending Approvals'" },
      { icon: "lock-closed-outline",           title: "Enter PIN",        desc: "Type PIN to view pending transactions" },
      { icon: "search-outline",                title: "Find Transaction",  desc: "Look for 'Franko Trading' in the list" },
      { icon: "checkmark-done-circle-outline", title: "Approve Payment",  desc: "Select YES to confirm payment" },
    ],
    tip: "Open Vodafone Cash app → Pending → Find request → Approve with PIN",
  },
  airteltigo: {
    name: "AirtelTigo Money", short: "AirtelTigo",
    logo: atLogo, theme: C.airteltigo, ussd: "*110#",
    steps: [
      { icon: "keypad-outline",               title: "Dial *110#",       desc: "Open dialer & enter USSD code" },
      { icon: "menu-outline",                  title: "Select Option 6",  desc: "Choose 'Wallet' / 'AirtelTigo Money'" },
      { icon: "checkmark-circle-outline",      title: "Select Pending",   desc: "Navigate to pending requests" },
      { icon: "lock-closed-outline",           title: "Enter PIN",        desc: "Type 4-digit PIN to view transactions" },
      { icon: "search-outline",                title: "Find Transaction",  desc: "Look for 'Franko Trading' in the list" },
      { icon: "checkmark-done-circle-outline", title: "Approve Payment",  desc: "Select Approve to confirm" },
    ],
    tip: "Open AirtelTigo Money app → Pending Approvals → Find request → Approve",
  },
};

const API_TO_KEY = {
  MTN: "mtn", VODAFONE: "vodafone", TIGO: "airteltigo",
  VOD: "vodafone", ATL: "airteltigo", ATT: "airteltigo",
  mtn: "mtn", vodafone: "vodafone", airteltigo: "airteltigo",
};
const getNetworkConfig = (code) =>
  NETWORK_CONFIG[API_TO_KEY[code] ?? String(code ?? "").toLowerCase()] ?? NETWORK_CONFIG.mtn;

/* ─── PulsingDot ─────────────────────────────────────── */
const PulsingDot = ({ color = C.success, size = 6 }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 0.2, duration: 800, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1,   duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: anim }} />
  );
};

/* ─── ResultOverlay ──────────────────────────────────── */
const ResultOverlay = ({ status, orderId, onDismiss }) => {
  const scale   = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const ok = status === "success";
  return (
    <Animated.View style={[styles.overlayBack, { opacity }]}>
      <Animated.View style={[styles.overlayCard, { transform: [{ scale }] }]}>
        <View style={[styles.overlayIcon, { backgroundColor: ok ? C.successGhost : C.dangerGhost }]}>
          <Ionicons name={ok ? "checkmark-circle" : "close-circle"} size={68} color={ok ? C.success : C.danger} />
        </View>
        <Text style={[styles.overlayTitle, { color: ok ? C.success : C.danger }]}>
          {ok ? "Payment Confirmed!" : "Payment Not Found"}
        </Text>
        <Text style={styles.overlaySub}>
          {ok ? "Your order has been placed successfully." : "We could not confirm your payment. Your order has been cancelled."}
        </Text>
        {orderId ? (
          <View style={styles.overlayRef}>
            <Text style={styles.overlayRefLabel}>Ref: </Text>
            <Text style={styles.overlayRefVal}>{orderId}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.overlayBtn, { backgroundColor: ok ? C.primary : C.danger }]}
          onPress={onDismiss}
        >
          <Text style={styles.overlayBtnText}>{ok ? "View Order" : "Go Back"}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

/* ═══════════════════════════════════════════════════════════
 *  MAIN SCREEN — exact port of web Approval Guide phase
 * ═══════════════════════════════════════════════════════════ */
const PaymentHelpScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const insets   = useSafeAreaInsets();

  const {
    orderId,
    network: networkApiCode,
    momoNumber,
    amount,
    checkoutDetails,
    addressDetails,
    cartItems = [],
  } = route?.params ?? {};

  const cfg       = getNetworkConfig(networkApiCode);
  const { theme } = cfg;
  const itemCount = cartItems.length;

  /* ── State ── */
  const [autoCheckCountdown, setAutoCheckCountdown] = useState(AUTO_CHECK_DELAY_MS / 1000);
  const [manualVerifying, setManualVerifying]       = useState(false);
  const [redirecting, setRedirecting]               = useState(false);
  const [resultStatus, setResultStatus]             = useState(null);
  const [showSteps, setShowSteps]                   = useState(false);
  const [showSummary, setShowSummary]               = useState(false);
  const [lastCheckResult, setLastCheckResult]       = useState(null); // "success" | "not_confirmed" | null

  /* ── Refs ── */
  const mountedRef        = useRef(true);
  const paymentResolvedRef = useRef(false); // mirrors web paymentResolvedRef
  const autoCheckFiredRef  = useRef(false); // mirrors web autoCheckFiredRef
  const orderProcessedRef  = useRef(false);
  const autoCheckTimerRef  = useRef(null);  // setTimeout for auto-check
  const autoCountdownRef   = useRef(null);  // setInterval for countdown UI
  const redirectTimerRef   = useRef(null);

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearAllTimers();
    };
  }, []);

  const clearAllTimers = useCallback(() => {
    if (autoCheckTimerRef.current) clearTimeout(autoCheckTimerRef.current);
    if (autoCountdownRef.current)  clearInterval(autoCountdownRef.current);
    if (redirectTimerRef.current)  clearTimeout(redirectTimerRef.current);
    autoCheckTimerRef.current = null;
    autoCountdownRef.current  = null;
    redirectTimerRef.current  = null;
  }, []);

  /* ── Storage ── */
  const clearStorage = useCallback(async () => {
    try { await AsyncStorage.multiRemove(CART_KEYS_TO_CLEAR); } catch (_) {}
  }, []);

  /* ── Order submission (idempotent — mirrors web processDirectCheckout) ── */
  const processOrder = useCallback(async () => {
    if (orderProcessedRef.current) {
      console.log("[PaymentHelp] Order already processed — skipping.");
      return;
    }
    orderProcessedRef.current = true;

    const retry = async (fn, n = 3) => {
      let err;
      for (let i = 1; i <= n; i++) {
        try { return await fn(); }
        catch (e) { err = e; if (i < n) await new Promise(r => setTimeout(r, 2 ** i * 1000)); }
      }
      throw err;
    };

    try {
      const cartId = (await AsyncStorage.getItem("cartId")) || checkoutDetails?.Cartid;
      await retry(() => dispatch(checkOutOrder({ ...checkoutDetails, Cartid: cartId })).unwrap());
      await retry(async () => {
        await dispatch(updateOrderDelivery(addressDetails)).unwrap();
        dispatch(clearCart());
        await clearStorage();
      });
      console.log("[PaymentHelp] Order submitted.");
    } catch (e) {
      orderProcessedRef.current = false;
      throw e;
    }
  }, [dispatch, checkoutDetails, addressDetails, clearStorage]);

  /* ══════════════════════════════════════════════════
   *  handlePaymentSuccessFlow
   *  Exact mirror of web handlePaymentSuccessFlow
   * ═════════════════════════════════════════════════*/
  const handlePaymentSuccessFlow = useCallback(async () => {
    if (paymentResolvedRef.current) return;
    paymentResolvedRef.current = true;
    clearAllTimers();

    if (!mountedRef.current) return;
    setResultStatus("success");
    setRedirecting(true);

    try {
      await processOrder();
    } catch (e) {
      console.error("[PaymentHelp] processOrder failed:", e);
      if (mountedRef.current) {
        Alert.alert(
          "Order Issue",
          `Payment confirmed but order recording failed.\nRef: ${orderId}\nPlease contact support.`,
          [{ text: "OK" }]
        );
      }
    }

    // Navigate after brief success display — same as web's setTimeout 1500
    redirectTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      navigation.reset({
        index: 0,
        routes: [{ name: "OrderPlacedScreen", params: { orderId } }],
      });
    }, 1500);
  }, [clearAllTimers, processOrder, navigation, orderId]);

  /* ══════════════════════════════════════════════════
   *  navigateToCancel — mirrors web performCancelOrder
   * ═════════════════════════════════════════════════*/
  const navigateToCancel = useCallback((reason = "Cancelled by user") => {
    if (paymentResolvedRef.current) return;
    paymentResolvedRef.current = true;
    clearAllTimers();

    if (!mountedRef.current) return;
    setResultStatus("failed");
    setRedirecting(true);

    redirectTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      navigation.reset({
        index: 0,
        routes: [{ name: "OrderCancellationScreen", params: { orderId, reason } }],
      });
    }, 1500);
  }, [clearAllTimers, navigation, orderId]);

  /* ══════════════════════════════════════════════════
   *  AUTO-CHECK useEffect
   *  Exact mirror of web useEffect watching isApprovalGuideVisible
   *
   *  Sets up a 2-minute countdown. When it hits zero,
   *  fires ONE checkTransactionStatus call.
   *
   *  On success → navigate to success
   *  On failure → show warning (NO auto-cancel, just like web)
   * ═════════════════════════════════════════════════*/
  useEffect(() => {
    if (!orderId) return;

    // Reset guards
    autoCheckFiredRef.current = false;

    // Countdown UI
    const totalSeconds = AUTO_CHECK_DELAY_MS / 1000;
    setAutoCheckCountdown(totalSeconds);

    autoCountdownRef.current = setInterval(() => {
      if (!mountedRef.current || paymentResolvedRef.current) {
        clearInterval(autoCountdownRef.current);
        return;
      }
      setAutoCheckCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(autoCountdownRef.current);
          autoCountdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Fire auto-check after 2 minutes — mirrors web setTimeout(AUTO_CHECK_DELAY_MS)
    autoCheckTimerRef.current = setTimeout(async () => {
      if (autoCheckFiredRef.current || paymentResolvedRef.current || !mountedRef.current) return;
      autoCheckFiredRef.current = true;

      console.log("[PaymentHelp] Auto-check fired at 2 min for:", orderId);

      try {
        const response = await dispatch(
          checkTransactionStatus({ refNo: orderId })
        ).unwrap();

        if (isPaymentSuccess(response)) {
          await handlePaymentSuccessFlow();
        } else {
          // Web: message.warning("Payment not yet confirmed...")
          // Just show a non-blocking alert — NO auto-cancel
          console.log("[PaymentHelp] Auto-check: payment not confirmed yet.", response?.responseCode, response?.responseMessage);
          if (mountedRef.current) {
            Alert.alert(
              "Still Pending",
              "Payment not yet confirmed. Please approve on your phone or tap 'I've Approved' to check again.",
              [{ text: "OK" }]
            );
          }
        }
      } catch (err) {
        console.warn("[PaymentHelp] Auto-check error:", err);
        if (mountedRef.current) {
          Alert.alert(
            "Check Failed",
            "Could not verify payment automatically. Use 'I've Approved' to check manually.",
            [{ text: "OK" }]
          );
        }
      }
    }, AUTO_CHECK_DELAY_MS);

    return () => {
      if (autoCountdownRef.current) clearInterval(autoCountdownRef.current);
      if (autoCheckTimerRef.current) clearTimeout(autoCheckTimerRef.current);
      autoCountdownRef.current = null;
      autoCheckTimerRef.current = null;
    };
  }, [orderId, dispatch, handlePaymentSuccessFlow]);

  /* ══════════════════════════════════════════════════
   *  handleManualConfirm
   *  Exact mirror of web handleManualConfirm
   *
   *  User taps "I've Approved" → immediate check
   *  Success → navigate
   *  Failure → show not_confirmed dialog
   * ═════════════════════════════════════════════════*/
  const handleManualConfirm = useCallback(async () => {
    if (!orderId || paymentResolvedRef.current) return;

    try {
      setManualVerifying(true);
      setLastCheckResult(null);

      console.log("[PaymentHelp] Manual confirm — checking:", orderId);

      const response = await dispatch(
        checkTransactionStatus({ refNo: orderId })
      ).unwrap();

      if (isPaymentSuccess(response)) {
        // Cancel auto-check timer if still pending
        if (autoCheckTimerRef.current) clearTimeout(autoCheckTimerRef.current);
        if (autoCountdownRef.current) clearInterval(autoCountdownRef.current);

        await handlePaymentSuccessFlow();
      } else {
        // Not confirmed — mirror web: set actionDialog({ open: true, mode: "not_confirmed" })
        setLastCheckResult("not_confirmed");
        console.log("[PaymentHelp] Manual confirm: not confirmed.", response?.responseCode, response?.responseMessage);
      }
    } catch (err) {
      console.warn("[PaymentHelp] Manual confirm error:", err);
      setLastCheckResult("not_confirmed");
    } finally {
      if (mountedRef.current) setManualVerifying(false);
    }
  }, [orderId, dispatch, handlePaymentSuccessFlow]);

  /* ══════════════════════════════════════════════════
   *  handleDialogRetry
   *  From the "not confirmed" dialog — user taps "Try Again"
   * ═════════════════════════════════════════════════*/
  const handleDialogRetry = useCallback(() => {
    setLastCheckResult(null);
    handleManualConfirm();
  }, [handleManualConfirm]);

  /* ══════════════════════════════════════════════════
   *  handleDialogCancel
   *  From either dialog — user taps "Yes, Cancel Order"
   * ═════════════════════════════════════════════════*/
  const handleDialogCancel = useCallback(() => {
    setLastCheckResult(null);
    navigateToCancel("Cancelled by user");
  }, [navigateToCancel]);

  /* ── Cancel order button (opens cancel dialog) ── */
  const handleCancelFromGuide = useCallback(() => {
    // Mirror web: setActionDialog({ open: true, mode: "cancel" })
    Alert.alert(
      "Cancel Order?",
      "Are you sure you want to cancel this order?",
      [
        { text: "Keep Trying", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => navigateToCancel("Cancelled by user"),
        },
      ],
      { cancelable: false }
    );
  }, [navigateToCancel]);

  /* ── Overlay dismiss ── */
  const handleOverlayDismiss = useCallback(() => {
    if (resultStatus === "success") {
      navigation.reset({ index: 0, routes: [{ name: "OrderPlacedScreen", params: { orderId } }] });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "OrderCancellationScreen", params: { orderId, reason: "Payment not confirmed" } }],
      });
    }
  }, [resultStatus, navigation, orderId]);

  /* ── Derived ── */
  const urgentTimer = autoCheckCountdown <= 30;

  /* ══════════════════════════════════════════════════
   *  "Not Confirmed" Dialog
   *  Mirror of web PaymentActionDialog with mode="not_confirmed"
   * ═════════════════════════════════════════════════*/
  const renderNotConfirmedDialog = () => {
    if (lastCheckResult !== "not_confirmed") return null;
    return (
      <Animated.View style={[styles.overlayBack, { opacity: 1 }]} pointerEvents="auto">
        <View style={styles.dialogCard}>
          <View style={[styles.dialogBar, { backgroundColor: C.warning }]} />
          <View style={styles.dialogBody}>
            <View style={[styles.dialogIcon, { backgroundColor: C.warningGhost }]}>
              <Ionicons name="alert-circle" size={32} color={C.warningDark} />
            </View>
            <Text style={styles.dialogTitle}>Payment not confirmed yet</Text>
            <Text style={styles.dialogDesc}>
              We couldn't verify your payment. Please approve via your MoMo app or USSD, then try again.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                onPress={handleDialogRetry}
                disabled={manualVerifying}
                style={[styles.dialogBtnPrimary, manualVerifying && { opacity: 0.5 }]}
                activeOpacity={0.85}
              >
                {manualVerifying ? (
                  <View style={styles.dialogBtnInner}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.dialogBtnPrimaryText}>Verifying…</Text>
                  </View>
                ) : (
                  <View style={styles.dialogBtnInner}>
                    <Ionicons name="refresh" size={16} color="#fff" />
                    <Text style={styles.dialogBtnPrimaryText}>I've Approved — Try Again</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDialogCancel}
                disabled={manualVerifying}
                style={[styles.dialogBtnDanger, manualVerifying && { opacity: 0.5 }]}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle-outline" size={16} color={C.danger} />
                <Text style={styles.dialogBtnDangerText}>Yes, Cancel Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  /* ══════════════════════════════════════════════════
   *  RENDER
   * ═════════════════════════════════════════════════*/
  return (
    <View style={styles.root}>
      {/* Result overlay */}
      {resultStatus !== null && (
        <ResultOverlay status={resultStatus} orderId={orderId} onDismiss={handleOverlayDismiss} />
      )}

      {/* "Not Confirmed" dialog — mirrors web PaymentActionDialog */}
      {renderNotConfirmedDialog()}

      {/* ── HEADER ── */}
      <LinearGradient
        colors={theme.gradient}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            disabled={redirecting}
          >
            <Ionicons name="chevron-back" size={18} color={C.white} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Complete Payment</Text>
            <View style={styles.statusRow}>
              <PulsingDot color="#FFFDE7" size={5} />
              <Text style={styles.statusText}>
                {redirecting ? "Redirecting…" : "Waiting for approval"}
              </Text>
              {!redirecting && (
                <View style={[styles.timerPill, urgentTimer && { backgroundColor: "rgba(239,68,68,0.2)" }]}>
                  <Ionicons name={urgentTimer ? "alarm" : "time-outline"} size={11} color={urgentTimer ? "#FCA5A5" : C.white} />
                  <Text style={[styles.timerText, { color: urgentTimer ? "#FCA5A5" : C.white }]}>
                    {formatAutoCheckTime(autoCheckCountdown)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Image source={cfg.logo} style={styles.networkIcon} />
        </View>

        <View style={styles.amountRow}>
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>AMOUNT</Text>
            <Text style={styles.amountValue}>{fmt(amount)}</Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>NETWORK</Text>
            <Text style={styles.amountSub}>{cfg.short}</Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>PHONE</Text>
            <Text style={styles.amountSub}>{formatMomo(momoNumber)}</Text>
          </View>
        </View>

        <View style={styles.refRow}>
          <Ionicons name="receipt-outline" size={10} color="rgba(255,255,255,0.6)" />
          <Text style={styles.refLabel}>Ref: </Text>
          <Text style={styles.refValue}>{orderId}</Text>
        </View>
      </LinearGradient>

      {/* ── CONTENT ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Auto-check countdown — mirrors web co-auto-check-bar */}
        {!redirecting && (
          <View style={styles.autoCheckBar}>
            <View style={styles.autoCheckLeft}>
              <Ionicons name="time-outline" size={14} color={C.warningDark} />
              <Text style={styles.autoCheckLabel}>Auto-checking payment in</Text>
            </View>
            <Text style={[styles.autoCheckTime, urgentTimer && { color: C.danger }]}>
              {formatAutoCheckTime(autoCheckCountdown)}
            </Text>
          </View>
        )}

        {/* USSD Quick Dial */}
        <View style={[styles.ussdCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <View style={[styles.ussdIconWrap, { backgroundColor: `${theme.accent}20` }]}>
            <Ionicons name="call-outline" size={18} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.ussdLabel, { color: theme.accent }]}>DIAL TO APPROVE</Text>
            <Text style={[styles.ussdCode,  { color: theme.dark   }]}>{cfg.ussd}</Text>
          </View>
        </View>

        {/* Steps toggle */}
        <TouchableOpacity style={styles.toggleRow} onPress={() => setShowSteps(s => !s)} activeOpacity={0.7}>
          <View style={[styles.toggleIcon, { backgroundColor: `${theme.accent}15` }]}>
            <Ionicons name="list-outline" size={14} color={theme.accent} />
          </View>
          <Text style={styles.toggleText}>{showSteps ? "Hide" : "Show"} {cfg.steps.length} Steps</Text>
          <Ionicons name={showSteps ? "chevron-up" : "chevron-down"} size={14} color={C.textSub} />
        </TouchableOpacity>

        {showSteps && (
          <View style={styles.stepsCard}>
            {cfg.steps.map((step, idx) => {
              const isLast = idx === cfg.steps.length - 1;
              return (
                <View key={idx} style={styles.stepRow}>
                  <View style={styles.stepTimeline}>
                    <LinearGradient
                      colors={isLast ? [theme.accent, theme.dark] : [C.primary, C.primaryDark]}
                      style={styles.stepDot}
                    >
                      {isLast ? <Ionicons name="checkmark" size={10} color={C.white} /> : <Text style={styles.stepNum}>{idx + 1}</Text>}
                    </LinearGradient>
                    {!isLast && <View style={[styles.stepLine, { backgroundColor: `${theme.accent}30` }]} />}
                  </View>
                  <View style={styles.stepContent}>
                    <View style={[styles.stepIconBox, { backgroundColor: theme.bg }]}>
                      <Ionicons name={step.icon} size={12} color={theme.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            <View style={[styles.tipBox, { backgroundColor: C.warningGhost }]}>
              <Ionicons name="flash" size={12} color={C.warningDark} />
              <Text style={styles.tipText}>{cfg.tip}</Text>
            </View>
          </View>
        )}

        {/* Order Summary toggle */}
        {itemCount > 0 && (
          <>
            <TouchableOpacity style={styles.toggleRow} onPress={() => setShowSummary(s => !s)} activeOpacity={0.7}>
              <View style={[styles.toggleIcon, { backgroundColor: C.primaryGhost }]}>
                <Ionicons name="bag-handle-outline" size={14} color={C.primary} />
              </View>
              <Text style={styles.toggleText}>Order Summary ({itemCount} item{itemCount !== 1 ? "s" : ""})</Text>
              <View style={styles.totalBadge}><Text style={styles.totalBadgeText}>{fmt(amount)}</Text></View>
              <Ionicons name={showSummary ? "chevron-up" : "chevron-down"} size={14} color={C.textSub} />
            </TouchableOpacity>

            {showSummary && (
              <View style={styles.summaryCard}>
                {cartItems.map((item, idx) => {
                  const uri = itemImageUri(item.imagePath);
                  const lineTotal = Number(item.amount) || Number(item.total) || 0;
                  const qty = Number(item.quantity) || 1;
                  return (
                    <View key={idx} style={[styles.cartItem, idx < itemCount - 1 && styles.cartItemBorder]}>
                      <View style={styles.cartImgWrap}>
                        {uri ? <Image source={{ uri }} style={styles.cartImg} /> : <Ionicons name="cube-outline" size={16} color={C.textMuted} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartName} numberOfLines={1}>{item.productName || "Item"}</Text>
                        <Text style={styles.cartQty}>×{qty}</Text>
                      </View>
                      <Text style={styles.cartPrice}>{fmt(lineTotal)}</Text>
                    </View>
                  );
                })}
                <LinearGradient colors={[C.primaryGhost, "#F0FDF4"]} style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{fmt(amount)}</Text>
                </LinearGradient>
              </View>
            )}
          </>
        )}

        {/* Help */}
        <View style={styles.helpBox}>
          <Ionicons name="shield-checkmark-outline" size={16} color={C.primary} />
          <Text style={styles.helpText}>
            Secure payment. Dial {cfg.ussd} if you didn't receive the prompt.
            We auto-check every 2 minutes. You can also tap "I've Approved" at any time.
          </Text>
        </View>
      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          onPress={handleManualConfirm}
          disabled={manualVerifying || redirecting}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={manualVerifying || redirecting ? [C.textMuted, "#CBD5E1"] : [C.primary, C.primaryDark]}
            style={styles.ctaBtn}
          >
            {manualVerifying || redirecting ? (
              <View style={styles.ctaInner}>
                <ActivityIndicator color={C.white} size="small" />
                <Text style={styles.ctaText}>{redirecting ? "Redirecting…" : "Verifying…"}</Text>
              </View>
            ) : (
              <View style={styles.ctaInner}>
                <Ionicons name="checkmark-circle" size={18} color={C.white} />
                <Text style={styles.ctaText}>I've Approved — Confirm Payment</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancelFromGuide}
          disabled={redirecting}
        >
          <Text style={[styles.cancelText, redirecting && { opacity: 0.4 }]}>Cancel Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PaymentHelpScreen;

/* ═══════════════════════════════════════════════════════════
 *  STYLES
 * ═══════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Result overlay */
  overlayBack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.overlay,
    justifyContent: "center", alignItems: "center",
    zIndex: 999, paddingHorizontal: 24,
  },
  overlayCard: {
    backgroundColor: C.white, borderRadius: 24,
    padding: 28, alignItems: "center", width: "100%", maxWidth: 340,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  overlayIcon: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  overlayTitle: { fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  overlaySub:   { fontSize: 13, color: C.textSub, textAlign: "center", lineHeight: 19, marginBottom: 14 },
  overlayRef:   { flexDirection: "row", backgroundColor: C.borderLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 20 },
  overlayRefLabel: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  overlayRefVal: { fontSize: 11, color: C.textMain, fontWeight: "700", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  overlayBtn:     { width: "100%", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  overlayBtnText: { color: C.white, fontSize: 15, fontWeight: "800" },

  /* Dialog (not confirmed / cancel) — mirrors web co-dialog-card */
  dialogCard: {
    backgroundColor: C.white, borderRadius: 16, width: "100%", maxWidth: 360,
    overflow: "hidden",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24 },
      android: { elevation: 12 },
    }),
  },
  dialogBar: { height: 4, width: "100%" },
  dialogBody: { padding: 24 },
  dialogIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 },
  dialogTitle: { fontSize: 18, fontWeight: "900", color: C.textMain, textAlign: "center", marginBottom: 6 },
  dialogDesc: { fontSize: 13, color: C.textMuted, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  dialogActions: { gap: 8 },
  dialogBtnPrimary: {
    width: "100%", padding: 14, backgroundColor: C.primary,
    borderRadius: 10, alignItems: "center",
  },
  dialogBtnPrimaryText: { color: C.white, fontSize: 14, fontWeight: "800" },
  dialogBtnDanger: {
    width: "100%", padding: 12, backgroundColor: C.white,
    borderWidth: 1, borderColor: `${C.danger}40`,
    borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  dialogBtnDangerText: { color: C.danger, fontSize: 14, fontWeight: "700" },
  dialogBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },

  /* Header */
  header:     { paddingHorizontal: 12, paddingBottom: 12 },
  headerTop:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  backBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: C.white, fontSize: 17, fontWeight: "800" },
  statusRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  statusText:  { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600" },
  timerPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  timerText: { fontSize: 11, fontWeight: "800", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  networkIcon: { width: 32, height: 32, borderRadius: 8 },
  amountRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
  amountBlock: { flex: 1 },
  amountLabel: { color: "rgba(255,255,255,0.5)", fontSize: 8, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  amountValue: { color: C.white, fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  amountSub:   { color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "700" },
  headerDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 8 },
  refRow: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.1)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  refLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "600" },
  refValue: { color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: "700", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },

  /* Scroll */
  scroll:      { flex: 1 },
  scrollInner: { paddingHorizontal: 12, paddingTop: 12 },

  /* Auto-check bar — mirrors web co-auto-check-bar */
  autoCheckBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.warningGhost, borderRadius: 8,
    borderWidth: 1, borderColor: "#FDE68A",
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  autoCheckLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  autoCheckLabel: { fontSize: 12, fontWeight: "700", color: C.warningDark },
  autoCheckTime: { fontSize: 14, fontWeight: "900", color: C.warningDark, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },

  /* USSD */
  ussdCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.2, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  ussdIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ussdLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 1 },
  ussdCode: { fontSize: 20, fontWeight: "900", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },

  /* Toggle rows */
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, borderWidth: 1, borderColor: C.borderLight },
  toggleIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  toggleText: { flex: 1, fontSize: 13, fontWeight: "700", color: C.textMain },
  totalBadge: { backgroundColor: C.primaryGhost, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  totalBadgeText: { fontSize: 11, fontWeight: "800", color: C.primaryDark },

  /* Steps */
  stepsCard: { backgroundColor: C.surface, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.borderLight },
  stepRow:      { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  stepTimeline: { width: 22, alignItems: "center" },
  stepDot:      { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepNum:      { color: C.white, fontSize: 9, fontWeight: "900" },
  stepLine:     { width: 2, height: 24, borderRadius: 1 },
  stepContent:  { flex: 1, flexDirection: "row", gap: 8, paddingLeft: 8, paddingBottom: 8 },
  stepIconBox:  { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepTitle:    { fontSize: 12, fontWeight: "700", color: C.textMain, marginBottom: 1 },
  stepDesc:     { fontSize: 10.5, color: C.textSub, lineHeight: 15 },
  tipBox:       { flexDirection: "row", gap: 8, borderRadius: 8, padding: 10, marginTop: 4 },
  tipText:      { flex: 1, fontSize: 11, color: "#78350F", lineHeight: 16 },

  /* Summary */
  summaryCard:    { backgroundColor: C.surface, borderRadius: 14, overflow: "hidden", marginBottom: 10, borderWidth: 1, borderColor: C.borderLight },
  cartItem:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  cartItemBorder: { borderBottomWidth: 1, borderBottomColor: C.borderHair },
  cartImgWrap:    { width: 40, height: 40, borderRadius: 8, backgroundColor: C.borderLight, alignItems: "center", justifyContent: "center" },
  cartImg:        { width: 40, height: 40, borderRadius: 8 },
  cartName:       { fontSize: 12, fontWeight: "700", color: C.textMain, marginBottom: 3 },
  cartQty:        { fontSize: 10, fontWeight: "600", color: C.textSub },
  cartPrice:      { fontSize: 12, fontWeight: "800", color: C.textMain },
  totalRow:       { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
  totalLabel:     { fontSize: 12, fontWeight: "600", color: C.textSub },
  totalValue:     { fontSize: 15, fontWeight: "900", color: C.primaryDark },

  /* Help */
  helpBox:  { flexDirection: "row", gap: 10, backgroundColor: C.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.borderLight, marginBottom: 10 },
  helpText: { flex: 1, fontSize: 11, color: C.textSub, lineHeight: 16 },

  /* Bottom bar */
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 12, paddingTop: 10 },
  ctaBtn:    { borderRadius: 14, paddingVertical: 14 },
  ctaInner:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaText:   { color: C.white, fontSize: 14, fontWeight: "800" },
  cancelBtn: { alignItems: "center", paddingVertical: 8, marginTop: 2 },
  cancelText:{ color: C.textMuted, fontSize: 12, fontWeight: "600" },
});