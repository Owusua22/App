import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import CarouselComponent from '../components/CarouselComponent'; 
import ShopByBrandsBanner from '../components/BrandsBannerComponent';
import ComboComponent from "../components/ComboComponent";
import CategoryComponent from '../components/CategoryComponent';
import PhonesComponent from '../components/PhonesComponent';
import LaptopComponent from '../components/LaptopComponent';
import FridgeComponent from '../components/fridgeComponent';
import TelevisionComponent from '../components/TelevisionComponent';
import AppliancesComponent from '../components/AppliancesComponent';
import SpeakerComponent from '../components/SpeakersComponent';
import Deals from '../components/Deals';
import BestSellers from '../components/BestSellers';
import Explore from '../components/Explore';

const HomeScreen = () => {
  const [refreshing, setRefreshing] = useState(false);

  const sections = [
    { key: 'carousel', component: <CarouselComponent /> },
 
    { key: 'categorycomponent', component: <CategoryComponent /> },
    { key: 'deals', component: <Deals /> },
    {key: 'bestsellers', component: <BestSellers/>} ,
    {key: 'explore', component: <Explore/>} ,
      
    {key:"phonecomponent", component:<PhonesComponent/>},
    {key:"laptopcomponent", component:<LaptopComponent/>},
    { key: 'fridgecomponent', component: <FridgeComponent/> },
    {key: "televisioncomponent", component:<TelevisionComponent/>},
    {key:"appliancecomponent", component:<AppliancesComponent/>},
    {key: "speakercomponent", component: <SpeakerComponent/>},
    
    { key: 'brandsbanner', component: <ShopByBrandsBanner /> },
 
    { key: 'combocomponent', component: <ComboComponent /> },

  ];

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) => (
        <View style={styles.sectionContainer}>
          {item.component}
        </View>
      )}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    />
  );
};
const styles = StyleSheet.create({
  sectionContainer: {
   overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#fffff',
    shadowColor: '#000',},
});

export default HomeScreen;
