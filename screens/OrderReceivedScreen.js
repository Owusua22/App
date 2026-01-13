import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Use Ionicons for icons

const OrderReceivedScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Ionicons
          name="checkmark-circle-outline"
          size={90}
          color="#28A745" // Green color for the success icon
          style={styles.icon}
        />
        <Text style={styles.headerText}>Thank You for Your Order!</Text>
        <Text style={styles.message}>
          Your order has been successfully received and is being processed.
        </Text>

        <View style={styles.buttonContainer}>
    

          {/* Navigate to Home Screen */}
          <TouchableOpacity
            style={[styles.button, styles.backToShoppingButton]}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons name="home-outline" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Back to Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F9F0', // Light green background
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    width: '100%',
    maxWidth: 400,
    textAlign: 'center',
    alignItems: 'center', // Center-align contents
  },
  icon: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2F4F4F', // Dark gray color
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#555',
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row', // Align icon and text horizontally
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%',
    paddingVertical: 15,
    borderRadius: 5,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonIcon: {
    marginRight: 10, // Add spacing between icon and text
  },
  viewOrdersButton: {
    backgroundColor: '#28A745',
  },
  backToShoppingButton: {
    backgroundColor: '#28A745',
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default OrderReceivedScreen;
