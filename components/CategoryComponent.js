import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const categories = [
  { name: 'Phones', icon: 'smartphone', route: 'Phones', color: '#E7F5EB' },
  { name: 'Laptops', icon: 'laptop-mac', route: 'Computers', color: '#ECF0FA' },
  { name: 'Fridges', icon: 'kitchen', route: 'Fridge', color: '#E5F3F4' },
  { name: 'TVs', icon: 'tv', route: 'Television', color: '#F7EFE4' },
  { name: 'Speakers', icon: 'speaker', route: 'Speakers', color: '#F3ECF7' },
  { name: 'Accessories', icon: 'headphones', route: 'Accessories', color: '#FDEEEB' },
  { name: 'Air cons', icon: 'ac-unit', route: 'AirCondition', color: '#E9F4FA' },
  { name: 'Laundry', icon: 'local-laundry-service', route: 'WashingMachine', color: '#F1F3E8' },
];

export default function CategoryComponent() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.kicker}>FIND WHAT YOU LOVE</Text>
          <Text style={styles.title}>Shop by category</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Category')} style={styles.all} accessibilityRole="button" accessibilityLabel="See all categories">
          <Text style={styles.allText}>See all</Text><Feather name="arrow-up-right" size={15} color="#086942" />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {categories.map((category) => (
          <Pressable key={category.route} onPress={() => navigation.navigate(category.route)} style={styles.item} accessibilityRole="button" accessibilityLabel={`Shop ${category.name}`}>
            <View style={[styles.iconBox, { backgroundColor: category.color }]}>
              <MaterialIcons name={category.icon} size={28} color="#075A3B" />
            </View>
            <Text style={styles.name} numberOfLines={1}>{category.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 17, backgroundColor: '#FFFFFF', marginHorizontal: 16, marginVertical: 10, borderRadius: 22, borderWidth: 1, borderColor: '#EFF2EC' },
  heading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 },
  kicker: { fontSize: 9, color: '#0B8A58', letterSpacing: 1.5, fontWeight: '800', marginBottom: 5 },
  title: { fontSize: 21, color: '#163A29', fontWeight: '800', letterSpacing: -0.6 },
  all: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingBottom: 2 },
  allText: { fontSize: 12, fontWeight: '700', color: '#086942' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  item: { width: '25%', alignItems: 'center', marginBottom: 15 },
  iconBox: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  name: { color: '#344C3C', fontSize: 11, fontWeight: '700', textAlign: 'center' },
});
