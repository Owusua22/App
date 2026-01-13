import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from 'lodash';

import { fetchProducts } from '../redux/slice/productSlice';

const backendBaseURL = 'https://fte002n1.salesmate.app';
const RECENT_SEARCH_LIMIT = 8;

const TRENDING = [
  { id: 'phones', label: 'Phones', route: 'Phones', icon: 'smartphone' },
  { id: 'laptops', label: 'Laptops', route: 'Computers', icon: 'laptop-mac' },
  { id: 'ac', label: 'Air Conditioners', route: 'AirCondition', icon: 'ac-unit' },
  { id: 'speakers', label: 'Speakers', route: 'Speakers', icon: 'speaker' },
  { id: 'accessories', label: 'Accessories', route: 'Accessories', icon: 'headphones' },
  { id: 'tv', label: 'Television', route: 'Television', icon: 'tv' },
  { id: 'fridge', label: 'Fridges', route: 'Fridge', icon: 'kitchen' },
];

const SearchScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);

  const { products = [], loading } = useSelector((state) => state.products);
  const debounceRef = useRef(null);

  useEffect(() => {
    loadRecentSearches();
    if (products.length === 0) {
      dispatch(fetchProducts());
    }
  }, [dispatch, products.length]);

  useEffect(() => {
    debounceRef.current = debounce((value) => setSearchQuery(value), 300);
    return () => debounceRef.current?.cancel();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentSearches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveSearch = async (term) => {
    try {
      let updated = [term, ...recentSearches.filter((item) => item !== term)];
      if (updated.length > RECENT_SEARCH_LIMIT) {
        updated = updated.slice(0, RECENT_SEARCH_LIMIT);
      }
      setRecentSearches(updated);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving search:', error);
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    debounceRef.current?.(text);
  };

  const handleSearchSubmit = () => {
    const term = searchText.trim();
    if (!term) return;
    saveSearch(term);
    setSearchQuery(term);
  };

  const handleClearAllRecent = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem('recentSearches');
    } catch (error) {
      console.error('Error clearing searches:', error);
    }
  };

  const handleRecentTap = (term) => {
    setSearchText(term);
    setSearchQuery(term);
  };

  const handleTrendingClick = (item) => {
    navigation.navigate(item.route);
  };

  const handleClearInput = () => {
    setSearchText('');
    setSearchQuery('');
  };

  const handleProductClick = async (productID) => {
    try {
      const product = products.find((p) => p.productID === productID);
      if (product) {
        const recentlyViewed = await AsyncStorage.getItem('recentlyViewed');
        let viewedProducts = recentlyViewed ? JSON.parse(recentlyViewed) : [];

        viewedProducts = viewedProducts.filter((p) => p.productID !== productID);
        viewedProducts.unshift(product);

        if (viewedProducts.length > 10) {
          viewedProducts = viewedProducts.slice(0, 10);
        }

        await AsyncStorage.setItem('recentlyViewed', JSON.stringify(viewedProducts));
      }

      navigation.navigate('ProductDetails', { productId: productID });
    } catch (error) {
      console.error('Error storing product in AsyncStorage:', error);
      navigation.navigate('ProductDetails', { productId: productID });
    }
  };

  const formatPrice = (price) => `₵${price?.toLocaleString?.() || 'N/A'}`;

  const getImageURL = (productImage) => {
    if (!productImage) return null;
    const imagePath = productImage.split('\\').pop();
    return `${backendBaseURL}/Media/Products_Images/${imagePath}`;
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return products.filter((product) =>
      product.productName?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const hasQuery = searchQuery.trim().length > 0;

  const renderHighlightedText = (text = '') => {
    if (!searchQuery) return text;

    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    const lowerTerm = searchQuery.toLowerCase();

    return parts.map((part, index) => {
      const isMatch = part.toLowerCase() === lowerTerm;
      return (
        <Text
          key={`${part}-${index}`}
          style={isMatch ? styles.highlightedText : null}
        >
          {part}
        </Text>
      );
    });
  };

  const renderProduct = ({ item: product }) => {
    const imageURL = getImageURL(product.productImage);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductClick(product.productID)}
        activeOpacity={0.85}
      >
        <View style={styles.productImageWrapper}>
          {imageURL ? (
            <Image
              source={{ uri: imageURL }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Icon name="image-not-supported" size={22} color="#9CA3AF" />
              <Text style={styles.placeholderText}>No image</Text>
            </View>
          )}

          <View style={styles.favoriteBadge}>
            <Icon name="favorite-border" size={18} color="#6B7280" />
          </View>
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {renderHighlightedText(product.productName || '')}
          </Text>
          <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchResults = () => {
    if (loading && hasQuery) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Searching products...</Text>
        </View>
      );
    }

    if (!hasQuery) {
      return (
        <View style={styles.emptyState}>
          <Icon name="search" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Search for products</Text>
          <Text style={styles.emptySubtitle}>
            Find phones, laptops, home appliances and more.
          </Text>
        </View>
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="search-off" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptySubtitle}>
            We couldn’t find anything for “{searchText}”.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Search results</Text>
          <Text style={styles.resultsCount}>
            {filteredProducts.length} item
            {filteredProducts.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.productID?.toString()}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productsList}
        />
      </View>
    );
  };

  const renderRecentChip = (term) => (
    <TouchableOpacity
      key={term}
      style={styles.chip}
      activeOpacity={0.8}
      onPress={() => handleRecentTap(term)}
    >
      <Icon name="history" size={16} color="#6B7280" />
      <Text style={styles.chipText}>{term}</Text>
    </TouchableOpacity>
  );

  // New: card-style, NON-scrollable “Popular right now” items
  const renderTrendingItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.trendingCard}
      activeOpacity={0.85}
      onPress={() => handleTrendingClick(item)}
    >
      <View style={styles.trendingIconWrapper}>
        <Icon name={item.icon} size={24} color="#22C55E" />
      </View>
      <Text style={styles.trendingLabel} numberOfLines={2}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderDiscover = () => (
    <ScrollView
      style={styles.discoverContainer}
      contentContainerStyle={styles.discoverContent}
      showsVerticalScrollIndicator={false}
    >
      {recentSearches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent searches</Text>
              <Text style={styles.sectionSubtitle}>Quickly jump back in</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClearAllRecent}
            >
              <Icon name="delete-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View style={styles.chipRow}>
            {recentSearches.map((term) => renderRecentChip(term))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Popular right now</Text>
            <Text style={styles.sectionSubtitle}>Browse top categories</Text>
          </View>
        </View>

        {/* NON-scrollable grid of trending items */}
        <View style={styles.trendingGrid}>
          {TRENDING.map(renderTrendingItem)}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <View style={styles.container}>
        {/* Search header */}
        <View style={styles.searchHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back-ios" size={20} color="#111827" />
          </TouchableOpacity>

          <View style={styles.searchBox}>
            <Icon
              name="search"
              size={20}
              color="#9CA3AF"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for products, brands, categories"
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={handleSearchChange}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              autoFocus={true}
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={handleClearInput}
                style={styles.clearButton}
                activeOpacity={0.7}
              >
                <Icon name="close" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {hasQuery ? renderSearchResults() : renderDiscover()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Header / search bar
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.06)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 999,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },

  // Discover / sections
  discoverContainer: {
    flex: 1,
  },
  discoverContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  // Chips (recent)
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },

  // Popular right now – grid (non-scrollable horizontally)
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  trendingCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  trendingIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  trendingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },

  // Results
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  resultsCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  productsList: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  // Product card
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  productImageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 140,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  placeholderText: {
    marginTop: 4,
    fontSize: 11,
    color: '#9CA3AF',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    padding: 4,
  },
  productInfo: {
    marginTop: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  highlightedText: {
    color: '#22C55E',
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22C55E',
  },

  // Loading / empty states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default SearchScreen;