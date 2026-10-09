import { createWebSafeStyles } from '../../theme/webSafeStyles';
import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import Text from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import { fetchShippingCountries } from '../../redux/slice/shippingSlice';
import {
  updateAccountStatus,
  logoutCustomer,
  selectCurrentCustomer,
  selectIsAuthenticated,
} from '../../redux/slice/customerSlice';
import SignupScreen from './SignupScreen';


const AccountScreen = () => {
  const [showSignupModal, setShowSignupModal] = useState(false);

  const dispatch = useDispatch();
  const navigation = useNavigation();
  const customerData = useSelector(selectCurrentCustomer);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  /* ======================================================================= */
  /*  SAFETY HELPER — guarantees Alert.alert always gets a plain string     */
  /* ======================================================================= */
  const toSafeString = (err, fallback = "Something went wrong.") => {
    if (!err) return fallback;
    if (typeof err === "string") return err;
    if (err?.message && typeof err.message === "string") return err.message;
    try { return String(err); } catch { return fallback; }
  };

  useEffect(() => {
    dispatch(fetchShippingCountries());
  }, [dispatch]);

  /* ------------------------------------------------------------------------ */
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
              await dispatch(
                updateAccountStatus({ accountStatus: "0" })
              ).unwrap();
              Alert.alert("Account deleted", "Your account has been deactivated.");
            } catch (error) {
              Alert.alert("Error", toSafeString(error, "Failed to delete account."));
            }
          },
        },
      ]
    );
  };

  /* ------------------------------------------------------------------------ */
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            // ✅ Now valid: logoutCustomer is a real createAsyncThunk
            await dispatch(logoutCustomer()).unwrap();
            // The thunk calls reset("Home") inside; this alert shows on Home
            Alert.alert("Logged out", "You have been logged out.");
          } catch (error) {
            // ✅ Never pass a raw object to Alert.alert
            Alert.alert("Error", toSafeString(error, "Failed to logout."));
          }
        },
      },
    ]);
  };

  const handleSignupClose = () => {
    setShowSignupModal(false);
  };

  const quickActions = [
    { name: "My Orders", icon: "package-variant-closed", color: "#086942", bgColor: "#E6FAEF", screen: "OrderHistoryScreen", description: "Track your purchases" },
    { name: "Wishlist", icon: "heart", color: "#B21F36", bgColor: "#FFF0F1", screen: "Wishlist", description: "Your saved items" },
    { name: "Addresses", icon: "map-marker-outline", color: "#086942", bgColor: "#DDF9EB", screen: "AddressManagement", description: "Delivery details" },
    { name: "Help Center", icon: "help-circle", color: "#0369A1", bgColor: "#E0F2FE", screen: "HelpFAQ", description: "Get support" },
  ];

  const accountOptions = [
    { name: "Invite Friends", icon: "gift", extra: "Earn rewards", screen: "Invite", color: "#086942", bgColor: "#ECFDF3", description: "Share Franko & get rewards" },
    { name: "Recently Viewed", icon: "history", screen: "RecentlyViewed", color: "#086942", bgColor: "#DDF9EB", description: "Pick up where you left off" },
    { name: "Our Stores", icon: "storefront", screen: "Shops", color: "#086942", bgColor: "#DDF9EB", description: "Find a Franko near you" },
    { name: "Customer Service", icon: "headphones", screen: "CustomerService", color: "#086942", bgColor: "#ECFEFF", description: "We’re here to help" },
    { name: "Terms & Privacy", icon: "shield-check", screen: "terms", color: "#0284C7", bgColor: "#E0F2FE", description: "Our policies" },
    { name: "Return Policy", icon: "package-variant", screen: "Policy", color: "#086942", bgColor: "#E6FAEF", description: "Returns & exchanges" },
    { name: "Contact Franko", icon: "email-outline", screen: "ContactUs", color: "#086942", bgColor: "#E6FAEF", description: "Find our stores & contact us" },
    { name: "About Us", icon: "information", screen: "AboutUs", color: "#086942", bgColor: "#E6FAEF", description: "Learn about Franko" },
  ];

  const openSignup = () => setShowSignupModal(true);

  const handleProtectedNavigation = (screen, label) => {
    if (!isAuthenticated) {
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
          <Icon name="chevron-left" size={22} color="#086942" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {customerData ? (
        <View style={styles.profileRow}>
          <View style={styles.avatarWrapper}>
            <Icon name="account-circle" size={64} color="#086942" />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.userName}>{customerData.firstName} {customerData.lastName}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.statusBadge}>
                <Icon name="check-decagram" size={14} color="#086942" />
                <Text style={styles.statusBadgeText}>Signed in</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Icon name="email-outline" size={14} color="#3D715B" />
              <Text style={styles.metaText} numberOfLines={1}>{customerData.email}</Text>
            </View>
            <View style={styles.metaRow}>
              <Icon name="phone" size={14} color="#3D715B" />
              <Text style={styles.metaText} numberOfLines={1}>{customerData.contactNumber}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.guestContainer}>
          <View style={styles.guestAvatar}>
            <Icon name="account-circle-outline" size={70} color="#086942" />
          </View>
          <Text style={styles.guestTitle}>Welcome to Franko</Text>
          <Text style={styles.guestSubtitle}>
            Create a free account to track orders, save items, and enjoy a faster checkout.
          </Text>
          <View style={styles.benefitsRow}>
            <View style={styles.benefitPill}>
              <Icon name="check-circle" size={14} color="#086942" />
              <Text style={styles.benefitPillText}>Track orders</Text>
            </View>
            <View style={styles.benefitPill}>
              <Icon name="check-circle" size={14} color="#086942" />
              <Text style={styles.benefitPillText}>Save wishlist</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={openSignup}
            activeOpacity={0.85}
          >
            <Icon name="account-plus" size={20} color="#FFFFFF" />
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
        {customerData && <Text style={styles.sectionSubtitle}>Manage your activity</Text>}
      </View>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((item) => {
          const isProtected = item.screen === "OrderHistoryScreen" || item.screen === "Wishlist";
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
              <View style={[styles.quickActionIcon, { backgroundColor: item.bgColor }]}>
                <Icon name={item.icon} size={26} color={item.color} />
              </View>
              <Text style={styles.quickActionName}>{item.name}</Text>
              <Text style={styles.quickActionDescription}>{item.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={[]} style={styles.safeArea}>
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
                  const isProtected = loginRequiredScreens.includes(item.screen);
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
                      activeOpacity={0.7}
                      onPress={() =>
                        isProtected && !isAuthenticated
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
                        <View style={[styles.menuIconContainer, { backgroundColor: item.bgColor }]}>
                          <Icon name={item.icon} size={22} color={item.color} />
                        </View>
                        <View style={styles.menuTextContainer}>
                          <Text style={styles.menuText}>{item.name}</Text>
                          <Text style={styles.menuDescription}>{item.description}</Text>
                        </View>
                      </View>
                      <View style={styles.menuRight}>
                        {item.extra && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.extra}</Text>
                          </View>
                        )}
                        <Icon name="chevron-right" size={20} color="#CBD5E1" />
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
                    <Icon name="chevron-right" size={18} color="rgba(220,38,38,0.7)" />
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.dangerRow}
                    activeOpacity={0.8}
                    onPress={handleDeleteAccount}
                  >
                    <View style={styles.dangerLeft}>
                      <View style={styles.dangerIconMuted}>
                        <Icon name="delete-forever" size={18} color="#DC2626" />
                      </View>
                      <Text style={styles.dangerText}>Delete account</Text>
                    </View>
                    <Icon name="chevron-right" size={18} color="rgba(220,38,38,0.7)" />
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

        <SignupScreen
          visible={showSignupModal}
          initialAuthMode="signup"
          onClose={handleSignupClose}
        />
      </View>
    </SafeAreaView>
  );
};

