import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { checkTransactionStatus } from "../redux/slice/paymentSlice";
import { checkOutOrder, updateOrderDelivery } from "../redux/slice/orderSlice";
import { clearCart } from "../redux/slice/cartSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const mtnLogo = require("../assets/momo.png");
const vodafoneLogo = require("../assets/voda.jpeg");
const atLogo = require("../assets/AT.png");

const CART_KEYS_TO_CLEAR = [
  "cart",
  "cartId",
  "cartDetails",
  "checkoutDetails",
  "pendingOrderId",
  "selectedLocation",
];

/* ─── Tokens ─────────────────────────────────────────── */
const C = {
  primary: "#059669",
  primaryDark: "#047857",
  primaryDeep: "#064E3B",
  primaryMist: "#A7F3D0",
  primaryGhost: "#ECFDF5",

  bg: "#F7F8F5",
  surface: "#FFFFFF",
  textMain: "#111714",
  textBody: "#2D3E35",
  textSub: "#5C7068",
  textMuted: "#8FA396",
  border: "#DDE5DF",
  borderLight: "#EEF3EF",
  borderHair: "#F3F7F4",

  danger: "#DC2626",
  warning: "#D97706",
  warningGhost: "#FFFBEB",
  warningBorder: "#FDE68A",

  mtnAccent: "#F59E0B",
  mtnBg: "#FFFBEB",
  mtnBorder: "#FCD34D",
  vodaAccent: "#E11D48",
  vodaBg: "#FFF1F2",
  vodaBorder: "#FECDD3",
  atAccent: "#2563EB",
  atBg: "#EFF6FF",
  atBorder: "#BFDBFE",

  white: "#FFFFFF",
};

