import React, { useState, useEffect, useCallback } from 'react';
import { Modal, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, View, Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../redux/slice/productSlice'; // Import fetchProducts action
import { useNavigation } from '@react-navigation/native'; // For navigation
import { Ionicons } from '@expo/vector-icons';
import { debounce } from 'lodash'; // For debouncing the search

const backendBaseURL = 'https://ct002.frankotrading.com:444';

const SearchModal = ({ visible, onClose }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const { products, loading } = useSelector((state) => state.products);

  // Fetch products once when the component mounts
  useEffect(() => {
    if (visible && products.length === 0) {
      dispatch(fetchProducts());
    }
  }, [dispatch, visible, products.length]);

  // Clear search query when modal is closed
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  // Debounced function for updating search query
  const debounceSearch = useCallback(
    debounce((value) => setSearchQuery(value), 300),
    []
  );
  const handleSearchChange = (value) => {
    setSearchQuery(value); // Directly update state to ensure sync
    debounceSearch(value);
  };
  
  // Format price
  const formatPrice = (price) => `₵${price.toLocaleString()}.00`;

  // Function to highlight matching text
  const highlightText = (text, query) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    return text.split(regex).map((part, index) => 
      regex.test(part) ? <Text key={index} style={styles.highlight}>{part}</Text> : part
    );
  };

  const filteredProducts = searchQuery
    ? products
        .filter((product) => product.status !== 0) // Exclude products with status 0
        .filter((product) =>
          product.productName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : [];

  const navigateToProduct = (productID) => {
    navigation.navigate('ProductDetails', { productId: productID });
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
    >
      <TouchableOpacity style={styles.modalContainer} onPress={onClose}>
        <TouchableOpacity style={styles.modalContent} activeOpacity={1}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={30} color="#888" />
            </TouchableOpacity>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={24} style={styles.searchIcon} />
              <TextInput
                placeholder="Search for a product"
                onChangeText={handleSearchChange}
                value={searchQuery}
                style={styles.searchInput}
              />
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#006838" />
          ) : (
            <>
              {filteredProducts.length === 0 ? (
                <Text style={styles.emptyText}>No products found</Text>
              ) : (
                <FlatList
                  data={filteredProducts}
                  keyExtractor={(item) => item.productID.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.itemContainer}
                      onPress={() => navigateToProduct(item.productID)}
                    >
                      <Image
                        source={{
                          uri: `${backendBaseURL}/Media/Products_Images/${item.productImage.split('\\').pop()}`,
                        }}
                        style={styles.itemImage}
                      />
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemTitle}>
                          {highlightText(item.productName || 'Unnamed Product', searchQuery)}
                        </Text>
                        <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Slightly darker overlay
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    width: '95%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8, // Shadow for Android
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Added to align the close button to the right
    marginBottom: 15,
  },
  closeButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    borderRadius: 25,
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 20,
    height: 45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    color: '#aaa',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#ddd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: '#444',
  },
  itemPrice: {
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 18,
    marginTop: 20,
  },
  highlight: {
    backgroundColor: '#FFEBE5',
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
});



export default SearchModal;
