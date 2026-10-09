import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Text from './AppText';

// A small, visible database request indicator. It never replaces an already
// cached list, and unlike the campaign placeholder it is not a carousel slide.
export default function CatalogFetchNotice({ loading, hasCachedData = false, label = 'products', style }) {
  if (!loading) return null;
  const message = hasCachedData ? `Checking latest ${label}…` : `Loading ${label} from Franko…`;
  return (
    <View style={[styles.row, style]} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="small" color="#086942" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 32, alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 5, backgroundColor: '#F0F8F3' },
  text: { fontSize: 11, fontWeight: '600', color: '#086942' },
});
