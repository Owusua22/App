import React, { useEffect, useState, useRef } from "react";
import { 
  View, 
  ActivityIndicator, 
  StyleSheet, 
  Alert, 
  BackHandler,
  Text,
  Animated 
} from "react-native";
import { WebView } from "react-native-webview";

const PaymentGatewayScreen = ({ route, navigation }) => {
  const { url } = route.params;
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState("Redirecting...");
  const paymentProcessed = useRef(false);
  const webViewRef = useRef(null);
  const currentUrl = useRef("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!paymentProcessed.current && !redirecting) {
        paymentProcessed.current = true;
        handleCancellation("Payment cancelled");
      }
      return true;
    });

    return () => backHandler.remove();
  }, [navigation, redirecting]);

  const showRedirectOverlay = (message) => {
    setRedirectMessage(message);
    setRedirecting(true);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCancellation = (message = "Payment cancelled") => {
    showRedirectOverlay(message);
    
    setTimeout(() => {
      navigation.navigate("OrderCancellationScreen");
    }, 1500);
  };

  const handleSuccess = () => {
    paymentProcessed.current = true;
    showRedirectOverlay("Payment Successful!");

    setTimeout(() => {
      Alert.alert(
        "Payment Successful", 
        "Your order has been placed successfully!", 
        [
          {
            text: "View Order",
            onPress: () => navigation.navigate("OrderPlacedScreen"),
          },
        ],
        { cancelable: false }
      );
    }, 1000);
  };

  const handleFailure = () => {
    paymentProcessed.current = true;
    handleCancellation("Payment failed");
  };

  const handleLoad = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    setLoading(false);
    currentUrl.current = nativeEvent.url;

    if (paymentProcessed.current) return;

    // Success patterns
    if (
      nativeEvent.url.includes("order-success") || 
      nativeEvent.url.includes("payment-success") ||
      nativeEvent.url.includes("success=true")
    ) {
      handleSuccess();
    } 
    // Failure patterns
    else if (
      nativeEvent.url.includes("payment-failed") || 
      nativeEvent.url.includes("order-cancelled") ||
      nativeEvent.url.includes("failed=true") ||
      nativeEvent.url.includes("cancelled=true")
    ) {
      handleFailure();
    }
  };

  const handleLoadStart = () => {
    setLoading(true);
  };

  const handleError = () => {
    setLoading(false);
    if (!paymentProcessed.current) {
      paymentProcessed.current = true;
      handleCancellation("Connection error");
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        startInLoadingState={true}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
      
      {loading && !redirecting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>Loading secure payment...</Text>
          </View>
        </View>
      )}

      {redirecting && (
        <Animated.View 
          style={[
            styles.redirectOverlay, 
            { 
              opacity: fadeAnim,
              backgroundColor: redirectMessage.includes("Successful") 
                ? "rgba(34, 197, 94, 0.95)" 
                : "rgba(239, 68, 68, 0.95)"
            }
          ]}
        >
          <View style={styles.redirectContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.redirectText}>{redirectMessage}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  webview: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  redirectOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  redirectContainer: {
    alignItems: "center",
    padding: 40,
  },
  redirectText: {
    marginTop: 20,
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
  },
});

export default PaymentGatewayScreen;