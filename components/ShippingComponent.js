import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchShippingCountries,
  fetchShippingDivisions,
  fetchShippingLocations,
} from "../redux/slice/shippingSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ShippingComponent = ({ isVisible, onClose, onShippingUpdate }) => {
  const dispatch = useDispatch();
  const { countries, divisions, locations, loading } = useSelector((state) => state.shipping);

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  useEffect(() => {
    if (isVisible) {
      dispatch(fetchShippingCountries());
    }
  }, [isVisible, dispatch]);

  const handleSaveShippingDetails = async () => {
    try {
      const selectedLocationDetails = locations.find(
        (location) => location.locationCode === selectedLocation
      );
      const selectedDivisionDetails = divisions.find(
        (division) => division.divisionCode === selectedDivision
      );

      const details = {
        country: selectedCountry,
        division: selectedDivisionDetails?.divisionName || "",
        location: selectedLocationDetails?.locationName || "",
        locationCharge: selectedLocationDetails?.shippingCharge || 0,
      };

      await AsyncStorage.setItem("shippingDetails", JSON.stringify(details));

      if (onShippingUpdate) {
        onShippingUpdate(details);
      }

      Alert.alert("Success", "Shipping details saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving shipping details:", error);
      Alert.alert("Error", "Failed to save shipping details.");
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.modalTitle}>Shipping Details</Text>

            {loading && <ActivityIndicator size="large" color="#3F6634" />}

            {/* Country Picker */}
            {countries.length > 0 && (
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Select Country</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedCountry}
                    onValueChange={(value) => {
                      setSelectedCountry(value);
                      setSelectedDivision("");
                      setSelectedLocation("");
                      if (value) dispatch(fetchShippingDivisions(value));
                    }}
                    style={styles.picker}
                    itemStyle={styles.pickerText}
                  >
                    <Picker.Item label="Select a Country" value="" />
                    {countries.map((country) => (
                      <Picker.Item key={country.countryCode} label={country.countryName} value={country.countryCode} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {/* Division Picker */}
            {selectedCountry && divisions.length > 0 && (
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Select Division</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedDivision}
                    onValueChange={(value) => {
                      setSelectedDivision(value);
                      setSelectedLocation("");
                      if (value) dispatch(fetchShippingLocations(value));
                    }}
                    style={styles.picker}
                    itemStyle={styles.pickerText}
                  >
                    <Picker.Item label="Select a Division" value="" />
                    {divisions.map((division) => (
                      <Picker.Item key={division.divisionCode} label={division.divisionName} value={division.divisionCode} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {/* Location Picker */}
            {selectedDivision && locations.length > 0 && (
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Select Town</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedLocation}
                    onValueChange={setSelectedLocation}
                    style={styles.picker}
                    itemStyle={styles.pickerText}
                  >
                    <Picker.Item label="Select a Location" value="" />
                    {locations.map((location) => (
                      <Picker.Item
                        key={location.locationCode}
                        label={`${location.locationName} - ${
                          location.shippingCharge === 0 ? "N/A" : `₵${location.shippingCharge}`
                        }`}
                        value={location.locationCode}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveShippingDetails}>
              <Text style={styles.saveButtonText}>Save Shipping Details</Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxHeight: "80%", // Limit the modal height to 80% of the screen
  },
  scrollView: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingBottom: 20, // Add padding for better scrolling experience
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "black",
  },
  label: {
    fontWeight: "500",
    marginBottom: 8,
    color: "black",
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerWrapper: {
    borderWidth: Platform.OS === "ios" ? 1 : 0,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: Platform.OS === "ios" ? 5 : 0,
    backgroundColor: "white",
  },
  picker: {
    width: "100%",
    color: "black",
  },
  pickerText: {
    color: "black",
  },
  saveButton: {
    backgroundColor: "#3F6634",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  closeButton: {
    marginTop: 10,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#3F6634",
    fontWeight: "bold",
  },
});

export default ShippingComponent;
