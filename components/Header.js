import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { loadCart } from '../redux/slice/cartSlice';

const Header = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const cartCount = useSelector((state) => Number(state.cart?.totalItems) || 0);

  useEffect(() => {
    dispatch(loadCart());
    return navigation.addListener('focus', () => dispatch(loadCart()));
  }, [dispatch, navigation]);

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.navigate('Home')} accessibilityRole="button" accessibilityLabel="Franko home" style={styles.brand}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.brandText}>
            <Text style={styles.brandCaption}>FRANKO TRADING</Text>
            <Text style={styles.brandSub}>Your tech destination</Text>
          </View>
        </Pressable>
        <View style={styles.actions}>
          <Pressable onPress={() => navigation.navigate('Wishlist')} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Wishlist">
            <Feather name="heart" size={21} color="#113F2B" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('cart')} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={`Cart${cartCount ? `, ${cartCount} items` : ''}`}>
            <Feather name="shopping-bag" size={21} color="#113F2B" />
            {cartCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View>}
          </Pressable>
        </View>
      </View>
      <Pressable onPress={() => navigation.navigate('Search')} style={styles.search} accessibilityRole="search" accessibilityLabel="Search products and brands">
        <Feather name="search" size={19} color="#0A6443" />
        <Text style={styles.placeholder}>Search phones, TVs, appliances...</Text>
        <View style={styles.searchArrow}><Feather name="arrow-right" size={17} color="#FFFFFF" /></View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: '#EDF1EB' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logo: { width: 87, height: 44 },
  brandText: { marginLeft: 8, borderLeftWidth: 1, borderLeftColor: '#DDE6DF', paddingLeft: 10 },
  brandCaption: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: '#124532' },
  brandSub: { fontSize: 10, color: '#798B80', marginTop: 3 },
  actions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#F3F7F2', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B21F36', borderWidth: 1.5, borderColor: '#FFFFFF' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  search: { height: 46, backgroundColor: '#F3F6F1', borderWidth: 1, borderColor: '#E8EFE8', borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingLeft: 15, paddingRight: 5 },
  placeholder: { flex: 1, fontSize: 13, color: '#7E9084', marginLeft: 10 },
  searchArrow: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#08613E', alignItems: 'center', justifyContent: 'center' },
});

export default React.memo(Header);
