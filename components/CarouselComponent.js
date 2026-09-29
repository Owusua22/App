import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import Swiper from "react-native-swiper";
import { useDispatch, useSelector } from "react-redux";
import { getBannerPageAdvertisment } from "../redux/slice/advertismentSlice";
import CachedImage from "./CachedImage";
import { preloadImageUrls } from "../utils/ImageCache";

const backendBaseURL = "https://testing.frankotrading.com";
const PLACEHOLDER = require("../assets/kumasi.jpg");
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

  useEffect(() => {
    let mounted = true;
    const uris = adsWithUri.map((ad) => ad.uri).filter(Boolean);

    if (!uris.length) {
      setPrefetched(true);
      return () => {
        mounted = false;
      };
    }

    setPrefetched(false);
    // Use the shared native image-cache utility, which deduplicates URLs and
    // limits prefetching to five ads with three concurrent requests.
    void preloadImageUrls(uris, {
      maxImages: MAX_PREFETCH_IMAGES,
      concurrency: PREFETCH_CONCURRENCY,
    }).finally(() => {
      if (mounted) setPrefetched(true);
    });

    return () => {
      mounted = false;
    };
  }, [adsWithUri]);

  const onImgError = useCallback((key) => {
    setFailed((previous) => ({ ...previous, [key]: true }));
  }, []);

  const showPlaceholder = loading || !prefetched || adsWithUri.length === 0;

  return (
    <View style={styles.container}>
      {showPlaceholder ? (
        <CachedImage
          source={PLACEHOLDER}
          style={styles.image}
          resizeMode="cover"
        />
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
                <CachedImage
                  source={shouldFallback ? PLACEHOLDER : { uri }}
                  style={styles.image}
                  resizeMode="cover"
                  onError={() => onImgError(key)}
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
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    height: 160,
  },
  slide: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 160,
  },
  dot: {
    backgroundColor: "#ccc",
    width: 8,
    height: 8,
    borderRadius: 4,
    margin: 3,
    marginTop: 105,
  },
  activeDot: {
    backgroundColor: "#10B981",
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 105,
  },
});

export default CarouselComponent;
