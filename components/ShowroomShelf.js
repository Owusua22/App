import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { fetchProductByShowroomAndRecord } from '../redux/slice/productSlice';
import { addToCart } from '../redux/slice/cartSlice';
import { ProductCard, LoadingCard } from './ProductCard';
import { preloadProductImages } from '../utils/ImageCache';

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

function ShowroomShelf({ showRoomCode, title, subtitle, icon, badge, isDeal = false }) {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const productsByShowroom = useSelector((state) => state.products?.productsByShowroom);
  const cartId = useSelector((state) => state.cart?.cartId);
  const [addingToCart, setAddingToCart] = useState({});
  const requestedRef = useRef(false);
  const [requestFinished, setRequestFinished] = useState(false);
  const products = productsByShowroom?.[showRoomCode] || EMPTY;
  const displayProducts = useMemo(() => products.slice(0, 10), [products]);

  useEffect(() => {
    if (!products.length && !requestedRef.current) {
      requestedRef.current = true;
      dispatch(fetchProductByShowroomAndRecord({ showRoomCode, recordNumber: 10 })).finally(() => setRequestFinished(true));
    }
  }, [dispatch, products.length, showRoomCode]);

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
      <View style={[styles.header, isDeal && styles.dealHeader]}>
        <View style={styles.headingLine}>
          <View style={[styles.iconBox, isDeal && styles.dealIcon]}><Feather name={icon} size={18} color={isDeal ? '#D8FF85' : '#086942'} /></View>
          <View style={styles.headingText}>
            <View style={styles.titleRow}><Text style={[styles.title, isDeal && styles.dealTitle]}>{title}</Text>{badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}</View>
            <Text style={[styles.subtitle, isDeal && styles.dealSubtitle]}>{subtitle}</Text>
          </View>
          <Pressable onPress={viewAll} style={[styles.seeAll, isDeal && styles.dealSeeAll]} accessibilityRole="button" accessibilityLabel={`See all ${title}`}>
            <Text style={[styles.seeAllText, isDeal && styles.dealSeeAllText]}>View all</Text><Feather name="arrow-up-right" size={15} color={isDeal ? '#FFFFFF' : '#086942'} />
          </Pressable>
        </View>
        {isDeal && <View style={styles.countdownRow}><Feather name="clock" size={13} color="#D8FF85" /><DealCountdown /></View>}
      </View>
      {products.length ? (
        <FlatList data={displayProducts} keyExtractor={keyExtractor} renderItem={renderProduct} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.products} getItemLayout={getItemLayout} initialNumToRender={3} maxToRenderPerBatch={4} windowSize={5} ListFooterComponent={products.length > 10 ? <Pressable onPress={viewAll} style={styles.more}><Feather name="arrow-right" size={22} color="#086942" /><Text style={styles.moreText}>More to explore</Text></Pressable> : null} />
      ) : requestFinished ? (
        <Pressable onPress={viewAll} style={styles.empty} accessibilityRole="button"><Text style={styles.emptyText}>Nothing here yet. Browse the showroom  →</Text></Pressable>
      ) : (
        <View style={styles.loadingRow}>{[0, 1, 2].map((index) => <LoadingCard key={index} />)}</View>
      )}
    </View>
  );
}

export default React.memo(ShowroomShelf);

const styles = StyleSheet.create({
  shelf: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 10, marginBottom: 5, borderRadius: 21, borderWidth: 1, borderColor: '#EDF1EA', overflow: 'hidden' },
  header: { paddingHorizontal: 16, paddingTop: 17, paddingBottom: 8 },
  dealHeader: { backgroundColor: '#0A6644', paddingBottom: 13 },
  headingLine: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#E7F5EA', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  dealIcon: { backgroundColor: '#FFFFFF20' },
  headingText: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '800', color: '#163A29', letterSpacing: -0.3 },
  dealTitle: { color: '#FFFFFF' },
  subtitle: { fontSize: 10, color: '#86958A', marginTop: 3 },
  dealSubtitle: { color: '#C9E8D6' },
  badge: { backgroundColor: '#B21F36', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { color: '#086942', fontSize: 11, fontWeight: '800' },
  dealSeeAllText: { color: '#FFFFFF' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 45, paddingTop: 10 },
  countdown: { color: '#D8FF85', fontSize: 10, letterSpacing: 1, fontWeight: '800' },
  products: { paddingTop: 12, paddingBottom: 2, paddingRight: 10 },
  loadingRow: { flexDirection: 'row', paddingTop: 12, overflow: 'hidden' },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#637769', fontSize: 12, fontWeight: '600' },
  more: { width: 140, height: 220, backgroundColor: '#EAF4EA', borderRadius: 15, marginHorizontal: 8, alignItems: 'center', justifyContent: 'center', gap: 10 },
  moreText: { color: '#086942', fontSize: 12, fontWeight: '800' },
});
