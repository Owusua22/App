import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { debounce } from "lodash";
import { fetchProducts } from "../redux/slice/productSlice";

const backendBaseURL = "https://fte002n1.salesmate.app";
const RECENT_SEARCH_LIMIT = 8;

const TRENDING = [
  { id: "phones", label: "Phones", route: "Phones", icon: "smartphone" },
  { id: "laptops", label: "Laptops", route: "Computers", icon: "laptop-mac" },
  { id: "ac", label: "Air Conditioners", route: "AirCondition", icon: "ac-unit" },
  { id: "speakers", label: "Speakers", route: "Speakers", icon: "speaker" },
  { id: "accessories", label: "Accessories", route: "Accessories", icon: "headphones" },
  { id: "tv", label: "Television", route: "Television", icon: "tv" },
  { id: "fridge", label: "Fridges", route: "Fridge", icon: "kitchen" },
];

function formatPrice(price) {
  return `₵${price?.toLocaleString?.()|| "N/A"}.00`;
}

function getImageURL(productImage) {
  if (!productImage) return null;
  const imagePath = String(productImage).split("\\").pop();
  return `${backendBaseURL}/Media/Products_Images/${imagePath}`;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text = "", query = "", style, highlightStyle }) {
  const q = query.trim();
  if (!q) return <Text style={style}>{text}</Text>;

  const regex = new RegExp(`(${escapeRegex(q)})`, "ig");
  const parts = String(text).split(regex);
  const qLower = q.toLowerCase();

  return (
    <Text style={style}>
      {parts.map((part, idx) => {
        const isMatch = part.toLowerCase() === qLower;
        return (
          <Text key={`${part}-${idx}`} style={isMatch ? highlightStyle : null}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

export default function SearchScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Be defensive about redux shape
  const products = useSelector((state) => state?.products?.products ?? []);
  const loading = useSelector((state) => state?.products?.loading ?? false);

  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);

  const debounceRef = useRef(null);

  useEffect(() => {
    // init debounce once
    debounceRef.current = debounce((value) => setSearchQuery(value), 250);
    return () => debounceRef.current?.cancel?.();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("recentSearches");
        if (stored) setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading recent searches:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!products || products.length === 0) dispatch(fetchProducts());
  }, [dispatch]); // fetch once

  const hasQuery = searchQuery.trim().length > 0;

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return (products || []).filter((p) =>
      String(p?.productName || "").toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const persistRecentSearches = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem("recentSearches", JSON.stringify(next));
    } catch (e) {
      console.error("Error saving recent searches:", e);
    }
  }, []);

  const saveSearch = useCallback(
    async (term) => {
      const t = term.trim();
      if (!t) return;

      const next = [t, ...recentSearches.filter((x) => x !== t)].slice(
        0,
        RECENT_SEARCH_LIMIT
      );
      setRecentSearches(next);
      await persistRecentSearches(next);
    },
    [recentSearches, persistRecentSearches]
  );

  const handleSearchChange = (text) => {
    setSearchText(text);
    debounceRef.current?.(text);
  };

  const handleSearchSubmit = async () => {
    const term = searchText.trim();
    if (!term) return;
    await saveSearch(term);
    setSearchQuery(term); // commit immediately
  };

  const handleClearInput = () => {
    setSearchText("");
    setSearchQuery("");
  };

  const handleClearAllRecent = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem("recentSearches");
    } catch (e) {
      console.error("Error clearing searches:", e);
    }
  };

  const handleRecentTap = async (term) => {
    setSearchText(term);
    setSearchQuery(term);
    await saveSearch(term);
  };

  const handleTrendingTap = (item) => {
    navigation.navigate(item.route);
  };

  const handleProductClick = async (productID) => {
    try {
      const product = (products || []).find((p) => p?.productID === productID);
      if (product) {
        const recentlyViewedRaw = await AsyncStorage.getItem("recentlyViewed");
        let viewed = recentlyViewedRaw ? JSON.parse(recentlyViewedRaw) : [];
        viewed = viewed.filter((p) => p?.productID !== productID);
        viewed.unshift(product);
        viewed = viewed.slice(0, 10);
        await AsyncStorage.setItem("recentlyViewed", JSON.stringify(viewed));
      }
    } catch (e) {
      console.error("Error storing recently viewed:", e);
    } finally {
      navigation.navigate("ProductDetails", { productId: productID });
    }
  };

  // ---------- UI pieces ----------
  const TrendingPill = ({ item }) => (
    <TouchableOpacity
      style={styles.trendingPill}
      activeOpacity={0.85}
      onPress={() => handleTrendingTap(item)}
    >
      <Icon name={item.icon} size={16} color="#059669" />
      <Text style={styles.trendingPillText} numberOfLines={1}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const RecentChip = ({ term }) => (
    <TouchableOpacity
      style={styles.recentChip}
      activeOpacity={0.85}
      onPress={() => handleRecentTap(term)}
    >
      <Icon name="history" size={16} color="#6B7280" />
      <Text style={styles.recentChipText} numberOfLines={1}>
        {term}
      </Text>
    </TouchableOpacity>
  );

  const EmptyState = ({ icon, title, subtitle }) => (
    <View style={styles.emptyState}>
      <Icon name={icon} size={46} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );

  const renderResultItem = ({ item }) => {
    const imageURL = getImageURL(item?.productImage);

    return (
      <TouchableOpacity
        style={styles.resultRow}
        activeOpacity={0.9}
        onPress={() => handleProductClick(item?.productID)}
      >
        <View style={styles.resultLeft}>
          {imageURL ? (
            <Image source={{ uri: imageURL }} style={styles.resultImage} />
          ) : (
            <View style={styles.resultImageFallback}>
              <Icon name="image-not-supported" size={18} color="#9CA3AF" />
            </View>
          )}

          <View style={styles.resultMeta}>
            <HighlightedText
              text={item?.productName || ""}
              query={searchQuery}
              style={styles.resultName}
              highlightStyle={styles.resultNameHighlight}
            />
            <Text style={styles.resultPrice}>{formatPrice(item?.price)}</Text>
          </View>
        </View>

        <Icon name="chevron-right" size={22} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  const renderDiscover = () => (
    <ScrollView
      style={styles.discover}
      contentContainerStyle={styles.discoverContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent searches</Text>
              <Text style={styles.sectionSubTitle}>Pick up where you left off</Text>
            </View>

            <TouchableOpacity
              onPress={handleClearAllRecent}
              activeOpacity={0.8}
              style={styles.clearRecentBtn}
            >
              <Icon name="delete-outline" size={18} color="#6B7280" />
              <Text style={styles.clearRecentText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.wrapRow}>
            {recentSearches.map((term) => (
              <RecentChip key={term} term={term} />
            ))}
          </View>
        </View>
      )}

      {/* Popular right now - compact pills (NOT grid) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Popular right now</Text>
            <Text style={styles.sectionSubTitle}>Top categories</Text>
          </View>
        </View>

        <View style={styles.wrapRow}>
          {TRENDING.map((item) => (
            <TrendingPill key={item.id} item={item} />
          ))}
        </View>
      </View>

    
    </ScrollView>
  );

  const renderResults = () => {
    if (loading && hasQuery) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Searching products…</Text>
        </View>
      );
    }

    if (!hasQuery) {
      return (
        <EmptyState
          icon="search"
          title="Search for products"
          subtitle="Find phones, laptops, home appliances and more."
        />
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <EmptyState
          icon="search-off"
          title="No results"
          subtitle={`We couldn’t find anything for “${searchText.trim()}”.`}
        />
      );
    }

    return (
      <View style={styles.results}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Results</Text>
          <Text style={styles.resultsCount}>
            {filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""}
          </Text>
        </View>

        <FlatList
          data={filteredProducts}
          renderItem={renderResultItem}
          keyExtractor={(item, idx) => String(item?.productID ?? idx)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsListContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.75}
        >
          <Icon name="arrow-back-ios" size={18} color="#111827" />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Search products, brands, categories"
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={handleSearchChange}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoFocus
          />

          {!!searchText && (
            <TouchableOpacity
              onPress={handleClearInput}
              style={styles.clearBtn}
              activeOpacity={0.8}
            >
              <Icon name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {hasQuery ? renderResults() : renderDiscover()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,23,42,0.06)",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 0,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  // Discover
  discover: { flex: 1 },
  discoverContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  section: { marginBottom: 18 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  sectionSubTitle: { marginTop: 2, fontSize: 12, color: "#6B7280" },

  clearRecentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  clearRecentText: { fontSize: 12, fontWeight: "700", color: "#374151" },

  wrapRow: { flexDirection: "row", flexWrap: "wrap" },

  // Recent chips
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 10,
    marginBottom: 10,
  },
  recentChipText: { fontSize: 13, fontWeight: "600", color: "#111827", maxWidth: 220 },

  // Trending pills (Popular right now) — compact rounded buttons
  trendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginRight: 10,
    marginBottom: 10,
  },
  trendingPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#065F46",
    maxWidth: 220,
  },

  // Tip card
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 6,
  },
  tipText: { flex: 1, fontSize: 12.5, color: "#374151", lineHeight: 18 },

  // Results
  results: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultsTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  resultsCount: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  resultsListContent: {
    paddingBottom: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  separator: { height: 1, backgroundColor: "#F3F4F6" },

  resultRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  resultLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, paddingRight: 10 },
  resultImage: { width: 54, height: 54, borderRadius: 12, backgroundColor: "#F3F4F6" },
  resultImageFallback: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  resultMeta: { flex: 1 },
  resultName: { fontSize: 13.5, fontWeight: "700", color: "#111827" },
  resultNameHighlight: { color: "#10B981", fontWeight: "900" },
  resultPrice: { marginTop: 4, fontSize: 13, fontWeight: "800", color: "#10B981" },

  // Loading/Empty
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, fontSize: 13, color: "#6B7280" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  emptyTitle: { marginTop: 10, fontSize: 18, fontWeight: "800", color: "#111827" },
  emptySubtitle: { marginTop: 6, fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 18 },
});