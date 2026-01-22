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

const VERSION_URL =
  "https://franko-app.s3.eu-north-1.amazonaws.com/config/app-version.json";

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

export default function ForceUpdateGate({ children }) {
  const appState = useRef(AppState.currentState);

  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");

  const [currentVersion, setCurrentVersion] = useState("");
  const [requiredVersion, setRequiredVersion] = useState("");

  const [openingStore, setOpeningStore] = useState(false);
  const [checking, setChecking] = useState(false); // prevents double-check spam

  const checkVersion = useCallback(async () => {
    try {
      setChecking(true);

      // note: nativeApplicationVersion is fixed per installed binary
      const current = String(Application.nativeApplicationVersion || "");
      setCurrentVersion(current);

      const res = await fetch(`${VERSION_URL}?t=${Date.now()}`);
      const cfg = await res.json();

      const min = String(cfg?.minVersion || "");
      setRequiredVersion(min);

      const url = Platform.OS === "ios" ? cfg?.iosUrl : cfg?.androidUrl;
      setStoreUrl(url || "");

      if (current && min && isVersionLess(current, min)) {
        setBlocked(true);
      } else {
        setBlocked(false);
      }
    } catch {
      // fail open (recommended)
      // If you prefer fail closed, setBlocked(true) here.
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  // ✅ Re-check when returning from background (e.g., coming back from the store)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const prev = appState.current;
      appState.current = nextState;

      // when app becomes active again, re-check
      if ((prev === "inactive" || prev === "background") && nextState === "active") {
        checkVersion();
      }
    });

    return () => subscription.remove();
  }, [checkVersion]);

  const handleUpdatePress = async () => {
    if (!storeUrl) return;
    try {
      setOpeningStore(true);
      await Linking.openURL(storeUrl);
      // When user comes back, AppState listener will trigger checkVersion()
    } finally {
      setOpeningStore(false);
    }
  };

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
      <LinearGradient colors={["#ECFDF5", "#D1FAE5", "#FFFFFF"]} style={styles.screen}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="cloud-download-outline" size={26} color="#059669" />
          </View>

          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.subtitle}>
            Please update the app to continue.
          </Text>

         

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleUpdatePress}
            disabled={!storeUrl || openingStore || checking}
            style={[styles.buttonOuter, (!storeUrl || openingStore || checking) && styles.buttonDisabled]}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonInner}
            >
              {openingStore || checking ? (
                <>
                  <ActivityIndicator color="#fff" />
                  
                </>
              ) : (
                <>
                  <Ionicons name="arrow-up-circle-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Update Now</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.hint}>
            After updating, return to the app and it will re-check automatically.
          </Text>
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
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
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
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    textAlign: "center",
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  versionText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },
  versionDot: {
    marginHorizontal: 8,
    color: "#9CA3AF",
    fontSize: 12,
  },
  buttonOuter: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  buttonInner: {
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  hint: {
    marginTop: 12,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
});