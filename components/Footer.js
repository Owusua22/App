import React, { useCallback, memo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Footer() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const isActive = useCallback((tabName) => route.name === tabName, [route.name]);

  const colors = {
    primary: '#22C55E',
    inactive: '#9CA3AF',
    border: '#E5E7EB',
  };

  const handleNavigate = useCallback(
    (screen) => {
      if (route.name !== screen) {
        navigation.navigate(screen);
      }
    },
    [navigation, route.name]
  );

  const tabs = [
    { name: 'Home', label: 'Home', icon: 'home' },
    { name: 'Category', label: 'Categories', icon: 'grid' },
    { name: 'Account', label: 'Profile', icon: 'user' },
    { name: 'Shops', label: 'Shops', icon: 'shopping-bag' },
  ];

  return (
    <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const active = isActive(tab.name);
        return (
          <Pressable
            key={tab.name}
            style={styles.footerItem}
            android_ripple={{ color: '#E5E7EB', borderless: false }}
            onPress={() => handleNavigate(tab.name)}
          >
            <Feather
              name={tab.icon}
              size={Platform.OS === 'android' ? 16 : 20}
              color={active ? colors.primary : colors.inactive}
            />
            <Text style={[styles.footerText, { color: active ? colors.primary : colors.inactive }]}>
              {tab.label}
            </Text>
            {active && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export default memo(Footer);

const styles = StyleSheet.create({
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },
  footerItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    minWidth: 55,
  },
  footerText: {
    fontSize: Platform.OS === 'android' ? 9 : 10,
    fontWeight: '500',
    marginTop: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 18,
    height: 2,
    borderRadius: 1,
  },
});
