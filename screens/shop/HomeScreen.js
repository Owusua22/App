import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import CarouselComponent from '../../components/CarouselComponent';
import ShopByBrandsBanner from '../../components/BrandsBannerComponent';
import ComboComponent from '../../components/ComboComponent';
import CategoryComponent from '../../components/CategoryComponent';
import PhonesComponent from '../../components/PhonesComponent';
import LaptopComponent from '../../components/LaptopComponent';
import FridgeComponent from '../../components/fridgeComponent';
import TelevisionComponent from '../../components/TelevisionComponent';
import AppliancesComponent from '../../components/AppliancesComponent';
import SpeakerComponent from '../../components/SpeakersComponent';
import Deals from '../../components/Deals';
import BestSellers from '../../components/BestSellers';
import Explore from '../../components/Explore';
import { useDispatch } from 'react-redux';
import { useCatalogScroll } from '../../hooks/useCatalogScroll';
import { useNavigation } from '@react-navigation/native';
import { getBannerPageAdvertisment } from '../../redux/slice/advertismentSlice';
import { refreshCatalog } from '../../utils/catalogRefresh';
import { fetchProductByShowroomAndRecord, fetchProducts } from '../../redux/slice/productSlice';

const SECTIONS = [
  { key: 'carousel', Component: CarouselComponent },
  { key: 'categories', Component: CategoryComponent },
  { key: 'deals', Component: Deals },
  { key: 'bestsellers', Component: BestSellers },
  { key: 'explore', Component: Explore },
  { key: 'phones', Component: PhonesComponent },
  { key: 'laptops', Component: LaptopComponent },
  { key: 'fridges', Component: FridgeComponent },
  { key: 'televisions', Component: TelevisionComponent },
  { key: 'appliances', Component: AppliancesComponent },
  { key: 'speakers', Component: SpeakerComponent },
  { key: 'brands', Component: ShopByBrandsBanner },
  { key: 'combos', Component: ComboComponent },
];

const renderSection = ({ item }) => <View style={styles.section}><item.Component /></View>;

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { listRef, onScroll, onContentSizeChange, rememberPosition } = useCatalogScroll('home');
  // Home shelves navigate to details from their own card components. Keep the
  // home feed offset only for that journey, not for a fresh home visit.
  useEffect(() => navigation.addListener('blur', () => {
    const state = navigation.getState();
    if (state?.routes?.[state.index]?.name === 'ProductDetails') rememberPosition();
  }), [navigation, rememberPosition]);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshCatalog(dispatch, 'ads:banner', () => getBannerPageAdvertisment(), { force: true }),
        refreshCatalog(dispatch, 'products:all', () => fetchProducts(), { force: true }),
        ...['1e93aeb7-bba7-4bd4-b017-ea3267047d46', 'fca9d386-2904-4e13-a0cb-4f183aa274af', '910812e9-cd1e-449a-a5bb-b74b29836569']
          .map((showRoomCode) => refreshCatalog(dispatch, `showroom-shelf:${showRoomCode}`,
            () => fetchProductByShowroomAndRecord({ showRoomCode, recordNumber: 10 }), { force: true })),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  return (
    <FlatList
      ref={listRef}
      onContentSizeChange={onContentSizeChange}
      data={SECTIONS}
      keyExtractor={(item) => item.key}
      renderItem={renderSection}
      onScroll={onScroll}
      scrollEventThrottle={100}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      updateCellsBatchingPeriod={80}
      windowSize={4}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#84e8b9']} tintColor="#086942" />}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 28 },
  section: { overflow: 'hidden' },
});
