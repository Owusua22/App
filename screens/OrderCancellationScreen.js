import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar,
  Dimensions 
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get('window');

const OrderCancellationScreen = () => {
  const navigation = useNavigation();

  const handleBackToShopping = () => {
    navigation.navigate("Home");
  };

  const handleContactSupport = () => {
    navigation.navigate("CustomerService");
  };

  return (
    <>

      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.cancelledheader}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>⚠️</Text>
          </View>
          <Text style={styles.title}>Order Cancelled</Text>
          <Text style={styles.subtitle}>
            Your payment was not successful or the order was cancelled.
          </Text>
        </View>

        {/* Main Content Card */}
        <View style={styles.card}>
    

       

          {/* Divider */}
          <View style={styles.divider} />

          {/* Support Section */}
          <View style={styles.supportSection}>
            <Text style={styles.supportTitle}>Need help?</Text>
            <Text style={styles.supportText}>
              If you have any questions or concerns about your cancellation, 
              our support team is here to assist you.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleBackToShopping}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleContactSupport}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for choosing our service
          </Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 20,
  },
  cancelledheader: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#fecaca",
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 30,
    overflow: "hidden",
  },
  statusBadge: {
    backgroundColor: "#dc2626",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: "center",
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 24,
  },
  statusText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
    marginTop: 8,
    marginRight: 12,
  },
  infoText: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 24,
    marginVertical: 20,
  },
  supportSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
  },
});

export default OrderCancellationScreen;