import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Text from './AppText';
import CachedImage from './CachedImage';
import { addToCart } from '../redux/slice/cartSlice';
import { addToWishlist, removeFromWishlist } from '../redux/wishlistSlice';
import { getProductImageUri } from '../utils/ImageCache';
import { franko } from '../theme/franko';

// The same geometry is used by all browse grids and horizontal home shelves.
export const CATALOG_CARD_HEIGHT = 280;
export const CATALOG_CARD_IMAGE_HEIGHT = 132;
export const getCatalogLayout = (width) => {
  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const cardWidth = Math.floor((Math.min(width, 1100) - 24 - (columns - 1) * 12) / columns);
  return { columns, cardWidth: Math.max(100, cardWidth) };
};

const money = (amount) => `GH₵ ${(Number(amount) || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CatalogProductCard = memo(({
  product,
  index = 0,
  width,
  horizontal = false,
  onPress,
  onAddToCart,
  onWishlistPress,
  addingToCart = false,
  showWishlist = true,
  titleNode,
}) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [addingInternally, setAddingInternally] = useState(false);
  const [showImageLoader, setShowImageLoader] = useState(false);
  const imageLoaderTimer = useRef(null);
  const wished = useSelector((state) => state.wishlist?.items?.some((item) => String(item.productID) === String(product.productID)) || false);
  const imageUri = getProductImageUri(product);
  const onImageLoadStart = useCallback(() => {
    clearTimeout(imageLoaderTimer.current);
    // Avoid flashing a spinner when the database image is already cached.
    imageLoaderTimer.current = setTimeout(() => setShowImageLoader(true), 160);
  }, []);
  const onImageLoadEnd = useCallback(() => {
    clearTimeout(imageLoaderTimer.current);
    setShowImageLoader(false);
  }, []);
  useEffect(() => {
    setShowImageLoader(false);
    return () => clearTimeout(imageLoaderTimer.current);
  }, [imageUri]);
  const price = Number(product.price) || 0;
  const oldPrice = Number(product.oldPrice) || 0;
  const discount = oldPrice > price && price > 0 ? Math.round((oldPrice - price) / oldPrice * 100) : 0;
  const busy = addingInternally || addingToCart;

  const openProduct = useCallback(() => {
    if (onPress) onPress(product.productID);
    else navigation.navigate('ProductDetails', { productId: product.productID });
  }, [navigation, onPress, product.productID]);

  const addProduct = useCallback(() => {
    if (busy) return;
    if (onAddToCart) { onAddToCart(product); return; }
    setAddingInternally(true);
    dispatch(addToCart({ productId: product.productID, price: product.price, quantity: 1 }))
      .unwrap()
      .then(() => Alert.alert('Added to cart', `${product.productName} added to your cart.`))
      .catch((error) => Alert.alert('Could not add to cart', String(error?.message || error || 'Please try again.')))
      .finally(() => setAddingInternally(false));
  }, [busy, dispatch, onAddToCart, product]);

  const toggleWishlist = useCallback((event) => {
    event?.stopPropagation?.();
    if (onWishlistPress) { onWishlistPress(product, event); return; }
    dispatch(wished ? removeFromWishlist(product.productID) : addToWishlist(product));
  }, [dispatch, onWishlistPress, product, wished]);

  return (
    <View style={[styles.card, horizontal && styles.horizontalCard, { width }]}>
      <Pressable style={styles.openArea} onPress={openProduct} accessibilityRole="button" accessibilityLabel={`View ${product.productName}`}>
        <View style={styles.imageBox}>
          {imageUri ? (
            <CachedImage source={{ uri: imageUri }} style={styles.image} contentFit="contain" recyclingKey={String(product.productID)} priority={index < 4 ? 'high' : 'normal'} transition={100}
              onLoadStart={onImageLoadStart} onLoadEnd={onImageLoadEnd} onError={onImageLoadEnd} />
          ) : <Feather name="image" size={30} color={franko.muted} />}
          {showImageLoader && <View pointerEvents="none" style={styles.imageLoader} accessibilityLabel="Loading product image"><ActivityIndicator size="small" color={franko.primary} /></View>}
          {discount > 0 && <View style={styles.discount}><Text style={styles.discountText}>-{discount}%</Text></View>}
          {showWishlist && <Pressable onPress={toggleWishlist} style={styles.heart} accessibilityRole="button" accessibilityLabel={wished ? 'Remove from wishlist' : 'Add to wishlist'}>
            <Feather name="heart" size={17} color={wished ? franko.red : franko.ink} fill={wished ? franko.red : 'none'} />
          </Pressable>}
        </View>
        <View style={styles.info}>
          {titleNode ? <View style={styles.name}>{titleNode}</View> : <Text style={styles.name} numberOfLines={2}>{product.productName}</Text>}
          <View style={styles.priceBlock}>
            <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{money(price)}</Text>
            {oldPrice > price && <Text style={styles.oldPrice} numberOfLines={1}>{money(oldPrice)}</Text>}
          </View>
        </View>
      </Pressable>
      <View style={styles.actionRow}>
        <Pressable onPress={addProduct} disabled={busy} style={[styles.cart, busy && styles.cartDisabled]} accessibilityRole="button" accessibilityLabel={`Add ${product.productName} to cart`}>
          {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="shopping-cart" size={17} color="#FFFFFF" />}
        </Pressable>
      </View>
    </View>
  );
});
CatalogProductCard.displayName = 'CatalogProductCard';
export default CatalogProductCard;

const styles = StyleSheet.create({
  card: { height: CATALOG_CARD_HEIGHT, backgroundColor: franko.surface, borderWidth: 1, borderColor: franko.border, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  horizontalCard: { marginLeft: 10, marginRight: 8 },
  openArea: { flex: 1, minHeight: 0 },
  imageBox: { height: CATALOG_CARD_IMAGE_HEIGHT, margin: 6, marginBottom: 0, backgroundColor: franko.canvas, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  imageLoader: { position: 'absolute', bottom: 7, left: 7, width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFFE8' },
  discount: { position: 'absolute', left: 7, top: 7, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, backgroundColor: franko.red },
  discountText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  heart: { position: 'absolute', top: 6, right: 6, width: 29, height: 29, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 3, justifyContent: 'space-between' },
  name: { color: franko.ink, fontSize: 12, lineHeight: 17, fontWeight: '600', height: 34, overflow: 'hidden' },
  priceBlock: { minHeight: 34, justifyContent: 'flex-end' },
  price: { color: franko.primary, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  oldPrice: { color: franko.muted, fontSize: 10, textDecorationLine: 'line-through' },
  actionRow: { height: 43, paddingHorizontal: 9, paddingBottom: 7, alignItems: 'flex-end', justifyContent: 'flex-end' },
  cart: { width: 35, height: 35, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: franko.primary },
  cartDisabled: { opacity: 0.55 },
});
