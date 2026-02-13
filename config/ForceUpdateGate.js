import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
  StyleSheet,
  AppState,
} from "react-native";
import * as Application from "expo-application";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const VERSION_URL =
  "https://franko-app.s3.eu-north-1.amazonaws.com/config/app-version.json";

const LAST_CHECK_KEY = "forceUpdate:lastCheckAt";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 8000;

const isVersionLess = (a, b) => {
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x < y) return true;
    if (x > y) return false;
  }
  return false;
};

const fetchWithTimeout = async (url, timeoutMs = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
};

export default function ForceUpdateGate({ children }) {
  // Do not block in dev / Expo Go
  if (__DEV__) return children;

  const appState = useRef(AppState.currentState);

  const [loading, setLoading] = useState(true); // only for first app boot check UI
  const [blocked, setBlocked] = useState(false);

  const [storeUrl, setStoreUrl] = useState("");
  const [currentVersion, setCurrentVersion] = useState("");
  const [requiredVersion, setRequiredVersion] = useState("");

  const [openingStore, setOpeningStore] = useState(false);

  // internal guard (avoid overlapping calls) - useRef so it doesn't re-render UI
  const checkingRef = useRef(false);

  const shouldCheckNow = useCallback(async () => {
    try {
      const last = await AsyncStorage.getItem(LAST_CHECK_KEY);
      if (!last) return true;

      const lastMs = Number(last);
      if (!Number.isFinite(lastMs)) return true;

      return Date.now() - lastMs >= CHECK_INTERVAL_MS;
    } catch {
      return true; // fail open
    }
  }, []);

  const runCheck = useCallback(async ({ force = false } = {}) => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      if (!force) {
        const ok = await shouldCheckNow();
        if (!ok) return;
      }

      await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

      const current = String(Application.nativeApplicationVersion || "");
      setCurrentVersion(current);

      const res = await fetchWithTimeout(`${VERSION_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`version check failed: ${res.status}`);

      const cfg = await res.json();

      const min = String(cfg?.minVersion || "");
      setRequiredVersion(min);

      const url = Platform.OS === "ios" ? cfg?.iosUrl : cfg?.androidUrl;
      setStoreUrl(url || "");

      setBlocked(Boolean(current && min && isVersionLess(current, min)));
    } catch (e) {
      // fail open (if you want to keep previous state instead, remove next line)
      setBlocked(false);
    } finally {
      checkingRef.current = false;
      setLoading(false);
    }
  }, [shouldCheckNow]);

  // Initial check on app start (throttled to 24h)
  useEffect(() => {
    runCheck({ force: false });
  }, [runCheck]);

  /**
   * IMPORTANT:
   * If the app is blocked, do NOT keep re-checking on AppState changes.
   * That was causing your button to stay in "Checking..." state.
   */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appState.current;
      appState.current = nextState;

      if (
        !blocked &&
        (prev === "inactive" || prev === "background") &&
        nextState === "active"
      ) {
        runCheck({ force: false }); // only if 24h passed
      }
    });

    return () => sub.remove();
  }, [runCheck, blocked]);

  const handleUpdatePress = useCallback(async () => {
    if (!storeUrl) return;

    try {
      setOpeningStore(true);
      await Linking.openURL(storeUrl);
      // optional: when user returns, you can force a re-check
      // (but not required; stores may not update instantly)
      // runCheck({ force: true });
    } finally {
      setOpeningStore(false);
    }
  }, [storeUrl]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Checking for updates...</Text>
      </View>
    );
  }

  if (blocked) {
    return (
      <LinearGradient
        colors={["#ECFDF5", "#D1FAE5", "#FFFFFF"]}
        style={styles.screen}
      >
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="cloud-download-outline" size={26} color="#059669" />
          </View>

          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.subtitle}>Please update the app to continue.</Text>

         

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleUpdatePress}
            disabled={!storeUrl || openingStore}
            style={[
              styles.buttonOuter,
              (!storeUrl || openingStore) && styles.buttonDisabled,
            ]}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonInner}
            >
              {openingStore ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.buttonText}>Opening Store...</Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="arrow-up-circle-outline"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.buttonText}>Update Now</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {!storeUrl ? (
            <Text style={styles.hint}>
              Store link not available. Please try again later.
            </Text>
          ) : null}
        </View>
      </LinearGradient>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  screen: { flex: 1, justifyContent: "center", padding: 18 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
    alignItems: "center",
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: 10,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 6 },
  subtitle: {
    textAlign: "center",
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  versionRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  versionText: { color: "#6B7280", fontSize: 12, fontWeight: "600" },
  versionDot: { marginHorizontal: 8, color: "#9CA3AF", fontSize: 12 },

  buttonOuter: { width: "100%", borderRadius: 14, overflow: "hidden" },
  buttonInner: {
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  hint: {
    marginTop: 12,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
});