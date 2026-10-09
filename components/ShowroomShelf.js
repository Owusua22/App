import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { Feather } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { fetchProductByShowroomAndRecord } from '../redux/slice/productSlice';
import { addToCart } from '../redux/slice/cartSlice';
import { ProductCard, LoadingCard } from './ProductCard';
import { preloadProductImages } from '../utils/ImageCache';
import { useCatalogRevalidation } from '../hooks/useCatalogRevalidation';
import { refreshCatalog } from '../utils/catalogRefresh';
import CatalogFetchNotice from './CatalogFetchNotice';

const EMPTY = [];
const ITEM_WIDTH = 178; // ProductCard width (160) + horizontal margins (18)
const getItemLayout = (_, index) => ({ length: ITEM_WIDTH, offset: ITEM_WIDTH * index, index });
const keyExtractor = (item) => String(item.productID);

function DealCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const end = new Date(now);
  end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
  end.setHours(23, 59, 59, 999);
  const remaining = Math.max(0, end.getTime() - now);
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor(remaining / 60000) % 60;
  const seconds = Math.floor(remaining / 1000) % 60;
  return <Text style={styles.countdown}>ENDS IN  {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</Text>;
}

function ShowroomShelf({ showRoomCode, title, subtitle, badge, isDeal = false }) {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const productsByShowroom = useSelector((state) => state.products?.productsByShowroom);
  const cartId = useSelector((state) => state.cart?.cartId);
  const [addingToCart, setAddingToCart] = useState({});
  const [requestFinished, setRequestFinished] = useState(false);
  const [requestError, setRequestError] = useState(false);
  const fetching = useCatalogRevalidation(`showroom-shelf:${showRoomCode}`, () => fetchProductByShowroomAndRecord({ showRoomCode, recordNumber: 10 }), {
    enabled: Boolean(showRoomCode), onResult: (result) => {
      setRequestFinished(true);
      setRequestError(Boolean(result?.error));
    },
  });
  const retry = useCallback(() => {
    setRequestError(false);
    setRequestFinished(false);
    void refreshCatalog(dispatch, `showroom-shelf:${showRoomCode}`,
      () => fetchProductByShowroomAndRecord({ showRoomCode, recordNumber: 10 }), { force: true })
      .then((result) => setRequestError(Boolean(result?.error)))
      .catch(() => setRequestError(true))
      .finally(() => setRequestFinished(true));
  }, [dispatch, showRoomCode]);
  const products = productsByShowroom?.[showRoomCode] || EMPTY;
  const displayProducts = useMemo(() => products.slice(0, 10), [products]);

  useEffect(() => {
    if (!displayProducts.length) return;
    // Visible cards load themselves; only warm the next cards on the same cache.
    void preloadProductImages(displayProducts.slice(3, 7), { maxImages: 4, concurrency: 2 });
  }, [displayProducts]);

  const viewAll = useCallback(() => navigation.navigate('showroom', { showRoomID: showRoomCode }), [navigation, showRoomCode]);
  const openProduct = useCallback((productId) => navigation.navigate('ProductDetails', { productId }), [navigation]);
  const handleAddToCart = useCallback((product) => {
    const id = product.productID;
    if (addingToCart[id]) return;
    setAddingToCart((prev) => ({ ...prev, [id]: true }));
    dispatch(addToCart({ cartId, productId: id, price: product.price, quantity: 1 }))
      .unwrap()
      .then(() => Alert.alert('Added to cart', `${product.productName} is in your cart.`))
      .catch((error) => Alert.alert('Could not add to cart', String(error?.message || error || 'Please try again.')))
      .finally(() => setAddingToCart((prev) => ({ ...prev, [id]: false })));
  }, [addingToCart, cartId, dispatch]);

  const renderProduct = useCallback(({ item, index }) => (
    <ProductCard product={item} index={index} onPress={openProduct} onAddToCart={handleAddToCart} isAddingToCart={Boolean(addingToCart[item.productID])} showHotDeal={isDeal} />
  ), [openProduct, handleAddToCart, addingToCart, isDeal]);

  return (
    <View style={styles.shelf}>
      <View style={styles.header}>
        <View style={styles.headingLine}>
          <View style={styles.headingText}>
            <View style={styles.titleRow}><Text style={styles.title}>{title}</Text>{badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}</View>
          </View>
          <Pressable onPress={viewAll} style={styles.seeAll} accessibilityRole="button" accessibilityLabel={`See all ${title}`}>
            <Text style={styles.seeAllText}>VIEW ALL</Text><Feather name="arrow-right" size={14} color="#086942" />
          </Pressable>
        </View>
        {isDeal && <View style={styles.countdownRow}><Feather name="clock" size={12} color="#086942" /><DealCountdown /></View>}
      </View>
      <CatalogFetchNotice loading={fetching} hasCachedData={products.length > 0} label="products" />
      {products.length ? (
        <FlatList data={displayProducts} keyExtractor={keyExtractor} renderItem={renderProduct} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.products} getItemLayout={getItemLayout} initialNumToRender={3} maxToRenderPerBatch={4} windowSize={5} ListFooterComponent={products.length > 10 ? <Pressable onPress={viewAll} style={styles.more}><Feather name="arrow-right" size={22} color="#086942" /><Text style={styles.moreText}>View all products</Text></Pressable> : null} />
      ) : requestFinished ? (
        <Pressable onPress={requestError ? retry : viewAll} style={styles.empty} accessibilityRole="button"><Text style={styles.emptyText}>{requestError ? 'Could not load products. Tap to retry.' : 'No products in this showroom. Browse categories  →'}</Text></Pressable>
      ) : (
        <View style={styles.loadingRow}>{[0, 1, 2].map((index) => <LoadingCard key={index} />)}</View>
      )}
    </View>
  );
}

export default React.memo(ShowroomShelf);

const styles = StyleSheet.create({
  shelf: { backgroundColor: '#FFFFFF', marginTop: 8, marginBottom: 5 },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  headingLine: { flexDirection: 'row', alignItems: 'center' },
  headingText: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: 18, fontWeight: '900', color: '#162C22', letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: '#84928A', marginTop: 2 },
  badge: { backgroundColor: '#84e8b9', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 3 },
  badgeText: { color: '#086942', fontSize: 8, fontWeight: '900' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
  seeAllText: { color: '#086942', fontSize: 10, fontWeight: '900' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9, alignSelf: 'flex-start', backgroundColor: '#E4F8EB', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 5 },
  countdown: { color: '#086942', fontSize: 9, letterSpacing: 0.4, fontWeight: '900' },
  products: { paddingTop: 7, paddingBottom: 4, paddingRight: 12 },
  loadingRow: { flexDirection: 'row', paddingTop: 12, overflow: 'hidden' },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#64766A', fontSize: 12, fontWeight: '600' },
  more: { width: 140, height: 220, backgroundColor: '#E4F8EB', borderRadius: 10, marginHorizontal: 8, alignItems: 'center', justifyContent: 'center', gap: 10 },
  moreText: { color: '#086942', fontSize: 12, fontWeight: '800' },
});