const CARD_RADIUS = 12;

const styles = createWebSafeStyles({
  safeArea: { flex: 1, backgroundColor: "#F7FAF8" },
  container: { flex: 1, backgroundColor: "#F7FAF8" },
  scrollContent: { paddingBottom: 24 },

  header: { backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, width: '100%', maxWidth: 920, alignSelf: 'center' },
  headerTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 13 },
  backButton: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1,
    borderColor: "#E4EBE5",
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 19, fontWeight: "900", color: "#163A29" },
  headerRightPlaceholder: { width: 34 },

  profileRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#84e8b9", padding: 16, borderRadius: 12, minHeight: 112 ,
    borderWidth: 1,
    borderColor: '#69D8A4',
  },
  avatarWrapper: { marginRight: 16, position: "relative" },
  onlineDot: {
    position: "absolute", right: 4, bottom: 6, width: 14, height: 14,
    borderRadius: 7, backgroundColor: "#086942", borderWidth: 2, borderColor: "#84e8b9",
  },
  profileDetails: { flex: 1 },
  userName: { fontSize: 20, fontWeight: "900", color: "#086942", marginBottom: 6 },
  badgeRow: { flexDirection: "row", marginBottom: 8 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusBadgeText: { marginLeft: 4, fontSize: 11, fontWeight: "600", color: "#086942" },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  metaText: { marginLeft: 6, fontSize: 13, color: "#255B42" },

  guestContainer: { alignItems: "flex-start", backgroundColor: "#84e8b9", borderRadius: 12, padding: 18 ,
    borderWidth: 1,
    borderColor: '#69D8A4',
  },
  guestAvatar: { marginBottom: 8 },
  guestTitle: { fontSize: 22, fontWeight: "900", color: "#086942", marginBottom: 4 },
  guestSubtitle: { fontSize: 13, color: "#245D44", marginBottom: 14, lineHeight: 19 },
  benefitsRow: { flexDirection: "row", marginBottom: 14 },
  benefitPill: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, backgroundColor: "#FFFFFF", marginRight: 8,
  },
  benefitPillText: { marginLeft: 4, fontSize: 11, color: "#086942", fontWeight: "700" },
  primaryCta: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
    backgroundColor: "#086942", paddingHorizontal: 18, paddingVertical: 11, borderRadius: 8,
  },
  primaryCtaText: { marginLeft: 8, fontSize: 14, fontWeight: "800", color: "#FFFFFF" },

  contentWrapper: { paddingHorizontal: 16, paddingTop: 20, width: '100%', maxWidth: 920, alignSelf: 'center' },
  cardSection: { marginBottom: 20 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#163A29" },
  sectionSubtitle: { fontSize: 12, color: "#738579" },

  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  quickActionCard: {
    width: '48%', backgroundColor: "#FFFFFF", borderRadius: CARD_RADIUS,
    borderWidth: 1, borderColor: "#DCE8DF",
    padding: 14, marginBottom: 12,
    shadowColor: "#163A29", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,

    borderColor: '#D5E6DB',
    shadowColor: '#173D29',
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  quickActionIcon: {
    width: 44, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10,
  },
  quickActionName: { fontSize: 14, fontWeight: "800", color: "#163A29", marginBottom: 2 },
  quickActionDescription: { fontSize: 12, color: "#738579" },

  menuCard: {
    backgroundColor: "#FFFFFF", borderRadius: CARD_RADIUS,
    borderWidth: 1, borderColor: "#E5EEE6",
    shadowColor: "#163A29", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2, overflow: "hidden",

    borderColor: '#D5E6DB',
    shadowColor: '#173D29',
    shadowOpacity: 0.05,
  },
  menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, justifyContent: "space-between" },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  menuLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  menuIconContainer: { width: 42, height: 42, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuTextContainer: { flex: 1, marginLeft: 12 },
  menuText: { fontSize: 14, fontWeight: "800", color: "#163A29", marginBottom: 2 },
  menuDescription: { fontSize: 12, color: "#738579" },
  menuRight: { flexDirection: "row", alignItems: "center" },
  badge: { marginRight: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#E6FAEF" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#086942" },

  secondaryCard: {
    backgroundColor: "#FFFFFF", borderRadius: CARD_RADIUS,
    borderWidth: 1, borderColor: "#E5EEE6",
    paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: "#163A29", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,

    borderColor: '#D5E6DB',
  },
  dangerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  dangerLeft: { flexDirection: "row", alignItems: "center" },
  dangerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center", marginRight: 10 },
  dangerIconMuted: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FEF2F2", justifyContent: "center", alignItems: "center", marginRight: 10 },
  dangerText: { fontSize: 14, fontWeight: "600", color: "#DC2626" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 4 },

  footer: { alignItems: "center", paddingTop: 14 },
  footerVersion: { fontSize: 12, color: "#9CA3AF", marginBottom: 2 },
  footerBrand: { fontSize: 12, color: "#D1D5DB" },
});

export default AccountScreen;