import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
} from "react-native";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import { fetchShippingCountries } from "../redux/slice/shippingSlice";
import { updateAccountStatus, logoutCustomer } from "../redux/slice/customerSlice";
import SignupScreen from "./SignupScreen";

const { width } = Dimensions.get("window");

const AccountScreen = () => {
  const [customerData, setCustomerData] = useState(null);
  const [showSignupModal, setShowSignupModal] = useState(false);

  const dispatch = useDispatch();
  const navigation = useNavigation();

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const stored = await AsyncStorage.getItem("customer");
        if (stored) setCustomerData(JSON.parse(stored));
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    loadCustomer();
  }, []);

  useEffect(() => {
    dispatch(fetchShippingCountries());
  }, [dispatch]);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "Are you sure you want to delete your account? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, delete",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(updateAccountStatus()).unwrap();
              Alert.alert("Account deleted", "Your account has been deactivated.");
              navigation.navigate("Home");
            } catch {
              Alert.alert("Error", "Failed to delete account.");
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: () => {
          try {
            dispatch(logoutCustomer());
            setCustomerData(null);
            Alert.alert("Logged out", "You have been logged out.");
            navigation.navigate("Home");
          } catch {
            Alert.alert("Error", "Failed to logout.");
          }
        },
      },
    ]);
  };

  const handleSignupClose = async () => {
    setShowSignupModal(false);
    try {
      const stored = await AsyncStorage.getItem("customer");
      if (stored) setCustomerData(JSON.parse(stored));
    } catch (error) {
      console.error("Error refreshing customer data:", error);
    }
  };

  const quickActions = [
    {
      name: "My Orders",
      icon: "package-variant-closed",
      color: "#059669",
      bgColor: "#DCFCE7",
      screen: "OrderHistoryScreen",
      description: "Track your purchases",
    },
    {
      name: "Wishlist",
      icon: "heart",
      color: "#DC2626",
      bgColor: "#FEE2E2",
      screen: "Wishlist",
      description: "Your saved items",
    },
    {
      name: "Recently Viewed",
      icon: "history",
      color: "#7C3AED",
      bgColor: "#EDE9FE",
      screen: "RecentlyViewed",
      description: "Browse history",
    },
    {
      name: "Help Center",
      icon: "help-circle",
      color: "#0369A1",
      bgColor: "#E0F2FE",
      screen: "HelpFAQ",
      description: "Get support",
    },
  ];

  const accountOptions = [
    {
      name: "Invite Friends",
      icon: "gift",
      extra: "Earn rewards",
      screen: "Invite",
      color: "#059669",
      bgColor: "#ECFDF3",
      description: "Share Franko & get rewards",
    },
    {
      name: "Customer Service",
      icon: "headphones",
      screen: "CustomerService",
      color: "#0F766E",
      bgColor: "#ECFEFF",
      description: "We’re here to help",
    },
    {
      name: "Terms & Privacy",
      icon: "shield-check",
      screen: "terms",
      color: "#0284C7",
      bgColor: "#E0F2FE",
      description: "Our policies",
    },
    {
      name: "About Us",
      icon: "information",
      screen: "AboutUs",
      color: "#047857",
      bgColor: "#ECFDF5",
      description: "Learn about Franko",
    },
  ];

  const openSignup = () => setShowSignupModal(true);

  const handleProtectedNavigation = (screen, label) => {
    if (!customerData) {
      Alert.alert(
        "Account required",
        `Please create an account to access ${label.toLowerCase()}.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Create account", onPress: openSignup },
        ]
      );
      return;
    }
    navigation.navigate(screen);
  };

  const ProfileHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="chevron-left" size={22} color="#ECFEFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {customerData ? (
        <View style={styles.profileRow}>
          <View style={styles.avatarWrapper}>
            <Icon name="account-circle" size={64} color="#ECFEFF" />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.userName}>
              {customerData.firstName} {customerData.lastName}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.statusBadge}>
                <Icon name="check-decagram" size={14} color="#22C55E" />
                <Text style={styles.statusBadgeText}>Signed in</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Icon name="email-outline" size={14} color="#C4D3E3" />
              <Text style={styles.metaText} numberOfLines={1}>
                {customerData.email}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Icon name="phone" size={14} color="#C4D3E3" />
              <Text style={styles.metaText} numberOfLines={1}>
                {customerData.contactNumber}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.guestContainer}>
          <View style={styles.guestAvatar}>
            <Icon
              name="account-circle-outline"
              size={70}
              color="rgba(226, 243, 255, 0.95)"
            />
          </View>
          <Text style={styles.guestTitle}>Welcome to Franko</Text>
          <Text style={styles.guestSubtitle}>
            Create a free account to track orders, save items, and enjoy a faster checkout.
          </Text>

          <View style={styles.benefitsRow}>
            <View style={styles.benefitPill}>
              <Icon name="check-circle" size={14} color="#22C55E" />
              <Text style={styles.benefitPillText}>Track orders</Text>
            </View>
            <View style={styles.benefitPill}>
              <Icon name="check-circle" size={14} color="#22C55E" />
              <Text style={styles.benefitPillText}>Save wishlist</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryCta}
            onPress={openSignup}
            activeOpacity={0.85}
          >
            <Icon name="account-plus" size={20} color="#052E16" />
            <Text style={styles.primaryCtaText}>Create account</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const QuickActionsSection = () => (
    <View style={styles.cardSection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        {customerData && (
          <Text style={styles.sectionSubtitle}>Manage your activity</Text>
        )}
      </View>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((item) => {
          const isProtected =
            item.screen === "OrderHistoryScreen" || item.screen === "Wishlist";
          return (
            <TouchableOpacity
              key={item.name}
              style={styles.quickActionCard}
              activeOpacity={0.8}
              onPress={() =>
                isProtected
                  ? handleProtectedNavigation(item.screen, item.name)
                  : navigation.navigate(item.screen)
              }
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: item.bgColor },
                ]}
              >
                <Icon name={item.icon} size={26} color={item.color} />
              </View>
              <Text style={styles.quickActionName}>{item.name}</Text>
              <Text style={styles.quickActionDescription}>
                {item.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <ProfileHeader />

          <View style={styles.contentWrapper}>
            <QuickActionsSection />

            <View style={styles.cardSection}>
              <Text style={styles.sectionTitle}>Account & support</Text>
              <View style={styles.menuCard}>
                {accountOptions.map((item, index) => {
                  const loginRequiredScreens = ["Invite"];
                  const isLast = index === accountOptions.length - 1;
                  const isProtected = loginRequiredScreens.includes(
                    item.screen
                  );

                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.menuItem,
                        !isLast && styles.menuItemBorder,
                      ]}
                      activeOpacity={0.7}
                      onPress={() =>
                        isProtected && !customerData
                          ? Alert.alert(
                              "Account required",
                              "Please create an account to access this feature.",
                              [
                                { text: "Cancel", style: "cancel" },
                                { text: "Create account", onPress: openSignup },
                              ]
                            )
                          : navigation.navigate(item.screen)
                      }
                    >
                      <View style={styles.menuLeft}>
                        <View
                          style={[
                            styles.menuIconContainer,
                            { backgroundColor: item.bgColor },
                          ]}
                        >
                          <Icon
                            name={item.icon}
                            size={22}
                            color={item.color}
                          />
                        </View>
                        <View style={styles.menuTextContainer}>
                          <Text style={styles.menuText}>{item.name}</Text>
                          <Text style={styles.menuDescription}>
                            {item.description}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.menuRight}>
                        {item.extra && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.extra}</Text>
                          </View>
                        )}
                        <Icon
                          name="chevron-right"
                          size={20}
                          color="#CBD5E1"
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {customerData && (
              <View style={styles.cardSection}>
                <View style={styles.secondaryCard}>
                  <TouchableOpacity
                    style={styles.dangerRow}
                    activeOpacity={0.8}
                    onPress={handleLogout}
                  >
                    <View style={styles.dangerLeft}>
                      <View style={styles.dangerIcon}>
                        <Icon name="logout" size={18} color="#DC2626" />
                      </View>
                      <Text style={styles.dangerText}>Logout</Text>
                    </View>
                    <Icon
                      name="chevron-right"
                      size={18}
                      color="rgba(220,38,38,0.7)"
                    />
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.dangerRow}
                    activeOpacity={0.8}
                    onPress={handleDeleteAccount}
                  >
                    <View style={styles.dangerLeft}>
                      <View style={styles.dangerIconMuted}>
                        <Icon
                          name="delete-forever"
                          size={18}
                          color="#DC2626"
                        />
                      </View>
                      <Text style={styles.dangerText}>Delete account</Text>
                    </View>
                    <Icon
                      name="chevron-right"
                      size={18}
                      color="rgba(220,38,38,0.7)"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerVersion}>Version 2.1.0</Text>
              <Text style={styles.footerBrand}>© 2025 Franko Trading</Text>
            </View>
          </View>
        </ScrollView>

        <SignupScreen visible={showSignupModal} onClose={handleSignupClose} />
      </View>
    </SafeAreaView>
  );
};

const CARD_RADIUS = 18;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Header
  header: {
    backgroundColor: "#059669",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(226, 252, 240, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(4, 120, 87, 0.3)",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#ECFEFF",
  },
  headerRightPlaceholder: {
    width: 34,
  },

  // Logged-in profile
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    marginRight: 16,
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    right: 4,
    bottom: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#059669",
  },
  profileDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ECFEFF",
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 118, 110, 0.9)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "600",
    color: "#A7F3D0",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  metaText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#E2F3FF",
  },

  // Guest header
  guestContainer: {
    alignItems: "flex-start",
  },
  guestAvatar: {
    marginBottom: 8,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ECFEFF",
    marginBottom: 4,
  },
  guestSubtitle: {
    fontSize: 13,
    color: "#D1FAE5",
    marginBottom: 14,
    lineHeight: 19,
  },
  benefitsRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  benefitPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(6, 95, 70, 0.6)",
    marginRight: 8,
  },
  benefitPillText: {
    marginLeft: 4,
    fontSize: 11,
    color: "#ECFEFF",
    fontWeight: "500",
  },
  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  primaryCtaText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#052E16",
  },

  // Content
  contentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  cardSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Quick actions
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickActionCard: {
    width: (width - 16 * 2 - 12) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: CARD_RADIUS,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  quickActionName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  quickActionDescription: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Menu
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: CARD_RADIUS,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
  },

  // Danger / account actions
  secondaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  dangerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  dangerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  dangerIconMuted: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  dangerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 4,
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingTop: 14,
  },
  footerVersion: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  footerBrand: {
    fontSize: 12,
    color: "#D1D5DB",
  },
});

export default AccountScreen;