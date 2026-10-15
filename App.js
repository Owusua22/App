import { createWebSafeStyles } from './theme/webSafeStyles';
// App.js
import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Image,
  StatusBar as RNStatusBar,
  Animated,
  AppState,
  Platform,
} from 'react-native';
import Text from './components/AppText';
import * as SplashScreen from 'expo-splash-screen';

import { Provider, useDispatch, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from './redux/store';

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";
import NetInfo from "@react-native-community/netinfo";

import { loadWishlistFromStorage } from './redux/wishlistSlice';
import { checkAuthStatus, selectIsAuthChecked } from './redux/slice/customerSlice';
import { navigationRef, reset, flushAuthRedirect } from './services/navigationService';
import {
  updateLastActivity,
  checkActiveSession,
} from './redux/slice/axiosInstance';
import ForceUpdateGate from './config/ForceUpdateGate';
import { franko } from './theme/franko';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
} from '@expo-google-fonts/inter';

// Screens
import HomeScreen from './screens/shop/HomeScreen';
import ProductDetailsScreen from './screens/shop/ProductDetailsScreen';
import CartScreen from './screens/orders/CartScreen';
import SignupScreen from './screens/account/SignupScreen';
import CheckoutScreen from './screens/orders/CheckoutScreen';
import AccountScreen from './screens/account/AccountScreen';
import CategoryScreen from './screens/shop/CategoryScreen';
import BrandScreen from './screens/shop/BrandScreen';
import ShopScreen from './screens/shop/ShopScreen';
import OrderReceivedScreen from './screens/orders/OrderReceivedScreen';
import OrderHistoryScreen from './screens/orders/OrderHistoryScreen';
import ProductsScreen from './screens/shop/ProductsScreen';
import PaymentGatewayScreen from './screens/orders/PaymentGatewayScreen';
import OrderPlacedScreen from './screens/orders/OrderPlacedScreen';
import ShowroomScreen from './screens/shop/ShowroomScreen';
import PhoneScreen from './screens/shop/categories/PhoneScreen';
import SpeakerScreen from './screens/shop/categories/SpeakerScreen';
import AccessoriesScreen from './screens/shop/categories/AccessoriesScreen';
import ComputerScreen from './screens/shop/categories/ComputerScreen';
import TelevisionScreen from './screens/shop/categories/TelevisionScreen';
import FanScreen from './screens/shop/categories/FanScreen';
import AirConditionScreen from './screens/shop/categories/AirConditionScreen';
import ComboScreen from './screens/shop/categories/ComboScreen';
import ApplianceScreen from './screens/shop/categories/ApplianceScreen';
import FridgeScreen from './screens/shop/categories/FridgeScreen';
import RecentlyViewedScreen from './screens/shop/RecentlyViewedScreen';
import CustomerServiceScreen from './screens/support/CustomerService';
import InviteScreen from './screens/account/InviteScreen';
import AddressManagementScreen from './screens/orders/AddressManagementScreen';
import SearchScreen from './screens/shop/SearchScreen';
import AboutScreen from './screens/support/AboutScreen';
import FAQScreen from './screens/support/FAQScreen';
import OrderCancellationScreen from './screens/orders/OrderCancellationScreen';
import MachineScreen from './screens/shop/categories/MachineScreen';
import TermsScreen from './screens/support/TermsScreen';
import PolicyScreen from './screens/support/PolicyScreen';
import ContactUsScreen from './screens/support/ContactUsScreen';
import WishlistScreen from './screens/shop/WishlistScreen';
import PaymentHelpScreen from './screens/orders/PaymentHelpScreen';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import FloatingTawkChat from './components/FloatingTawkChat';
import { notifyScrollActivity } from './utils/scrollActivity';

/* ------------------------------------------------------------------ */
/* Native splash hand-off                                              */
/* ------------------------------------------------------------------ */
// Hold the native splash (a plain green screen, configured in app.json) until
// the Welcome screen has painted, so the default Expo asset, a white view or a
// spinner never shows between app launch and the Welcome screen.
SplashScreen.preventAutoHideAsync().catch(() => {});

const hideSplash = () => SplashScreen.hideAsync().catch(() => {});

