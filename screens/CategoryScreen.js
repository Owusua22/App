import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories } from '../redux/slice/categorySlice';
import { fetchBrands } from '../redux/slice/brandSlice';
import { useNavigation } from '@react-navigation/native';

const CategoryScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const { categories, status, error } = useSelector((state) => state.categories);
  const { brands } = useSelector((state) => state.brands);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // Memoize filtered categories to avoid recalculation on every render
  const filteredCategories = useMemo(() => {
    return categories.filter(
      (category) => category.categoryName.toLowerCase() !== 'products out of stock'
    );
  }, [categories]);

  // Memoize selected category name
  const selectedCategoryName = useMemo(() => {
    const category = filteredCategories.find(cat => cat.categoryId === selectedCategoryId);
    return category ? category.categoryName : "";
  }, [filteredCategories, selectedCategoryId]);

  // Memoize filtered brands for the selected category
  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => brand.categoryId === selectedCategoryId);
  }, [brands, selectedCategoryId]);

  // Fetch categories only once on mount
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchCategories());
    }
  }, [dispatch, status]);

  // Auto-select first category when categories load
  useEffect(() => {
    if (filteredCategories.length > 0 && !selectedCategoryId) {
      const firstCategory = filteredCategories[0];
      setSelectedCategoryId(firstCategory.categoryId);
    }
  }, [filteredCategories, selectedCategoryId]);

  // Fetch brands when category is selected
  useEffect(() => {
    if (selectedCategoryId) {
      dispatch(fetchBrands(selectedCategoryId));
    }
  }, [dispatch, selectedCategoryId]);

  // Memoize category selection handler
  const handleCategoryPress = useCallback((categoryId) => {
    setSelectedCategoryId(categoryId);
  }, []);

  // Memoize brand press handler
  const handleBrandPress = useCallback((brandId) => {
    navigation.navigate('Brands', { brandId });
  }, [navigation]);

  // Memoize category render item
  const renderCategoryItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategoryId === item.categoryId && styles.activeCategory,
      ]}
      onPress={() => handleCategoryPress(item.categoryId)}
      activeOpacity={0.8}
    >
      <View style={styles.categoryItemContent}>
        <View style={[
          styles.categoryIndicator,
          selectedCategoryId === item.categoryId && styles.activeCategoryIndicator,
        ]} />
        <Text
          style={[
            styles.categoryText,
            selectedCategoryId === item.categoryId && styles.activeCategoryText,
          ]}
        >
          {item.categoryName}
        </Text>
      </View>
    </TouchableOpacity>
  ), [selectedCategoryId, handleCategoryPress]);

  // Optimize key extractor
  const keyExtractor = useCallback((item) => item.categoryId.toString(), []);

  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const renderBrands = () => {
    if (filteredBrands.length === 0) {
      return (
        <View style={styles.noBrandsContainer}>
          <Text style={styles.noBrandsText}>No brands available</Text>
          <Text style={styles.noBrandsSubtext}>Try selecting a different category</Text>
        </View>
      );
    }
    
    return (
      <ScrollView style={styles.brandsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.brandGrid}>
          {filteredBrands.map((item) => (
            <TouchableOpacity
              key={item.brandId}
              style={styles.brandCard}
              onPress={() => handleBrandPress(item.brandId)}
              activeOpacity={0.8}
            >
              <Text style={styles.brandName}>{item.brandName}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.categoryContainer}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryHeaderText}>Categories</Text>
        </View>
        <FlatList
          data={filteredCategories}
          keyExtractor={keyExtractor}
          renderItem={renderCategoryItem}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 60,
            offset: 60 * index,
            index,
          })}
        />
      </View>
      
      <View style={styles.brandContainer}>
        {selectedCategoryId ? (
          <>
            <View style={styles.brandHeader}>
              <Text style={styles.categoryTitle}>{selectedCategoryName}</Text>
              <Text style={styles.categorySubtitle}>Explore brands in this category</Text>
            </View>
            {renderBrands()}
          </>
        ) : (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIcon}>
              <Text style={styles.emptyStateEmoji}>📂</Text>
            </View>
            <Text style={styles.selectPrompt}>Select a category to view brands</Text>
            <Text style={styles.selectSubPrompt}>Choose from the categories on the left</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    
  },
  categoryContainer: {
    flex: 1.5,
    backgroundColor: '#DCFCE7',
    shadowColor: '#16A34A',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryHeader: {
    padding: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  categoryHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#15803D',
    textAlign: 'center',
  },
  brandContainer: {
    flex: 2,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  categoryItem: {
    marginVertical: 4,
    marginHorizontal: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeCategory: {
    backgroundColor: '#22C55E',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryIndicator: {
    width: 4,
    height: 20,
    backgroundColor: '#BBF7D0',
    borderRadius: 2,
    marginRight: 12,
  },
  activeCategoryIndicator: {
    backgroundColor: '#FFFFFF',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#166534',
    flex: 1,
  },
  activeCategoryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  brandHeader: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#F0FDF4',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#16A34A',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#F0FDF4',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#BBF7D0',
  },
  emptyStateEmoji: {
    fontSize: 32,
  },
  selectPrompt: {
    fontSize: 18,
    color: '#16A34A',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  selectSubPrompt: {
    fontSize: 14,
    color: '#22C55E',
    textAlign: 'center',
  },
  brandsContainer: {
    flex: 1,
  },
  brandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  brandCard: {
    width: '48%',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  brandIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  brandIcon: {
    fontSize: 20,
  },
  brandName: {
    fontSize: 13,
    color: '#15803D',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
  brandArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    backgroundColor: '#22C55E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noBrandsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noBrandsText: {
    fontSize: 18,
    color: '#16A34A',
    fontWeight: '600',
    marginBottom: 8,
  },
  noBrandsSubtext: {
    fontSize: 14,
    color: '#22C55E',
    textAlign: 'center',
  },
});

export default CategoryScreen;