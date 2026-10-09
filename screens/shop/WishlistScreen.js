import { createWebSafeStyles } from '../../theme/webSafeStyles';
import React, { useCallback } from 'react';
import { Alert, FlatList, Pressable, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Text from '../../components/AppText';
import { Feather } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import CatalogProductCard, { getCatalogLayout } from '../../components/CatalogProductCard';
import CachedImage from '../../components/CachedImage';
import { resolveProductImageUri } from '../../utils/ImageCache';
import { clearWishlist, removeFromWishlist } from '../../redux/wishlistSlice';
import { franko, frankoCard } from '../../theme/franko';
import { useCatalogScroll } from '../../hooks/useCatalogScroll';

const formatPrice = (price) => `GH₵ ${(Number(price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WishlistScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const wishlist = useSelector((state) => state.wishlist?.items || []);
  const { columns, cardWidth } = getCatalogLayout(width);
  const { listRef, onScroll, onContentSizeChange, rememberPosition } = useCatalogScroll('wishlist');

  const removeItem = useCallback((productID) => {
    Alert.alert('Remove from saved', 'Remove this product from your wishlist?', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeFromWishlist(productID)) },
    ]);
  }, [dispatch]);
  const clearAll = useCallback(() => {
    Alert.alert('Clear wishlist', 'Remove every saved product?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => dispatch(clearWishlist()) },
    ]);
  }, [dispatch]);
  const share = useCallback(async () => {
    try {
      await Share.share({ title: 'My Wishlist', message: 'Check out my wishlist products!' });
    } catch {
      Alert.alert('Could not share', 'Please try again later.');
    }
  }, []);

  const renderItem = useCallback(({ item, index }) => (
    <CatalogProductCard product={item} index={index} width={cardWidth}
      onPress={(id) => { rememberPosition(); navigation.navigate('ProductDetails', { productId: id }); }}
      onWishlistPress={(product) => removeItem(product.productID)} />
  ), [cardWidth, navigation, removeItem, rememberPosition]);

  return (
    <View style={styles.screen}>
      <View style={styles.heading}>
        <View style={styles.headingRow}><Text style={styles.title}>Saved items<Text style={styles.titleDot}>.</Text></Text>
          {wishlist.length > 0 && <View style={styles.actions}>
            <Pressable style={styles.action} onPress={share} accessibilityLabel="Share wishlist"><Feather name="share-2" size={18} color={franko.primary} /></Pressable>
            <Pressable style={styles.action} onPress={clearAll} accessibilityLabel="Clear wishlist"><Feather name="trash-2" size={18} color={franko.red} /></Pressable>
          </View>}
        </View>
        <Text style={styles.subtitle}>{wishlist.length ? `${wishlist.length} saved product${wishlist.length === 1 ? '' : 's'}` : 'No saved products'}</Text>
      </View>
      {wishlist.length ? <FlatList ref={listRef} onScroll={onScroll} onContentSizeChange={onContentSizeChange} scrollEventThrottle={100} style={styles.listFrame} data={wishlist} keyExtractor={(item, index) => String(item.productID || index)} numColumns={columns} key={`columns-${columns}`} renderItem={renderItem} columnWrapperStyle={styles.row} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} initialNumToRender={4} maxToRenderPerBatch={4} windowSize={5} /> :
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Feather name="heart" size={40} color={franko.primary} /></View>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyText}>Tap the heart on a product to save it.</Text>
          <Pressable onPress={() => navigation.navigate('Home')} style={styles.browse} accessibilityRole="button"><Text style={styles.browseText}>Browse products</Text><Feather name="arrow-up-right" size={16} color="#FFFFFF" /></Pressable>
        </View>}
    </View>
  );
}

const styles = createWebSafeStyles({
  screen: { flex: 1, backgroundColor: franko.canvas },
  heading: { backgroundColor: franko.surface, paddingHorizontal: 22, paddingVertical: 19, borderBottomWidth: 1, borderBottomColor: franko.border },
  kicker: { fontSize: 9, fontWeight: '800', color: franko.primary, letterSpacing: 1.5 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  title: { fontSize: 28, fontWeight: '900', color: franko.ink, letterSpacing: -1 },
  titleDot: { color: franko.red },
  actions: { flexDirection: 'row', gap: 8 },
  action: { width: 36, height: 36, borderRadius: 12, backgroundColor: franko.soft, alignItems: 'center', justifyContent: 'center' },
  subtitle: { color: franko.muted, fontSize: 12, marginTop: 4 },
  listFrame: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  list: { paddingHorizontal: 12, paddingBottom: 30 },
  row: { justifyContent: 'space-between' },
  card: { ...frankoCard, padding: 8, marginBottom: 12, minHeight: 246, borderColor: '#DCE8DF', borderRadius: 12 ,
    borderColor: '#D5E6DB',
    shadowColor: '#173D29',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  imageBox: { height: 145, borderRadius: 8, backgroundColor: '#F4FAF6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' ,
    backgroundColor: '#F2F9F4',
  },
  image: { width: '100%', height: '100%' },
  heart: { position: 'absolute', right: 7, bottom: 7, backgroundColor: '#FFFFFF', width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sale: { position: 'absolute', top: 7, left: 7, backgroundColor: franko.red, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 },
  saleText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  productName: { color: franko.ink, fontSize: 12, fontWeight: '700', lineHeight: 17, minHeight: 34, marginTop: 9 },
  price: { color: franko.primary, fontSize: 15, fontWeight: '900', marginTop: 5 },
  oldPrice: { color: franko.muted, fontSize: 10, textDecorationLine: 'line-through', marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 35 },
  emptyIcon: { width: 95, height: 95, borderRadius: 30, backgroundColor: franko.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { color: franko.ink, fontSize: 22, fontWeight: '800' },
  emptyText: { color: franko.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 9, marginBottom: 24 },
  browse: { flexDirection: 'row', gap: 8, backgroundColor: franko.primary, paddingHorizontal: 19, height: 44, borderRadius: 13, alignItems: 'center' },
  browseText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
