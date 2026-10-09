import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../../components/AppText';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { fetchCategories } from '../../redux/slice/categorySlice';
import { fetchBrands } from '../../redux/slice/brandSlice';
import { useCatalogRevalidation } from '../../hooks/useCatalogRevalidation';
import CatalogFetchNotice from '../../components/CatalogFetchNotice';

const CATEGORY_ICONS = ['smartphone', 'laptop-mac', 'tv', 'kitchen', 'headphones', 'speaker', 'ac-unit', 'devices-other'];

export default function CategoryScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { categories = [], status, error } = useSelector((state) => state.categories);
  const { brands = [], loading: brandsLoading } = useSelector((state) => state.brands);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const categoriesFetching = useCatalogRevalidation('categories:all', () => fetchCategories());
  const brandsFetching = useCatalogRevalidation('brands:all', () => fetchBrands());

  const visibleCategories = useMemo(() => categories.filter((category) =>
    category.categoryName?.toLowerCase() !== 'products out of stock'
  ), [categories]);
  const selectedCategory = useMemo(() => visibleCategories.find((category) => category.categoryId === selectedCategoryId), [visibleCategories, selectedCategoryId]);
  const visibleBrands = useMemo(() => brands.filter((brand) => brand.categoryId === selectedCategoryId), [brands, selectedCategoryId]);

  useEffect(() => {
    if (visibleCategories.length && !selectedCategoryId) setSelectedCategoryId(visibleCategories[0].categoryId);
  }, [visibleCategories, selectedCategoryId]);

  const renderCategory = useCallback(({ item, index }) => {
    const active = item.categoryId === selectedCategoryId;
    return (
      <Pressable onPress={() => setSelectedCategoryId(item.categoryId)} style={[styles.category, active && styles.selected]} accessibilityRole="button" accessibilityState={{ selected: active }}>
        <View style={[styles.categoryIcon, active && styles.selectedIcon]}>
          <MaterialIcons name={CATEGORY_ICONS[index % CATEGORY_ICONS.length]} size={22} color={active ? '#086942' : '#397354'} />
        </View>
        <Text style={[styles.categoryName, active && styles.selectedName]} numberOfLines={2}>{item.categoryName}</Text>
      </Pressable>
    );
  }, [selectedCategoryId]);

  if (status === 'loading' && !visibleCategories.length) return <View style={styles.center}><ActivityIndicator size="large" color="#086942"/><Text style={styles.muted}>Loading categories...</Text></View>;
  if (status === 'failed' && !visibleCategories.length) return <View style={styles.center}><Text style={styles.muted}>{String(error || 'Could not load categories')}</Text><Pressable onPress={() => dispatch(fetchCategories())} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View>;

  return (
    <View style={styles.screen}>
      <View style={styles.heading}>
        <Text style={styles.title}>Categories<Text style={styles.titleDot}>.</Text></Text>
      </View>
      <CatalogFetchNotice loading={categoriesFetching || brandsFetching} hasCachedData={Boolean(visibleCategories.length)} label="categories" />
      <View style={styles.columns}>
        <View style={styles.sidebar}>
          <FlatList data={visibleCategories} keyExtractor={(item) => String(item.categoryId)} renderItem={renderCategory} showsVerticalScrollIndicator={false} initialNumToRender={10} maxToRenderPerBatch={10} />
        </View>
        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
          {selectedCategory ? <>
            <View style={styles.mainHeading}>
              <Text style={styles.mainTitle}>{selectedCategory.categoryName}</Text>
              <Text style={styles.mainSubtitle}>Shop your favourite brands</Text>
            </View>
            {visibleBrands.length ? visibleBrands.map((brand) => (
              <Pressable key={String(brand.brandId)} style={styles.brandCard} onPress={() => navigation.navigate('Brands', { brandId: brand.brandId })} accessibilityRole="button" accessibilityLabel={`Shop ${brand.brandName}`}>
                <View style={styles.brandMark}><Text style={styles.brandInitial}>{brand.brandName?.slice(0, 1)?.toUpperCase() || 'F'}</Text></View>
                <Text numberOfLines={2} style={styles.brandName}>{brand.brandName}</Text>
                <Feather name="arrow-up-right" size={16} color="#086942" />
              </Pressable>
            )) : brandsLoading ? <View style={styles.loadingBrands}><ActivityIndicator color="#086942" /><Text style={styles.muted}>Finding brands...</Text></View> : <View style={styles.empty}><Feather name="grid" size={27} color="#9CB9A5"/><Text style={styles.emptyTitle}>No brands here yet</Text><Text style={styles.muted}>Try another category on the left.</Text></View>}
          </> : <View style={styles.empty}><Text style={styles.muted}>Select a category to begin.</Text></View>}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  heading: { backgroundColor: '#FFFFFF', paddingHorizontal: 17, paddingTop: 17, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: '#EDF1EE' },
  kicker: { fontSize: 9, color: '#086942', fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#163A29', fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
  titleDot: { color: '#B21F36' },
  subtitle: { fontSize: 12, color: '#87968B', marginTop: 4 },
  columns: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 108, backgroundColor: '#F0F5F1', paddingTop: 7 },
  category: { minHeight: 86, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  selected: { backgroundColor: '#FFFFFF', borderLeftColor: '#086942' },
  categoryIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E1EEE4', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  selectedIcon: { backgroundColor: '#84e8b9' },
  categoryName: { color: '#577260', fontSize: 11, textAlign: 'center', fontWeight: '600', lineHeight: 14 },
  selectedName: { color: '#086942', fontWeight: '800' },
  main: { flex: 1 },
  mainContent: { padding: 13, paddingBottom: 35 },
  mainHeading: { marginBottom: 14 },
  mainKicker: { color: '#086942', fontWeight: '800', fontSize: 9, letterSpacing: 1.4 },
  mainTitle: { color: '#183D2A', fontWeight: '900', fontSize: 17, marginTop: 4 },
  mainSubtitle: { color: '#839489', fontSize: 12, marginTop: 4 },
  brandCard: { backgroundColor: '#FFFFFF', borderRadius: 8, minHeight: 66, padding: 9, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#ECF0EC' },
  brandMark: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#84e8b9', alignItems: 'center', justifyContent: 'center' },
  brandInitial: { fontWeight: '900', color: '#086942', fontSize: 17 },
  brandName: { flex: 1, color: '#163A29', fontWeight: '700', fontSize: 12 },
  loadingBrands: { alignItems: 'center', paddingVertical: 35 },
  empty: { alignItems: 'center', paddingVertical: 35, gap: 10 },
  emptyTitle: { color: '#163A29', fontWeight: '800', fontSize: 14 },
  muted: { color: '#839489', textAlign: 'center', fontSize: 12, marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7FAF8' },
  retry: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#086942', borderRadius: 10, marginTop: 12 },
  retryText: { color: 'white', fontWeight: '700' },
});
