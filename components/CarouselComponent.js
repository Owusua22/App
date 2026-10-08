import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, StyleSheet, Text } from "react-native";
import Swiper from "react-native-swiper";
import { useDispatch, useSelector } from "react-redux";
import { getBannerPageAdvertisment } from '../redux/slice/advertismentSlice';
import CachedImage from './CachedImage';
import { preloadImageUrls } from '../utils/ImageCache';

const backendBaseURL = "https://testing.frankotrading.com";
const MAX_PREFETCH_IMAGES = 5;
const PREFETCH_CONCURRENCY = 3;

function buildAdUri(fileName) {
  if (!fileName) return null;
  const justName = String(fileName).split(/[\\/]/).pop();
  if (!justName) return null;
  const encodedName = encodeURIComponent(justName);
  return `${backendBaseURL.replace(/\/$/, "")}/Media/Ads/${encodedName}`;
}

const CarouselComponent = () => {
  const dispatch = useDispatch();
  const [failed, setFailed] = useState({});

  const { advertisments = [] } = useSelector((state) => state.advertisment);

  useEffect(() => {
    dispatch(getBannerPageAdvertisment());
  }, [dispatch]);

  const adsWithUri = useMemo(() => {
    return (advertisments || []).map((ad, idx) => {
      const uri = buildAdUri(ad?.fileName);
      const key = ad?.id ?? ad?.fileName ?? String(idx);
      return { uri, key };
    });
  }, [advertisments]);

  useEffect(() => {
    const uris = adsWithUri.slice(1).map((ad) => ad.uri).filter(Boolean);
    // Never gate the visible banner on prefetch; warm only upcoming slides.
    void preloadImageUrls(uris, { maxImages: MAX_PREFETCH_IMAGES, concurrency: PREFETCH_CONCURRENCY });
  }, [adsWithUri]);

  const onImgError = useCallback((key) => {
    setFailed((previous) => ({ ...previous, [key]: true }));
  }, []);

  if (!adsWithUri.length) return null;

  return (
    <View style={styles.outer}>
      <Text style={styles.label}>WHAT'S NEW</Text>
      <Text style={styles.heading}>Featured at Franko</Text>
      <View style={styles.container}>
        <Swiper
          autoplay={adsWithUri.length > 1}
          autoplayTimeout={5}
          loop={adsWithUri.length > 1}
          showsPagination={adsWithUri.length > 1}
          dotStyle={styles.dot}
          activeDotStyle={styles.activeDot}
        >
          {adsWithUri.map(({ key, uri }) => (
            <View key={String(key)} style={styles.slide}>
              {uri && !failed[key] ? (
                <CachedImage source={{ uri }} style={styles.image} resizeMode="cover" transition={180} onError={() => onImgError(key)} />
              ) : <View style={styles.fallback}><Text style={styles.fallbackText}>Discover more at Franko</Text></View>}
            </View>
          ))}
        </Swiper>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: { marginHorizontal: 16, marginVertical: 13 },
  label: { color: '#0B8A58', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 },
  heading: { color: '#163A29', fontSize: 21, fontWeight: '800', marginBottom: 12 },
  container: { width: '100%', height: 170, borderRadius: 20, overflow: 'hidden', backgroundColor: '#EAF2EA' },
  slide: { flex: 1 },
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1, backgroundColor: '#0B6947', justifyContent: 'center', alignItems: 'center' },
  fallbackText: { color: 'white', fontSize: 18, fontWeight: '800' },
  dot: { backgroundColor: '#FFFFFF99', width: 6, height: 6, borderRadius: 3, margin: 3 },
  activeDot: { backgroundColor: '#D8FF85', width: 16, height: 6, borderRadius: 3, margin: 3 },
});

export default CarouselComponent;