const SHADOW_SM = Platform.select({
  ios: {
    shadowColor: "#0A2018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
});
const SHADOW_LG = Platform.select({
  ios: {
    shadowColor: "#0A2018",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
  },
  android: { elevation: 8 },
});
const SHADOW_BTN = Platform.select({
  ios: {
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  android: { elevation: 7 },
});

const fmt = (v) => {
  const n = Number(v) || 0;
  return `GH₵${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const BACKEND_BASE = "https://ct002.frankotrading.com:444";
const itemImageUri = (p) =>
  p
    ? `${BACKEND_BASE}/Media/Products_Images/${p.split("\\").pop()}`
    : null;

/* ─── Network Config ─────────────────────────────────── */
const NETWORK_CONFIG = {
  mtn: {
    name: "MTN Mobile Money",
    short: "MTN",
    logo: mtnLogo,
    accent: C.mtnAccent,
    bg: C.mtnBg,
    border: C.mtnBorder,
    ussd: "*170#",
    steps: [
      {
        icon: "phone-portrait-outline",
        label: "Dial *170# on your MTN phone",
      },
      {
        icon: "list-outline",
        label: "Select 6 — My Wallet (or 10 on some versions)",
      },
      { icon: "checkmark-circle-outline", label: "Select 3 — My Approvals" },
      {
        icon: "lock-closed-outline",
        label: "Enter your MoMo PIN to load pending list",
      },
      {
        icon: "search-outline",
        label: "Select the Franko Trading transaction",
      },
      { icon: "checkmark-done-outline", label: "Select 1 (YES) to approve" },
    ],
    tip: "You can also open the MTN MoMo app → Approvals → approve the pending request.",
  },
  vodafone: {
    name: "Vodafone Cash",
    short: "Vodafone",
    logo: vodafoneLogo,
    accent: C.vodaAccent,
    bg: C.vodaBg,
    border: C.vodaBorder,
    ussd: "*110#",
    steps: [
      {
        icon: "phone-portrait-outline",
        label: "Dial *110# on your Vodafone phone",
      },
      { icon: "list-outline", label: "Select 4 — Make Payments" },
      { icon: "checkmark-circle-outline", label: "Select 8 — My Approvals" },
      {
        icon: "lock-closed-outline",
        label: "Enter your MoMo PIN to load pending list",
      },
      {
        icon: "search-outline",
        label: "Select the Franko Trading transaction",
      },
      { icon: "checkmark-done-outline", label: "Select 1 (YES) to approve" },
    ],
    tip: "You can also open the Vodafone Cash app → Pending Transactions → approve.",
  },
  airteltigo: {
    name: "AirtelTigo Money",
    short: "AirtelTigo",
    logo: atLogo,
    accent: C.atAccent,
    bg: C.atBg,
    border: C.atBorder,
    ussd: "*110#",
    steps: [
      {
        icon: "phone-portrait-outline",
        label: "Dial *110# on your AirtelTigo phone",
      },
      {
        icon: "list-outline",
        label: "Select Pending Approvals or Wallet (option 8 or 6)",
      },
      {
        icon: "lock-closed-outline",
        label: "Enter your 4-digit PIN to view pending transactions",
      },
      {
        icon: "search-outline",
        label: "Select the Franko Trading transaction",
      },
      {
        icon: "checkmark-done-outline",
        label: "Choose Approve to confirm the payment",
      },
    ],
    tip: "You can also open the AirtelTigo Money app → Pending Approvals → confirm.",
  },
};

/* ─── Pulsing dot ────────────────────────────────────── */
const PulsingDot = ({ color, size = 6 }) => {
  const ring = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, {
          toValue: 2.2,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(ring, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  return (
    <View
      style={{
        width: size * 2.5,
        height: size * 2.5,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          width: size * 2.5,
          height: size * 2.5,
          borderRadius: size * 1.25,
          backgroundColor: color,
          opacity: 0.18,
          transform: [{ scale: ring }],
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

/* ═══════════════════════════════════════════════════════
 *  MAIN
 * ═════════════════════════════════════════════════════*/
const PaymentHelpScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const {
    orderId,
    network,
    momoNumber,
    amount,
    checkoutDetails,
    addressDetails,
    cartItems = [],
  } = route?.params || {};

  const [checking, setChecking] = useState(false);
  const cfg = NETWORK_CONFIG[network] || NETWORK_CONFIG.mtn;

  const masterFade = useRef(new Animated.Value(0)).current;
  const bodyY = useRef(new Animated.Value(20)).current;
  const stagger = useRef(cfg.steps.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(masterFade, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(bodyY, {
        toValue: 0,
        tension: 75,
        friction: 10,
        delay: 80,
        useNativeDriver: true,
      }),
    ]).start();
    stagger.forEach((a, i) =>
      Animated.timing(a, {
        toValue: 1,
        duration: 280,
        delay: 420 + i * 80,
        useNativeDriver: true,
      }).start()
    );
  }, []);

  /* helpers */
  const clearAllCartStorage = () =>
    AsyncStorage.multiRemove(CART_KEYS_TO_CLEAR);
  const retryAsync = async (fn, retries = 3) => {
    let err;
    for (let i = 1; i <= retries; i++) {
      try {
        return await fn();
      } catch (e) {
        err = e;
        if (i < retries)
          await new Promise((r) => setTimeout(r, 2 ** i * 1000));
      }
    }
    throw err;
  };
  const processOrder = async () => {
    const cartId =
      (await AsyncStorage.getItem("cartId")) || checkoutDetails?.Cartid;
    await retryAsync(() =>
      dispatch(checkOutOrder({ ...checkoutDetails, Cartid: cartId })).unwrap()
    );
    await retryAsync(async () => {
      await dispatch(updateOrderDelivery(addressDetails)).unwrap();
      dispatch(clearCart());
      await clearAllCartStorage();
    });
  };

  /* actions */
  const handleCancelOrder = () =>
    Alert.alert(
      "Cancel Order?",
      "This will cancel your order. You have not been charged.",
      [
        { text: "Keep Trying", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: "OrderCancellationScreen" }],
            }),
        },
      ]
    );

  const handleConfirmPayment = async () => {
    if (!orderId) {
      Alert.alert(
        "Error",
        "Order reference not found. Please contact support."
      );
      return;
    }
    try {
      setChecking(true);
      const res = await dispatch(
        checkTransactionStatus({ refNo: orderId })
      ).unwrap();
      if (
        res?.responseMessage === "Successfully Processed Transaction"
      ) {
        try {
          await processOrder();
          await AsyncStorage.multiRemove([
            "checkoutDetails",
            "orderDeliveryDetails",
          ]);
          navigation.reset({
            index: 0,
            routes: [
              { name: "OrderPlacedScreen", params: { orderId } },
            ],
          });
        } catch {
          Alert.alert(
            "Order Error",
            "Payment confirmed but order processing failed. Contact support."
          );
        }
      } else {
        Alert.alert(
          "Not Yet Confirmed",
          "We couldn't confirm your payment. Follow the steps to approve, then try again.",
          [
            { text: "Try Again" },
            {
              text: "Cancel Order",
              style: "destructive",
              onPress: handleCancelOrder,
            },
          ]
        );
      }
    } catch {
      Alert.alert("Connection Error", "Check your internet and try again.");
    } finally {
      setChecking(false);
    }
  };

  const itemCount = cartItems.length;
  const totalQty = cartItems.reduce(
    (sum, i) => sum + (Number(i.quantity) || 1),
    0
  );

  return (
    <View style={s.root}>
      {/* ══════ COMPACT HEADER ══════ */}
      <Animated.View
        style={[
          s.header,
          {
            opacity: masterFade,
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <View style={s.arc} pointerEvents="none" />

        {/* Row 1: back · title+status · network */}
        <View style={s.topRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={17}
              color={C.white}
            />
          </TouchableOpacity>

          <View style={s.headerMid}>
            <Text style={s.headerTitle}>Complete Payment</Text>
            <View style={s.statusRow}>
              <PulsingDot color="#FCD34D" size={4} />
              <Text style={s.statusText}>Action Required</Text>
            </View>
          </View>

          <View
            style={[
              s.netPill,
              { borderColor: `${cfg.accent}55` },
            ]}
          >
            <Image
              source={cfg.logo}
              style={s.netLogo}
              resizeMode="contain"
            />
            <Text style={[s.netText, { color: cfg.accent }]}>
              {cfg.short}
            </Text>
          </View>
        </View>

        {/* Row 2: amount · ref · number */}
        <View style={s.amountRow}>
          <View style={s.amountLeft}>
            <Text style={s.amountEye}>AMOUNT DUE</Text>
            <Text style={s.amountVal}>{fmt(amount)}</Text>
          </View>
          <View style={s.amountSep} />
          <View style={s.amountRight}>
            <Text style={s.amountEye}>ORDER REF</Text>
            <View style={s.refRow}>
              <Ionicons
                name="receipt-outline"
                size={10}
                color={C.primaryMist}
              />
              <Text style={s.refCode}>{orderId}</Text>
            </View>
          </View>
          <View style={s.amountSep} />
          <View style={s.amountRight}>
            <Text style={s.amountEye}>NUMBER</Text>
            <Text style={s.refCode}>{momoNumber}</Text>
          </View>
        </View>
      </Animated.View>

      {/* ══════ BODY ══════ */}
      <Animated.ScrollView
        style={[
          s.scroll,
          { opacity: masterFade, transform: [{ translateY: bodyY }] },
        ]}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* USSD banner */}
        <TouchableOpacity
          style={[
            s.ussdBanner,
            { backgroundColor: cfg.bg, borderColor: cfg.border },
          ]}
          activeOpacity={0.8}
        >
          <View
            style={[
              s.ussdIcon,
              { backgroundColor: `${cfg.accent}18` },
            ]}
          >
            <Ionicons
              name="keypad-outline"
              size={20}
              color={cfg.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.ussdEye, { color: cfg.accent }]}>
              QUICK DIAL
            </Text>
            <Text style={[s.ussdCode, { color: cfg.accent }]}>
              {cfg.ussd}
            </Text>
          </View>
          <View
            style={[
              s.ussdArrow,
              { backgroundColor: `${cfg.accent}18` },
            ]}
          >
            <Ionicons
              name="arrow-forward"
              size={12}
              color={cfg.accent}
            />
          </View>
        </TouchableOpacity>

        {/* Steps card */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <View
              style={[
                s.cardIcon,
                { backgroundColor: `${cfg.accent}18` },
              ]}
            >
              <Ionicons
                name="list-outline"
                size={14}
                color={cfg.accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>How to Approve</Text>
              <Text style={s.cardSub}>{cfg.name}</Text>
            </View>
            <View
              style={[
                s.badge,
                { backgroundColor: cfg.bg, borderColor: cfg.border },
              ]}
            >
              <Text style={[s.badgeText, { color: cfg.accent }]}>
                {cfg.steps.length} steps
              </Text>
            </View>
          </View>

          <View style={s.stepsWrap}>
            {cfg.steps.map((step, idx) => {
              const isLast = idx === cfg.steps.length - 1;
              const dotColor = isLast ? cfg.accent : C.primary;
              return (
                <Animated.View
                  key={idx}
                  style={[
                    s.stepRow,
                    {
                      opacity: stagger[idx],
                      transform: [
                        {
                          translateX: stagger[idx].interpolate({
                            inputRange: [0, 1],
                            outputRange: [16, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={s.tlCol}>
                    <View
                      style={[s.dot, { backgroundColor: dotColor }]}
                    >
                      <Text style={s.dotNum}>{idx + 1}</Text>
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          s.line,
                          { backgroundColor: C.border },
                        ]}
                      />
                    )}
                  </View>
                  <View
                    style={[
                      s.stepContent,
                      isLast && { paddingBottom: 0 },
                    ]}
                  >
                    <View
                      style={[
                        s.stepIconBox,
                        {
                          backgroundColor: isLast
                            ? cfg.bg
                            : C.primaryGhost,
                          borderColor: isLast
                            ? cfg.border
                            : C.borderLight,
                        },
                      ]}
                    >
                      <Ionicons
                        name={step.icon}
                        size={11}
                        color={dotColor}
                      />
                    </View>
                    <Text
                      style={[
                        s.stepLabel,
                        isLast && {
                          color: cfg.accent,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Tip */}
        <View style={s.tipBanner}>
          <View style={s.tipIcon}>
            <Ionicons name="bulb" size={14} color={C.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.tipTitle}>PRO TIP</Text>
            <Text style={s.tipBody}>{cfg.tip}</Text>
          </View>
        </View>

        {/* Order Items */}
        {itemCount > 0 && (
          <View style={s.card}>
            <View style={s.cardHead}>
              <View
                style={[
                  s.cardIcon,
                  { backgroundColor: C.primaryGhost },
                ]}
              >
                <Ionicons
                  name="bag-handle-outline"
                  size={14}
                  color={C.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>Order Summary</Text>
                <Text style={s.cardSub}>
                  {itemCount} item{itemCount !== 1 ? "s" : ""} ·{" "}
                  {totalQty} unit{totalQty !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>

            {cartItems.map((item, idx) => {
              const uri = itemImageUri(item.imagePath);
              const lineTotal =
                Number(item.amount) || Number(item.total) || 0;
              const qty = Number(item.quantity) || 1;
              return (
                <View
                  key={`${item.productId}-${idx}`}
                  style={[
                    s.itemRow,
                    idx === itemCount - 1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  {uri ? (
                    <Image
                      source={{ uri }}
                      style={s.itemThumb}
                    />
                  ) : (
                    <View style={s.itemThumbFallback}>
                      <Ionicons
                        name="cube-outline"
                        size={16}
                        color={C.textMuted}
                      />
                    </View>
                  )}
                  <View style={s.itemInfo}>
                    <Text style={s.itemName} numberOfLines={2}>
                      {item.productName || "Item"}
                    </Text>
                    <View style={s.qtyChip}>
                      <Ionicons
                        name="layers-outline"
                        size={9}
                        color={C.primary}
                      />
                      <Text style={s.qtyText}>Qty {qty}</Text>
                    </View>
                  </View>
                  <Text style={s.itemPrice}>
                    {fmt(lineTotal)}
                  </Text>
                </View>
              );
            })}

            <View style={s.orderTotal}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Ionicons
                  name="receipt-outline"
                  size={12}
                  color={C.textSub}
                />
                <Text style={s.orderTotalLabel}>Order Total</Text>
              </View>
              <Text style={s.orderTotalValue}>
                {fmt(amount)}
              </Text>
            </View>
          </View>
        )}

        {/* Security */}
        <View style={s.secRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={12}
            color={C.primary}
          />
          <Text style={s.secText}>
            End-to-end encrypted · Secured by Franko Trading
          </Text>
        </View>
      </Animated.ScrollView>

      {/* ══════ BOTTOM BAR ══════ */}
      <View
        style={[
          s.bottomBar,
          {
            paddingBottom:
              Platform.OS === "ios"
                ? Math.max(insets.bottom, 16) + 12
                : 16,
          },
        ]}
      >
        <TouchableOpacity
          style={[s.confirmBtn, checking && s.confirmDisabled]}
          onPress={handleConfirmPayment}
          disabled={checking}
          activeOpacity={0.88}
        >
          {checking ? (
            <View style={s.btnInner}>
              <ActivityIndicator color={C.white} size="small" />
              <Text style={s.btnLabel}>Verifying Payment…</Text>
            </View>
          ) : (
            <View style={s.btnInner}>
              <View style={s.checkCircle}>
                <Ionicons
                  name="checkmark"
                  size={13}
                  color={C.white}
                />
              </View>
              <Text style={s.btnLabel}>
                I've Approved — Confirm Payment
              </Text>
              <Ionicons
                name="arrow-forward"
                size={14}
                color="rgba(255,255,255,0.55)"
              />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.cancelBtn}
          onPress={handleCancelOrder}
          disabled={checking}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close-circle-outline"
            size={12}
            color={C.danger}
          />
          <Text style={s.cancelLabel}>Cancel Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PaymentHelpScreen;

/* ══════════════════════════════════════════════════════
 *  STYLES
 * ════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* ── Compact Header ─────────── */
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingBottom: 14,
    overflow: "hidden",
    /* paddingTop is set dynamically via insets.top + 12 */
  },
  arc: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 36,
    borderColor: "rgba(255,255,255,0.05)",
    top: -80,
    right: -50,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerMid: { flex: 1 },
  headerTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  statusText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    fontWeight: "600",
  },

  netPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  netLogo: { width: 15, height: 15, borderRadius: 4 },
  netText: { fontSize: 10, fontWeight: "800" },

  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  amountLeft: { flex: 1.2 },
  amountRight: { flex: 1 },
  amountSep: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 12,
  },
  amountEye: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.9,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  amountVal: {
    color: C.white,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  refCode: {
    color: C.primaryMist,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  /* ── Scroll ─────────────────── */
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 140 },

  /* ── USSD ───────────────────── */
  ussdBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  ussdIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ussdEye: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  ussdCode: {
    fontSize: 22,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    letterSpacing: -0.2,
  },
  ussdArrow: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Card ───────────────────── */
  card: {
    backgroundColor: C.surface,
    borderRadius: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
    overflow: "hidden",
    ...SHADOW_SM,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderHair,
  },
  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.textMain,
    letterSpacing: -0.1,
  },
  cardSub: { fontSize: 10.5, color: C.textSub, marginTop: 1 },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 9.5, fontWeight: "800" },

  /* steps */
  stepsWrap: { padding: 14, paddingTop: 10 },
  stepRow: { flexDirection: "row" },
  tlCol: { width: 24, alignItems: "center" },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  dotNum: { color: C.white, fontSize: 8.5, fontWeight: "900" },
  line: {
    width: 1.5,
    flex: 1,
    minHeight: 6,
    borderRadius: 1,
    marginVertical: 2,
  },
  stepContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    paddingLeft: 9,
    paddingBottom: 12,
  },
  stepIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepLabel: {
    flex: 1,
    fontSize: 12.5,
    color: C.textBody,
    fontWeight: "500",
    lineHeight: 18,
    paddingTop: 3,
  },

  /* tip */
  tipBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: C.warningGhost,
    borderWidth: 1,
    borderColor: C.warningBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(217,119,6,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tipTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  tipBody: {
    fontSize: 12,
    color: "#78350F",
    lineHeight: 18,
    fontWeight: "500",
  },

  /* items */
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.borderHair,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: C.borderLight,
  },
  itemThumbFallback: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: C.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: C.textMain,
    lineHeight: 17,
    marginBottom: 4,
  },
  qtyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.primaryGhost,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  qtyText: { fontSize: 9.5, fontWeight: "700", color: C.primary },
  itemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: C.textMain,
  },

  orderTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: C.primaryGhost,
  },
  orderTotalLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: C.textSub,
  },
  orderTotalValue: {
    fontSize: 15,
    fontWeight: "900",
    color: C.primaryDark,
  },

  /* security */
  secRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
  },
  secText: {
    fontSize: 10.5,
    color: C.textMuted,
    fontWeight: "500",
  },

  /* bottom bar */
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    /* paddingBottom is set dynamically via insets */
    ...SHADOW_LG,
  },
  confirmBtn: {
    backgroundColor: C.primaryDark,
    borderRadius: 15,
    paddingVertical: 15,
    ...SHADOW_BTN,
  },
  confirmDisabled: {
    backgroundColor: C.textMuted,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnLabel: {
    color: C.white,
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    marginTop: 2,
  },
  cancelLabel: {
    color: C.danger,
    fontSize: 12,
    fontWeight: "700",
  },
});