// Last-resort safety net: never leave the native splash up forever.
setTimeout(hideSplash, 8000);

// How long the Welcome screen stays up once it is visible.
const WELCOME_DURATION_MS = 1200;

const Stack = createNativeStackNavigator();
const WELCOME_DOTS = Array.from({ length: 20 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  opacity: 0.1 + Math.random() * 0.2,
}));

/* ------------------------------------------------------------------ */
/* WelcomeScreen                                                       */
/* ------------------------------------------------------------------ */
const WelcomeScreen = ({ onReady }) => {
  const [loading, setLoading] = useState(true);
  const [layoutReady, setLayoutReady] = useState(false);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.3));
  const [slideAnim] = useState(() => new Animated.Value(50));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    dispatch(loadWishlistFromStorage());
  }, [dispatch]);

  useEffect(() => {
    // Wait until the gradient has been laid out, then drop the native splash
    // and start the entrance animation.
    if (!layoutReady) return undefined;

    const raf = requestAnimationFrame(hideSplash);

    const entrance = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 550,
        delay: 100,
        useNativeDriver: true,
      }),
    ]);
    entrance.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Brief branded transition. Authentication continues independently in
    // AppContent, so this never blocks the app behind a fixed delay.
    const readyTimer = setTimeout(() => {
      setLoading(false);
      onReady();
    }, WELCOME_DURATION_MS);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(readyTimer);
      entrance.stop();
      pulseLoop.stop();
    };
  }, [layoutReady, onReady, fadeAnim, scaleAnim, slideAnim, pulseAnim]);

  return (
    <View style={styles.welcomeWrapper} onLayout={() => setLayoutReady(true)}>
      <RNStatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <LinearGradient
        colors={["#BBF7D0", "#10B981", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.welcomeContainer}
      >
        <View style={styles.backgroundPattern}>
          {WELCOME_DOTS.map((dot, index) => (
            <View key={index} style={[styles.patternDot, dot]} />
          ))}
        </View>

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
                source={require('./assets/frankoIcon.png')}
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

/* ------------------------------------------------------------------ */
/* Screen wrappers                                                     */
/* ------------------------------------------------------------------ */
const withFooter = (Screen, { header = false } = {}) => {
  const Wrapped = () => (
    <View style={{ flex: 1 }}>
      {header && <Header />}
      <View style={{ flex: 1 }}>
        <Screen />
        <Footer />
      </View>
    </View>
  );
  Wrapped.displayName = `WithFooter(${Screen.displayName || Screen.name || 'Screen'})`;
  return Wrapped;
};

const HomeScreenWithFooter = withFooter(HomeScreen, { header: true });
const CategoryScreenWithFooter = withFooter(CategoryScreen, { header: true });
const CartScreenWithFooter = withFooter(CartScreen);
const ShowroomScreenWithFooter = withFooter(ShowroomScreen);
const AccountScreenWithFooter = withFooter(AccountScreen);
const ProductsScreenWithFooter = withFooter(ProductsScreen);
const WishlistScreenWithFooter = withFooter(WishlistScreen);
const ShopScreenWithFooter = withFooter(ShopScreen);
const RecentlyViewedScreenWithFooter = withFooter(RecentlyViewedScreen);
const CustomerServiceScreenWithFooter = withFooter(CustomerServiceScreen);
const InviteScreenWithFooter = withFooter(InviteScreen);
const AddressManagementScreenWithFooter = withFooter(AddressManagementScreen);

// The account screen uses SignupScreen as a modal. A navigation route must
// explicitly show it; otherwise reset('Signup') lands on an invisible modal.
const SignInRoute = () => (
  <SignupScreen visible onClose={() => reset('Home')} onSuccess={() => reset('Home')} />
);

/* ------------------------------------------------------------------ */
/* App stack                                                           */
/* ------------------------------------------------------------------ */
const AppStack = () => (
  <Stack.Navigator
    initialRouteName="Home"
    screenOptions={{ headerShown: false, contentStyle: { backgroundColor: franko.canvas } }}
  >
    <Stack.Screen name="Home" component={HomeScreenWithFooter} />
    <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
    <Stack.Screen name="cart" component={CartScreenWithFooter} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="SignIn" component={SignInRoute} />
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
    <Stack.Screen name="showroom" component={ShowroomScreenWithFooter} />
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
    <Stack.Screen name="ContactUs" component={ContactUsScreen} />
    <Stack.Screen name="Policy" component={PolicyScreen} />
    <Stack.Screen name="Wishlist" component={WishlistScreenWithFooter} />
  </Stack.Navigator>
);

/* ------------------------------------------------------------------ */
/* Banners / loading                                                   */
/* ------------------------------------------------------------------ */
const NoInternetBanner = () => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.offlineContainer, { top: insets.top || 0 }]}>
      <Text style={styles.offlineText}>No internet connection</Text>
    </View>
  );
};

const AuthLoadingScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.authLoadingContainer}>
      <RNStatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={[styles.authLoadingContent, { paddingTop: insets.top + 50 }]}>
        <Image
          source={require('./assets/frankoIcon.png')}
          style={styles.authLoadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator
          size="large"
          color="#086942"
          style={styles.authLoadingIndicator}
        />
        <Text style={styles.authLoadingText}>Loading...</Text>
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/* Main container                                                      */
/* ------------------------------------------------------------------ */
const MainAppContainer = () => (
  <View style={styles.mainContainer}>
    <RNStatusBar barStyle="dark-content" translucent backgroundColor="#FFFFFF" />
    <View
      style={styles.contentContainer}
      onTouchMove={notifyScrollActivity}
      {...(Platform.OS === "web" ? { onWheel: notifyScrollActivity } : {})}
    >
      <AppStack />
      <FloatingTawkChat />
    </View>
  </View>
);

/* ------------------------------------------------------------------ */
/* App content                                                         */
/* ------------------------------------------------------------------ */
const AppContent = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const dispatch = useDispatch();

  const isAuthChecked = useSelector(selectIsAuthChecked);
  const handleReady = useCallback(() => setShowWelcome(false), []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const hasInternet = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(Boolean(hasInternet));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkActiveSession({ logoutIfExpiredWhileAway: true });
        await dispatch(checkAuthStatus()).unwrap();
        await updateLastActivity();
      } catch (error) {
        console.log("[App] Auth initialization completed");
      } finally {
        setIsInitializing(false);
      }
    };
    initializeAuth();
  }, [dispatch]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "active" && !isInitializing) {
        const active = await checkActiveSession({ logoutIfExpiredWhileAway: true });
        if (active) await updateLastActivity();
      }
    });
    return () => subscription?.remove?.();
  }, [isInitializing]);

  // Auth can expire before the welcome view has mounted the navigator.
  useEffect(() => {
    if (!showWelcome && !isInitializing) {
      const timer = setTimeout(flushAuthRedirect, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showWelcome, isInitializing]);

  // Keep one NavigationContainer mounted through welcome, auth, and app states.
  return (
    <NavigationContainer ref={navigationRef} onStateChange={flushAuthRedirect}>
      {!isConnected && <NoInternetBanner />}
      {showWelcome ? (
        <WelcomeScreen onReady={handleReady} />
      ) : isInitializing || !isAuthChecked ? (
        <AuthLoadingScreen />
      ) : (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
          <MainAppContainer />
        </SafeAreaView>
      )}
    </NavigationContainer>
  );
};

/* ------------------------------------------------------------------ */
/* App root                                                            */
/* ------------------------------------------------------------------ */
const App = () => {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
  });

  // The native splash is still visible while fonts and the persisted store
  // load, so render nothing here instead of a white view or a spinner.
  if (!fontsLoaded && !fontError) return null;

  return (
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
};

export default App;

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const styles = createWebSafeStyles({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flex: 1,
  },
  offlineContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: "#B91C1C",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  offlineText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  authLoadingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  authLoadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  authLoadingLogo: {
    width: 100,
    height: 100,
    marginBottom: 30,
    opacity: 0.8,
  },
  authLoadingIndicator: {
    marginBottom: 20,
  },
  authLoadingText: {
    fontSize: 16,
    color: "#4B5563",
    fontWeight: "500",
    textAlign: "center",
  },

  /* Welcome */
  welcomeWrapper: {
    flex: 1,
    backgroundColor: "#10B981",
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
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