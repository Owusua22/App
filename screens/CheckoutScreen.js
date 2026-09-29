import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  Animated,
  Platform,
} from "react-native";
import CachedImage from "../components/CachedImage";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  checkOutOrder,
  validateCart,
  updateOrderDelivery,
  FRIENDLY_PRICE_UPDATE_MSG,
} from "../redux/slice/orderSlice";
import {
  validateAccount,
  getAccountHoldName,
  debitCustomer,
  checkTransactionStatus,
  dispatchToAllNetworks,
  resetPaymentState,
  clearError,
  setValidationStep,
  incrementRetryAttempts,
  isValidationSuccess,
  isDebitSubmitted,
} from "../redux/slice/paymentSlice";
import { clearCart } from "../redux/slice/cartSlice";
import {
  selectCurrentCustomer,
  selectIsAuthenticated,
} from "../redux/slice/customerSlice";
import LocationsModal from "../components/Locations";

/* ─── Assets ──────────────────────────────────────────── */
const mtnLogo = require("../assets/momo.png");
const vodafoneLogo = require("../assets/voda.jpeg");
const airteltigoLogo = require("../assets/AT.png");
const frankoLogo = require("../assets/frankoIcon.png");

/* ─── Constants ───────────────────────────────────────── */
const HOME_ROUTE = "Home"; // Change this if your registered home route has a different name.

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
const POLL_INTERVAL_MS = 5000;
const REDIRECT_TO_HELP_MS = 60 * 1000;
const AUTO_VALIDATE_DEBOUNCE_MS = 800;

const API_BASE = "https://testing.frankotrading.com";

const NETWORK_CONFIGS = [
  {
    id: "1",
    name: "MTN Ghana",
    code: "mtn",
    apiCode: "MTN",
    prefix: ["024", "054", "055", "059"],
    color: "#FACC15",
    logo: mtnLogo,
  },
  {
    id: "2",
    name: "Vodafone Ghana",
    code: "vodafone",
    apiCode: "VODAFONE",
    prefix: ["020", "050"],
    color: "#EF4444",
    logo: vodafoneLogo,
  },
  {
    id: "3",
    name: "AirtelTigo",
    code: "airteltigo",
    apiCode: "TIGO",
    prefix: ["027", "057", "026", "056"],
    color: "#3B82F6",
    logo: airteltigoLogo,
  },
];

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

const buildNarration = (items, maxLen = 40) => {
  if (!items?.length) return "Franko Trading Purchase";
  const parts = items.map((i) => {
    const name = (i.productName || "Item").trim();
    const qty = Number(i.quantity) || 1;
    return qty > 1 ? `${name} x${qty}` : name;
  });
  const full = parts.join(", ");
  return full.length > maxLen ? `${full.slice(0, maxLen - 3)}...` : full;
};

const productImage = (path) =>
  path
    ? `${API_BASE}/Media/Products_Images/${path.split("\\").pop()}`
    : null;

const isFree = (fee) =>
  typeof fee === "string" && fee.toLowerCase().trim().includes("free");
const isNA = (fee) =>
  fee == null || fee === "N/A" || fee === "n/a" || fee === 0 || fee === "0";

const getApiResponseCode = (value) => {
  let response = value;
  if (typeof response === "string") {
    try {
      response = JSON.parse(response);
    } catch {
      return response.trim();
    }
  }
  if (Array.isArray(response)) response = response[0];
  if (Array.isArray(response?.data)) response = response.data[0];
  if (Array.isArray(response?.result)) response = response.result[0];
  return String(
    response?.responseCode ??
      response?.response?.responseCode ??
      response?.data?.responseCode ??
      response?.code ??
      ""
  ).trim();
};

const getApiResponseMessage = (value) =>
  value?.responseMessage ??
  value?.response?.responseMessage ??
  value?.data?.responseMessage ??
  value?.message ??
  "";

const getFailureMessage = (error, fallback) => {
  if (typeof error === "string") return error;
  const payload = error?.payload ?? error;
  return (
    payload?.message ??
    payload?.responseMessage ??
    payload?.title ??
    error?.response?.data?.message ??
    error?.response?.data?.title ??
    error?.message ??
    fallback
  );
};

// Only ValidateCart failures are price-update events. CheckOutDbCart is now
// used to create an order, not to decide whether cart prices have changed.
const isPriceUpdateFailure = (error) => {
  const failure = error?.payload ?? error;
  return (
    failure?.isPriceUpdate === true || failure?.isCheckoutFailure === true
  );
};

const isPaymentSuccess = (res) => {
  if (!res) return false;
  const codeMatch =
    String(res.responseCode) === "1" || String(res.responseCode) === "01";
  const messageMatch =
    res.responseMessage === "Successfully processed transaction.";
  const result = codeMatch && messageMatch;

  console.log("[isPaymentSuccess] Check:", {
    responseCode: res.responseCode,
    responseMessage: res.responseMessage,
    codeMatch,
    messageMatch,
    result,
  });

  return result;
};

const detectNetworkFromNumber = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\D/g, "");
  const local =
    cleaned.startsWith("233") && cleaned.length >= 5
      ? "0" + cleaned.slice(3)
      : cleaned;
  if (local.length < 3) return null;
  const prefix = local.substring(0, 3);
  return (
    NETWORK_CONFIGS.find((net) => net.prefix.some((p) => prefix === p)) || null
  );
};

const isMomoValid = (momo) => /^233[1-9]\d{8}$/.test(momo);

const isValidPhoneFormat = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\D/g, "");
  return cleaned.length === 10 && cleaned.startsWith("0");
};

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
          color={error ? C.red : C.inkFaint}
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

const NetCard = ({ network, selected, onPick, disabled }) => {
  const pal = {
    mtn: { b: C.mtnBorder, bg: C.mtnBg, d: C.mtn },
    vodafone: { b: C.vodaBorder, bg: C.vodaBg, d: C.voda },
    airteltigo: { b: C.atBorder, bg: C.atBg, d: C.at },
  }[network.code] || {};

  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.7}
      onPress={disabled ? null : () => onPick(network)}
      style={[
        s.netCard,
        selected && { borderColor: pal.b, backgroundColor: pal.bg },
        disabled && { opacity: 0.5 },
      ]}
    >
      <CachedImage source={network.logo} style={s.netLogo} resizeMode="contain" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.netName}>{network.name}</Text>
        <Text style={s.netSub}>{network.name} Mobile Money</Text>
      </View>
      <View style={[s.radio, selected && { borderColor: pal.d }]}>
        {selected && <View style={[s.radioDot, { backgroundColor: pal.d }]} />}
      </View>
    </TouchableOpacity>
  );
};

