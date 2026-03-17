// App.js
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Image,
  StatusBar as RNStatusBar,
  Animated,
  Dimensions,
  Platform,
} from "react-native";

import { Provider, useDispatch } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./redux/store";

import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";
import { loadWishlistFromStorage } from "./redux/wishlistSlice";
import ForceUpdateGate from "./config/ForceUpdateGate";

// Screens
import HomeScreen from "./screens/HomeScreen";
import ProductDetailsScreen from "./screens/ProductDetailsScreen";
import CartScreen from "./screens/CartScreen";
import SignupScreen from "./screens/SignupScreen";
import LoginScreen from "./screens/LoginScreen";
import CheckoutScreen from "./screens/CheckoutScreen";
import AccountScreen from "./screens/AccountScreen";
import CategoryScreen from "./screens/CategoryScreen";
import BrandScreen from "./screens/BrandScreen";
import ShopScreen from "./screens/ShopScreen";
import OrderReceivedScreen from "./screens/OrderReceivedScreen";
import OrderHistoryScreen from "./screens/OrderHistoryScreen";
import ProductsScreen from "./screens/ProductsScreen";
import PaymentGatewayScreen from "./screens/PaymentGatewayScreen";
import OrderPlacedScreen from "./screens/OrderPlacedScreen";
import ShowroomScreen from "./screens/ShowroomScreen";
import PhoneScreen from "./screens/Categories/PhoneScreen";
import SpeakerScreen from "./screens/Categories/SpeakerScreen";
import AccessoriesScreen from "./screens/Categories/AccessoriesScreen";
import ComputerScreen from "./screens/Categories/ComputerScreen";
import TelevisionScreen from "./screens/Categories/TelevisionScreen";
import FanScreen from "./screens/Categories/FanScreen";
import AirConditionScreen from "./screens/Categories/AirConditionScreen";
import ComboScreen from "./screens/Categories/ComboScreen";
import ApplianceScreen from "./screens/Categories/ApplianceScreen";
import FridgeScreen from "./screens/Categories/FridgeScreen";
import RecentlyViewedScreen from "./screens/RecentlyViewedScreen";
import CustomerServiceScreen from "./screens/CustomerService";
import InviteScreen from "./screens/InviteScreen";
import AddressManagementScreen from "./screens/AddressManagementScreen";
import SearchScreen from "./screens/SearchScreen";
import AboutScreen from "./screens/AboutScreen";
import FAQScreen from "./screens/FAQScreen";
import OrderCancellationScreen from "./screens/OrderCancellationScreen";
import MachineScreen from "./screens/Categories/MachineScreen";
import TermsScreen from "./screens/TermsScreen";
import WishlistScreen from "./screens/WishlistScreen";

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";
import FloatingTawkChat from "./components/FloatingTawkChat";
import PaymentHelpScreen from "./screens/PaymentHelpScreen";

const Stack = createStackNavigator();
const { width, height } = Dimensions.get("window");

/* ────────────────────────────────────────────────────────
 *  iOS STATUS BAR FIX:
 *
 *  Problem:
 *    • iOS ignores StatusBar's `translucent={false}` and `backgroundColor`
 *    • Content always renders BEHIND the status bar on iOS
 *    • edges={["bottom"]} left the top unprotected
 *    • Status bar indicators (time, battery) were hidden behind app content
 *
 *  Solution:
 *    • Welcome screen → light-content bar + manual insets (gradient behind bar)
 *    • Main app → SafeAreaView edges={["top","bottom"]} handles the top
 *    • Removed manual paddingTop from MainAppContainer (SafeAreaView does it)
 *    • StatusBar barStyle changes dynamically based on current screen
 * ──────────────────────────────────────────────────────── */

