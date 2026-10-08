import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { fetchCategories } from '../../redux/slice/categorySlice';
import { fetchBrands } from '../../redux/slice/brandSlice';

const CATEGORY_ICONS = ['smartphone', 'laptop-mac', 'tv', 'kitchen', 'headphones', 'speaker', 'ac-unit', 'devices-other'];

export default function CategoryScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { categories = [], status, error } = useSelector((state) => state.categories);
  const { brands = [], loading: brandsLoading } = useSelector((state) => state.brands);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const requestedBrands = useRef(false);

  const visibleCategories = useMemo(() => categories.filter((category) =>
    category.categoryName?.toLowerCase() !== 'products out of stock'
  ), [categories]);
  const selectedCategory = useMemo(() => visibleCategories.find((category) => category.categoryId === selectedCategoryId), [visibleCategories, selectedCategoryId]);
  const visibleBrands = useMemo(() => brands.filter((brand) => brand.categoryId === selectedCategoryId), [brands, selectedCategoryId]);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchCategories());
  }, [dispatch, status]);
  useEffect(() => {
    if (visibleCategories.length && !selectedCategoryId) setSelectedCategoryId(visibleCategories[0].categoryId);
  }, [visibleCategories, selectedCategoryId]);
  useEffect(() => {
    // The Brand endpoint returns all brands; cache the result across category taps.
    if (selectedCategoryId && !brands.length && !brandsLoading && !requestedBrands.current) {
      requestedBrands.current = true;
      dispatch(fetchBrands(selectedCategoryId));
    }
  }, [dispatch, selectedCategoryId, brands.length, brandsLoading]);

  const renderCategory = useCallback(({ item, index }) => {
    const active = item.categoryId === selectedCategoryId;
    return (
      <Pressable onPress={() => setSelectedCategoryId(item.categoryId)} style={[styles.category, active && styles.selected]} accessibilityRole="button" accessibilityState={{ selected: active }}>
        <View style={[styles.categoryIcon, active && styles.selectedIcon]}>
          <MaterialIcons name={CATEGORY_ICONS[index % CATEGORY_ICONS.length]} size={22} color={active ? '#FFFFFF' : '#397354'} />
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
        <Text style={styles.kicker}>EXPLORE FRANKO</Text>
        <Text style={styles.title}>Categories<Text style={styles.titleDot}>.</Text></Text>
        <Text style={styles.subtitle}>Everything you need, all in one place.</Text>
      </View>
      <View style={styles.columns}>
        <View style={styles.sidebar}>
          <FlatList data={visibleCategories} keyExtractor={(item) => String(item.categoryId)} renderItem={renderCategory} showsVerticalScrollIndicator={false} initialNumToRender={10} maxToRenderPerBatch={10} />
        </View>
        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
          {selectedCategory ? <>
            <View style={styles.mainHeading}>
              <Text style={styles.mainKicker}>DISCOVER MORE</Text>
              <Text style={styles.mainTitle}>{selectedCategory.categoryName}</Text>
              <Text style={styles.mainSubtitle}>Explore brands</Text>
            </View>
            {visibleBrands.length ? visibleBrands.map((brand) => (
              <Pressable key={String(brand.brandId)} style={styles.brandCard} onPress={() => navigation.navigate('Brands', { brandId: brand.brandId })} accessibilityRole="button" accessibilityLabel={`Shop ${brand.brandName}`}>
                <View style={styles.brandMark}><Text style={styles.brandInitial}>{brand.brandName?.slice(0, 1)?.toUpperCase() || 'F'}</Text></View>
                <Text numberOfLines={2} style={styles.brandName}>{brand.brandName}</Text>
                <Feather name="arrow-up-right" size={16} color="#0A704B" />
              </Pressable>
            )) : <View style={styles.empty}><Feather name="grid" size={27} color="#9CB9A5"/><Text style={styles.emptyTitle}>No brands here yet</Text><Text style={styles.muted}>Try another category on the left.</Text></View>}
          </> : <View style={styles.empty}><Text style={styles.muted}>Select a category to begin.</Text></View>}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8F3' },
  heading: { backgroundColor: '#FFFFFF', paddingHorizontal: 22, paddingTop: 21, paddingBottom: 20 },
  kicker: { fontSize: 9, color: '#0A8A59', fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#163A29', fontSize: 29, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  titleDot: { color: '#B21F36' },
  subtitle: { fontSize: 12, color: '#87968B', marginTop: 4 },
  columns: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 112, backgroundColor: '#EBF1E9', paddingTop: 12 },
  category: { minHeight: 92, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  selected: { backgroundColor: '#FFFFFF', borderLeftColor: '#087A4D' },
  categoryIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#D9E8DA', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  selectedIcon: { backgroundColor: '#086942' },
  categoryName: { color: '#577260', fontSize: 11, textAlign: 'center', fontWeight: '600', lineHeight: 14 },
  selectedName: { color: '#075B3B', fontWeight: '800' },
  main: { flex: 1 },
  mainContent: { padding: 16, paddingBottom: 35 },
  mainHeading: { marginBottom: 18 },
  mainKicker: { color: '#0A8A59', fontWeight: '800', fontSize: 9, letterSpacing: 1.4 },
  mainTitle: { color: '#183D2A', fontWeight: '800', fontSize: 20, marginTop: 4 },
  mainSubtitle: { color: '#839489', fontSize: 12, marginTop: 4 },
  brandCard: { backgroundColor: '#FFFFFF', borderRadius: 15, minHeight: 66, padding: 10, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#EDF1EA' },
  brandMark: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#E7F5EA', alignItems: 'center', justifyContent: 'center' },
  brandInitial: { fontWeight: '900', color: '#096340', fontSize: 17 },
  brandName: { flex: 1, color: '#254633', fontWeight: '700', fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 35, gap: 10 },
  emptyTitle: { color: '#254633', fontWeight: '800', fontSize: 14 },
  muted: { color: '#839489', textAlign: 'center', fontSize: 12, marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F8F3' },
  retry: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#086942', borderRadius: 10, marginTop: 12 },
  retryText: { color: 'white', fontWeight: '700' },
});
