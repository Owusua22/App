import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";

const { width } = Dimensions.get("window");
const MAX_CONTENT_WIDTH = 520;

const OrderCancellationScreen = () => {
  const navigation = useNavigation();

  const handleBackToShopping = () => {
    navigation.navigate("Home");
    // or: navigation.navigate("Home", { screen: "Products" });
  };

  const handleContactSupport = () => {
    navigation.navigate("CustomerService");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <View style={styles.iconRing}>
                <Icon name="cancel" size={34} color="#DC2626" />
              </View>
            </View>

            <Text style={styles.title}>Order Cancelled</Text>
            <Text style={styles.subtitle}>
              Your payment didn’t go through, or the order was cancelled before completion.
            </Text>

            
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What you can do next</Text>

            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Icon name="refresh" size={18} color="#0F766E" />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Try again</Text>
                <Text style={styles.rowText}>
                  Double‑check your payment details or try a different payment method.
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Icon name="wifi-off" size={18} color="#0F766E" />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Check your connection</Text>
                <Text style={styles.rowText}>
                  If your network dropped during checkout, retry from a stable connection.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.supportHeader}>
              <Icon name="support-agent" size={20} color="#111827" />
              <Text style={styles.supportTitle}>Need help?</Text>
            </View>

            <Text style={styles.supportText}>
              If you have any questions about the cancellation, our support team can help you.
            </Text>

            {/* NEW: Contact us link right under “Need help?” */}
            <TouchableOpacity
              style={styles.supportLink}
              onPress={handleContactSupport}
              activeOpacity={0.75}
            >
              <Text style={styles.supportLinkText}>Contact us</Text>
              <Icon name="chevron-right" size={20} color="#059669" />
            </TouchableOpacity>

            
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {/* UPDATED: Continue Shopping button is now GREEN */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleBackToShopping}
              activeOpacity={0.85}
            >
              <Icon name="shopping-bag" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Continue Shopping</Text>
            </TouchableOpacity>

           
          </View>

          {/* Footer */}
          <Text style={styles.footerText}>Thank you for choosing our service</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  container: { width: "100%", maxWidth: MAX_CONTENT_WIDTH },

  header: { alignItems: "center", paddingTop: 8, paddingBottom: 14 },
  iconWrap: { marginBottom: 14 },
  iconRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 6,
  },
  badge: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#991B1B", letterSpacing: 0.6 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 5,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 12 },

  row: { flexDirection: "row", gap: 12, paddingVertical: 10 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "800", color: "#111827", marginBottom: 3 },
  rowText: { fontSize: 13, color: "#6B7280", lineHeight: 19 },

  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },

  supportHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  supportTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  supportText: { fontSize: 13, color: "#6B7280", lineHeight: 19 },

  // NEW link styles
  supportLink: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    alignSelf: "flex-start",
    gap: 2,
    paddingVertical: 6,
  },
  supportLinkText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#059669",
  },

  supportPills: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  supportPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  supportPillText: { fontSize: 12, fontWeight: "700", color: "#065F46" },

  actions: { marginTop: 14, gap: 12 },

  // UPDATED: green primary button
  primaryButton: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#10B981",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 7,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },

  secondaryButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondaryButtonText: { color: "#111827", fontSize: 15, fontWeight: "800" },

  footerText: { marginTop: 18, textAlign: "center", fontSize: 13, color: "#9CA3AF" },
});

export default OrderCancellationScreen;