import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { loadCart, clearCart } from '../redux/slice/cartSlice'; // Make sure clearCart is imported

const SearchIcon = ({ size = 20, color = '#6B7280' }) => (
  <Icon name="search" size={size} color={color} />
);

const Header = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const { totalItems, cart } = useSelector((state) => state.cart)

  useEffect(() => {
    // Load cart when component mounts
    dispatch(loadCart());
  }, [dispatch]);

  // Add focus listener to reload cart when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      dispatch(loadCart());
    });

    return unsubscribe;
  }, [navigation, dispatch]);

  const navigateToCart = () => {
    navigation.navigate('cart');
  };

  return (
    <View style={styles.headerWrapper}>
      <View style={styles.innerContainer}>
        {/* Logo */}
        <TouchableOpacity 
          style={styles.logoWrapper} 
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Image
            source={require('../assets/frankoIcon.png')}
            style={styles.logo}
          />
        </TouchableOpacity>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchContainer}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.8}
        >
          <View style={styles.searchIconContainer}>
            <SearchIcon />
          </View>
          <Text style={styles.searchPlaceholder}>Search products...</Text>
        </TouchableOpacity>

        {/* Modern Cart Icon with Badge */}
        <TouchableOpacity 
          style={styles.cartWrapper} 
          onPress={navigateToCart}
          activeOpacity={0.7}
        >
          <View style={styles.cartIconContainer}>
            <Icon name="shopping-bag" size={24} color="#374151" />
            {totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {totalItems > 99 ? '99+' : totalItems}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 2,
    paddingHorizontal: 2,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoWrapper: {
    width: 100,
    marginRight: 12,
  },
  logo: {
    width: '100%',
    height: 40,
    resizeMode: 'contain',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 25,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIconContainer: {
    paddingHorizontal: 8,

  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 12,
    color: '#9CA3AF',
   
    paddingRight: 16,
    fontWeight: '400',
  },
  cartWrapper: {
    marginLeft: 12,
    padding: 8,
  },
  cartIconContainer: {
    position: 'relative',
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 23,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default Header;