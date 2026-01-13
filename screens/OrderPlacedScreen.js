import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Animated, Easing } from 'react-native';
import { useDispatch } from 'react-redux';
import { clearCart } from "../redux/slice/cartSlice";
import AsyncStorage from '@react-native-async-storage/async-storage';

const OrderPlacedScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { orderId } = route.params || {};

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // ✅ Immediately clear cart + AsyncStorage when user lands on screen
    const clearAllData = async () => {
      try {
        // Clear Redux cart
        dispatch(clearCart());

        // Clear related AsyncStorage items
        await AsyncStorage.multiRemove([
          "checkoutDetails",
          "orderDeliveryDetails",
          "cartId",
          "cart",
          "cartDetails",
          "pendingOrderId",
        ]);

        console.log("✅ Cart and AsyncStorage cleared on screen load");
      } catch (error) {
        console.warn("⚠️ Failed to clear AsyncStorage:", error);
      }
    };

    clearAllData();

    // 🔹 Start animations after clearing
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [dispatch, scaleAnim, fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated Success Icon */}
        <Animated.View 
          style={[
            styles.successIconContainer,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <Text style={styles.successIcon}>✅</Text>
        </Animated.View>

        {/* Animated Message */}
        <Animated.View 
          style={[
            styles.messageContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={styles.successTitle}>Your Order Has Been Received!</Text>

          {orderId && (
            <View style={styles.orderIdContainer}>
              <Text style={styles.orderIdLabel}>Order ID</Text>
              <Text style={styles.orderIdValue}>{orderId}</Text>
            </View>
          )}
        </Animated.View>

        {/* Animated Buttons */}
        <Animated.View 
          style={[
            styles.buttonContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate('OrderHistoryScreen')}
          >
            <Text style={styles.primaryButtonText}>View My Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  successIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#e8f5e8',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    elevation: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  successIcon: { fontSize: 60 },
  messageContainer: { alignItems: 'center', marginBottom: 48 },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 36,
  },
  orderIdContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    minWidth: 200,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderIdLabel: { fontSize: 16, color: '#666', marginBottom: 8 },
  orderIdValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  buttonContainer: { width: '100%', gap: 16 },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButton: { backgroundColor: '#4CAF50' },
  secondaryButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#2196F3' },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  secondaryButtonText: { color: '#2196F3', fontSize: 18, fontWeight: '600' },
});

export default OrderPlacedScreen;
