import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const CustomerServiceScreen = () => {
  const navigation = useNavigation();

  const handleCall = () => {
    Linking.openURL("tel:+233302225651");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("Customer Support Inquiry");
    const body = encodeURIComponent("Hello,\n\nI need assistance with:\n\n");
    const mailtoUrl = `mailto:it@frankotrading.com?subject=${subject}&body=${body}`;
    Linking.openURL(mailtoUrl);
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      "Hello! I need customer support assistance."
    );
    Linking.openURL(`https://wa.me/233555939311?text=${message}`);
  };

  const handleSocialMedia = (url) => {
    Linking.openURL(url);
  };

  const contactMethods = [
    {
      id: 1,
      title: "Phone support",
      subtitle: "Talk to our support team",
      description: "Get instant help with your orders or account.",
      icon: "phone",
      value: "+233 302 225 651",
      action: handleCall,
      color: "#16A34A",
      bgColor: "#ECFDF3",
      iconBg: "rgba(22, 163, 74, 0.08)",
    },
    {
      id: 2,
      title: "Email support",
      subtitle: "Send us your queries",
      description: "We usually respond within 24 hours.",
      icon: "email-outline",
      value: "it@frankotrading.com",
      action: handleEmail,
      color: "#2563EB",
      bgColor: "#EFF6FF",
      iconBg: "rgba(37, 99, 235, 0.08)",
    },
    {
      id: 3,
      title: "WhatsApp chat",
      subtitle: "Quick messaging support",
      description: "Chat with us in real time on WhatsApp.",
      icon: "whatsapp",
      value: "+233 246 422 338",
      action: handleWhatsApp,
      color: "#22C55E",
      bgColor: "#F0FDF4",
      iconBg: "rgba(34, 197, 94, 0.08)",
    },
  ];

  const socialMediaLinks = [
    {
      id: 1,
      name: "Facebook",
      username: "/frankotradingenterprise",
      icon: "facebook",
      color: "#1877F2",
      bgColor: "#EFF6FF",
      url: "https://www.facebook.com/frankotradingenterprise",
    },
    {
      id: 2,
      name: "Instagram",
      username: "@frankotrading_fte",
      icon: "instagram",
      color: "#E4405F",
      bgColor: "#FFF1F2",
      url: "https://instagram.com/frankotrading_fte",
    },
    {
      id: 3,
      name: "X (Twitter)",
      username: "@frankotrading1",
      icon: "twitter",
      color: "#0EA5E9",
      bgColor: "#EFF6FF",
      url: "https://x.com/frankotrading1",
    },
    {
      id: 4,
      name: "TikTok",
      username: "@frankotrading",
      icon: "music-note",
      color: "#000000",
      bgColor: "#F9FAFB",
      url: "https://www.tiktok.com/@frankotrading",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#16A34A" />
      <View style={styles.container}>
        {/* HEADER */}
        <LinearGradient
          colors={["#22C55E", "#16A34A", "#15803D"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerDecor1} />
          <View style={styles.headerDecor2} />

          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Icon name="chevron-left" size={22} color="#ECFEFF" />
            </TouchableOpacity>

            <Text style={styles.headerTopTitle}>Support</Text>
            <View style={styles.headerRightSpacer} />
          </View>

          <View style={styles.headerContentRow}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerTitle}>Customer support</Text>
              <Text style={styles.headerSubtitle}>
                Need help with an order, delivery or product? We’re here for
                you.
              </Text>

              <View style={styles.headerBadgesRow}>
                <View style={styles.badge}>
                  <View style={styles.badgeDotLive} />
                  <Text style={styles.badgeText}>Live help</Text>
                </View>
                <View style={styles.badgeMuted}>
                  <Icon
                    name="clock-outline"
                    size={14}
                    color="rgba(226, 252, 240, 0.9)"
                  />
                  <Text style={styles.badgeMutedText}>8:00 AM – 6:00 PM</Text>
                </View>
              </View>
            </View>

            <View style={styles.headerIconWrapper}>
              <View style={styles.headerIconOuter}>
                <View style={styles.headerIconInner}>
                  <Icon name="headset" size={30} color="#16A34A" />
                </View>
                <View style={styles.headerIconBadge}>
                  <Icon
                    name="message-processing-outline"
                    size={14}
                    color="#16A34A"
                  />
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* CONTENT */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* CONTACT METHODS */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Get in touch</Text>
              <Text style={styles.sectionSubtitle}>
                Choose the support option that works best for you.
              </Text>
            </View>

            {contactMethods.map((method, index) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.contactCard,
                  { backgroundColor: method.bgColor },
                  index === contactMethods.length - 1 && styles.lastCard,
                ]}
                onPress={method.action}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.contactIconContainer,
                    { backgroundColor: method.iconBg },
                  ]}
                >
                  <Icon name={method.icon} size={26} color={method.color} />
                </View>

                <View style={styles.contactInfo}>
                  <Text style={styles.contactTitle}>{method.title}</Text>
                  <Text style={styles.contactSubtitle}>{method.subtitle}</Text>
                  <Text style={styles.contactDescription}>
                    {method.description}
                  </Text>
                  <Text
                    style={[styles.contactValue, { color: method.color }]}
                  >
                    {method.value}
                  </Text>
                </View>

                <View
                  style={[
                    styles.chevronContainer,
                    { borderColor: method.color },
                  ]}
                >
                  <Icon
                    name="chevron-right"
                    size={18}
                    color={method.color}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* SOCIAL MEDIA */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Connect with us</Text>
                <Text style={styles.sectionSubtitle}>
                  Follow Franko Trading for deals, news & tips.
                </Text>
              </View>
              <View style={styles.socialBadge}>
                <Icon
                  name="account-multiple-outline"
                  size={14}
                  color="#0369A1"
                />
                <Text style={styles.socialBadgeText}>Join the community</Text>
              </View>
            </View>

            <View style={styles.socialMediaGrid}>
              {socialMediaLinks.map((social) => (
                <TouchableOpacity
                  key={social.id}
                  style={[
                    styles.socialMediaCard,
                    { backgroundColor: social.bgColor },
                  ]}
                  onPress={() => handleSocialMedia(social.url)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.socialIconContainer,
                      { backgroundColor: social.color },
                    ]}
                  >
                    <Icon name={social.icon} size={22} color="#FFFFFF" />
                  </View>
                  <Text style={styles.socialMediaName}>{social.name}</Text>
                  <Text style={styles.socialMediaUsername}>
                    {social.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* SUPPORT HOURS */}
          <View style={styles.supportHoursCard}>
            <View style={styles.supportHoursHeader}>
              <View style={styles.clockIconContainer}>
                <Icon name="clock-outline" size={22} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.supportHoursTitle}>Business hours</Text>
                <Text style={styles.supportHoursSubtitle}>
                  Ghana Standard Time (GMT)
                </Text>
              </View>
            </View>

            <View style={styles.supportHoursList}>
              <View style={styles.supportHoursItem}>
                <View style={styles.dayContainer}>
                  <Text style={styles.dayText}>Monday – Saturday</Text>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusLabel}>Open</Text>
                </View>
                <Text style={styles.timeText}>8:00 AM – 6:00 PM</Text>
              </View>

              <View style={[styles.supportHoursItem, styles.lastHoursItem]}>
                <View style={styles.dayContainer}>
                  <Text style={styles.dayText}>Public holidays</Text>
                  <View style={[styles.statusDot, styles.limitedDot]} />
                  <Text style={styles.statusLabelLimited}>Limited</Text>
                </View>
                <Text style={styles.timeText}>8:00 AM – 5:00 PM</Text>
              </View>
            </View>

            <View style={styles.responseTimeInfo}>
              <Icon
                name="information-outline"
                size={16}
                color="#6B7280"
              />
              <Text style={styles.responseTimeText}>
                Average response time is 2–4 hours during business hours. For
                urgent issues, please call us directly.
              </Text>
            </View>
          </View>

          <View style={styles.footerSpacer} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const CARD_RADIUS = 18;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#16A34A",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 8 : StatusBar.currentHeight || 8,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  headerDecor1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(236, 253, 245, 0.12)",
    top: -60,
    right: -40,
  },
  headerDecor2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(236, 253, 245, 0.08)",
    bottom: -50,
    left: -20,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(226, 252, 240, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(6, 95, 70, 0.55)",
  },
  headerTopTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#ECFEFF",
  },
  headerRightSpacer: {
    width: 36,
  },
  headerContentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 12,
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
    lineHeight: 19,
    marginBottom: 10,
  },
  headerBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6, 95, 70, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeDotLive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ECFEFF",
  },
  badgeMuted: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15, 118, 110, 0.75)",
  },
  badgeMutedText: {
    marginLeft: 6,
    fontSize: 11,
    color: "rgba(226, 252, 240, 0.9)",
  },
  headerIconWrapper: {
    alignItems: "flex-end",
  },
  headerIconOuter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIconBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#BBF7D0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ECFDF5",
  },

  // Scroll content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
  },

  // Sections
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },

  // Contact cards
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  lastCard: {
    marginBottom: 0,
  },
  contactIconContainer: {
    borderRadius: 16,
    padding: 12,
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 12,
    color: "#4B5563",
    marginBottom: 2,
  },
  contactDescription: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 6,
  },
  contactValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  // Social media
  socialBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E0F2FE",
  },
  socialBadgeText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: "600",
    color: "#0369A1",
  },
  socialMediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  socialMediaCard: {
    width: (width - 16 * 2 - 10) / 2,
    borderRadius: CARD_RADIUS,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  socialIconContainer: {
    borderRadius: 999,
    padding: 10,
    marginBottom: 8,
  },
  socialMediaName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 2,
  },
  socialMediaUsername: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },

  // Support hours
  supportHoursCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: CARD_RADIUS,
    padding: 16,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  supportHoursHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  clockIconContainer: {
    backgroundColor: "#ECFDF3",
    borderRadius: 12,
    padding: 8,
    marginRight: 10,
  },
  supportHoursTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  supportHoursSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  supportHoursList: {
    marginBottom: 12,
  },
  supportHoursItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastHoursItem: {
    borderBottomWidth: 0,
  },
  dayContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
    marginRight: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
    marginRight: 4,
  },
  limitedDot: {
    backgroundColor: "#F97316",
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
  },
  statusLabelLimited: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F97316",
  },
  timeText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
  responseTimeInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  responseTimeText: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },

  footerSpacer: {
    height: 10,
  },
});

export default CustomerServiceScreen;