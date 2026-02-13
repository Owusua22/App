import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import Swiper from "react-native-swiper";
import { useDispatch, useSelector } from "react-redux";
import { Image } from "expo-image";
import { getBannerPageAdvertisment } from "../redux/slice/advertismentSlice";

const backendBaseURL = "https://ct002.frankotrading.com:444";
const PLACEHOLDER = require("../assets/kumasi.jpg");

function buildAdUri(fileName) {
  if (!fileName) return null;
  const justName = String(fileName).split(/[/\\]/).pop();
  if (!justName) return null;
  const encodedName = encodeURIComponent(justName);
  return `${backendBaseURL.replace(/\/$/, "")}/Media/Ads/${encodedName}`;
}

const CarouselComponent = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState({});
  const [prefetched, setPrefetched] = useState(false);

  const { advertisments = [] } = useSelector((state) => state.advertisment);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await dispatch(getBannerPageAdvertisment());
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  const adsWithUri = useMemo(() => {
    return (advertisments || []).map((ad, idx) => {
      const uri = buildAdUri(ad?.fileName);
      const key = ad?.id ?? ad?.fileName ?? String(idx);
      return { uri, key };
    });
  }, [advertisments]);

  // Preload first few images into cache
  useEffect(() => {
    const uris = adsWithUri.map((x) => x.uri).filter(Boolean);
    if (!uris.length) return;

    (async () => {
      try {
        await Image.prefetch(uris.slice(0, 5));
      } finally {
        setPrefetched(true);
      }
    })();
  }, [adsWithUri]);

  const onImgError = useCallback((key, uri, e) => {
    console.log("AD IMAGE FAILED:", { key, uri, error: e?.nativeEvent });
    setFailed((prev) => ({ ...prev, [key]: true }));
  }, []);

  const showPlaceholder = loading || !prefetched || adsWithUri.length === 0;

  return (
    <View style={styles.container}>
      {showPlaceholder ? (
        <Image source={PLACEHOLDER} style={styles.image} contentFit="cover" />
      ) : (
        <Swiper
          autoplay={adsWithUri.length > 1}
          autoplayTimeout={5}
          loop={adsWithUri.length > 1}
          showsPagination
          dotStyle={styles.dot}
          activeDotStyle={styles.activeDot}
        >
          {adsWithUri.map(({ key, uri }) => {
            const shouldFallback = !uri || failed[key];

            return (
              <View key={String(key)} style={styles.slide}>
                <Image
                  source={shouldFallback ? PLACEHOLDER : { uri }}
                  style={styles.image}
                  contentFit="cover"
                  cachePolicy="disk"     // important for speed after first load
                  transition={150}       // smooth
                  onError={(e) => onImgError(key, uri, e)}
                />
              </View>
            );
          })}
        </Swiper>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%", alignItems: "center", justifyContent: "center", height: 160 },
  slide: { width: "100%", justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: 160 },
  dot: { backgroundColor: "#ccc", width: 8, height: 8, borderRadius: 4, margin: 3, marginTop: 105 },
  activeDot: { backgroundColor: "#10B981", width: 10, height: 10, borderRadius: 5, marginTop: 105 },
});

export default CarouselComponent;