import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  Modal,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { checkOutOrder, updateOrderDelivery } from "../redux/slice/orderSlice";
import {
  debitCustomer,
  checkTransactionStatus,
} from "../redux/slice/paymentSlice";
import { clearCart } from "../redux/slice/cartSlice";
import LocationsModal from "../components/Locations";

/* ─── Assets ──────────────────────────────────────────── */
const mtnLogo = require("../assets/momo.png");
const vodafoneLogo = require("../assets/voda.jpeg");
const airteltigoLogo = require("../assets/AT.png");
const frankoLogo = require("../assets/frankoIcon.png");

/* ─── Constants ───────────────────────────────────────── */
const { width: SCREEN_W } = Dimensions.get("window");

const CART_KEYS_TO_CLEAR = [
  "cart",
  "cartId",
  "cartDetails",
  "checkoutDetails",
  "pendingOrderId",
];

const SERVICE_CHARGE_RATE = 0.01;
const SERVICE_CHARGE_CAP = 20.0;
const SERVICE_CHARGE_THRESHOLD = 2000;
const TIMER_SECONDS = 60;
const POLL_TOTAL_MS = 60000;
const POLL_WARMUP_MS = 15000;
const POLL_INTERVAL_MS = 5000;
const API_BASE = "https://ct002.frankotrading.com:444";

/* ─── Color System ────────────────────────────────────── */
const C = {
  brand: "#059669",
  brandDark: "#047857",
  brandLight: "#D1FAE5",
  brandGhost: "#ECFDF5",
  brandBorder: "#6EE7B7",
  brandAccent: "#10B981",

  bg: "#F0F4F8",
  card: "#FFFFFF",
  cardAlt: "#F8FAFC",
  elevated: "#FFFFFF",

  ink: "#0F172A",
  inkSoft: "#334155",
  inkMuted: "#64748B",
  inkFaint: "#94A3B8",
  inkGhost: "#CBD5E1",

  line: "#E2E8F0",
  lineLight: "#F1F5F9",

  red: "#EF4444",
  redGhost: "#FEF2F2",
  green: "#10B981",
  greenGhost: "#ECFDF5",
  blue: "#3B82F6",
  blueGhost: "#EFF6FF",
  blueBorder: "#BFDBFE",
  amber: "#F59E0B",
  amberGhost: "#FFFBEB",
  amberBorder: "#FDE68A",

  mtn: "#FACC15",
  mtnBorder: "#FDE047",
  mtnBg: "#FEFCE8",
  voda: "#EF4444",
  vodaBorder: "#FCA5A5",
  vodaBg: "#FEF2F2",
  at: "#3B82F6",
  atBorder: "#93C5FD",
  atBg: "#EFF6FF",

  white: "#FFFFFF",
  overlay: "rgba(15, 23, 42, 0.55)",
};

