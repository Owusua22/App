import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import HomeHero from '../../components/HomeHero';
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
import { getBannerPageAdvertisment } from '../../redux/slice/advertismentSlice';
import { fetchProductByShowroomAndRecord } from '../../redux/slice/productSlice';

const SECTIONS = [
  { key: 'hero', Component: HomeHero },
  { key: 'categories', Component: CategoryComponent },
  { key: 'deals', Component: Deals },
  { key: 'bestsellers', Component: BestSellers },
  { key: 'campaigns', Component: CarouselComponent },
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
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(getBannerPageAdvertisment()),
        dispatch(fetchProductByShowroomAndRecord({ showRoomCode: '1e93aeb7-bba7-4bd4-b017-ea3267047d46', recordNumber: 10 })),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  return (
    <FlatList
      data={SECTIONS}
      keyExtractor={(item) => item.key}
      renderItem={renderSection}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      initialNumToRender={3}
      maxToRenderPerBatch={2}
      updateCellsBatchingPeriod={80}
      windowSize={4}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#086942']} tintColor="#086942" />}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: '#F7F8F3' },
  content: { paddingBottom: 28 },
  section: { overflow: 'hidden' },
});
