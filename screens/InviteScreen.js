import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Share,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
} from "react-native";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

const InviteScreen = () => {
  const navigation = useNavigation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const sheetAnim = useRef(new Animated.Value(40)).current;

  const androidLink =
    "https://play.google.com/store/apps/details?id=com.poldark.mrfranky2";
  const iosLink =
    "https://apps.apple.com/us/app/franko-trading/id6741319907";

  const message = `🛒 Discover Franko Trading - Your Ultimate Shopping Destination! 

🔥 Premium phones, laptops, smart TVs, appliances & more at incredible prices!
💨 Lightning-fast delivery & secure payment
🎁 Exclusive deals just for you!

📱 Download now:
Android: ${androidLink}
iOS: ${iosLink}

Join thousands of happy customers! 🌟`;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 700,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: "whatsapp",
      color: "#25D366",
      iconLibrary: FontAwesome,
    },
    {
      name: "SMS",
      icon: "commenting",
      color: "#0EA5E9",
      iconLibrary: FontAwesome,
    },
    {
      name: "Facebook",
      icon: "facebook",
      color: "#1877F2",
      iconLibrary: FontAwesome,
    },
    {
      name: "More",
      icon: "share-alt",
      color: "#8B5CF6",
      iconLibrary: FontAwesome,
    },
  ];

  const shareApp = async () => {
    try {
      await Share.share({
        message,
        title: "Franko Trading App",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const AnimatedTouchable = ({ children, onPress, style, delay = 0 }) => {
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(animValue, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          style,
          {
            opacity: animValue,
            transform: [
              {
                translateY: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#16A34A" />
      <LinearGradient
        colors={["#22C55E", "#16A34A", "#15803D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        {/* Decorative shapes */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#ECFEFF" />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.headerTextContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.headerTitle}>Invite friends</Text>
            <Text style={styles.headerSubtitle}>
              Share Franko Trading and help your friends discover great deals.
            </Text>
          </Animated.View>
        </View>

        {/* Hero content */}
        <Animated.View
          style={[
            styles.heroContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["#ECFDF5", "#DCFCE7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIconWrapper}
          >
            <View style={styles.heroIconInner}>
              <Ionicons name="people" size={38} color="#16A34A" />
              <View style={styles.heroBadge}>
                <MaterialCommunityIcons
                  name="gift-outline"
                  size={14}
                  color="#16A34A"
                />
              </View>
            </View>
          </LinearGradient>

          <Text style={styles.heroTitle}>Share the love</Text>
          <Text style={styles.heroDescription}>
            Invite friends to shop phones, laptops, TVs and more. Fast delivery,
            secure payments & everyday low prices.
          </Text>

          <View style={styles.highlightRow}>
            <View style={styles.highlightPill}>
              <Ionicons
                name="pricetag-outline"
                size={16}
                color="#16A34A"
              />
              <Text style={styles.highlightText}>Best prices</Text>
            </View>
            <View style={styles.highlightPill}>
              <Ionicons name="car-outline" size={16} color="#16A34A" />
              <Text style={styles.highlightText}>Fast delivery</Text>
            </View>
            <View style={styles.highlightPill}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color="#16A34A"
              />
              <Text style={styles.highlightText}>Secure checkout</Text>
            </View>
          </View>
        </Animated.View>

        {/* Bottom sheet card */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: sheetAnim }],
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>Share via</Text>
            <Text style={styles.sheetSubtitle}>
              Choose how you’d like to share the app.
            </Text>
          </View>

          {/* Social shortcuts */}
          <View style={styles.socialRow}>
            {shareOptions.map((option, index) => {
              const IconComponent = option.iconLibrary;
              return (
                <AnimatedTouchable
                  key={option.name}
                  delay={index * 80}
                  style={styles.socialItemWrapper}
                  onPress={shareApp}
                >
                  <View style={styles.socialItem}>
                    <View
                      style={[
                        styles.socialIconCircle,
                        { backgroundColor: option.color },
                      ]}
                    >
                      <IconComponent
                        name={option.icon}
                        size={22}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text style={styles.socialLabel}>
                      {option.name === "More" ? "More" : option.name}
                    </Text>
                  </View>
                </AnimatedTouchable>
              );
            })}
          </View>

          {/* Divider text */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Primary share button */}
          <AnimatedTouchable
            delay={250}
            style={styles.primaryButtonWrapper}
            onPress={shareApp}
          >
            <LinearGradient
              colors={["#22C55E", "#16A34A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Feather name="share-2" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Share invite link</Text>
            </LinearGradient>
          </AnimatedTouchable>

          {/* Info text */}
          <View style={styles.infoRow}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#6B7280"
            />
            <Text style={styles.infoText}>
              Your friends will receive links to download the Franko Trading app
              on Android and iOS.
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const SHEET_RADIUS = 26;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#16A34A",
  },
  gradientContainer: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 8 : 0,
  },

  // Decorative circles
  circle1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(236, 253, 245, 0.16)",
    top: -60,
    right: -40,
  },
  circle2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(236, 253, 245, 0.1)",
    bottom: height * 0.35,
    left: -40,
  },
  circle3: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(236, 253, 245, 0.12)",
    top: height * 0.25,
    right: 12,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(226, 252, 240, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(4, 120, 87, 0.3)",
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ECFEFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#DCFCE7",
  },

  // Hero
  heroContainer: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  heroIconWrapper: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  heroIconInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  heroBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#BBF7D0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ECFEFF",
    marginBottom: 4,
  },
  heroDescription: {
    fontSize: 14,
    color: "#DCFCE7",
    lineHeight: 20,
    marginBottom: 12,
  },
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  highlightPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(6, 95, 70, 0.5)",
  },
  highlightText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: "500",
    color: "#ECFEFF",
  },

  // Bottom sheet
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 15,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginBottom: 14,
  },
  sheetHeaderRow: {
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Social
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 16,
  },
  socialItemWrapper: {
    flex: 1,
    alignItems: "center",
  },
  socialItem: {
    alignItems: "center",
  },
  socialIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  socialLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#111827",
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 8,
    fontSize: 12,
    color: "#9CA3AF",
  },

  // Primary button
  primaryButtonWrapper: {
    marginBottom: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 14,
  },
  primaryButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Info
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
  },
});

export default InviteScreen;