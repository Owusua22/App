import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';

const CheckoutForm = ({
  customerName,
  setCustomerName,
  customerNumber,
  setCustomerNumber,
  deliveryInfo,
  setDeliveryInfo,
  orderNote,
  setOrderNote,
  locations,
}) => {
  const [region, setRegion] = useState(null);
  const [town, setTown] = useState(null);
  const [fee, setFee] = useState(null);
  const [manualAddress, setManualAddress] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [locationNotFound, setLocationNotFound] = useState(false);

  useEffect(() => {
    loadDeliveryInfo();
  }, []);

  useEffect(() => {
    loadCustomerName();
  }, []);

  const loadDeliveryInfo = async () => {
    try {
      const saved = await AsyncStorage.getItem("deliveryInfo");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.address && parsed?.fee !== undefined) {
          setDeliveryInfo(parsed);
          setFee(Number(parsed.fee));
        }
      }
    } catch (error) {
      console.error('Error loading delivery info:', error);
    }
  };

  const loadCustomerName = async () => {
    try {
      const savedName = await AsyncStorage.getItem("customerName");
      if (savedName && !customerName) {
        setCustomerName(savedName);
      }
    } catch (error) {
      console.error('Error loading customer name:', error);
    }
  };

  const handleRegionChange = (value) => {
    setRegion(value);
    setTown(null);
    setFee(null);
  };

  const handleTownChange = (value) => {
    const currentRegion = locations?.find((r) => r.region === region);
    const townData = currentRegion?.towns?.find((t) => t.name === value);
    if (townData) {
      setTown(value);
      setFee(townData.delivery_fee);
    }
  };

  const getFilteredLocations = () => {
    if (!locations || !Array.isArray(locations)) return [];
    if (!searchText) return locations;
    
    return locations.map(region => ({
      ...region,
      towns: region.towns?.filter(town => 
        town.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        region.region?.toLowerCase().includes(searchText.toLowerCase())
      ) || []
    })).filter(region => region.towns.length > 0);
  };

  const handleTownSelect = (townName, regionName) => {
    if (!locations || !Array.isArray(locations)) return;
    
    const selectedRegion = locations.find(r => r.region === regionName);
    const selectedTown = selectedRegion?.towns?.find(t => t.name === townName);
    
    if (selectedTown) {
      setRegion(regionName);
      setTown(townName);
      setFee(selectedTown.delivery_fee);
      setSearchText("");
    }
  };

  const handleSave = async () => {
    let address = "";
    let finalFee = 0;

    if (locationNotFound) {
      if (!manualAddress.trim()) {
        Alert.alert('Error', 'Please enter your address');
        return;
      }
      address = manualAddress;
      finalFee = 0; // N/A for manual addresses
    } else {
      if (!region || !town || fee === null) {
        Alert.alert('Error', 'Please select both region and town');
        return;
      }
      address = `${town} (${region})`;
      finalFee = fee;
    }

    const info = { 
      address, 
      fee: finalFee,
      isManual: locationNotFound 
    };
    
    try {
      setDeliveryInfo(info);
      await AsyncStorage.setItem("deliveryInfo", JSON.stringify(info));
      resetModal();
      Alert.alert('Success', 'Delivery address saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save delivery address');
      console.error('Error saving delivery info:', error);
    }
  };

  const resetModal = () => {
    setModalVisible(false);
    setLocationNotFound(false);
    setSearchText("");
    setManualAddress("");
    setRegion(null);
    setTown(null);
    setFee(null);
  };

  const renderSearchResultItem = ({ item: region }) => (
    <View>
      {region.towns?.map(town => (
        <TouchableOpacity
          key={`${region.region}-${town.name}`}
          style={styles.searchResultItem}
          onPress={() => handleTownSelect(town.name, region.region)}
        >
          <View style={styles.searchResultContent}>
            <Text style={styles.searchResultText}>
              <Text style={styles.townName}>{town.name}</Text>
              <Text style={styles.regionName}> ({region.region})</Text>
            </Text>
            <Text style={styles.deliveryFee}>
              {town.delivery_fee === 0 ? "N/A" : `₵${town.delivery_fee}`}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {/* Recipient Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recipient Name *</Text>
          <View style={styles.inputWrapper}>
            <Icon name="person" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recipient Contact *</Text>
          <View style={styles.inputWrapper}>
            <Icon name="phone" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={customerNumber}
              onChangeText={setCustomerNumber}
              placeholder="Enter your phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Delivery Address</Text>
          <View style={styles.addressCard}>
            <View style={styles.addressInfo}>
              {deliveryInfo?.address ? (
                <>
                  <View style={styles.addressRow}>
                    <Icon name="location-on" size={20} color="#10B981" />
                    <Text style={styles.addressText}>{deliveryInfo.address}</Text>
                  </View>
                  <Text style={styles.deliveryFeeText}>
                    Delivery Fee: {' '}
                    <Text style={styles.feeAmount}>
                      {deliveryInfo.fee === 0 ? "N/A" : `₵${deliveryInfo.fee}`}
                    </Text>
                  </Text>
                </>
              ) : (
                <Text style={styles.noAddressText}>No address selected</Text>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.selectLocationButton}
              onPress={() => setModalVisible(true)}
            >
              <Icon name="my-location" size={16} color="#FFFFFF" />
              <Text style={styles.selectLocationText}>Select Location</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Note */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Order Note (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={orderNote}
            onChangeText={setOrderNote}
            placeholder="Add any notes about your order"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={resetModal}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Icon name="place" size={24} color="#374151" />
                <Text style={styles.modalTitle}>Select Delivery Location</Text>
              </View>
              <TouchableOpacity onPress={resetModal} style={styles.closeButton}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {!locationNotFound && (
                <>
                  {/* Search Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Search for your location</Text>
                    <View style={styles.inputWrapper}>
                      <Icon name="search" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Type to search regions and towns..."
                        placeholderTextColor="#9CA3AF"
                        value={searchText}
                        onChangeText={setSearchText}
                      />
                    </View>
                  </View>

                  {/* Search Results or Region/Town Selectors */}
                  {searchText ? (
                    <View style={styles.searchResults}>
                      <Text style={styles.searchResultsHeader}>Search Results:</Text>
                      {getFilteredLocations().length > 0 ? (
                        <FlatList
                          data={getFilteredLocations()}
                          renderItem={renderSearchResultItem}
                          keyExtractor={(item) => item.region}
                          style={styles.resultsList}
                        />
                      ) : (
                        <Text style={styles.noResultsText}>
                          No locations found matching your search.
                        </Text>
                      )}
                    </View>
                  ) : (
                    <>
                      {/* Region Picker */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Select Region</Text>
                        <View style={styles.pickerWrapper}>
                          <Picker
                            selectedValue={region}
                            onValueChange={handleRegionChange}
                            style={styles.picker}
                          >
                            <Picker.Item label="Choose region" value={null} />
                            {locations && Array.isArray(locations) && locations.map((loc) => (
                              <Picker.Item key={loc.region} label={loc.region} value={loc.region} />
                            ))}
                          </Picker>
                        </View>
                      </View>

                      {/* Town Picker */}
                      {region && (
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Select Town</Text>
                          <View style={styles.pickerWrapper}>
                            <Picker
                              selectedValue={town}
                              onValueChange={handleTownChange}
                              style={styles.picker}
                            >
                              <Picker.Item label="Choose town" value={null} />
                              {locations
                                ?.find((loc) => loc.region === region)
                                ?.towns?.map((t) => (
                                  <Picker.Item 
                                    key={t.name} 
                                    label={`${t.name} (${t.delivery_fee === 0 ? "N/A" : `₵${t.delivery_fee}`})`} 
                                    value={t.name} 
                                  />
                                )) || []}
                            </Picker>
                          </View>
                        </View>
                      )}
                    </>
                  )}

                  {/* Location Not Found Checkbox */}
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => {
                      setLocationNotFound(!locationNotFound);
                      if (!locationNotFound) {
                        setSearchText("");
                        setRegion(null);
                        setTown(null);
                        setFee(null);
                      }
                    }}
                  >
                    <Icon 
                      name={locationNotFound ? "check-box" : "check-box-outline-blank"} 
                      size={20} 
                      color="#10B981" 
                    />
                    <Text style={styles.checkboxText}>
                      My location is not in the list (Enter manually)
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Manual Address Input */}
              {locationNotFound && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Enter your location manually</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Type your full delivery address here"
                      placeholderTextColor="#9CA3AF"
                      value={manualAddress}
                      onChangeText={setManualAddress}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                  
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      <Text style={styles.warningBold}>Note:</Text> Delivery fee for manual addresses is N/A. 
                      Our delivery team will contact you to confirm delivery charges.
                    </Text>
                  </View>

                  {/* Back to search option */}
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => {
                      setLocationNotFound(false);
                      setManualAddress("");
                    }}
                  >
                    <Icon 
                      name={!locationNotFound ? "check-box" : "check-box-outline-blank"} 
                      size={20} 
                      color="#10B981" 
                    />
                    <Text style={styles.checkboxText}>Back to location search</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  ((!locationNotFound && !region && !town) || 
                   (locationNotFound && !manualAddress.trim())) && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={
                  (!locationNotFound && !region && !town) || 
                  (locationNotFound && !manualAddress.trim())
                }
              >
                <Icon name="save" size={16} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Address</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  textArea: {
    height: 100,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addressInfo: {
    marginBottom: 16,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  deliveryFeeText: {
    fontSize: 14,
    color: '#10B981',
  },
  feeAmount: {
    fontWeight: '600',
    color: '#059669',
  },
  noAddressText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  selectLocationButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  selectLocationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  picker: {
    height: 50,
  },
  searchResults: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    maxHeight: 240,
    padding: 8,
  },
  searchResultsHeader: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  resultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  searchResultContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultText: {
    flex: 1,
    fontSize: 14,
  },
  townName: {
    fontWeight: '600',
    color: '#111827',
  },
  regionName: {
    color: '#6B7280',
  },
  deliveryFee: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    padding: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 16,
  },
  checkboxText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
  },
  warningBold: {
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default CheckoutForm;