const shadow = (size = "sm") => {
  const presets = {
    sm: Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
    md: Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
    }),
    lg: Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
    brand: Platform.select({
      ios: {
        shadowColor: "#059669",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  };
  return presets[size] || presets.sm;
};

/* ─── Utilities ───────────────────────────────────────── */
const money = (v) => {
  const n = Number(v) || 0;
  return `GH₵${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const narration = (items) => {
  if (!items?.length) return "Franko Trading Purchase";
  const parts = items.map((i) => {
    const name = (i.productName || "Item").trim();
    const qty = Number(i.quantity) || 1;
    return qty > 1 ? `${name} x${qty}` : name;
  });
  const full = parts.join(", ");
  return full.length > 40 ? `${full.slice(0, 37)}...` : full;
};

const productImage = (path) =>
  path
    ? `${API_BASE}/Media/Products_Images/${path.split("\\").pop()}`
    : null;

const isFree = (fee) =>
  typeof fee === "string" && fee.toLowerCase().trim().includes("free");

const isNA = (fee) =>
  fee == null || fee === "N/A" || fee === "n/a" || fee === 0 || fee === "0";

/* ─── Reusable Components ─────────────────────────────── */
const Card = ({ children, style }) => (
  <View style={[s.card, style]}>{children}</View>
);

const HeaderRow = ({ icon, title, badge }) => (
  <View style={s.cardHeader}>
    <View style={s.cardIconWrap}>
      <Ionicons name={icon} size={15} color={C.brand} />
    </View>
    <Text style={s.cardTitle}>{title}</Text>
    {badge != null && (
      <View style={s.cardBadge}>
        <Text style={s.cardBadgeText}>{badge}</Text>
      </View>
    )}
  </View>
);

const Field = ({
  label,
  required,
  icon,
  error,
  containerStyle,
  inputStyle,
  ...rest
}) => (
  <View style={[s.fieldWrap, containerStyle]}>
    {label && (
      <Text style={s.fieldLabel}>
        {label}
        {required && <Text style={{ color: C.red }}> *</Text>}
      </Text>
    )}
    <View
      style={[
        s.fieldBox,
        rest.multiline && { alignItems: "flex-start" },
        error && { borderColor: C.red },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={17}
          color={C.inkFaint}
          style={[{ marginLeft: 14 }, rest.multiline && { marginTop: 13 }]}
        />
      )}
      <TextInput
        style={[s.fieldInput, !icon && { paddingLeft: 16 }, inputStyle]}
        placeholderTextColor={C.inkGhost}
        {...rest}
      />
    </View>
    {error && <Text style={s.fieldError}>{error}</Text>}
  </View>
);

const NetCard = ({ id, label, sub, logo, selected, onPick }) => {
  const pal =
    {
      mtn: { b: C.mtnBorder, bg: C.mtnBg, d: C.mtn },
      vodafone: { b: C.vodaBorder, bg: C.vodaBg, d: C.voda },
      airteltigo: { b: C.atBorder, bg: C.atBg, d: C.at },
    }[id] || {};
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPick(id)}
      style={[
        s.netCard,
        selected && { borderColor: pal.b, backgroundColor: pal.bg },
      ]}
    >
      <Image source={logo} style={s.netLogo} resizeMode="contain" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.netName}>{label}</Text>
        <Text style={s.netSub}>{sub}</Text>
      </View>
      <View style={[s.radio, selected && { borderColor: pal.d }]}>
        {selected && (
          <View style={[s.radioDot, { backgroundColor: pal.d }]} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const SummaryLine = ({ label, value, bold, valueStyle }) => (
  <View style={s.sumLine}>
    <Text style={[s.sumLabel, bold && s.sumLabelBold]}>{label}</Text>
    <Text style={[s.sumVal, bold && s.sumValBold, valueStyle]}>{value}</Text>
  </View>
);

const Hint = ({ type, text }) => (
  <View style={s.hintRow}>
    <Ionicons
      name={type === "error" ? "warning" : "checkmark-circle"}
      size={13}
      color={type === "error" ? C.red : C.green}
    />
    <Text
      style={[s.hintText, { color: type === "error" ? C.red : C.green }]}
    >
      {text}
    </Text>
  </View>
);

const InfoLine = ({ label, value, highlight }) => (
  <View style={s.infoLine}>
    <Text style={s.infoLabel}>{label}</Text>
    <Text
      style={[s.infoVal, highlight && { color: C.brand, fontWeight: "800" }]}
    >
      {value}
    </Text>
  </View>
);

const Bar = ({ pct, color = C.brand }) => (
  <View style={s.barTrack}>
    <View
      style={[
        s.barFill,
        {
          width: `${Math.max(0, Math.min(1, pct)) * 100}%`,
          backgroundColor: color,
        },
      ]}
    />
  </View>
);

/* ═══════════════════════════════════════════════════════════
 *  MAIN SCREEN
 * ═══════════════════════════════════════════════════════════ */
const CheckoutScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  /* ── Refs ────────────────────────────────────────────── */
  const doneRef = useRef(false);
  const payDoneRef = useRef(false);   // ← NEW: prevents error-path after poll succeeds
  const mountedRef = useRef(true);
  const pollIntervalRef = useRef(null);
  const warmupTimeoutRef = useRef(null);
  const tickIntervalRef = useRef(null);
  const tickStartRef = useRef(null);
  const itemsRef = useRef([]);

  /* ── State ───────────────────────────────────────────── */
  const [customer, setCustomer] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [payMethod, setPayMethod] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [loc, setLoc] = useState(null);
  const [ids, setIds] = useState(new Set());
  const [oid, setOid] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | input | pending | success | failed
  const [tick, setTick] = useState(TIMER_SECONDS);
  const [momo, setMomo] = useState("233");
  const [net, setNet] = useState(null);
  const [pCo, setPCo] = useState(null);
  const [pAddr, setPAddr] = useState(null);

  /* ── Animations ──────────────────────────────────────── */
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  /* ══════════════════════════════════════════════════════
   *  TIMER HELPERS — wall-clock based, iOS-safe
   * ══════════════════════════════════════════════════════ */
  const killAllTimers = useCallback(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (warmupTimeoutRef.current) {
      clearTimeout(warmupTimeoutRef.current);
      warmupTimeoutRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    tickStartRef.current = null;
  }, []);

  /**
   * Starts the visible countdown from TIMER_SECONDS → 0.
   * Uses Date.now() so iOS timer throttling cannot break it.
   */
  const startCountdown = useCallback(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    const started = Date.now();
    tickStartRef.current = started;
    setTick(TIMER_SECONDS);

    tickIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
        return;
      }
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const remaining = Math.max(0, TIMER_SECONDS - elapsed);
      setTick(remaining);
      if (remaining <= 0) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    }, 500);
  }, []);

  /* ── Computed values ─────────────────────────────────── */
  const subtotal = useMemo(
    () =>
      cartItems.reduce((sum, it) => {
        const amt = Number(it.amount) || Number(it.total) || 0;
        return sum + amt;
      }, 0),
    [cartItems]
  );

  const deliveryFee = useMemo(() => {
    if (typing || !loc) return 0;
    const f = loc.town?.delivery_fee;
    if (isFree(f)) return 0;
    const n = typeof f === "number" ? f : parseFloat(f);
    return !isNaN(n) && n > 0 ? n : 0;
  }, [typing, loc]);

  const totalBeforeCharge = useMemo(() => {
    if (typing || isNA(loc?.town?.delivery_fee)) return subtotal;
    return subtotal + deliveryFee;
  }, [subtotal, deliveryFee, typing, loc]);

  const serviceCharge = useMemo(
    () =>
      totalBeforeCharge > SERVICE_CHARGE_THRESHOLD
        ? SERVICE_CHARGE_CAP
        : totalBeforeCharge * SERVICE_CHARGE_RATE,
    [totalBeforeCharge]
  );

  const grandTotal = useMemo(
    () => totalBeforeCharge + serviceCharge,
    [totalBeforeCharge, serviceCharge]
  );

  const displayTotal = useMemo(
    () => (payMethod === "Mobile Money" ? grandTotal : totalBeforeCharge),
    [payMethod, grandTotal, totalBeforeCharge]
  );

  const deliveryLabel = useMemo(() => {
    if (typing) return "To be confirmed";
    if (!loc) return "Select location";
    const f = loc.town?.delivery_fee;
    if (isFree(f)) return "FREE";
    const n = typeof f === "number" ? f : parseFloat(f);
    return !isNaN(n) && n > 0 ? money(n) : "To be confirmed";
  }, [typing, loc]);

  const canCOD = useMemo(
    () => !typing && loc && isFree(loc.town?.delivery_fee),
    [typing, loc]
  );

  const methods = useMemo(() => {
    const list = [
      {
        key: "Mobile Money",
        icon: "phone-portrait-outline",
        desc: "MTN, Vodafone or AirtelTigo",
      },
    ];
    if (canCOD)
      list.unshift({
        key: "Cash on Delivery",
        icon: "cash-outline",
        desc: "Pay when you receive",
      });
    return list;
  }, [canCOD]);

  const momoOk = useCallback(() => /^233[1-9]\d{8}$/.test(momo), [momo]);
  const momoZero = useCallback(
    () => momo.length > 3 && momo[3] === "0",
    [momo]
  );

  /* ── Bootstrap ───────────────────────────────────────── */
  useEffect(() => {
    mountedRef.current = true;
    Animated.timing(fade, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();

    (async () => {
      try {
        const [cJ, dJ, cJson, lJ, iJ] = await Promise.all([
          AsyncStorage.getItem("customer"),
          AsyncStorage.getItem("cartDetails"),
          AsyncStorage.getItem("cart"),
          AsyncStorage.getItem("selectedLocation"),
          AsyncStorage.getItem("usedOrderIds"),
        ]);
        if (!mountedRef.current) return;

        const c = cJ ? JSON.parse(cJ) : null;
        setCustomer(c || {});
        setName(c ? `${c.firstName} ${c.lastName}` : "");
        setPhone(c?.contactNumber || "");

        const raw = dJ
          ? JSON.parse(dJ)?.cartItems || []
          : cJson
          ? JSON.parse(cJson)
          : [];
        setCartItems(raw);
        itemsRef.current = raw;

        if (lJ) {
          const l = JSON.parse(lJ);
          setLoc(l);
          setAddress(`${l.town?.name}, ${l.region}`);
        }
        if (iJ) setIds(new Set(JSON.parse(iJ)));
      } catch {
        Alert.alert("Error", "Could not load checkout data.");
      }
    })();

    return () => {
      mountedRef.current = false;
      killAllTimers();
    };
  }, []);

  useEffect(() => {
    if (ids.size)
      AsyncStorage.setItem("usedOrderIds", JSON.stringify([...ids])).catch(
        () => {}
      );
  }, [ids]);

  /* pulse animation for pending status */
  useEffect(() => {
    if (status !== "pending") return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    a.start();
    return () => a.stop();
  }, [status]);

  /* ── Helpers ─────────────────────────────────────────── */
  const makeId = useCallback(() => {
    let id,
      t = 0;
    do {
      id = `APP-${Math.floor(Math.random() * 900) + 100}-${
        Math.floor(Math.random() * 900) + 100
      }`;
      t++;
    } while (ids.has(id) && t < 100);
    setIds((p) => new Set([...p, id]));
    return id;
  }, [ids]);

  const wipe = () => AsyncStorage.multiRemove(CART_KEYS_TO_CLEAR);

  const retry = async (fn, n = 3) => {
    let e;
    for (let i = 1; i <= n; i++) {
      try {
        return await fn();
      } catch (x) {
        e = x;
        if (i < n) await new Promise((r) => setTimeout(r, 2 ** i * 1e3));
      }
    }
    throw e;
  };

  const submitOrder = async (co, addr) => {
    await retry(async () => {
      const cid = (await AsyncStorage.getItem("cartId")) || co.Cartid;
      return dispatch(checkOutOrder({ ...co, Cartid: cid })).unwrap();
    });
    await retry(async () => {
      await dispatch(updateOrderDelivery(addr)).unwrap();
      dispatch(clearCart());
      await wipe();
    });
  };

  const onMomo = (t) => {
    let v = t.replace(/\D/g, "");
    if (v.startsWith("0")) v = "233" + v.slice(1);
    if (!v.startsWith("233")) v = "233";
    setMomo(v.slice(0, 12));
  };

  /* ══════════════════════════════════════════════════════
   *  POLLING — starts after debitCustomer succeeds
   * ══════════════════════════════════════════════════════ */
  const beginPolling = useCallback(
    (orderId, checkoutObj, addrObj, networkVal, momoVal, totalVal) => {
      if (warmupTimeoutRef.current) {
        clearTimeout(warmupTimeoutRef.current);
        warmupTimeoutRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      warmupTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        warmupTimeoutRef.current = null;

        let elapsed = 0;

        pollIntervalRef.current = setInterval(async () => {
          if (!mountedRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            return;
          }

          elapsed += POLL_INTERVAL_MS;

          try {
            const r = await dispatch(
              checkTransactionStatus({ refNo: orderId })
            ).unwrap();

            if (
              r?.responseMessage ===
              "Successfully Processed Transaction"
            ) {
              // ── SUCCESS ──
              // Mark done FIRST so any pending error-path timeouts bail out
              payDoneRef.current = true;
              killAllTimers();
              if (!mountedRef.current) return;

              setStatus("success");

              try {
                await submitOrder(checkoutObj, addrObj);
                await AsyncStorage.multiRemove([
                  "checkoutDetails",
                  "cart",
                  "cartId",
                  "cartDetails",
                  "pendingOrderId",
                ]);
              } catch {
                if (mountedRef.current) {
                  Alert.alert(
                    "Order Error",
                    "Payment succeeded but order submission failed. Please contact support with your reference number."
                  );
                }
              }

              setTimeout(() => {
                if (!mountedRef.current) return;
                setModalOpen(false);
                navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: "OrderPlacedScreen",
                      params: { orderId: orderId },
                    },
                  ],
                });
              }, 1600);
              return;
            }
          } catch {
            // individual poll failure — keep polling
          }

          // ── TIMEOUT ──
          if (elapsed >= POLL_TOTAL_MS - POLL_WARMUP_MS) {
            killAllTimers();
            if (!mountedRef.current) return;

            setStatus("failed");

            setTimeout(() => {
              if (!mountedRef.current) return;
              setModalOpen(false);
              navigation.navigate("PaymentHelpScreen", {
                orderId: orderId,
                network: networkVal,
                momoNumber: momoVal,
                amount: totalVal,
                checkoutDetails: checkoutObj,
                addressDetails: addrObj,
                cartItems: itemsRef.current,
              });
            }, 2200);
          }
        }, POLL_INTERVAL_MS);
      }, POLL_WARMUP_MS);
    },
    [dispatch, navigation, killAllTimers]
  );

  /* ══════════════════════════════════════════════════════
   *  HANDLE PAY
   * ══════════════════════════════════════════════════════ */
  const handlePay = async () => {
    if (!momoOk()) {
      return Alert.alert("Invalid Number", "Enter a valid number after 233.");
    }
    if (!net) {
      return Alert.alert("Network Required", "Pick your network provider.");
    }

    // Capture current values to avoid stale closures
    const currentOid = oid;
    const currentPCo = pCo;
    const currentPAddr = pAddr;
    const currentNet = net;
    const currentMomo = momo;
    const currentGrandTotal = grandTotal;
    const currentTotalBeforeCharge = totalBeforeCharge;

    if (!currentOid || !currentPCo || !currentPAddr) {
      Alert.alert("Error", "Missing order details. Please try again.");
      return;
    }

    // ── Reset the pay-done guard before each fresh attempt ──
    payDoneRef.current = false;

    try {
      setPayBusy(true);

      // Show pending UI immediately so user sees feedback before API responds
      setStatus("pending");
      startCountdown();

      await dispatch(
        debitCustomer({
          refNo: currentOid,
          msisdn: currentMomo,
          amount: currentTotalBeforeCharge,
          network: currentNet,
          narration: narration(cartItems),
        })
      ).unwrap();

      // API call resolved — start polling for payment confirmation
      beginPolling(
        currentOid,
        currentPCo,
        currentPAddr,
        currentNet,
        currentMomo,
        currentGrandTotal
      );
    } catch (err) {
      // ── IMPORTANT: iOS can throw a network/timeout error even when
      //    the MoMo prompt was actually dispatched server-side.
      //    We must NOT auto-navigate away — instead let the user decide.
      killAllTimers();
      if (!mountedRef.current) return;

      // If polling already found a success result, bail — don't show error UI
      if (payDoneRef.current) return;

      setStatus("failed");

      setTimeout(() => {
        // Double-check: poll may have succeeded while we were waiting 1.5s
        if (!mountedRef.current || payDoneRef.current) return;

        Alert.alert(
          "Payment Request Issue",
          "We couldn't confirm the payment prompt was sent to your phone. On some networks this is a temporary hiccup — the prompt may still arrive.\n\nDid you receive a payment prompt on your phone?",
          [
            {
              // User DID get the prompt — keep polling for their approval
              text: "Yes, I got it",
              style: "default",
              onPress: () => {
                if (!mountedRef.current) return;
                setStatus("pending");
                startCountdown();
                beginPolling(
                  currentOid,
                  currentPCo,
                  currentPAddr,
                  currentNet,
                  currentMomo,
                  currentGrandTotal
                );
              },
            },
            {
              // User did NOT get the prompt — let them retry cleanly
              text: "No, try again",
              style: "default",
              onPress: () => {
                if (!mountedRef.current) return;
                setStatus("input");
                setTick(TIMER_SECONDS);
              },
            },
            {
              // User wants to abort entirely
              text: "Cancel Order",
              style: "destructive",
              onPress: () => {
                if (!mountedRef.current) return;
                setModalOpen(false);
                setStatus("idle");
                navigation.reset({
                  index: 0,
                  routes: [{ name: "OrderCancellationScreen" }],
                });
              },
            },
          ],
          { cancelable: false }
        );
      }, 1500);
    } finally {
      if (mountedRef.current) {
        setPayBusy(false);
      }
    }
  };

  /* ── Finalize (non-MoMo) ─────────────────────────────── */
  const finalize = useCallback(
    async (id, co, addr) => {
      if (!id || doneRef.current) return;
      doneRef.current = true;
      try {
        setBusy(true);
        await submitOrder(co, addr);
        navigation.reset({
          index: 0,
          routes: [{ name: "OrderPlacedScreen", params: { orderId: id } }],
        });
      } catch (e) {
        doneRef.current = false;
        Alert.alert("Error", e?.message || "Order failed.");
      } finally {
        setBusy(false);
        setOid(null);
      }
    },
    [dispatch, navigation]
  );

  /* ── Location ────────────────────────────────────────── */
  const pickLoc = async (l) => {
    setLoc(l);
    setAddress(`${l.town?.name}, ${l.region}`);
    setTyping(false);
    setPayMethod("");
    await AsyncStorage.setItem("selectedLocation", JSON.stringify(l));
    setLocOpen(false);
  };

  const toggleManual = async () => {
    const next = !typing;
    setTyping(next);
    if (next) {
      setLoc(null);
      setAddress("");
      setPayMethod("");
      await AsyncStorage.removeItem("selectedLocation");
    }
  };

  /* ── Checkout ────────────────────────────────────────── */
  const checkout = async () => {
    if (name.trim().toLowerCase().includes("guest"))
      return Alert.alert("Name Required", "Enter your real name.");
    if (!payMethod)
      return Alert.alert("Payment", "Choose a payment method.");
    if (!address.trim())
      return Alert.alert("Address", "Enter a delivery address.");
    if (!name.trim())
      return Alert.alert("Name", "Enter recipient name.");
    if (!phone.trim())
      return Alert.alert("Phone", "Enter contact number.");

    const id = makeId();
    setOid(id);
    const cartId = await AsyncStorage.getItem("cartId");

    const items = cartItems.map((it) => {
      const qty = Number(it.quantity) || 1;
      const amt = Number(it.amount) || Number(it.total) || 0;
      return {
        productId: it.productId,
        productName: it.productName,
        quantity: qty,
        unitPrice: parseFloat((qty > 0 ? amt / qty : amt).toFixed(2)),
        amount: amt,
      };
    });

    const co = {
      Cartid: cartId,
      customerId: customer.customerAccountNumber,
      orderCode: id,
      PaymentMode: payMethod,
      PaymentAccountNumber: customer.contactNumber,
      customerAccountType: customer.accountType || "Customer",
      paymentService: payMethod === "Mobile Money" ? "Mtn" : "Cash",
      totalAmount: totalBeforeCharge,
      items,
      recipientName: name,
      recipientContactNumber: phone,
      orderNote: note || "N/A",
      orderDate: new Date().toISOString(),
    };

    const addr = {
      orderCode: id,
      address,
      Customerid: customer.customerAccountNumber,
      recipientName: name,
      recipientContactNumber: phone,
      orderNote: note || "N/A",
      geoLocation: "N/A",
    };

    try {
      setBusy(true);

      if (payMethod !== "Mobile Money") {
        return await finalize(id, co, addr);
      }

      await AsyncStorage.setItem("checkoutDetails", JSON.stringify(co));
      await AsyncStorage.setItem(
        "orderDeliveryDetails",
        JSON.stringify(addr)
      );

      setPCo(co);
      setPAddr(addr);
      setMomo("233");
      setNet(null);
      setStatus("input");
      setTick(TIMER_SECONDS);
      setModalOpen(true);
    } catch (e) {
      doneRef.current = false;
      setOid(null);
      Alert.alert("Error", e?.message || "Checkout failed.");
    } finally {
      setBusy(false);
    }
  };

  const closeModal = () => {
    if (status === "input") {
      killAllTimers();
      setModalOpen(false);
      setStatus("idle");
    }
  };

  /* ═══════════════════════════════════════════════════════
   *  RENDER SECTIONS
   * ═══════════════════════════════════════════════════════ */
  const renderDelivery = () => (
    <Card>
      <HeaderRow icon="location-outline" title="Delivery Details" />

      <Field
        label="Recipient Name"
        required
        icon="person-outline"
        value={name}
        onChangeText={setName}
        placeholder="John Doe"
      />

      <Field
        label="Contact Number"
        required
        icon="call-outline"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="0XX XXX XXXX"
      />

      <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>
          Delivery Address
          <Text style={{ color: C.red }}> *</Text>
        </Text>
        {!typing ? (
          <View style={s.addrRow}>
            <View style={[s.fieldBox, { flex: 1 }]}>
              <Ionicons
                name="navigate-outline"
                size={17}
                color={C.inkFaint}
                style={{ marginLeft: 14 }}
              />
              <TextInput
                style={s.fieldInput}
                value={address}
                editable={false}
                placeholder="Select location"
                placeholderTextColor={C.inkGhost}
              />
            </View>
            <TouchableOpacity
              style={s.locBtn}
              onPress={() => setLocOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={14} color={C.white} />
              <Text style={s.locBtnText}>
                {address ? "Change" : "Select"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.fieldBox, { alignItems: "flex-start" }]}>
            <Ionicons
              name="create-outline"
              size={17}
              color={C.inkFaint}
              style={{ marginLeft: 14, marginTop: 13 }}
            />
            <TextInput
              style={[s.fieldInput, { height: 84, textAlignVertical: "top" }]}
              value={address}
              onChangeText={setAddress}
              multiline
              placeholder="Full delivery address"
              placeholderTextColor={C.inkGhost}
            />
          </View>
        )}
      </View>

      <TouchableOpacity
        style={s.toggle}
        onPress={toggleManual}
        activeOpacity={0.7}
      >
        <Ionicons
          name={typing ? "list-outline" : "pencil-outline"}
          size={13}
          color={C.brand}
        />
        <Text style={s.toggleText}>
          {typing ? "Pick from locations" : "Type address manually"}
        </Text>
      </TouchableOpacity>

      <Field
        label="Order Note"
        icon="chatbubble-ellipses-outline"
        value={note}
        onChangeText={setNote}
        multiline
        placeholder="Any special instructions?"
        inputStyle={{ height: 72, textAlignVertical: "top" }}
      />
    </Card>
  );

  const renderPayment = () => (
    <Card>
      <HeaderRow icon="wallet-outline" title="Payment Method" />
      {methods.map((m) => {
        const on = payMethod === m.key;
        return (
          <TouchableOpacity
            key={m.key}
            activeOpacity={0.7}
            onPress={() => setPayMethod(m.key)}
            style={[s.pmCard, on && s.pmCardOn]}
          >
            <View style={[s.pmIconBox, on && s.pmIconBoxOn]}>
              <Ionicons
                name={m.icon}
                size={20}
                color={on ? C.brand : C.inkFaint}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.pmTitle, on && { color: C.brandDark }]}>
                {m.key}
              </Text>
              <Text style={s.pmSub}>{m.desc}</Text>
            </View>
            <View style={[s.radio, on && { borderColor: C.brand }]}>
              {on && (
                <View style={[s.radioDot, { backgroundColor: C.brand }]} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </Card>
  );

  const renderSummary = () => (
    <Card style={{ marginBottom: 120 }}>
      <HeaderRow
        icon="receipt-outline"
        title="Order Summary"
        badge={cartItems.length}
      />

      {cartItems.map((item, i) => {
        const img = productImage(item.imagePath);
        const exactAmount = Number(item.amount) || Number(item.total) || 0;
        const qty = Number(item.quantity) || 1;
        const unitPr = qty > 0 ? exactAmount / qty : exactAmount;

        return (
          <View
            key={`${item.productId}-${i}`}
            style={[
              s.itemRow,
              i === cartItems.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            {img ? (
              <Image source={{ uri: img }} style={s.itemImg} />
            ) : (
              <View style={s.itemImgFallback}>
                <Ionicons name="cube-outline" size={18} color={C.inkGhost} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.itemName} numberOfLines={2}>
                {item.productName}
              </Text>
              <View style={s.itemMeta}>
                <View style={s.qtyTag}>
                  <Text style={s.qtyTagText}>Qty {qty}</Text>
                </View>
                {qty > 1 && (
                  <Text style={s.unitPrice}>{money(unitPr)} each</Text>
                )}
              </View>
            </View>
            <Text style={s.itemTotal}>{money(exactAmount)}</Text>
          </View>
        );
      })}

      <View style={s.divider} />
      <SummaryLine label="Subtotal" value={money(subtotal)} />
      <SummaryLine
        label="Delivery Fee"
        value={deliveryLabel}
        valueStyle={
          deliveryLabel === "FREE"
            ? { color: C.green, fontWeight: "800" }
            : null
        }
      />
      {payMethod === "Mobile Money" && (
        <SummaryLine
          label="Momo Service Charge"
          value={money(serviceCharge)}
        />
      )}
      <View style={[s.divider, { borderStyle: "dashed" }]} />

      <View style={s.totalRow}>
        <View>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalHint}>
            {payMethod === "Mobile Money"
              ? "Includes service charge"
              : "No extra charges"}
          </Text>
        </View>
        <Text style={s.totalVal}>{money(displayTotal)}</Text>
      </View>

      {payMethod === "Mobile Money" && (
        <View style={s.notice}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={C.blue}
          />
          <Text style={s.noticeText}>
            The {money(serviceCharge)} service charge is applied by your mobile
            money provider, not by Franko Trading.
          </Text>
        </View>
      )}
    </Card>
  );

  /* ── Payment Modal ──────────────────────────────────── */
  const renderModal = () => (
    <Modal
      visible={modalOpen}
      animationType="slide"
      transparent
      onRequestClose={closeModal}
    >
      <View style={s.mOverlay}>
        <View style={s.mSheet}>
          <View style={s.mDrag} />
          {status === "input" && (
            <TouchableOpacity style={s.mClose} onPress={closeModal}>
              <Ionicons name="close-circle" size={28} color={C.inkGhost} />
            </TouchableOpacity>
          )}
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 34,
            }}
          >
            <View style={s.mBrand}>
              <Image
                source={frankoLogo}
                style={s.mLogo}
                resizeMode="contain"
              />
              <Text style={s.mBrandText}>Franko Trading</Text>
            </View>

            <View style={s.mAmountBox}>
              <Text style={s.mAmountLabel}>AMOUNT TO PAY</Text>
              <Text style={s.mAmountVal}>{money(grandTotal)}</Text>
              <View style={s.mBreakdown}>
                <Text style={s.mBreakdownText}>
                  Items: {money(subtotal)}
                  {deliveryFee > 0 ? ` + Delivery: ${money(deliveryFee)}` : ""}
                  {" + Service: "}
                  {money(serviceCharge)}
                </Text>
              </View>
              <View style={s.mRefWrap}>
                <Ionicons
                  name="document-text-outline"
                  size={11}
                  color={C.inkFaint}
                />
                <Text style={s.mRefText}>Ref: {oid}</Text>
              </View>
            </View>

            {/* ── INPUT STATE ── */}
            {status === "input" && (
              <>
                <View style={s.mStep}>
                  <View style={s.mStepHead}>
                    <View style={s.mBadge}>
                      <Text style={s.mBadgeText}>1</Text>
                    </View>
                    <Text style={s.mStepTitle}>Mobile Money Number</Text>
                  </View>
                  <View style={s.momoRow}>
                    <Text style={{ fontSize: 18, marginRight: 8 }}>🇬🇭</Text>
                    <TextInput
                      style={s.momoInput}
                      value={momo}
                      onChangeText={onMomo}
                      keyboardType="phone-pad"
                      maxLength={12}
                      placeholder="233XXXXXXXXX"
                      placeholderTextColor={C.inkGhost}
                    />
                    {momoOk() && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={C.green}
                      />
                    )}
                  </View>
                  {momoZero() && (
                    <Hint type="error" text="Don't start with 0 after 233" />
                  )}
                  {momo.length === 12 && !momoOk() && !momoZero() && (
                    <Hint type="error" text="Invalid number" />
                  )}
                  {momoOk() && <Hint type="success" text="Valid number" />}
                </View>

                <View style={s.mStep}>
                  <View style={s.mStepHead}>
                    <View style={s.mBadge}>
                      <Text style={s.mBadgeText}>2</Text>
                    </View>
                    <Text style={s.mStepTitle}>Select Network</Text>
                  </View>
                  <NetCard
                    id="mtn"
                    label="MTN"
                    sub="MTN Mobile Money"
                    logo={mtnLogo}
                    selected={net === "mtn"}
                    onPick={setNet}
                  />
                  <NetCard
                    id="vodafone"
                    label="Vodafone"
                    sub="Vodafone Cash"
                    logo={vodafoneLogo}
                    selected={net === "vodafone"}
                    onPick={setNet}
                  />
                  <NetCard
                    id="airteltigo"
                    label="AirtelTigo"
                    sub="AirtelTigo Money"
                    logo={airteltigoLogo}
                    selected={net === "airteltigo"}
                    onPick={setNet}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={!momoOk() || !net || payBusy}
                  onPress={handlePay}
                  style={[
                    s.payBtn,
                    (!momoOk() || !net || payBusy) && s.payBtnOff,
                  ]}
                >
                  {payBusy ? (
                    <View style={s.payBtnInner}>
                      <ActivityIndicator color={C.white} size="small" />
                      <Text style={s.payBtnText}>Sending request…</Text>
                    </View>
                  ) : (
                    <View style={s.payBtnInner}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={C.white}
                      />
                      <Text style={s.payBtnText}>
                        Pay {money(grandTotal)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={s.helpCard}>
                  <View style={s.helpHead}>
                    <Ionicons name="bulb-outline" size={15} color={C.amber} />
                    <Text style={s.helpTitle}>What happens next?</Text>
                  </View>
                  {[
                    "Payment prompt appears on your phone",
                    "Enter your Mobile Money PIN to approve",
                    "Wait 10–25 seconds for confirmation",
                    "Order processes immediately after payment",
                  ].map((t, i) => (
                    <View key={i} style={s.helpLine}>
                      <View style={s.helpDot} />
                      <Text style={s.helpText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── PENDING STATE ── */}
            {status === "pending" && (
              <View style={s.statusBox}>
                <Animated.View
                  style={[
                    s.pulseRing,
                    { transform: [{ scale: pulse }] },
                  ]}
                >
                  <View style={s.pulseCore}>
                    <Ionicons
                      name="phone-portrait"
                      size={32}
                      color={C.brand}
                    />
                  </View>
                </Animated.View>
                <Text style={s.statusTitle}>Approve on Your Phone</Text>
                <Text style={s.statusSub}>
                  A payment prompt has been sent
                </Text>
                <View style={s.statusMeta}>
                  <InfoLine label="Number" value={momo} />
                  <InfoLine label="Network" value={net?.toUpperCase()} />
                  <InfoLine
                    label="Amount"
                    value={money(grandTotal)}
                    highlight
                  />
                </View>
                <View style={s.tickWrap}>
                  <Bar pct={tick / TIMER_SECONDS} />
                  <Text style={s.tickText}>
                    {tick > 0 ? `${tick}s remaining` : "Checking…"}
                  </Text>
                </View>
              </View>
            )}

            {/* ── SUCCESS STATE ── */}
            {status === "success" && (
              <View style={s.statusBox}>
                <View
                  style={[s.statusBubble, { backgroundColor: C.greenGhost }]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={68}
                    color={C.green}
                  />
                </View>
                <Text style={[s.statusTitle, { color: C.green }]}>
                  Payment Successful!
                </Text>
                <Text style={s.statusSub}>Processing your order…</Text>
                <ActivityIndicator
                  size="small"
                  color={C.brand}
                  style={{ marginTop: 18 }}
                />
              </View>
            )}

            {/* ── FAILED STATE ── */}
            {status === "failed" && (
              <View style={s.statusBox}>
                <View
                  style={[s.statusBubble, { backgroundColor: C.redGhost }]}
                >
                  <Ionicons name="close-circle" size={68} color={C.red} />
                </View>
                <Text style={[s.statusTitle, { color: C.red }]}>
                  Payment Not Completed
                </Text>
                <Text style={s.statusSub}>
                  Please check the alert for options
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  /* ═══════════════════════════════════════════════════════
   *  RENDER
   * ═══════════════════════════════════════════════════════ */
  return (
    <View style={s.root}>
      {busy && (
        <View style={s.busyOverlay}>
          <View style={s.busyBox}>
            <ActivityIndicator size="large" color={C.brand} />
            <Text style={s.busyTitle}>Processing Order</Text>
            <Text style={s.busySub}>Please wait…</Text>
          </View>
        </View>
      )}

      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.hBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.hTitle}>Checkout</Text>
          <View style={s.hSec}>
            <Ionicons name="lock-closed" size={9} color={C.brandLight} />
            <Text style={s.hSecText}>Secure checkout</Text>
          </View>
        </View>
        <View style={s.hBag}>
          <Ionicons name="bag-handle-outline" size={19} color={C.white} />
          {cartItems.length > 0 && (
            <View style={s.hBagBadge}>
              <Text style={s.hBagBadgeText}>{cartItems.length}</Text>
            </View>
          )}
        </View>
      </View>

      <Animated.ScrollView
        style={[{ flex: 1 }, { opacity: fade }]}
        contentContainerStyle={{ padding: 14, paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {renderDelivery()}
        {renderPayment()}
        {renderSummary()}
      </Animated.ScrollView>

      <View
        style={[
          s.bottom,
          {
            paddingBottom:
              Platform.OS === "ios"
                ? Math.max(insets.bottom, 14) + 10
                : 14,
          },
        ]}
      >
        <View>
          <Text style={s.botLabel}>Total</Text>
          <Text style={s.botAmount}>{money(displayTotal)}</Text>
        </View>
        <TouchableOpacity
          style={[s.botBtn, busy && { opacity: 0.5 }]}
          onPress={checkout}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={s.botBtnText}>Place Order</Text>
          <Ionicons name="arrow-forward-circle" size={18} color={C.white} />
        </TouchableOpacity>
      </View>

      <LocationsModal
        isVisible={locOpen}
        onClose={() => setLocOpen(false)}
        onLocationSelect={pickLoc}
        selectedLocation={loc}
      />
      {renderModal()}
    </View>
  );
};

export default CheckoutScreen;

/* ──────────────────────────────────────────────────────
 *  STYLES
 * ────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.brand,
    paddingHorizontal: 14,
    paddingBottom: 12,
    ...shadow("lg"),
  },
  hBack: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  hTitle: { color: C.white, fontSize: 19, fontWeight: "800" },
  hSec: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  hSecText: { color: C.brandLight, fontSize: 10, fontWeight: "600" },
  hBag: { position: "relative", padding: 4 },
  hBagBadge: {
    position: "absolute",
    top: -3,
    right: -5,
    backgroundColor: C.red,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  hBagBadgeText: { color: C.white, fontSize: 9, fontWeight: "800" },

  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    ...shadow("sm"),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: C.brandGhost,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: C.ink },
  cardBadge: {
    backgroundColor: C.brandGhost,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardBadgeText: { fontSize: 11, fontWeight: "800", color: C.brand },

  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: C.inkSoft, marginBottom: 6 },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.cardAlt,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 13,
    overflow: "hidden",
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: C.ink,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
  },
  fieldError: { fontSize: 11, color: C.red, fontWeight: "600", marginTop: 4 },

  addrRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.brand,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 13,
  },
  locBtnText: { color: C.white, fontSize: 11, fontWeight: "800" },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 12,
  },
  toggleText: { color: C.brand, fontWeight: "700", fontSize: 12 },

  pmCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    backgroundColor: C.cardAlt,
  },
  pmCardOn: { borderColor: C.brandBorder, backgroundColor: C.brandGhost },
  pmIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.lineLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  pmIconBoxOn: { backgroundColor: C.brandLight },
  pmTitle: { fontSize: 13, fontWeight: "700", color: C.ink },
  pmSub: { fontSize: 10, color: C.inkFaint, marginTop: 2 },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.inkGhost,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.lineLight,
  },
  itemImg: {
    width: 50,
    height: 50,
    borderRadius: 11,
    backgroundColor: C.lineLight,
  },
  itemImgFallback: {
    width: 50,
    height: 50,
    borderRadius: 11,
    backgroundColor: C.lineLight,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    color: C.ink,
    lineHeight: 17,
    marginBottom: 3,
  },
  itemMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyTag: {
    backgroundColor: C.brandGhost,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  qtyTagText: { fontSize: 10, fontWeight: "700", color: C.brand },
  unitPrice: { fontSize: 10, color: C.inkFaint, fontWeight: "600" },
  itemTotal: { fontSize: 14, fontWeight: "800", color: C.ink },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    marginVertical: 10,
  },
  sumLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  sumLabel: { fontSize: 13, fontWeight: "600", color: C.inkMuted },
  sumLabelBold: { fontWeight: "800", color: C.ink },
  sumVal: { fontSize: 13, fontWeight: "700", color: C.ink },
  sumValBold: { fontWeight: "900" },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  totalLabel: { fontSize: 16, fontWeight: "900", color: C.ink },
  totalHint: { fontSize: 10, color: C.inkFaint, fontWeight: "600", marginTop: 2 },
  totalVal: { fontSize: 18, fontWeight: "900", color: C.red },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: C.blueGhost,
    borderWidth: 1,
    borderColor: C.blueBorder,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: C.blue,
    fontWeight: "600",
    lineHeight: 16,
  },

  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.white,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
    ...shadow("lg"),
  },
  botLabel: { fontSize: 11, color: C.inkFaint, fontWeight: "600" },
  botAmount: { fontSize: 18, fontWeight: "900", color: C.ink, marginTop: 1 },
  botBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.brand,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    ...shadow("brand"),
  },
  botBtnText: { color: C.white, fontSize: 14, fontWeight: "800" },

  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.overlay,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  busyBox: {
    backgroundColor: C.white,
    padding: 26,
    borderRadius: 18,
    alignItems: "center",
    ...shadow("lg"),
  },
  busyTitle: { marginTop: 12, fontSize: 15, fontWeight: "800", color: C.ink },
  busySub: { marginTop: 3, fontSize: 12, color: C.inkMuted },

  mOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: "flex-end",
  },
  mSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "92%",
    ...shadow("lg"),
  },
  mDrag: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.inkGhost,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  mClose: {
    position: "absolute",
    top: 8,
    right: 12,
    zIndex: 10,
    padding: 6,
  },

  mBrand: { alignItems: "center", marginTop: 6, marginBottom: 12 },
  mLogo: { width: 90, height: 36 },
  mBrandText: { fontSize: 12, fontWeight: "800", color: C.inkSoft, marginTop: 4 },

  mAmountBox: {
    backgroundColor: C.brandGhost,
    borderWidth: 1.5,
    borderColor: C.brandBorder,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 18,
  },
  mAmountLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: C.inkFaint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mAmountVal: { fontSize: 24, fontWeight: "900", color: C.brandDark, marginTop: 3 },
  mBreakdown: {
    backgroundColor: "rgba(5,150,105,0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  mBreakdownText: { fontSize: 10, fontWeight: "700", color: C.brandDark },
  mRefWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  mRefText: { fontSize: 10, color: C.inkFaint, fontWeight: "600" },

  mStep: {
    backgroundColor: C.cardAlt,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  mStepHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  mBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.brand,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  mBadgeText: { color: C.white, fontSize: 12, fontWeight: "800" },
  mStepTitle: { fontSize: 13, fontWeight: "800", color: C.ink },

  momoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 13,
    paddingHorizontal: 12,
  },
  momoInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: C.ink,
    paddingVertical: 12,
  },

  hintRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  hintText: { fontSize: 11, fontWeight: "600" },

  netCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.line,
    borderRadius: 13,
    padding: 12,
    marginBottom: 8,
  },
  netLogo: { width: 38, height: 38, borderRadius: 9 },
  netName: { fontSize: 13, fontWeight: "700", color: C.ink },
  netSub: { fontSize: 10, color: C.inkFaint, marginTop: 1 },

  payBtn: {
    backgroundColor: C.brand,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    ...shadow("brand"),
  },
  payBtnOff: {
    backgroundColor: C.inkGhost,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  payBtnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  payBtnText: { color: C.white, fontSize: 16, fontWeight: "800" },

  helpCard: {
    backgroundColor: C.amberGhost,
    borderWidth: 1,
    borderColor: C.amberBorder,
    borderRadius: 13,
    padding: 14,
  },
  helpHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  helpTitle: { fontSize: 12, fontWeight: "800", color: "#92400E" },
  helpLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 7,
    gap: 8,
  },
  helpDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.amber,
    marginTop: 5,
  },
  helpText: { flex: 1, fontSize: 11, color: "#78350F", lineHeight: 16 },

  statusBox: { alignItems: "center", paddingVertical: 32 },
  pulseRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.brandGhost,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseCore: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow("sm"),
  },
  statusBubble: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statusTitle: { fontSize: 18, fontWeight: "900", color: C.ink, marginTop: 18 },
  statusSub: { fontSize: 13, color: C.inkFaint, marginTop: 5 },

  statusMeta: {
    width: "100%",
    backgroundColor: C.cardAlt,
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: C.line,
  },
  infoLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.lineLight,
  },
  infoLabel: { fontSize: 12, color: C.inkFaint, fontWeight: "600" },
  infoVal: { fontSize: 12, color: C.ink, fontWeight: "700" },

  tickWrap: { width: "100%", marginTop: 22, alignItems: "center" },
  tickText: { fontSize: 12, fontWeight: "700", color: C.brandDark, marginTop: 7 },

  barTrack: {
    width: "100%",
    height: 5,
    backgroundColor: C.line,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: 5, borderRadius: 3 },
});