const ValidationStatusBanner = ({ validationState, accountName, onRetry }) => {
  if (validationState === "idle") return null;
  const configs = {
    validating: {
      bg: C.blueGhost,
      border: C.blueBorder,
      iconName: null,
      iconColor: null,
      textColor: C.blue,
      title: "Validating your account…",
      subtitle: "This only takes a moment",
      showSpinner: true,
    },
    success: {
      bg: C.greenGhost,
      border: C.green + "40",
      iconName: "checkmark-circle",
      iconColor: C.green,
      textColor: C.green,
      title: "Account verified successfully",
      subtitle: accountName
        ? `Holder: ${accountName.name || accountName.accountName || "Verified"}`
        : "You may now proceed to pay",
      showSpinner: false,
    },
    failed: {
      bg: C.redGhost,
      border: C.red + "40",
      iconName: "close-circle",
      iconColor: C.red,
      textColor: C.red,
      title: "Validation failed",
      subtitle: "Please check your number and network, then retry",
      showSpinner: false,
    },
  };
  const cfg = configs[validationState];
  if (!cfg) return null;

  return (
    <View style={[s.vBanner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={s.vBannerRow}>
        {cfg.showSpinner ? (
          <ActivityIndicator size="small" color={C.blue} style={{ marginRight: 10 }} />
        ) : (
          <Ionicons
            name={cfg.iconName}
            size={22}
            color={cfg.iconColor}
            style={{ marginRight: 10 }}
          />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[s.vBannerTitle, { color: cfg.textColor }]}>{cfg.title}</Text>
          <Text style={s.vBannerSub}>{cfg.subtitle}</Text>
        </View>
        {validationState === "failed" && onRetry && (
          <TouchableOpacity style={s.vRetryBtn} onPress={onRetry}>
            <Ionicons name="refresh" size={14} color={C.white} />
            <Text style={s.vRetryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const NetworkDispatchStatus = ({ dispatchData, dispatchStep, loading }) => {
  if (!dispatchData || dispatchStep === "idle") return null;
  const { results, summary } = dispatchData;
  return (
    <View style={s.dispatchStatusCard}>
      <View style={s.dispatchHeader}>
        <Ionicons name="cloud-upload-outline" size={16} color={C.brand} />
        <Text style={s.dispatchTitle}>Network Dispatch Status</Text>
        <View
          style={[
            s.dispatchSummaryBadge,
            summary.successful === summary.total && { backgroundColor: C.green },
            summary.successful === 0 && { backgroundColor: C.red },
            summary.successful > 0 &&
              summary.successful < summary.total && { backgroundColor: C.amber },
          ]}
        >
          <Text style={s.dispatchSummaryText}>
            {summary.successful}/{summary.total}
          </Text>
        </View>
      </View>
      {loading.networkDispatch && (
        <View style={s.dispatchLoadingStatus}>
          <ActivityIndicator size="small" color={C.brand} />
        </View>
      )}
      {results?.length > 0 && (
        <View style={s.dispatchResultsList}>
          {results.map((result, index) => (
            <View key={index} style={s.dispatchResultItem}>
              <View style={s.dispatchResultContent}>
                <Text style={s.dispatchResultNetwork}>{result.network}</Text>
                <Text style={s.dispatchResultTime}>
                  {new Date(result.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <View style={s.dispatchResultStatus}>
                <Ionicons
                  name={result.success ? "checkmark-circle" : "close-circle"}
                  size={14}
                  color={result.success ? C.green : C.red}
                />
                <Text
                  style={[
                    s.dispatchResultText,
                    { color: result.success ? C.green : C.red },
                  ]}
                >
                  {result.success ? "Success" : "Failed"}
                </Text>
                {result.duration && (
                  <Text style={s.dispatchResultDuration}>({result.duration}ms)</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════ */
const CheckoutScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const {
    accountHoldName,
    networkDispatchData,
    loading,
    error,
    authError,
    dispatchStep,
    retryAttempts,
  } = useSelector((state) => state.payment);

  const currentCustomer = useSelector(selectCurrentCustomer);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const doneRef = useRef(false);
  const payDoneRef = useRef(false);
  const mountedRef = useRef(true);
  const pollIntervalRef = useRef(null);
  const tickIntervalRef = useRef(null);
  const tickStartRef = useRef(null);
  const redirectTimeoutRef = useRef(null);
  const itemsRef = useRef([]);
  const autoValidateTimerRef = useRef(null);
  const priceUpdateHandledRef = useRef(false);
  const momoCartValidatedRef = useRef(false);
  const closeModalInFlightRef = useRef(false);

  const pCoRef = useRef(null);
  const pAddrRef = useRef(null);
  const selectedNetworkRef = useRef(null);
  const oidRef = useRef(null);
  const momoRef = useRef("233");
  const grandTotalRef = useRef(0);

  const [customer, setCustomer] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [payMethod, setPayMethod] = useState("");
  const payMethodRef = useRef("");
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
  const [modalPhase, setModalPhase] = useState("input");
  const [priceUpdateOpen, setPriceUpdateOpen] = useState(false);
  const [priceUpdateMessage, setPriceUpdateMessage] = useState(
    FRIENDLY_PRICE_UPDATE_MSG
  );
  const [inlineValidation, setInlineValidation] = useState("idle");
  const [tick, setTick] = useState(TIMER_SECONDS);
  const [momo, setMomo] = useState("233");
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [pCo, setPCo] = useState(null);
  const [pAddr, setPAddr] = useState(null);

  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, it) => sum + (Number(it.amount) || Number(it.total) || 0),
        0
      ),
    [cartItems]
  );

  const deliveryFee = useMemo(() => {
    if (typing || !loc) return 0;
    const f = loc.town?.delivery_fee;
    if (isFree(f)) return 0;
    const n = typeof f === "number" ? f : parseFloat(f);
    return !isNaN(n) && n > 0 ? n : 0;
  }, [typing, loc]);

  const totalBeforeCharge = useMemo(
    () =>
      typing || isNA(loc?.town?.delivery_fee)
        ? subtotal
        : subtotal + deliveryFee,
    [subtotal, deliveryFee, typing, loc]
  );

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
    if (canCOD) {
      list.unshift({
        key: "Cash on Delivery",
        icon: "cash-outline",
        desc: "Pay when you receive",
      });
    }
    return list;
  }, [canCOD]);

  const momoOk = useCallback(() => isMomoValid(momo), [momo]);
  const momoZero = useCallback(() => momo.length > 3 && momo[3] === "0", [momo]);
  const canPay = useMemo(
    () =>
      momoOk() &&
      selectedNetwork !== null &&
      inlineValidation === "success" &&
      modalPhase === "input",
    [momoOk, selectedNetwork, inlineValidation, modalPhase]
  );

  const choosePayMethod = useCallback((method) => {
    // Keep the ref in sync immediately so checkout never submits a stale method.
    payMethodRef.current = method;
    setPayMethod(method);
  }, []);

  useEffect(() => {
    grandTotalRef.current = grandTotal;
  }, [grandTotal]);

  useEffect(() => {
    momoRef.current = momo;
  }, [momo]);

  useEffect(() => {
    selectedNetworkRef.current = selectedNetwork;
  }, [selectedNetwork]);

  useEffect(() => {
    oidRef.current = oid;
  }, [oid]);

  useEffect(() => {
    pCoRef.current = pCo;
  }, [pCo]);

  useEffect(() => {
    pAddrRef.current = pAddr;
  }, [pAddr]);

  /* ── Auto-validation ─────────────────────────────────── */
  const runValidation = useCallback(
    async (momoNumber, network) => {
      if (!isMomoValid(momoNumber) || !network) return;
      setInlineValidation("validating");

      try {
        const result = await dispatch(
          validateAccount({ msisdn: momoNumber, network: network.apiCode })
        ).unwrap();

        if (!mountedRef.current) return;

        if (isValidationSuccess(result)) {
          setInlineValidation("success");
          dispatch(setValidationStep("success"));
          dispatch(
            getAccountHoldName({
              msisdn: momoNumber,
              network: network.apiCode,
            })
          );
        } else if (
          network.code !== "mtn" &&
          String(result?.responseCode) === "100"
        ) {
          console.warn("[Validation] 100 General Failure for non-MTN. Bypassing.");
          setInlineValidation("success");
          dispatch(setValidationStep("success"));
        } else {
          console.warn(
            "[Validation] gateway returned non-success:",
            result?.responseCode,
            result?.responseMessage
          );
          setInlineValidation("failed");
          dispatch(setValidationStep("failed"));
        }
      } catch (err) {
        if (!mountedRef.current) return;

        const errCode = String(
          err?.responseCode || err?.gatewayCode || err?.code || ""
        );
        if (network.code !== "mtn" && errCode === "100") {
          console.warn("[Validation] 100 Error thrown for non-MTN. Bypassing.");
          setInlineValidation("success");
          dispatch(setValidationStep("success"));
        } else {
          console.warn("[Validation] error:", err);
          setInlineValidation("failed");
          dispatch(setValidationStep("failed"));
          if (err?.isAuthError) {
            Alert.alert(
              "Authentication Error",
              err.message || "Authentication failed. Please contact support."
            );
          }
        }
      }
    },
    [dispatch]
  );

  const scheduleAutoValidation = useCallback(
    (momoNumber, network) => {
      if (autoValidateTimerRef.current) {
        clearTimeout(autoValidateTimerRef.current);
        autoValidateTimerRef.current = null;
      }
      if (!isMomoValid(momoNumber) || !network) {
        setInlineValidation("idle");
        dispatch(setValidationStep("idle"));
        return;
      }
      setInlineValidation("validating");
      dispatch(setValidationStep("validating"));

      autoValidateTimerRef.current = setTimeout(() => {
        autoValidateTimerRef.current = null;
        if (mountedRef.current) runValidation(momoNumber, network);
      }, AUTO_VALIDATE_DEBOUNCE_MS);
    },
    [dispatch, runValidation]
  );

  /* ── Timer helpers ───────────────────────────────────── */
  const killAllTimers = useCallback(() => {
    clearInterval(tickIntervalRef.current);
    clearInterval(pollIntervalRef.current);
    clearTimeout(redirectTimeoutRef.current);
    clearTimeout(autoValidateTimerRef.current);
    tickIntervalRef.current = null;
    pollIntervalRef.current = null;
    redirectTimeoutRef.current = null;
    autoValidateTimerRef.current = null;
    tickStartRef.current = null;
  }, []);

  const startCountdown = useCallback(() => {
    clearInterval(tickIntervalRef.current);
    const started = Date.now();
    tickStartRef.current = started;
    setTick(TIMER_SECONDS);
    tickIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(tickIntervalRef.current);
        return;
      }
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const remaining = Math.max(0, TIMER_SECONDS - elapsed);
      setTick(remaining);
      if (remaining <= 0) clearInterval(tickIntervalRef.current);
    }, 500);
  }, []);

  /* ── Price-update handling ───────────────────────────── */
  const handlePriceUpdateFailure = useCallback(
    async (failure) => {
      const alreadyHandled = priceUpdateHandledRef.current;
      priceUpdateHandledRef.current = true;

      doneRef.current = true;
      payDoneRef.current = true;
      killAllTimers();
      setBusy(false);
      setPayBusy(false);
      setModalOpen(false);
      setModalPhase("input");
      momoCartValidatedRef.current = false;
      setPCo(null);
      pCoRef.current = null;
      setPAddr(null);
      pAddrRef.current = null;
      setOid(null);
      oidRef.current = null;
      setCartItems([]);
      itemsRef.current = [];
      dispatch(clearCart());

      const message =
        typeof failure === "string" ? failure : failure?.message;
      setPriceUpdateMessage(
        typeof message === "string" && message.trim()
          ? message
          : FRIENDLY_PRICE_UPDATE_MSG
      );
      // Open immediately, including when this handler is invoked again by the
      // checkout catch after ValidateCart has already identified a price change.
      if (mountedRef.current) setPriceUpdateOpen(true);

      if (alreadyHandled) return;
      AsyncStorage.multiRemove(CART_KEYS_TO_CLEAR).catch((storageError) => {
        console.warn("[Checkout] Could not clear persisted cart:", storageError);
      });
    },
    [dispatch, killAllTimers]
  );

  const validateCartBeforeOrder = useCallback(
    async (cartIdValue) => {
      const cartId = String(cartIdValue ?? "").trim();
      if (!cartId) {
        throw new Error("Your cart ID is missing. Please refresh your cart.");
      }

      // ValidateCart is a POST with cartId as a query parameter, not a body array.
      const validation = await dispatch(validateCart({ cartId })).unwrap();
      const responseCode = getApiResponseCode(validation);

      if (responseCode === "1") return validation;

      if (responseCode === "0") {
        const failure = {
          message: FRIENDLY_PRICE_UPDATE_MSG,
          responseCode,
          isPriceUpdate: true,
          isCheckoutFailure: true,
          isCartValidationFailure: true,
          raw: validation,
        };
        await handlePriceUpdateFailure(failure);
        throw failure;
      }

      const message = getApiResponseMessage(validation);
      const error = new Error(
        message || "We couldn't validate your cart. Please try again."
      );
      error.responseCode = responseCode;
      error.isCartValidationFailure = true;
      throw error;
    },
    [dispatch, handlePriceUpdateFailure]
  );

  const clearMomoDraft = useCallback(async () => {
    momoCartValidatedRef.current = false;
    setModalOpen(false);
    setModalPhase("input");
    setPayBusy(false);
    setInlineValidation("idle");
    setMomo("233");
    setSelectedNetwork(null);
    selectedNetworkRef.current = null;
    setOid(null);
    oidRef.current = null;
    setPCo(null);
    pCoRef.current = null;
    setPAddr(null);
    pAddrRef.current = null;
    dispatch(clearError());
    dispatch(setValidationStep("idle"));
    await AsyncStorage.multiRemove([
      "checkoutDetails",
      "orderDeliveryDetails",
      "pendingOrderId",
    ]).catch(() => {});
  }, [dispatch]);

  /* ── Bootstrap ───────────────────────────────────────── */
  useEffect(() => {
    mountedRef.current = true;
    dispatch(resetPaymentState());
    Animated.timing(fade, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();

    (async () => {
      try {
        const [dJ, cJson, lJ, iJ] = await Promise.all([
          AsyncStorage.getItem("cartDetails"),
          AsyncStorage.getItem("cart"),
          AsyncStorage.getItem("selectedLocation"),
          AsyncStorage.getItem("usedOrderIds"),
        ]);
        if (!mountedRef.current) return;

        const c = isAuthenticated ? currentCustomer : null;
        if (!c || !c.contactNumber) {
          Alert.alert("Sign in required", "Please sign in before checking out.", [
            {
              text: "OK",
              onPress: () =>
                navigation.reset({ index: 0, routes: [{ name: "SignIn" }] }),
            },
          ]);
          return;
        }

        setCustomer(c);
        setName(c.firstName ? `${c.firstName} ${c.lastName || ""}`.trim() : "");
        setPhone(c.contactNumber || "");
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
  }, [
    killAllTimers,
    dispatch,
    isAuthenticated,
    currentCustomer,
    navigation,
    fade,
  ]);

  useEffect(() => {
    if (ids.size) {
      AsyncStorage.setItem("usedOrderIds", JSON.stringify([...ids])).catch(() => {});
    }
  }, [ids]);

  useEffect(() => {
    if (modalPhase !== "pending") return;
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
  }, [modalPhase, pulse]);

  /* ── Helpers ─────────────────────────────────────────── */
  const makeId = useCallback(() => {
    let id;
    let attempts = 0;
    do {
      id = `APP-${Math.floor(Math.random() * 900) + 100}-${
        Math.floor(Math.random() * 900) + 100
      }`;
      attempts += 1;
    } while (ids.has(id) && attempts < 100);
    setIds((previous) => new Set([...previous, id]));
    return id;
  }, [ids]);

  const wipe = () => AsyncStorage.multiRemove(CART_KEYS_TO_CLEAR);

  const retryFn = async (fn, n = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= n; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (isPriceUpdateFailure(error)) throw error;
        if (attempt < n) {
          await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
        }
      }
    }
    throw lastError;
  };

  const createCheckoutOrder = async (co) => {
    const cid = (await AsyncStorage.getItem("cartId")) || co.Cartid;
    try {
      await validateCartBeforeOrder(cid);
    } catch (error) {
      console.error("[Checkout] ValidateCart failed:", error?.payload ?? error);
      throw error;
    }

    // CheckOutDbCart creates the order only. Cart-price validation is handled
    // exclusively by ValidateCart immediately before order creation.
    try {
      return await dispatch(checkOutOrder({ ...co, Cartid: cid })).unwrap();
    } catch (error) {
      console.error("[Checkout] CheckOutDbCart order creation failed:", error?.payload ?? error);
      throw error;
    }
  };

  const updateDeliveryAndClearCart = async (addr) =>
    retryFn(async () => {
      await dispatch(updateOrderDelivery(addr)).unwrap();
      dispatch(clearCart());
      await wipe();
    });

  // COD uses this combined flow: validate cart, create order, then save delivery.
  // Mobile Money validates before prompting and creates an order only after a
  // confirmed successful payment.
  const submitOrder = async (co, addr) => {
    const orderCode = String(co.orderCode || addr.orderCode);
    await createCheckoutOrder({ ...co, orderCode });
    await updateDeliveryAndClearCart({ ...addr, orderCode });
    return orderCode;
  };

  const onMomo = (text) => {
    let value = text.replace(/\D/g, "");
    if (value.startsWith("0")) value = "233" + value.slice(1);
    if (!value.startsWith("233")) value = "233";
    const next = value.slice(0, 12);
    setMomo(next);
    const detected = detectNetworkFromNumber(next);
    let network = selectedNetwork;
    if (detected && detected.id !== selectedNetwork?.id) {
      setSelectedNetwork(detected);
      network = detected;
    }
    setInlineValidation("idle");
    scheduleAutoValidation(next, network);
  };

  const handleNetworkSelect = (network) => {
    setSelectedNetwork(network);
    setInlineValidation("idle");
    scheduleAutoValidation(momo, network);
  };

  const handleRetryValidation = () =>
    scheduleAutoValidation(momo, selectedNetwork);

  /* ── Create and dispatch a MoMo order after confirmed payment ── */
  const dispatchMomoOrder = useCallback(
    async (orderId, checkoutObj, addrObj, paymentStatus) => {
      if (!isPaymentSuccess(paymentStatus)) return null;
      if (doneRef.current) return null;
      if (!momoCartValidatedRef.current) {
        throw new Error("The cart was not validated before Mobile Money payment.");
      }

      doneRef.current = true;
      try {
        // This function is called only after the payment status is confirmed.
        // Revalidate after payment before CheckOutDbCart creates the order.
        await createCheckoutOrder({ ...checkoutObj, orderCode: orderId });

        const finalAddressObj = { ...addrObj, orderCode: orderId };
        await updateDeliveryAndClearCart(finalAddressObj);
        await dispatch(
          dispatchToAllNetworks({
            paymentData: {
              transactionNumber: orderId,
              contactNumber: momoRef.current,
              amount: grandTotalRef.current,
            },
            networks: NETWORK_CONFIGS,
          })
        );
        await AsyncStorage.multiRemove(CART_KEYS_TO_CLEAR);
        momoCartValidatedRef.current = false;
        return orderId;
      } catch (error) {
        if (!priceUpdateHandledRef.current && mountedRef.current) {
          Alert.alert(
            "Order Error",
            "Payment succeeded, but order processing could not be completed. Please contact support with your payment reference."
          );
        }
        throw error;
      }
    },
    [createCheckoutOrder, dispatch, updateDeliveryAndClearCart]
  );

  /* ── Post-payment navigation ─────────────────────────── */
  const navigateAfterPayment = useCallback(
    async (success, orderId) => {
      if (!mountedRef.current || priceUpdateHandledRef.current) return;

      killAllTimers();
      if (success) {
        await clearMomoDraft();
        navigation.reset({
          index: 0,
          routes: [{ name: "OrderPlacedScreen", params: { orderId } }],
        });
        return;
      }

      // No server order exists for an unsuccessful or abandoned payment. Return
      // to checkout with the cart intact so another method (including COD) works.
      payDoneRef.current = false;
      doneRef.current = false;
      await clearMomoDraft();
    },
    [clearMomoDraft, killAllTimers, navigation]
  );

  /* ── Polling ─────────────────────────────────────────── */
  const beginPolling = useCallback(
    (orderId, checkoutObj, addrObj) => {
      clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(async () => {
        if (!mountedRef.current) {
          clearInterval(pollIntervalRef.current);
          return;
        }

        try {
          const res = await dispatch(
            checkTransactionStatus({ refNo: orderId })
          ).unwrap();

          console.log("[Poll] Transaction status response:", {
            responseCode: res?.responseCode,
            responseMessage: res?.responseMessage,
          });

          if (isPaymentSuccess(res)) {
            payDoneRef.current = true;
            killAllTimers();
            if (!mountedRef.current) return;

            setModalPhase("success");
            let placedOrderId;
            try {
              // Order creation is gated on this confirmed-success status.
              placedOrderId = await dispatchMomoOrder(
                orderId,
                checkoutObj,
                addrObj,
                res
              );
            } catch (dispatchErr) {
              console.error("[Poll] dispatchMomoOrder failed:", dispatchErr);
              if (!priceUpdateHandledRef.current && mountedRef.current) {
                setModalPhase("failed");
              }
              return;
            }

            // Do not replace the price-update dialog with an order-success route.
            if (!placedOrderId || priceUpdateHandledRef.current) return;

            setTimeout(() => {
              if (priceUpdateHandledRef.current) return;
              navigateAfterPayment(true, placedOrderId);
            }, 1600);
          } else {
            console.log(
              "[Poll] Payment not yet complete, continuing to poll:",
              res?.responseCode,
              res?.responseMessage
            );
          }
        } catch (err) {
          if (err.isAuthError) {
            killAllTimers();
            payDoneRef.current = true;
            if (!mountedRef.current) return;
            setModalPhase("failed");
            Alert.alert(
              "Authentication Error",
              err.message || "Authentication failed. Please contact support."
            );
            setTimeout(() => {
              navigateAfterPayment(false, orderId);
            }, 500);
          }
        }
      }, POLL_INTERVAL_MS);
    },
    [dispatch, killAllTimers, navigateAfterPayment, dispatchMomoOrder]
  );

  /* ── Handle Pay ──────────────────────────────────────── */
  const handlePay = async () => {
    if (!canPay) return;

    const currentOid = oidRef.current;
    const currentPCo = pCoRef.current;
    const currentPAddr = pAddrRef.current;
    const currentNet = selectedNetworkRef.current?.apiCode;
    const currentMomo = momoRef.current;
    const currentGrandTotal = grandTotalRef.current;

    if (!currentOid || !currentPCo || !currentPAddr) {
      Alert.alert("Error", "Missing order details. Please try again.");
      return;
    }

    payDoneRef.current = false;

    try {
      setPayBusy(true);
      setModalPhase("pending");
      setTick(TIMER_SECONDS);
      startCountdown();

      const debitResult = await dispatch(
        debitCustomer({
          refNo: currentOid,
          msisdn: currentMomo,
          amount: totalBeforeCharge,
          network: currentNet,
          narration: buildNarration(cartItems, 30),
        })
      ).unwrap();

      if (!isDebitSubmitted(debitResult)) {
        console.warn(
          "[Pay] debit prompt not submitted:",
          debitResult?.responseCode,
          debitResult?.responseMessage
        );
        const error = new Error(
          debitResult?.responseMessage ||
            "Payment prompt could not be sent. Please try again."
        );
        error.gatewayCode = debitResult?.responseCode;
        error.isGatewayRejection = true;
        throw error;
      }

      console.log("[Pay] Prompt submitted, code:", debitResult?.responseCode);
      beginPolling(currentOid, currentPCo, currentPAddr);

      redirectTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current || payDoneRef.current) return;
        killAllTimers();
        setModalOpen(false);
        setModalPhase("input");
        navigation.navigate("PaymentHelpScreen", {
          orderId: currentOid,
          network: currentNet,
          momoNumber: currentMomo,
          amount: currentGrandTotal,
          checkoutDetails: currentPCo,
          addressDetails: currentPAddr,
          cartItems: itemsRef.current,
        });
      }, REDIRECT_TO_HELP_MS);
    } catch (err) {
      killAllTimers();
      if (!mountedRef.current || payDoneRef.current) return;
      setModalPhase("failed");

      setTimeout(() => {
        if (!mountedRef.current || payDoneRef.current) return;

        if (err.isAuthError) {
          Alert.alert(
            "Authentication Error",
            err.message || "Authentication failed.",
            [
              {
                text: "OK",
                onPress: () =>
                  navigateAfterPayment(false, currentOid),
              },
            ]
          );
          return;
        }

        if (err.status === 503 || err.status === 502) {
          Alert.alert(
            "Service Temporarily Unavailable",
            "The payment service is temporarily unavailable.\n\nWould you like to try again?",
            [
              {
                text: "Try Again",
                onPress: () => {
                  dispatch(incrementRetryAttempts());
                  setModalPhase("input");
                  handlePay();
                },
              },
              {
                text: "Back to Checkout",
                style: "destructive",
                onPress: () =>
                  navigateAfterPayment(false, currentOid),
              },
            ]
          );
          return;
        }

        if (err.isGatewayRejection) {
          Alert.alert(
            "Payment Could Not Be Processed",
            err.message ||
              "The mobile money provider rejected the request. Please check your number and try again.",
            [
              {
                text: "Try Again",
                onPress: () => {
                  if (mountedRef.current) setModalPhase("input");
                },
              },
              {
                text: "Back to Checkout",
                style: "destructive",
                onPress: () =>
                  navigateAfterPayment(false, currentOid),
              },
            ]
          );
          return;
        }

        Alert.alert(
          "Payment Request Issue",
          "We couldn't confirm the payment prompt was sent to your phone.\n\nDid you receive a payment prompt?",
          [
            {
              text: "Yes, I got it",
              onPress: () => {
                if (!mountedRef.current) return;
                setModalPhase("pending");
                setTick(TIMER_SECONDS);
                startCountdown();
                beginPolling(currentOid, currentPCo, currentPAddr);
                redirectTimeoutRef.current = setTimeout(() => {
                  if (!mountedRef.current || payDoneRef.current) return;
                  killAllTimers();
                  setModalOpen(false);
                  setModalPhase("input");
                  navigation.navigate("PaymentHelpScreen", {
                    orderId: currentOid,
                    network: currentNet,
                    momoNumber: currentMomo,
                    amount: currentGrandTotal,
                    checkoutDetails: currentPCo,
                    addressDetails: currentPAddr,
                    cartItems: itemsRef.current,
                  });
                }, REDIRECT_TO_HELP_MS);
              },
            },
            {
              text: "No, try again",
              onPress: () => {
                if (mountedRef.current) setModalPhase("input");
              },
            },
            {
              text: "Back to Checkout",
              style: "destructive",
              onPress: () =>
                navigateAfterPayment(false, currentOid),
            },
          ],
          { cancelable: false }
        );
      }, 1500);
    } finally {
      if (mountedRef.current) setPayBusy(false);
    }
  };

  /* ── Finalize non-MoMo order ─────────────────────────── */
  const finalize = useCallback(
    async (id, co, addr) => {
      if (!id || doneRef.current) return;
      doneRef.current = true;
      try {
        setBusy(true);
        const placedOrderId = await submitOrder(
          { ...co, orderCode: id },
          { ...addr, orderCode: id }
        );
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "OrderPlacedScreen",
              params: { orderId: placedOrderId || id },
            },
          ],
        });
      } catch (error) {
        if (isPriceUpdateFailure(error)) {
          await handlePriceUpdateFailure(error);
          setModalOpen(false);
          setPriceUpdateOpen(true);
          return;
        }

        console.error("[Checkout] Order submission failed:", error?.payload ?? error);
        doneRef.current = false;
        Alert.alert("Error", getFailureMessage(error, "Order failed."));
      } finally {
        setBusy(false);
        setOid(null);
      }
    },
    [navigation, handlePriceUpdateFailure, submitOrder]
  );

  /* ── Location ────────────────────────────────────────── */
  const pickLoc = async (location) => {
    setLoc(location);
    setAddress(`${location.town?.name}, ${location.region}`);
    setTyping(false);
    choosePayMethod("");
    await AsyncStorage.setItem("selectedLocation", JSON.stringify(location));
    setLocOpen(false);
  };

  const toggleManual = async () => {
    const next = !typing;
    setTyping(next);
    if (next) {
      setLoc(null);
      setAddress("");
      choosePayMethod("");
      await AsyncStorage.removeItem("selectedLocation");
    }
  };

  /* ── Checkout ────────────────────────────────────────── */
  const checkout = async () => {
    // Use the immediately-updated selection, not a stale Mobile Money value.
    const selectedPayMethod = payMethodRef.current;

    if (name.trim().toLowerCase().includes("guest")) {
      return Alert.alert("Name Required", "Enter your real name.");
    }
    if (!selectedPayMethod) return Alert.alert("Payment", "Choose a payment method.");
    if (!address.trim()) return Alert.alert("Address", "Enter a delivery address.");
    if (!name.trim()) return Alert.alert("Name", "Enter recipient name.");
    if (!phone.trim()) return Alert.alert("Phone", "Enter contact number.");
    if (selectedPayMethod === "Mobile Money" && !isValidPhoneFormat(phone)) {
      return Alert.alert(
        "Invalid Phone",
        "Please enter a valid 10-digit number starting with 0."
      );
    }

    const id = makeId();
    doneRef.current = false;
    payDoneRef.current = false;
    momoCartValidatedRef.current = false;
    setOid(id);
    oidRef.current = id;
    setBusy(true);

    try {
      const cartId = await AsyncStorage.getItem("cartId");
      const items = cartItems.map((item) => {
        const qty = Number(item.quantity) || 1;
        const amount = Number(item.amount) || Number(item.total) || 0;
        return {
          productId: item.productId,
          productName: item.productName,
          quantity: qty,
          unitPrice: parseFloat((qty > 0 ? amount / qty : amount).toFixed(2)),
          amount,
        };
      });

      const co = {
        Cartid: cartId,
        customerId: customer.customerAccountNumber,
        orderCode: id,
        PaymentMode: selectedPayMethod,
        PaymentAccountNumber: customer.contactNumber,
        customerAccountType: customer.accountType || "Customer",
        paymentService:
          selectedPayMethod === "Mobile Money" ? "PENDING_NETWORK" : "Cash",
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

      if (selectedPayMethod !== "Mobile Money") {
        await finalize(id, co, addr);
        return;
      }

      // Mobile Money starts only after ValidateCart returns responseCode 1.
      // Do not create or dispatch a server order until payment is confirmed.
      await validateCartBeforeOrder(cartId);
      momoCartValidatedRef.current = true;

      // Keep an in-memory checkout draft for the payment flow.
      setPCo(co);
      setPAddr(addr);
      pCoRef.current = co;
      pAddrRef.current = addr;

      await AsyncStorage.setItem("checkoutDetails", JSON.stringify(co));
      await AsyncStorage.setItem("orderDeliveryDetails", JSON.stringify(addr));
      await AsyncStorage.setItem("pendingOrderId", id);

      setMomo("233");
      setSelectedNetwork(null);
      setModalPhase("input");
      setInlineValidation("idle");
      setTick(TIMER_SECONDS);
      dispatch(setValidationStep("idle"));
      dispatch(clearError());
      setModalOpen(true);
    } catch (error) {
      if (isPriceUpdateFailure(error)) {
        await handlePriceUpdateFailure(error);
        setModalOpen(false);
        setPriceUpdateOpen(true);
        return;
      }

      console.error("[Checkout] Checkout setup failed:", error?.payload ?? error);
      momoCartValidatedRef.current = false;
      doneRef.current = false;
      setModalOpen(false);
      setOid(null);
      oidRef.current = null;
      setPCo(null);
      setPAddr(null);
      pCoRef.current = null;
      pAddrRef.current = null;
      await AsyncStorage.multiRemove([
        "checkoutDetails",
        "orderDeliveryDetails",
        "pendingOrderId",
      ]).catch(() => {});
      Alert.alert("Error", getFailureMessage(error, "Checkout failed."));
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const closeModal = async () => {
    if (
      modalPhase === "pending" ||
      modalPhase === "success" ||
      closeModalInFlightRef.current
    ) {
      return;
    }

    closeModalInFlightRef.current = true;
    setBusy(true);
    clearTimeout(autoValidateTimerRef.current);
    killAllTimers();

    try {
      // No server order exists before payment success, so abandoning the modal
      // simply clears the local payment draft and leaves the cart available.
      await clearMomoDraft();
    } finally {
      closeModalInFlightRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const goHomeAfterPriceUpdate = useCallback(() => {
    setPriceUpdateOpen(false);
    navigation.reset({
      index: 0,
      routes: [{ name: HOME_ROUTE }],
    });
  }, [navigation]);

  /* ═══════════════════════════════════════════════════════
     RENDER SECTIONS
     ═══════════════════════════════════════════════════════ */
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
        error={!name.trim() && name.length > 0 ? "Name is required" : null}
      />
      <Field
        label="Contact Number"
        required
        icon="call-outline"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="0XX XXX XXXX"
        error={
          phone.length > 0 && !isValidPhoneFormat(phone)
            ? "Enter a valid 10-digit number starting with 0"
            : null
        }
      />
      <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>
          Delivery Address<Text style={{ color: C.red }}> *</Text>
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
              <Text style={s.locBtnText}>{address ? "Change" : "Select"}</Text>
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
      <TouchableOpacity style={s.toggle} onPress={toggleManual} activeOpacity={0.7}>
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
      {methods.map((method) => {
        const selected = payMethod === method.key;
        return (
          <TouchableOpacity
            key={method.key}
            activeOpacity={0.7}
            onPress={() => choosePayMethod(method.key)}
            style={[s.pmCard, selected && s.pmCardOn]}
          >
            <View style={[s.pmIconBox, selected && s.pmIconBoxOn]}>
              <Ionicons
                name={method.icon}
                size={20}
                color={selected ? C.brand : C.inkFaint}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.pmTitle, selected && { color: C.brandDark }]}>
                {method.key}
              </Text>
              <Text style={s.pmSub}>{method.desc}</Text>
            </View>
            <View style={[s.radio, selected && { borderColor: C.brand }]}>
              {selected && <View style={[s.radioDot, { backgroundColor: C.brand }]} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </Card>
  );

  const renderSummary = () => (
    <View>
      <Card style={{ marginBottom: 120 }}>
        <HeaderRow icon="receipt-outline" title="Order Summary" badge={cartItems.length} />
        {cartItems.map((item, index) => {
          const img = productImage(item.imagePath);
          const exactAmount = Number(item.amount) || Number(item.total) || 0;
          const qty = Number(item.quantity) || 1;
          const unitPrice = qty > 0 ? exactAmount / qty : exactAmount;
          return (
            <View
              key={`${item.productId}-${index}`}
              style={[
                s.itemRow,
                index === cartItems.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              {img ? (
                <CachedImage source={{ uri: img }} style={s.itemImg} />
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
                  {qty > 1 && <Text style={s.unitPrice}>{money(unitPrice)} each</Text>}
                </View>
              </View>
              <Text style={s.itemTotal}>{money(exactAmount)}</Text>
            </View>
          );
        })}
        <View style={s.divider} />
        <View style={s.sumLine}>
          <Text style={s.sumLabel}>Subtotal</Text>
          <Text style={s.sumVal}>{money(subtotal)}</Text>
        </View>
        <View style={s.sumLine}>
          <Text style={s.sumLabel}>Delivery Fee</Text>
          <Text
            style={[
              s.sumVal,
              deliveryLabel === "FREE" && { color: C.green, fontWeight: "800" },
            ]}
          >
            {deliveryLabel}
          </Text>
        </View>
        {payMethod === "Mobile Money" && (
          <View style={s.sumLine}>
            <Text style={s.sumLabel}>Momo Service Charge</Text>
            <Text style={s.sumVal}>{money(serviceCharge)}</Text>
          </View>
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
            <Ionicons name="information-circle-outline" size={14} color={C.blue} />
            <Text style={s.noticeText}>
              The {money(serviceCharge)} service charge is applied by your mobile
              money provider. Your account will be automatically validated in the
              payment screen.
            </Text>
          </View>
        )}
      </Card>
      <NetworkDispatchStatus
        dispatchData={networkDispatchData}
        dispatchStep={dispatchStep}
        loading={loading}
      />
    </View>
  );

  /* ── Payment Modal ───────────────────────────────────── */
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
          {modalPhase !== "pending" && modalPhase !== "success" && (
            <TouchableOpacity style={s.mClose} onPress={closeModal}>
              <Ionicons name="close-circle" size={28} color={C.inkGhost} />
            </TouchableOpacity>
          )}
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 34 }}
          >
            <View style={s.mBrand}>
              <CachedImage source={frankoLogo} style={s.mLogo} resizeMode="contain" />
              <Text style={s.mBrandText}>Franko Trading Limited</Text>
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
                <Ionicons name="document-text-outline" size={11} color={C.inkFaint} />
                <Text style={s.mRefText}>Ref: {oid}</Text>
              </View>
            </View>

            {modalPhase === "input" && (
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
                      editable={inlineValidation !== "validating"}
                    />
                    {inlineValidation === "validating" && (
                      <ActivityIndicator size="small" color={C.brand} />
                    )}
                    {inlineValidation === "success" && (
                      <Ionicons name="checkmark-circle" size={22} color={C.green} />
                    )}
                    {inlineValidation === "failed" && (
                      <Ionicons name="close-circle" size={22} color={C.red} />
                    )}
                  </View>
                  {momoZero() && (
                    <View style={s.hintRow}>
                      <Ionicons name="warning" size={13} color={C.red} />
                      <Text style={[s.hintText, { color: C.red }]}>
                        Don't include a leading 0 after 233
                      </Text>
                    </View>
                  )}
                  {momo.length === 12 && !momoOk() && !momoZero() && (
                    <View style={s.hintRow}>
                      <Ionicons name="warning" size={13} color={C.red} />
                      <Text style={[s.hintText, { color: C.red }]}>Invalid number</Text>
                    </View>
                  )}
                  {momoOk() && inlineValidation === "idle" && (
                    <View style={s.hintRow}>
                      <Ionicons name="ellipse-outline" size={13} color={C.inkFaint} />
                      <Text style={[s.hintText, { color: C.inkFaint }]}>
                        Select a network to validate automatically
                      </Text>
                    </View>
                  )}
                </View>

                <View style={s.mStep}>
                  <View style={s.mStepHead}>
                    <View style={s.mBadge}>
                      <Text style={s.mBadgeText}>2</Text>
                    </View>
                    <Text style={s.mStepTitle}>Select Network</Text>
                    {inlineValidation === "validating" && (
                      <Text style={s.autoValidatingLabel}>Auto-validating…</Text>
                    )}
                  </View>
                  {NETWORK_CONFIGS.map((network) => (
                    <NetCard
                      key={network.id}
                      network={network}
                      selected={selectedNetwork?.id === network.id}
                      onPick={handleNetworkSelect}
                      disabled={inlineValidation === "validating"}
                    />
                  ))}
                </View>

                <ValidationStatusBanner
                  validationState={inlineValidation}
                  accountName={accountHoldName}
                  onRetry={handleRetryValidation}
                />

                <TouchableOpacity
                  activeOpacity={canPay ? 0.85 : 1}
                  disabled={!canPay || payBusy}
                  onPress={handlePay}
                  style={[s.payBtn, (!canPay || payBusy) && s.payBtnOff]}
                >
                  {payBusy ? (
                    <View style={s.payBtnInner}>
                      <ActivityIndicator color={C.white} size="small" />
                      <Text style={s.payBtnText}>Sending request…</Text>
                    </View>
                  ) : (
                    <View style={s.payBtnInner}>
                      <Ionicons
                        name={canPay ? "card-outline" : "lock-closed-outline"}
                        size={18}
                        color={C.white}
                      />
                      <Text style={s.payBtnText}>
                        {inlineValidation === "validating"
                          ? "Validating…"
                          : inlineValidation === "success"
                          ? `Pay ${money(grandTotal)}`
                          : inlineValidation === "failed"
                          ? "Validation Failed – Retry Above"
                          : "Complete Fields to Pay"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={s.helpCard}>
                  <View style={s.helpHead}>
                    <Ionicons name="bulb-outline" size={15} color={C.amber} />
                    <Text style={s.helpTitle}>How It Works</Text>
                  </View>
                  {[
                    "Enter your MoMo number – network detected automatically",
                    "Your account is validated automatically",
                    "Tap Pay once validation succeeds",
                    "Approve the prompt on your phone",
                    "Your order is confirmed instantly after payment",
                  ].map((text, index) => (
                    <View key={index} style={s.helpLine}>
                      <View style={s.helpDot} />
                      <Text style={s.helpText}>{text}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {modalPhase === "pending" && (
              <View style={s.statusBox}>
                <Animated.View style={[s.pulseRing, { transform: [{ scale: pulse }] }]}>
                  <View style={s.pulseCore}>
                    <Ionicons name="phone-portrait" size={32} color={C.brand} />
                  </View>
                </Animated.View>
                <Text style={s.statusTitle}>Approve on Your Phone</Text>
                <Text style={s.statusSub}>A payment prompt has been sent</Text>
                <View style={s.statusMeta}>
                  <View style={s.infoLine}>
                    <Text style={s.infoLabel}>Number</Text>
                    <Text style={s.infoVal}>{momo}</Text>
                  </View>
                  <View style={s.infoLine}>
                    <Text style={s.infoLabel}>Network</Text>
                    <Text style={s.infoVal}>{selectedNetwork?.name}</Text>
                  </View>
                  <View style={s.infoLine}>
                    <Text style={s.infoLabel}>Amount</Text>
                    <Text style={[s.infoVal, { color: C.brand, fontWeight: "800" }]}>
                      {money(grandTotal)}
                    </Text>
                  </View>
                </View>
                <View style={s.tickWrap}>
                  <View style={s.barTrack}>
                    <View
                      style={[
                        s.barFill,
                        {
                          width: `${Math.max(0, Math.min(1, tick / TIMER_SECONDS)) * 100}%`,
                          backgroundColor: C.brand,
                        },
                      ]}
                    />
                  </View>
                  <Text style={s.tickText}>
                    {tick > 0 ? `${tick}s remaining` : "Checking…"}
                  </Text>
                </View>
              </View>
            )}

            {modalPhase === "success" && (
              <View style={s.statusBox}>
                <View style={[s.statusBubble, { backgroundColor: C.greenGhost }]}>
                  <Ionicons name="checkmark-circle" size={68} color={C.green} />
                </View>
                <Text style={[s.statusTitle, { color: C.green }]}>Payment Successful!</Text>
                <Text style={s.statusSub}>Processing your order…</Text>
                {loading.networkDispatch && (
                  <View style={s.dispatchingStatus}>
                    <ActivityIndicator size="small" color={C.brand} style={{ marginTop: 18 }} />
                  </View>
                )}
              </View>
            )}

            {modalPhase === "failed" && (
              <View style={s.statusBox}>
                <View style={[s.statusBubble, { backgroundColor: C.redGhost }]}>
                  <Ionicons name="close-circle" size={68} color={C.red} />
                </View>
                <Text style={[s.statusTitle, { color: C.red }]}>Payment Not Completed</Text>
                <Text style={s.statusSub}>
                  {authError
                    ? "Authentication failed — please contact support"
                    : error?.status === 503
                    ? "Service temporarily unavailable"
                    : "Check the alert above for options"}
                </Text>
                {error?.status === 503 && retryAttempts > 0 && (
                  <Text style={s.retryText}>Retry attempts: {retryAttempts}</Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  /* ── Price-update modal ──────────────────────────────── */
  const renderPriceUpdateModal = () => (
    <Modal
      visible={priceUpdateOpen}
      transparent
      animationType="fade"
      onRequestClose={goHomeAfterPriceUpdate}
    >
      <View style={s.priceUpdateOverlay}>
        <View style={s.priceUpdateCard}>
          <View style={s.priceUpdateIconWrap}>
            <Ionicons name="pricetag-outline" size={28} color={C.amber} />
          </View>
          <Text style={s.priceUpdateTitle}>Price Update Detected</Text>
          <Text style={s.priceUpdateMessage}>{priceUpdateMessage}</Text>
          <TouchableOpacity
            style={s.priceUpdateButton}
            onPress={goHomeAfterPriceUpdate}
            activeOpacity={0.85}
          >
            <Text style={s.priceUpdateButtonText}>Continue to Home</Text>
            <Ionicons name="arrow-forward" size={17} color={C.white} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={s.root}>
      <Modal
        visible={busy}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={s.busyOverlay}>
          <View style={s.busyBox}>
            <ActivityIndicator size="large" color={C.brand} />
            <Text style={s.busyTitle}>Processing Order</Text>
            <Text style={s.busySub}>Please wait…</Text>
          </View>
        </View>
      </Modal>

      <View style={[s.header, { paddingTop: 10 }]}>
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
        contentContainerStyle={{ padding: 14 }}
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
              Platform.OS === "ios" ? Math.max(insets.bottom, 14) : 14,
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
      {renderPriceUpdateModal()}
    </View>
  );
};

export default CheckoutScreen;

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
  hSec: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
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
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
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
  toggle: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 },
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
  itemImg: { width: 50, height: 50, borderRadius: 11, backgroundColor: C.lineLight },
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
  qtyTag: { backgroundColor: C.brandGhost, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  qtyTagText: { fontSize: 10, fontWeight: "700", color: C.brand },
  unitPrice: { fontSize: 10, color: C.inkFaint, fontWeight: "600" },
  itemTotal: { fontSize: 14, fontWeight: "800", color: C.ink },
  divider: { borderBottomWidth: 1, borderBottomColor: C.line, marginVertical: 10 },
  sumLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  sumLabel: { fontSize: 13, fontWeight: "600", color: C.inkMuted },
  sumVal: { fontSize: 13, fontWeight: "700", color: C.ink },
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
  noticeText: { flex: 1, fontSize: 11, color: C.blue, fontWeight: "600", lineHeight: 16 },
  dispatchStatusCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    ...shadow("sm"),
  },
  dispatchHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dispatchTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: C.ink, marginLeft: 8 },
  dispatchSummaryBadge: { backgroundColor: C.brand, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  dispatchSummaryText: { fontSize: 11, fontWeight: "700", color: C.white },
  dispatchLoadingStatus: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  dispatchLoadingText: { fontSize: 12, color: C.inkMuted, fontWeight: "500" },
  dispatchResultsList: { marginTop: 8 },
  dispatchResultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: C.cardAlt,
    borderRadius: 8,
    marginBottom: 6,
  },
  dispatchResultContent: { flex: 1 },
  dispatchResultNetwork: { fontSize: 12, fontWeight: "600", color: C.ink },
  dispatchResultTime: { fontSize: 10, color: C.inkMuted, marginTop: 1 },
  dispatchResultStatus: { flexDirection: "row", alignItems: "center", gap: 4 },
  dispatchResultText: { fontSize: 11, fontWeight: "600" },
  dispatchResultDuration: { fontSize: 9, color: C.inkFaint, marginLeft: 4 },
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
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  busyBox: { backgroundColor: C.white, padding: 26, borderRadius: 18, alignItems: "center", ...shadow("lg") },
  busyTitle: { marginTop: 12, fontSize: 15, fontWeight: "800", color: C.ink },
  busySub: { marginTop: 3, fontSize: 12, color: C.inkMuted },
  mOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  mSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "92%",
    ...shadow("lg"),
  },
  mDrag: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.inkGhost, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  mClose: { position: "absolute", top: 8, right: 12, zIndex: 10, padding: 6 },
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
  mAmountLabel: { fontSize: 10, fontWeight: "800", color: C.inkFaint, textTransform: "uppercase", letterSpacing: 0.5 },
  mAmountVal: { fontSize: 24, fontWeight: "900", color: C.brandDark, marginTop: 3 },
  mBreakdown: { backgroundColor: "rgba(5,150,105,0.08)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  mBreakdownText: { fontSize: 10, fontWeight: "700", color: C.brandDark },
  mRefWrap: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  mRefText: { fontSize: 10, color: C.inkFaint, fontWeight: "600" },
  mStep: { backgroundColor: C.cardAlt, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  mStepHead: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  mBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", marginRight: 8 },
  mBadgeText: { color: C.white, fontSize: 12, fontWeight: "800" },
  mStepTitle: { flex: 1, fontSize: 13, fontWeight: "800", color: C.ink },
  autoValidatingLabel: { fontSize: 10, fontWeight: "600", color: C.brand, fontStyle: "italic" },
  momoRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderWidth: 1.5, borderColor: C.line, borderRadius: 13, paddingHorizontal: 12 },
  momoInput: { flex: 1, fontSize: 17, fontWeight: "600", color: C.ink, paddingVertical: 12 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  hintText: { fontSize: 11, fontWeight: "600" },
  netCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderWidth: 2, borderColor: C.line, borderRadius: 13, padding: 12, marginBottom: 8 },
  netLogo: { width: 38, height: 38, borderRadius: 9 },
  netName: { fontSize: 13, fontWeight: "700", color: C.ink },
  netSub: { fontSize: 10, color: C.inkFaint, marginTop: 1 },
  vBanner: { borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1.5 },
  vBannerRow: { flexDirection: "row", alignItems: "flex-start" },
  vBannerTitle: { fontSize: 13, fontWeight: "700" },
  vBannerSub: { fontSize: 11, color: C.inkMuted, marginTop: 3, lineHeight: 16 },
  vRetryBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.brand, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 10, alignSelf: "flex-start" },
  vRetryText: { color: C.white, fontSize: 11, fontWeight: "700" },
  payBtn: { backgroundColor: C.brand, borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center", marginBottom: 14, ...shadow("brand") },
  payBtnOff: { backgroundColor: C.inkGhost, ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }) },
  payBtnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  payBtnText: { color: C.white, fontSize: 16, fontWeight: "800" },
  helpCard: { backgroundColor: C.amberGhost, borderWidth: 1, borderColor: C.amberBorder, borderRadius: 13, padding: 14 },
  helpHead: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  helpTitle: { fontSize: 12, fontWeight: "800", color: "#92400E" },
  helpLine: { flexDirection: "row", alignItems: "flex-start", marginBottom: 7, gap: 8 },
  helpDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.amber, marginTop: 5 },
  helpText: { flex: 1, fontSize: 11, color: "#78350F", lineHeight: 16 },
  statusBox: { alignItems: "center", paddingVertical: 32 },
  pulseRing: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.brandGhost, alignItems: "center", justifyContent: "center" },
  pulseCore: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.white, alignItems: "center", justifyContent: "center", ...shadow("sm") },
  statusBubble: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statusTitle: { fontSize: 18, fontWeight: "900", color: C.ink, marginTop: 18 },
  statusSub: { fontSize: 13, color: C.inkFaint, marginTop: 5 },
  statusMeta: { width: "100%", backgroundColor: C.cardAlt, borderRadius: 12, padding: 14, marginTop: 18, borderWidth: 1, borderColor: C.line },
  infoLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.lineLight },
  infoLabel: { fontSize: 12, color: C.inkFaint, fontWeight: "600" },
  infoVal: { fontSize: 12, color: C.ink, fontWeight: "700" },
  tickWrap: { width: "100%", marginTop: 22, alignItems: "center" },
  tickText: { fontSize: 12, fontWeight: "700", color: C.brandDark, marginTop: 7 },
  barTrack: { width: "100%", height: 5, backgroundColor: C.line, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3 },
  dispatchingStatus: { alignItems: "center", marginTop: 10 },
  dispatchingText: { fontSize: 12, color: C.inkMuted, marginTop: 6 },
  retryText: { fontSize: 11, color: C.inkMuted, marginTop: 4, textAlign: "center" },
  priceUpdateOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  priceUpdateCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    ...shadow("lg"),
  },
  priceUpdateIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.amberGhost,
    borderWidth: 1,
    borderColor: C.amberBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  priceUpdateTitle: { fontSize: 18, fontWeight: "900", color: C.ink, textAlign: "center" },
  priceUpdateMessage: { fontSize: 13, color: C.inkMuted, lineHeight: 20, textAlign: "center", marginTop: 8, marginBottom: 20 },
  priceUpdateButton: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.brand,
    paddingVertical: 14,
    borderRadius: 14,
  },
  priceUpdateButtonText: { color: C.white, fontSize: 14, fontWeight: "800" },
});
