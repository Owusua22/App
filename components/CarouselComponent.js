import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Text from './AppText';
import Swiper from 'react-native-swiper';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { getBannerPageAdvertisment } from '../redux/slice/advertismentSlice';
import CachedImage from './CachedImage';
import { preloadImage, versionMediaUri } from '../utils/ImageCache';
import { useCatalogRevalidation } from '../hooks/useCatalogRevalidation';

const AD_BASE = 'https://testing.frankotrading.com/Media/Ads';
const PROMO = require('../assets/franko-promo.jpg');
const FRANKO_LOGO = require('../assets/frankoIcon.png');
const EMPTY_ADS = [];

function buildAdUri(ad) {
  if (!ad?.fileName) return null;
  const justName = String(ad.fileName).split(/[\\/]/).pop();
  if (!justName) return null;
  const revision = ad.imageVersion || ad.imageModifiedDate || ad.dateModified || ad.updatedAt;
  try { return versionMediaUri(`${AD_BASE}/${encodeURIComponent(decodeURIComponent(justName))}`, revision); }
  catch { return versionMediaUri(`${AD_BASE}/${encodeURIComponent(justName)}`, revision); }
}

function CampaignFallback({ onShop, compact }) {
  return (
    <View style={styles.fallback}>
      <Image source={PROMO} style={styles.fallbackImage} resizeMode="cover" />
      <View style={[styles.fallbackCopy, compact && styles.compactCopy]}>
        <Image source={FRANKO_LOGO} style={[styles.fallbackLogo, compact && styles.compactLogo]} resizeMode="contain" accessibilityLabel="Franko logo" />
        <Text style={[styles.fallbackTitle, compact && styles.compactTitle]}>Phones, laptops{'\n'}& appliances.</Text>
        <Text style={styles.fallbackCaption} numberOfLines={1}>Shop Franko categories</Text>
        <Pressable style={[styles.cta, compact && styles.compactCta]} onPress={onShop} accessibilityRole="button" accessibilityLabel="Shop Franko categories">
          <Text style={styles.ctaText}>BROWSE</Text><Feather name="arrow-right" size={12} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

export default function CarouselComponent() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [readyUris, setReadyUris] = useState([]);
  const ads = useSelector((state) => state.advertisment?.advertisments || EMPTY_ADS);
  const adUris = useMemo(() => [...new Set(ads.map(buildAdUri).filter(Boolean))], [ads]);
  const adKey = adUris.join('|');

  // The bundled campaign is the ONLY placeholder. Prefetch ads before adding
  // them to Swiper: an unloaded slide must never bring a green transition frame.
  useCatalogRevalidation('ads:banner', () => getBannerPageAdvertisment());
  useEffect(() => {
    let cancelled = false;
    const warmAds = async () => {
      for (const uri of adUris.slice(0, 8)) {
        const loaded = await preloadImage(uri, { priority: 'high' });
        if (cancelled) return;
        if (loaded) setReadyUris((previous) => previous.includes(uri) ? previous : [...previous, uri]);
      }
    };
    void warmAds();
    return () => { cancelled = true; };
  }, [adKey]);

  const shop = useCallback(() => navigation.navigate('Category'), [navigation]);
  const onAdError = useCallback((uri) => setReadyUris((previous) => previous.filter((item) => item !== uri)), []);
  const visibleAds = useMemo(() => adUris.filter((uri) => readyUris.includes(uri)), [adUris, readyUris]);
  const frameWidth = Math.min(Math.max(0, width - 8), 920);
  const height = Math.min(330, Math.max(145, Math.round(frameWidth * 0.49)));
  const compact = width < 360;

  return (
    <View style={styles.outer}>
      <View style={[styles.frame, { height, maxWidth: 920 }]}>
        {visibleAds.length ? (
          <Swiper key={visibleAds.join('|')} autoplay={visibleAds.length > 1} autoplayTimeout={5} loop={visibleAds.length > 1} showsPagination={visibleAds.length > 1} dotStyle={styles.dot} activeDotStyle={styles.activeDot} paginationStyle={styles.pagination}>
            {visibleAds.map((uri) => (
              <View style={styles.slide} key={uri}>
                <CachedImage source={{ uri }} placeholder={null} style={styles.adImage} contentFit="cover" cachePolicy="memory-disk" priority="high" recyclingKey={uri} onError={() => onAdError(uri)} accessibilityLabel="Franko promotion" />
              </View>
            ))}
          </Swiper>
        ) : <CampaignFallback onShop={shop} compact={compact} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: 10, backgroundColor: '#FFFFFF', alignItems: 'center' },
  frame: { width: '100%', borderRadius: 13, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  slide: { flex: 1, backgroundColor: '#FFFFFF' },
  fallback: { flex: 1, overflow: 'hidden', backgroundColor: '#84e8b9' },
  fallbackImage: { width: '100%', height: '100%' },
  fallbackCopy: { position: 'absolute', top: 20, left: 19, width: '53%' },
  compactCopy: { top: 12, left: 13, width: '56%' },
  fallbackLogo: { width: 91, height: 40, marginBottom: 2, alignSelf: 'flex-start' },
  compactLogo: { width: 74, height: 32, marginBottom: 1 },
  fallbackTitle: { color: '#086942', fontSize: 22, lineHeight: 25, fontWeight: '900', letterSpacing: -1 },
  compactTitle: { fontSize: 18, lineHeight: 21 },
  fallbackCaption: { fontSize: 10, color: '#086942', fontWeight: '600', marginTop: 7 },
  cta: { marginTop: 14, backgroundColor: '#B21F36', flexDirection: 'row', gap: 8, alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 13, height: 31, borderRadius: 5 },
  compactCta: { marginTop: 8, height: 27 },
  ctaText: { color: '#FFFFFF', fontWeight: '900', fontSize: 9, letterSpacing: 0.5 },
  adImage: { width: '100%', height: '100%' },
  pagination: { bottom: 6 },
  dot: { backgroundColor: '#FFFFFFBB', width: 6, height: 6, borderRadius: 3, margin: 3 },
  activeDot: { backgroundColor: '#B21F36', width: 16, height: 6, borderRadius: 3, margin: 3 },
});