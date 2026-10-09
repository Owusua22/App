import React, { useEffect } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Text from './AppText';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { loadCart } from '../redux/slice/cartSlice';

const DEALS_SHOWROOM = '1e93aeb7-bba7-4bd4-b017-ea3267047d46';
const QUICK = [
  { label: 'Deals', route: 'showroom', params: { showRoomID: DEALS_SHOWROOM } },
  { label: 'Phones', route: 'Phones' },
  { label: 'Laptops', route: 'Computers' },
  { label: 'TVs', route: 'Television' },
  { label: 'Appliances', route: 'Appliances' },
  { label: 'Accessories', route: 'Accessories' },
];

function Header() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const cartCount = useSelector((state) => Number(state.cart?.totalItems) || 0);

  useEffect(() => {
    dispatch(loadCart());
    return navigation.addListener('focus', () => dispatch(loadCart()));
  }, [dispatch, navigation]);

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.navigate('Home')} accessibilityRole="button" accessibilityLabel="Franko home" style={[styles.logoTouch, width < 350 && styles.logoCompact]}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Search')} style={styles.search} accessibilityRole="search" accessibilityLabel="Search Franko products">
          <Feather name="search" size={17} color="#8C9B91" />
          <Text style={styles.placeholder} numberOfLines={1}>What are you looking for?</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('cart')} style={styles.cart} accessibilityRole="button" accessibilityLabel={`Cart${cartCount ? `, ${cartCount} items` : ''}`}>
          <Feather name="shopping-cart" size={21} color="#086942" />
          {cartCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View>}
        </Pressable>
      </View>
      <View style={styles.navRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navContent} keyboardShouldPersistTaps="handled">
          {QUICK.map((item, index) => (
            <Pressable key={item.label} style={styles.navItem} onPress={() => navigation.navigate(item.route, item.params)} accessibilityRole="button" accessibilityLabel={`Shop ${item.label}`}>
              <Text style={[styles.navText, index === 0 && styles.dealText]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable style={styles.allButton} onPress={() => navigation.navigate('Category')} accessibilityLabel="All categories" accessibilityRole="button">
          <Feather name="grid" size={19} color="#086942" />
        </Pressable>
      </View>
    </View>
  );
}

export default React.memo(Header);

const styles = StyleSheet.create({
  header: { backgroundColor: '#FFFFFF', borderBottomColor: '#EDF1EE', borderBottomWidth: 1 },
  topRow: { height: 60, flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 8, gap: 5, maxWidth: 920, width: '100%', alignSelf: 'center' },
  logoTouch: { width: 81, alignItems: 'flex-start', justifyContent: 'center' },
  logoCompact: { width: 69 },
  logo: { width: '100%', height: 38 },
  search: { minWidth: 0, height: 40, borderWidth: 1, borderColor: '#E2E9E4', borderRadius: 8, paddingHorizontal: 11, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFFFFF' },
  placeholder: { color: '#A0AAA2', fontSize: 11, flex: 1, flexShrink: 1 },
  cart: { width: 30, height: 40, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 1, right: -2, backgroundColor: '#B21F36', borderRadius: 9, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 9 },
  navRow: { height: 39, flexDirection: 'row', alignItems: 'center' },
  navContent: { paddingLeft: 15, alignItems: 'center', gap: 20, paddingRight: 12 },
  navItem: { height: 39, justifyContent: 'center' },
  navText: { fontSize: 12, color: '#56675C', fontWeight: '600' },
  dealText: { color: '#B21F36', fontWeight: '800' },
  allButton: { width: 43, height: 36, borderLeftWidth: 1, borderLeftColor: '#E9F0EA', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
});
