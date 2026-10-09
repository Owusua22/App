import { createWebSafeStyles } from '../theme/webSafeStyles';
import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const DEALS_SHOWROOM = '1e93aeb7-bba7-4bd4-b017-ea3267047d46';
const tabs = [
  { name: 'Home', label: 'Home', icon: 'home' },
  { name: 'Category', label: 'Categories', icon: 'grid' },
  { name: 'showroom', label: 'Deals', special: true },
  { name: 'Account', label: 'Account', icon: 'user' },
  { name: 'cart', label: 'Cart', icon: 'shopping-cart' },
];

function Footer() {
  const navigation = useNavigation();
  const route = useRoute();
  return (
    <View style={styles.footer}>
      {tabs.map((tab) => {
        const selected = route.name === tab.name;
        return <Pressable key={tab.name} onPress={() => {
          if (tab.name === 'showroom') navigation.navigate('showroom', { showRoomID: DEALS_SHOWROOM });
          else if (!selected) navigation.navigate(tab.name);
        }} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={tab.label}>
          {tab.special ? <View style={styles.featured}><MaterialCommunityIcons name="fire" size={25} color="#086942" /></View> :
            <Feather name={tab.icon} size={21} color={selected ? '#086942' : '#69756F'} />}
          <Text style={[styles.label, selected && styles.selected]}>{tab.label}</Text>
        </Pressable>;
      })}
    </View>
  );
}

export default memo(Footer);

const styles = createWebSafeStyles({
  footer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EDF1EE', paddingTop: 9, paddingBottom: 8, justifyContent: 'space-around', width: '100%', maxWidth: 920, alignSelf: 'center' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 49 },
  featured: { width: 55, height: 55, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#84e8b9', marginTop: -27, borderWidth: 4, borderColor: '#FFFFFF', elevation: 4, shadowColor: '#082D20', shadowOpacity: 0.12, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
  label: { fontSize: 10, fontWeight: '600', color: '#69756F', marginTop: 4 },
  selected: { color: '#086942', fontWeight: '800' },
});
