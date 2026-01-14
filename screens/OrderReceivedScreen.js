import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const OrderReceivedScreen = ({ navigation, route }) => {
  const orderId = route?.params?.orderId;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#ECFDF5', '#F9FAFB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.card}>
          {/* Icon + halo */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconHalo}>
              <Ionicons
                name="checkmark-circle"
                size={72}
                color="#10B981"
              />
            </View>
          </View>

          {/* Title & message */}
          <Text style={styles.headerText}>Order Confirmed!</Text>
          <Text style={styles.message}>
            Thank you for your purchase. Your order has been received and is now
            being processed.
          </Text>

          {orderId && (
            <View style={styles.orderInfo}>
              <Text style={styles.orderLabel}>Order ID</Text>
              <Text style={styles.orderValue}>{orderId}</Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Extra info */}
          <View style={styles.infoRow}>
            <Ionicons
              name="notifications-outline"
              size={18}
              color="#6B7280"
            />
            <Text style={styles.infoText}>
              You’ll receive a call when your items are ready for delivery.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('OrderHistoryScreen')}
              activeOpacity={0.85}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color="#065F46"
                style={styles.buttonIcon}
              />
              <Text style={styles.secondaryButtonText}>View Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.9}
            >
              <Ionicons
                name="home-outline"
                size={18}
                color="#ffffff"
                style={styles.buttonIcon}
              />
              <Text style={styles.primaryButtonText}>Back to Shopping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default OrderReceivedScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ECFDF5',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 12,
  },
  iconHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  headerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#022C22',
    marginTop: 8,
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  orderInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  orderLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  orderValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 6,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    marginLeft: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    marginRight: 8,
  },
  secondaryButtonText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '600',
  },
});