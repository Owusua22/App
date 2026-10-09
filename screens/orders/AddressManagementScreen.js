import { createWebSafeStyles } from '../../theme/webSafeStyles';
import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import Text from '../../components/AppText';
import { Ionicons } from "@expo/vector-icons"; // For icons
import AsyncStorage from "@react-native-async-storage/async-storage";
import ShippingComponent from '../../components/ShippingComponent'; // Ensure correct import
import { useNavigation } from "@react-navigation/native"; // For navigation

const AddressManagementScreen = () => {
  const [shippingDetails, setShippingDetails] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchShippingDetails();
  }, []);

  const fetchShippingDetails = async () => {
    try {
      const storedDetails = await AsyncStorage.getItem("shippingDetails");
      if (storedDetails) {
        setShippingDetails(JSON.parse(storedDetails));
      }
    } catch (error) {
      console.error("Error fetching shipping details:", error);
      Alert.alert("Error", "Failed to fetch shipping details.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShipping = (updatedDetails) => {
    setShippingDetails(updatedDetails);
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#086942" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Address Management</Text>
      </View>

      {/* Content Section */}
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#086942" />
        ) : shippingDetails ? (
          <View style={styles.detailsContainer}>
            <Text style={styles.sectionTitle}>Your Shipping Address</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Country:</Text>
              <Text style={styles.value}>{shippingDetails.country || "N/A"}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Division:</Text>
              <Text style={styles.value}>{shippingDetails.division || "N/A"}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Town:</Text>
              <Text style={styles.value}>{shippingDetails.location || "N/A"}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Shipping Charge:</Text>
              <Text style={styles.value}>
                {shippingDetails.locationCharge ? `₵${shippingDetails.locationCharge}` : "N/A"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.updateButton}
              onPress={() => setIsModalVisible(true)}
            >
              <Text style={styles.updateButtonText}>Update Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Ionicons name="location-outline" size={28} color="#086942" /></View>
            <Text style={styles.sectionTitle}>No saved address yet</Text>
            <Text style={styles.noDataText}>Add your delivery details for a smoother checkout.</Text>
            <TouchableOpacity style={styles.updateButton} onPress={() => setIsModalVisible(true)} accessibilityRole="button">
              <Text style={styles.updateButtonText}>Add delivery address</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Shipping Component for updating address */}
      <ShippingComponent
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onShippingUpdate={handleUpdateShipping}
      />
    </View>
  );
};

const styles = createWebSafeStyles({
  container: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5EEE6",
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 4,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#163A29",
    textAlign: "center",
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  detailsContainer: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE8DF",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    marginTop: 20,
  
    borderColor: '#D5E6DB',
    shadowColor: '#173D29',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#163A29",
  
    textAlign: 'left',
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  
    borderBottomColor: '#E6EEE8',
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
  },
  value: {
    fontSize: 16,
    color: "#163A29",
  },
  updateButton: {
    marginTop: 20,
    backgroundColor: "#086942",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
    alignItems: "center",
  },
  updateButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyCard: { marginTop: 20, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#DCE8DF', alignItems: 'center' ,
    borderColor: '#D5E6DB',
  },
  emptyIcon: { width: 58, height: 58, borderRadius: 12, backgroundColor: '#84e8b9', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  noDataText: {
    textAlign: "center",
    fontSize: 16,
    color: "#738579",
    marginBottom: 12,
  },
});

export default AddressManagementScreen;
