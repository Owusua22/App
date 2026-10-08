import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const TABS = [
  { name: 'Home', label: 'Home', icon: 'home' },
  { name: 'Category', label: 'Categories', icon: 'grid' },
  { name: 'Shops', label: 'Stores', icon: 'map-pin' },
  { name: 'Wishlist', label: 'Saved', icon: 'heart' },
  { name: 'Account', label: 'Account', icon: 'user' },
];

function Footer() {
  const navigation = useNavigation();
  const route = useRoute();
  const handleNavigate = useCallback((screen) => {
    if (route.name !== screen) navigation.navigate(screen);
  }, [navigation, route.name]);

  return (
    <View style={styles.footer}>
      {TABS.map((tab) => {
        const active = route.name === tab.name;
        return (
          <Pressable key={tab.name} onPress={() => handleNavigate(tab.name)} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={tab.label}>
            <View style={[styles.iconWrap, active && styles.activeIcon]}>
              <Feather name={tab.icon} size={20} color={active ? '#FFFFFF' : '#84938A'} />
            </View>
            <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default memo(Footer);

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EDF1EB', paddingTop: 8, paddingBottom: 8, paddingHorizontal: 10, justifyContent: 'space-around' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 47 },
  iconWrap: { width: 40, height: 28, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activeIcon: { backgroundColor: '#08613E' },
  label: { fontSize: 10, fontWeight: '600', color: '#84938A', marginTop: 3 },
  activeLabel: { color: '#075C3B', fontWeight: '800' },
});