/* ═══════════════ WelcomeScreen ═══════════════ */
const WelcomeScreen = ({ onReady }) => {
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.3))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    dispatch(loadWishlistFromStorage());
  }, [dispatch]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 1000, useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 50, friction: 7, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 800, delay: 300, useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1, duration: 1500, useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1, duration: 1500, useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const fetchData = async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      setLoading(false);
      onReady();
    };
    fetchData();

    return () => pulseLoop.stop();
  }, [onReady, fadeAnim, scaleAnim, slideAnim, pulseAnim]);

  return (
    <View style={styles.welcomeWrapper}>
      {/*
        ✅ Welcome screen gets its own StatusBar config:
        light-content = white text/icons visible on green gradient
      */}
      <RNStatusBar
        barStyle="light-content"
        translucent={true}
        backgroundColor="transparent"
      />

      <LinearGradient
        colors={["#BBF7D0", "#10B981", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.welcomeContainer}
      >
        {/* Background Pattern */}
        <View style={styles.backgroundPattern}>
          {[...Array(20)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.patternDot,
                {
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: 0.1 + Math.random() * 0.2,
                },
              ]}
            />
          ))}
        </View>

        {/*
          ✅ Content starts below the status bar via paddingTop.
          The gradient still extends behind the bar (looks good).
        */}
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              paddingTop: insets.top + 20,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View
            style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}
          >
            <View style={styles.logoShadow}>
              <Image
                source={require("./assets/frankoIcon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          <Animated.View
            style={[styles.textContainer, { transform: [{ translateY: slideAnim }] }]}
          >
            <Text style={styles.welcomeTitle}>Welcome to</Text>
            <Text style={styles.companyName}>Franko Trading Ent</Text>
            <Text style={styles.tagline}>Your trusted electronics partner</Text>
          </Animated.View>

          {loading && (
            <Animated.View
              style={[
                styles.loadingContainer,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>
                Home of quality phones and electronic appliances.
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        <View style={styles.bottomWave} />
      </LinearGradient>
    </View>
  );
};

/* ═══════════════ Screen Wrappers ═══════════════ */
const ScreenWithFooter = ({ children }) => (
  <View style={{ flex: 1 }}>
    {children}
    <Footer />
  </View>
);

const HomeScreenWithFooter = () => (
  <ScreenWithFooter><HomeScreen /></ScreenWithFooter>
);
const CategoryScreenWithFooter = () => (
  <ScreenWithFooter><CategoryScreen /></ScreenWithFooter>
);
const AccountScreenWithFooter = () => (
  <ScreenWithFooter><AccountScreen /></ScreenWithFooter>
);
const ProductsScreenWithFooter = () => (
  <ScreenWithFooter><ProductsScreen /></ScreenWithFooter>
);
const ShopScreenWithFooter = () => (
  <ScreenWithFooter><ShopScreen /></ScreenWithFooter>
);
const RecentlyViewedScreenWithFooter = () => (
  <ScreenWithFooter><RecentlyViewedScreen /></ScreenWithFooter>
);
const CustomerServiceScreenWithFooter = () => (
  <ScreenWithFooter><CustomerServiceScreen /></ScreenWithFooter>
);
const InviteScreenWithFooter = () => (
  <ScreenWithFooter><InviteScreen /></ScreenWithFooter>
);
const AddressManagementScreenWithFooter = () => (
  <ScreenWithFooter><AddressManagementScreen /></ScreenWithFooter>
);

/* ═══════════════ App Stack ═══════════════ */
const AppStack = () => (
  <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreenWithFooter} />
    <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
    <Stack.Screen name="cart" component={CartScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="SignIn" component={LoginScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="Category" component={CategoryScreenWithFooter} />
    <Stack.Screen name="Account" component={AccountScreenWithFooter} />
    <Stack.Screen name="Brands" component={BrandScreen} />
    <Stack.Screen name="Shops" component={ShopScreenWithFooter} />
    <Stack.Screen name="OrderReceivedScreen" component={OrderReceivedScreen} />
    <Stack.Screen name="OrderHistoryScreen" component={OrderHistoryScreen} />
    <Stack.Screen name="Products" component={ProductsScreenWithFooter} />
    <Stack.Screen name="PaymentGatewayScreen" component={PaymentGatewayScreen} />
    <Stack.Screen name="OrderPlacedScreen" component={OrderPlacedScreen} />
    <Stack.Screen name="AboutUs" component={AboutScreen} />
    <Stack.Screen name="showroom" component={ShowroomScreen} />
    <Stack.Screen name="PaymentHelpScreen" component={PaymentHelpScreen} />
    <Stack.Screen name="Phones" component={PhoneScreen} />
    <Stack.Screen name="WashingMachine" component={MachineScreen} />
    <Stack.Screen name="Speakers" component={SpeakerScreen} />
    <Stack.Screen name="Accessories" component={AccessoriesScreen} />
    <Stack.Screen name="Computers" component={ComputerScreen} />
    <Stack.Screen name="Television" component={TelevisionScreen} />
    <Stack.Screen name="Fridge" component={FridgeScreen} />
    <Stack.Screen name="Fan" component={FanScreen} />
    <Stack.Screen name="AirCondition" component={AirConditionScreen} />
    <Stack.Screen name="OrderCancellationScreen" component={OrderCancellationScreen} />
    <Stack.Screen name="terms" component={TermsScreen} />
    <Stack.Screen name="Combo" component={ComboScreen} />
    <Stack.Screen name="Appliances" component={ApplianceScreen} />
    <Stack.Screen name="RecentlyViewed" component={RecentlyViewedScreenWithFooter} />
    <Stack.Screen name="CustomerService" component={CustomerServiceScreenWithFooter} />
    <Stack.Screen name="Invite" component={InviteScreenWithFooter} />
    <Stack.Screen name="AddressManagement" component={AddressManagementScreenWithFooter} />
    <Stack.Screen name="Search" component={SearchScreen} />
    <Stack.Screen name="HelpFAQ" component={FAQScreen} />
    <Stack.Screen name="Wishlist" component={WishlistScreen} />
  </Stack.Navigator>
);

/* ═══════════════ Main App Container ═══════════════ */
const MainAppContainer = () => {
  /*
    ✅ FIX: Removed manual paddingTop: insets.top
    SafeAreaView with edges={["top","bottom"]} now handles the top inset.
    This prevents the double-padding bug and ensures the status bar area
    is always clear on every iOS device (notch, Dynamic Island, etc.)
  */
  return (
    <View style={styles.mainContainer}>
      {/*
        ✅ Main app StatusBar: dark text on white background.
        translucent={true} is the iOS reality — we embrace it.
      */}
      <RNStatusBar
        barStyle="dark-content"
        translucent={true}
        backgroundColor="#FFFFFF"
      />

      <Header />

      <View style={styles.contentContainer}>
        <AppStack />
        <FloatingTawkChat />
      </View>
    </View>
  );
};

/* ═══════════════ App Content ═══════════════ */
const AppContent = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const handleReady = () => setShowWelcome(false);

  if (showWelcome) {
    /*
      ✅ Welcome screen renders OUTSIDE SafeAreaView
      so the gradient can extend behind the status bar.
      It handles its own top padding via useSafeAreaInsets().
    */
    return (
      <NavigationContainer>
        <WelcomeScreen onReady={handleReady} />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {/*
        ✅ KEY FIX: edges now includes "top"
        This tells SafeAreaView to add padding equal to the status bar
        height (+ notch/Dynamic Island) at the top.

        Before: edges={["bottom"]} → top was unprotected → content behind status bar
        After:  edges={["top","bottom"]} → status bar area is always clear
      */}
      <SafeAreaView
        style={styles.container}
        edges={["top", "bottom"]}
      >
        <MainAppContainer />
      </SafeAreaView>
    </NavigationContainer>
  );
};

/* ═══════════════ App Root ═══════════════ */
const App = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <SafeAreaProvider>
        <ForceUpdateGate>
          <AppContent />
        </ForceUpdateGate>
      </SafeAreaProvider>
    </PersistGate>
  </Provider>
);

export default App;

/* ═══════════════ Styles ═══════════════ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    /*
      ✅ White background ensures the status bar area
      (the space SafeAreaView reserves at the top)
      has a clean white background behind the dark status bar text.
    */
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flex: 1,
  },
  welcomeWrapper: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    /*
      ✅ Removed paddingTop from here.
      It's now on contentWrapper so the gradient
      fills the entire screen including behind the status bar.
    */
  },
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternDot: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ffffff",
  },
  contentWrapper: {
    alignItems: "center",
    zIndex: 1,
    /*
      ✅ paddingTop is set dynamically via insets.top + 20
      in the component's style prop.
    */
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  logoShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  logo: {
    width: 120,
    height: 120,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "300",
    color: "#ffffff",
    marginBottom: 5,
    textAlign: "center",
    letterSpacing: 1,
  },
  companyName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 10,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  tagline: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    fontStyle: "italic",
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "400",
  },
  bottomWave: {
    position: "absolute",
    bottom: -60,
    left: -50,
    right: -50,
    height: 150,
    borderRadius: 100,
    transform: [{ scaleX: 1.5 }],
  },
});