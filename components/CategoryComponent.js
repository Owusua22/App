import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Text from './AppText';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CategoryIllustration from './CategoryIllustration';

const categories = [
  { label: 'PHONES', kind: 'phone', route: 'Phones' },
  { label: 'LAPTOPS', kind: 'laptop', route: 'Computers' },
  { label: 'FRIDGES', kind: 'fridge', route: 'Fridge' },
  { label: 'TELEVISIONS', kind: 'tv', route: 'Television' },
  { label: 'SPEAKERS', kind: 'speaker', route: 'Speakers' },
  { label: 'ACCESSORIES', kind: 'headphones', route: 'Accessories' },
  { label: 'AIR CONS', kind: 'ac', route: 'AirCondition' },
  { label: 'LAUNDRY', kind: 'washer', route: 'WashingMachine' },
];

export default function CategoryComponent() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const columns = width >= 760 ? 8 : width < 330 ? 2 : 4;
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>Shop by category</Text>
        <Pressable onPress={() => navigation.navigate('Category')} style={styles.all} accessibilityRole="button" accessibilityLabel="See all categories">
          <Text style={styles.allText}>VIEW ALL</Text><Feather name="arrow-right" size={14} color="#086942" />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {categories.map((category) => (
          <Pressable key={category.route} onPress={() => navigation.navigate(category.route)} style={[styles.item, { width: `${100 / columns}%` }]} accessibilityRole="button" accessibilityLabel={`Shop ${category.label.toLowerCase()}`}>
            <View style={styles.tile}>
              <CategoryIllustration kind={category.kind} size={68} />
              <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>{category.label}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: '#FFFFFF', paddingTop: 8, paddingBottom: 13 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#172B24', letterSpacing: -0.5 },
  all: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32 },
  allText: { fontSize: 10, fontWeight: '800', color: '#086942', letterSpacing: 0.4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, maxWidth: 960, width: '100%', alignSelf: 'center' },
  item: { width: '25%', paddingHorizontal: 4, paddingBottom: 8 },
  tile: { height: 104, borderRadius: 12, backgroundColor: '#84e8b9', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  name: { color: '#0E392A', fontWeight: '900', fontSize: 9, letterSpacing: -0.1, textAlign: 'center', marginTop: -1, width: '100%' },
});
