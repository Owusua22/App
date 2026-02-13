import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated,
  Alert,
  SafeAreaView,
  Platform,
  Pressable,
} from "react-native";

import { useDispatch, useSelector } from "react-redux";
import { useRoute, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/MaterialIcons";

import { fetchProductById, fetchProducts } from "../redux/slice/productSlice";
import { addToCart, getCartById, updateCartItem } from "../redux/slice/cartSlice";

import { OptimizedProductList } from "../components/ProductCard";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

/* ----------------- typography ----------------- */
const font = {
  regular: Platform.select({ ios: "AvenirNext-Regular", android: "sans-serif", default: "System" }),
  medium: Platform.select({ ios: "AvenirNext-Medium", android: "sans-serif-medium", default: "System" }),
  bold: Platform.select({ ios: "AvenirNext-DemiBold", android: "sans-serif-medium", default: "System" }),
  black: Platform.select({ ios: "AvenirNext-Bold", android: "sans-serif-black", default: "System" }),
};

/* ----------------- colors ----------------- */
const palette = {
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e5e7eb",

  primary: "#16a34a",
  primaryDeep: "#15803d",
  primarySoft: "#f0fdf4",
  primaryBorder: "#bbf7d0",

  text: "#0b0f19",
  textSoft: "#111827",
  gray: "#6b7280",
  muted: "#9ca3af",

  danger: "#dc2626",
  dangerSoft: "#fef2f2",
  dangerBorder: "#fecaca",
};

/* ----------------- helpers ----------------- */
const formatPrice = (price) => {
  const n = Number(price);
  if (!Number.isFinite(n)) return "0";
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const getValidImageUrl = (imagePath) => {
  if (!imagePath) return null;
  const file = imagePath.includes("\\")
    ? imagePath.split("\\").pop()
    : imagePath.includes("/")
      ? imagePath.split("/").pop()
      : imagePath;
  return `https://ct002.frankotrading.com:444/Media/Products_Images/${file}`;
};

const normalizeCategoryName = (name) =>
  String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const CATEGORY_ROUTE_MAP = {
  phones: "Phones",
  phone: "Phones",
  computers: "Computers",
  computer: "Computers",
  accessories: "Accessories",
  accessory: "Accessories",
  television: "Television",
  televisions: "Television",
  tv: "Television",
  speakers: "Speakers",
  speaker: "Speakers",
  "air condition": "AirCondition",
  "air conditioner": "AirCondition",
  "air-conditioning": "AirCondition",
  fridge: "Fridge",
  refrigerator: "Fridge",
  "fridge/freezer": "Fridge",
};

const getCategoryRouteName = (categoryName) => {
  const key = normalizeCategoryName(categoryName);
  return CATEGORY_ROUTE_MAP[key] || null;
};

const calcCartTotal = (items) => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, it) => acc + (Number(it?.price) || 0) * (Number(it?.quantity) || 0), 0);
};

/* ---------------- description parsing ---------------- */
const normalizeDescriptionToLines = (raw) => {
  let text = typeof raw === "string" ? raw : "";
  if (!text.trim()) return [];

  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "");

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
};

const getRawDescription = (p) =>
  p?.description ||
  p?.productDescription ||
  p?.details ||
  p?.shortDescription ||
  p?.longDescription ||
  p?.specification ||
  p?.productDetails ||
  "";

const splitDescription = (product) => {
  const raw = getRawDescription(product);
  const lines = normalizeDescriptionToLines(raw);

  const stripLeadingBullet = (l) => l.replace(/^([•*-])\s+/, "").trim();
  const isSectionHeader = (l) => /^[^:]{2,}:\s*$/.test(stripLeadingBullet(l));
  const isKeyValue = (l) => /^([^:]{1,}):\s*(.+)$/.test(stripLeadingBullet(l));

  const firstStructuredIdx = lines.findIndex((l) => isSectionHeader(l) || isKeyValue(l));

  const intro =
    firstStructuredIdx === -1 ? lines.join(" ") : lines.slice(0, firstStructuredIdx).join(" ");

  const structuredLines = firstStructuredIdx === -1 ? [] : lines.slice(firstStructuredIdx);

  const sections = [];
  let current = null;

  for (const rawLine of structuredLines) {
    const line = stripLeadingBullet(rawLine);

    if (isSectionHeader(line)) {
      const title = line.replace(/:\s*$/, "").trim();
      current = { title, items: [] };
      sections.push(current);
      continue;
    }

    const kv = line.match(/^([^:]{1,}):\s*(.+)$/);
    if (kv) {
      const label = kv[1].trim();
      const value = kv[2].trim();
      if (!current) {
        current = { title: "Details", items: [] };
        sections.push(current);
      }
      current.items.push({ label, value });
      continue;
    }

    if (!current) {
      current = { title: "Details", items: [] };
      sections.push(current);
    }
    current.items.push({ label: "", value: line });
  }

  return { intro: intro.trim(), sections };
};

/* ---------------- UI components ---------------- */
const InfoPill = ({ icon, label, tone = "green" }) => {
  const isRed = tone === "red";
  return (
    <View
      style={[
        styles.infoPill,
        isRed
          ? { backgroundColor: palette.dangerSoft, borderColor: palette.dangerBorder }
          : { backgroundColor: palette.primarySoft, borderColor: palette.primaryBorder },
      ]}
    >
      <Icon name={icon} size={16} color={isRed ? palette.danger : palette.primaryDeep} />
      <Text style={[styles.infoPillText, { color: isRed ? palette.danger : palette.primaryDeep }]}>
        {label}
      </Text>
    </View>
  );
};

const ProductSpecsList = ({ product }) => {
  const { intro, sections } = splitDescription(product);

  return (
    <View style={styles.specsCard}>
      <View style={styles.specsHeader}>
        <Text style={styles.specsHeaderText}>Product details</Text>
      </View>

      <View style={styles.specsBody}>
        {intro ? <Text style={styles.specsIntro}>{intro}</Text> : null}

        {sections.length > 0 ? (
          <View style={[styles.specsSections, intro ? { marginTop: 12 } : null]}>
            {sections.map((sec) => (
              <View key={sec.title} style={styles.specsSection}>
                <Text style={styles.specsSectionTitle}>{sec.title}</Text>
                {sec.items.map((it, idx) => (
                  <Text key={`${sec.title}-${idx}`} style={styles.specsItemText}>
                    {it.label ? (
                      <>
                        <Text style={styles.specsItemLabel}>
                          {it.label}
                          {": "}
                        </Text>
                        <Text>{it.value}</Text>
                      </>
                    ) : (
                      <Text>{it.value}</Text>
                    )}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const MoneyRow = ({ label, value, bold = false }) => (
  <View style={styles.moneyRow}>
    <Text style={[styles.moneyLabel, bold && styles.moneyLabelBold]}>{label}</Text>
    <Text style={[styles.moneyValue, bold && styles.moneyValueBold]}>{value}</Text>
  </View>
);

/* ---------------- skeleton ---------------- */
const ProductDetailSkeleton = () => (
  <SafeAreaView style={styles.safeArea}>
    <View style={styles.skeletonHeaderBar}>
      <View style={styles.skeletonBackBtn} />
      <View style={styles.skeletonHeaderTextBlock}>
        <View style={styles.skeletonLineShort} />
        <View style={[styles.skeletonLineTiny, { marginTop: 6 }]} />
      </View>
      <View style={styles.skeletonShareBtn} />
    </View>

    <ScrollView contentContainerStyle={styles.skeletonScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.skeletonImageCard}>
        <View style={styles.skeletonImageBox} />
        <View style={styles.skeletonSummaryBox}>
          <View style={styles.skeletonLineLg} />
          <View style={[styles.skeletonLineMd, { width: "60%", marginTop: 10 }]} />
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>
);

/* ---------------- related helpers ---------------- */
const RELATED_LIMIT = 10;
const RECENT_LIMIT = 12;

const getMostRecentSortKey = (p) => {
  const raw =
    p?.createdAt ||
    p?.created_at ||
    p?.dateCreated ||
    p?.date_created ||
    p?.createdOn ||
    p?.created_on ||
    p?.updatedAt ||
    p?.updated_at;

  const t = raw ? new Date(raw).getTime() : NaN;
  if (Number.isFinite(t)) return t;

  const id = Number(p?.productID);
  if (Number.isFinite(id)) return id;

  return 0;
};

/* =========================
   PRODUCT DETAILS SCREEN
========================= */
const ProductDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const { productId } = route.params;

  const { currentProduct, products, loading: productsLoading } = useSelector((state) => state.products);
  const { cartItems, cartId, loading: cartLoading } = useSelector((state) => state.cart);

  const scrollRef = useRef(null);

  const [networkStatus, setNetworkStatus] = useState(true);
  const [cartSyncError, setCartSyncError] = useState(null);

  const [mobileQty, setMobileQty] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addingRelatedToCart, setAddingRelatedToCart] = useState({});

  const [bottomBarHeight, setBottomBarHeight] = useState(0);

  // Basket sheet modal
  const [showBasketSheet, setShowBasketSheet] = useState(false);
  const [lastAddedSummary, setLastAddedSummary] = useState(null);
  const sheetAnim = useRef(new Animated.Value(140)).current;

  // Image modal
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  /* ----- fetch ----- */
  useEffect(() => {
    if (!products || products.length === 0) dispatch(fetchProducts());
    dispatch(fetchProductById(productId));
  }, [dispatch, productId, products?.length]);

  /* ----- reset on product switch ----- */
  useEffect(() => {
    setIsImageModalVisible(false);
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    scaleAnim.setValue(0.96);
    requestAnimationFrame(() => scrollRef.current?.scrollTo?.({ y: 0, animated: false }));
  }, [productId, fadeAnim, slideAnim, scaleAnim]);

  /* ----- network ----- */
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setNetworkStatus(online);
      if (!online) {
        setCartSyncError("You're offline. Cart changes will sync when connection is restored.");
      } else {
        setCartSyncError(null);
        if (cartId) syncCartWithDatabase();
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId]);

  const syncCartWithDatabase = async () => {
    if (!cartId || !networkStatus) return;
    try {
      const result = await dispatch(getCartById(cartId)).unwrap();
      if (Array.isArray(result)) {
        await AsyncStorage.setItem("cart", JSON.stringify(result));
        setCartSyncError(null);
      }
    } catch {
      setCartSyncError("Failed to sync cart. Changes saved locally.");
    }
  };

  /* ----- product resolution ----- */
  const productFromList = useMemo(() => {
    if (!Array.isArray(products)) return null;
    return products.find((p) => String(p.productID) === String(productId)) || null;
  }, [products, productId]);

  const productFromApi = useMemo(() => {
    const p = currentProduct?.[0] || null;
    if (!p) return null;
    return String(p.productID) === String(productId) ? p : null;
  }, [currentProduct, productId]);

  const product = productFromList || productFromApi;
  const isSwitchingOrLoadingCorrectProduct = !product && productsLoading;

  useEffect(() => {
    if (!product) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [product, fadeAnim, slideAnim, scaleAnim]);

  const isOutOfStock = (p) => {
    if (!p) return false;
    const indicators = ["products out of stock", "out of stock", "unavailable", "not available"];
    if (p.brandName && indicators.some((x) => p.brandName.toLowerCase().includes(x))) return true;
    if (p.categoryName && indicators.some((x) => p.categoryName.toLowerCase().includes(x))) return true;
    if (p.showRoomName && indicators.some((x) => p.showRoomName.toLowerCase().includes(x))) return true;
    if (p.stockStatus && p.stockStatus.toLowerCase() === "out of stock") return true;
    if (p.quantity !== undefined && Number(p.quantity) <= 0) return true;
    return false;
  };

  const outOfStock = isOutOfStock(product);
  const inStock = !!product && !outOfStock;

  const imageUrl = useMemo(() => getValidImageUrl(product?.productImage), [product]);

  const discountPercent = useMemo(() => {
    const oldP = Number(product?.oldPrice || 0);
    const newP = Number(product?.price || 0);
    if (!oldP || oldP <= newP) return 0;
    return Math.round(((oldP - newP) / oldP) * 100);
  }, [product]);

  /* ----- related ----- */
  const hasValidCategory = !!product?.categoryName;
  const hasValidBrand = !!product?.brandName;

  const sameCategoryProducts = useMemo(() => {
    if (!Array.isArray(products) || !product?.categoryName) return [];
    return products.filter((p) => p.categoryName === product.categoryName && p.productID !== product.productID);
  }, [products, product]);

  const mostRecentProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const currentId = String(product?.productID ?? productId);
    return [...products]
      .filter((p) => String(p.productID) !== currentId)
      .sort((a, b) => getMostRecentSortKey(b) - getMostRecentSortKey(a))
      .slice(0, RECENT_LIMIT);
  }, [products, product, productId]);

  const shouldUseRecentFallback = !hasValidCategory || !hasValidBrand;

  const relatedProducts = useMemo(() => {
    if (shouldUseRecentFallback) return mostRecentProducts;
    const catRelated = sameCategoryProducts.slice(0, RELATED_LIMIT);
    return catRelated.length > 0 ? catRelated : mostRecentProducts;
  }, [shouldUseRecentFallback, mostRecentProducts, sameCategoryProducts]);

  const hasMoreInCategory = sameCategoryProducts.length > RELATED_LIMIT;
  const categoryRouteName = useMemo(() => {
    if (!product?.categoryName) return null;
    return getCategoryRouteName(product.categoryName);
  }, [product]);

  /* ----- cart totals/line ----- */
  const basketTotal = useMemo(() => calcCartTotal(cartItems), [cartItems]);

  const cartLineForThisProduct = useMemo(() => {
    if (!product || !Array.isArray(cartItems)) return null;
    const pid = String(product.productID ?? productId);
    return cartItems.find((it) => String(it.productId) === pid) || null;
  }, [cartItems, product, productId]);

  useEffect(() => {
    const q = Number(cartLineForThisProduct?.quantity);
    if (Number.isFinite(q) && q > 0) setMobileQty(q);
    else setMobileQty(1);
  }, [cartLineForThisProduct]);

  const isCartButtonLoading = isAddingToCart || cartLoading;

  /* ----- basket sheet controls ----- */
  const openBasketSheet = (summary) => {
    setLastAddedSummary(summary);
    setShowBasketSheet(true);
    Animated.spring(sheetAnim, { toValue: 0, friction: 9, useNativeDriver: true }).start();
  };

  const closeBasketSheet = () => {
    Animated.timing(sheetAnim, { toValue: 140, duration: 180, useNativeDriver: true }).start(() => {
      setShowBasketSheet(false);
      setLastAddedSummary(null);
    });
  };

  /* ----- actions ----- */
  const handleShare = async () => {
    if (!product) return;
    try {
      const message = `Check out this product on Franko Trading:\n\n${product.productName}\nPrice: ₵${formatPrice(
        product.price
      )}.00`;
      await Share.share({ message, title: product.productName });
    } catch {
      Alert.alert("Error", "Failed to share product.");
    }
  };

  const refreshCartAndPersist = async () => {
    if (!cartId) return null;
    const updated = await dispatch(getCartById(cartId)).unwrap();
    if (Array.isArray(updated)) {
      await AsyncStorage.setItem("cart", JSON.stringify(updated));
      return updated;
    }
    return null;
  };

  const addProductToCartWithSync = async (p, quantity = 1) => {
    if (!p) return null;
    if (!networkStatus) {
      setCartSyncError("No internet connection. Please check your network.");
      return null;
    }
    const payload = { cartId, productId: p.productID, price: p.price, quantity };
    await dispatch(addToCart(payload)).unwrap();
    return await refreshCartAndPersist();
  };

  const updateProductQtyWithSync = async (productIdToUpdate, quantity) => {
    if (!cartId) return null;
    await dispatch(updateCartItem({ cartId, productId: productIdToUpdate, quantity })).unwrap();
    return await refreshCartAndPersist();
  };

  /**
   * ✅ IMPLEMENTED (your exact rule):
   * Every time the sheet opens, show:
   *   Basket total (display) = Basket total (BEFORE) + Item total
   * If basket total before is 0, this naturally displays the item total.
   */
  const handleStickyAddOrUpdate = async () => {
    if (!product || outOfStock) return;

    const desiredQty = Math.max(1, Math.min(99, Number(mobileQty) || 1));

    // snapshot BEFORE cart update
    const basketTotalBefore = Number(basketTotal) || 0;

    try {
      setIsAddingToCart(true);

      let updatedCart = null;

      if (cartLineForThisProduct?.productId && cartId) {
        updatedCart = await updateProductQtyWithSync(cartLineForThisProduct.productId, desiredQty);
      } else {
        updatedCart = await addProductToCartWithSync(product, desiredQty);
      }

      const updatedLine =
        Array.isArray(updatedCart) &&
        updatedCart.find((it) => String(it.productId) === String(product.productID));

      const qtyInCart = Number(updatedLine?.quantity ?? desiredQty);
      const unit = Number(updatedLine?.price ?? product.price ?? 0);
      const lineTotal = qtyInCart * unit;

      // ✅ REQUIRED DISPLAY
      const basketTotalDisplay = basketTotalBefore + (Number(lineTotal) || 0);

      openBasketSheet({
        productName: product.productName,
        qty: qtyInCart,
        unit,
        lineTotal,
        basketTotalDisplay,
      });
    } catch {
      setCartSyncError("Failed to update cart. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleAddRelatedToCart = async (p) => {
    if (!p || isOutOfStock(p)) return;

    // snapshot BEFORE cart update
    const basketTotalBefore = Number(basketTotal) || 0;

    try {
      setAddingRelatedToCart((prev) => ({ ...prev, [p.productID]: true }));

      const updatedCart = await addProductToCartWithSync(p, 1);

      const updatedLine =
        Array.isArray(updatedCart) && updatedCart.find((it) => String(it.productId) === String(p.productID));

      const qtyInCart = Number(updatedLine?.quantity ?? 1);
      const unit = Number(updatedLine?.price ?? p.price ?? 0);
      const lineTotal = qtyInCart * unit;

      // ✅ REQUIRED DISPLAY
      const basketTotalDisplay = basketTotalBefore + (Number(lineTotal) || 0);

      openBasketSheet({
        productName: p.productName,
        qty: qtyInCart,
        unit,
        lineTotal,
        basketTotalDisplay,
      });
    } catch {
      setCartSyncError("Failed to add product to cart. Please try again.");
    } finally {
      setAddingRelatedToCart((prev) => ({ ...prev, [p.productID]: false }));
    }
  };

  /* ---------------- early returns ---------------- */
  if (isSwitchingOrLoadingCorrectProduct) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stickyHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
              <Icon name="arrow-back-ios" size={20} color={palette.primaryDeep} />
            </TouchableOpacity>
            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Product not found
              </Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          <Text style={{ textAlign: "center", color: palette.gray, fontSize: 15, fontFamily: font.medium }}>
            Product not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const addBtnLabel = outOfStock ? "OUT OF STOCK" : "ADD TO CART";

  /* ---------------- render ---------------- */
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Sticky header */}
        <View style={styles.stickyHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
              <Icon name="arrow-back-ios" size={20} color={palette.primaryDeep} />
            </TouchableOpacity>

            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {product.productName}
              </Text>
            </View>

            <TouchableOpacity onPress={handleShare} style={styles.shareButton} activeOpacity={0.8}>
              <Icon name="share" size={20} color={palette.primaryDeep} />
            </TouchableOpacity>
          </View>

          {!!cartSyncError && (
            <View style={styles.banner}>
              <Icon name="info" size={16} color={palette.text} />
              <Text style={styles.bannerText}>{cartSyncError}</Text>
            </View>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(24, bottomBarHeight + 16) }]}
        >
          <Animated.View
            key={String(productId)}
            style={[
              styles.gridWrapper,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
            ]}
          >
            {/* Left column */}
            <View style={styles.leftColumn}>
              <View style={styles.imageCard}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => setIsImageModalVisible(true)}>
                  <View style={styles.imageOuter}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.mainImage} resizeMode="contain" />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Icon name="image-not-supported" size={40} color={palette.muted} />
                        <Text style={styles.imagePlaceholderText}>No image</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryBody}>
                    <Text style={styles.productName}>{product.productName}</Text>

                    <View style={styles.priceRow}>
                      <Text style={styles.priceText}>₵{formatPrice(product.price)}.00</Text>

                      {Number(product.oldPrice) > Number(product.price) && (
                        <Text style={styles.oldPriceText}>₵{formatPrice(product.oldPrice)}.00</Text>
                      )}

                      {discountPercent > 0 && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>-{discountPercent}%</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.trustRow}>
                      <InfoPill icon="local-shipping" label="Delivery 24–48hrs" />
                      <InfoPill
                        icon={inStock ? "inventory" : "remove-shopping-cart"}
                        label={inStock ? "In stock" : "Out of stock"}
                        tone={inStock ? "green" : "red"}
                      />
                      <InfoPill icon="verified" label="Quality guaranteed" />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Right column */}
            <View style={styles.rightColumn}>
              <ProductSpecsList product={product} />
            </View>
          </Animated.View>

          {/* Related */}
          <View style={styles.relatedSection}>
            <View style={styles.relatedHeader}>
              <Text style={styles.relatedTitle}>{shouldUseRecentFallback ? "New arrivals" : "You may also like"}</Text>
              <View style={styles.relatedDivider} />
            </View>

            {relatedProducts.length > 0 ? (
              <>
                <OptimizedProductList
                  products={relatedProducts}
                  loading={productsLoading}
                  onProductPress={(pid) => navigation.push("ProductDetails", { productId: pid })}
                  onAddToCart={handleAddRelatedToCart}
                  addingToCart={addingRelatedToCart}
                  showHotDeal={true}
                />

                {!shouldUseRecentFallback && hasMoreInCategory && categoryRouteName && (
                  <View style={styles.viewMoreWrapper}>
                    <TouchableOpacity
                      style={styles.viewMoreBtn}
                      onPress={() => navigation.navigate(categoryRouteName, { categoryName: product.categoryName })}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.viewMoreText}>View more</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noRelatedCard}>
                <Icon name="search-off" size={34} color={palette.muted} />
                <Text style={styles.noRelatedText}>No products found.</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom bar */}
        <View style={styles.bottomBar} onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}>
          <View style={styles.qtyWrapper}>
            <View style={styles.qtyBox}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setMobileQty((q) => Math.max(1, q - 1))}
                disabled={outOfStock || mobileQty <= 1}
              >
                <Icon
                  name="remove"
                  size={20}
                  color={outOfStock || mobileQty <= 1 ? palette.muted : palette.primaryDeep}
                />
              </TouchableOpacity>

              <View style={styles.qtyValueBox}>
                <Text style={styles.qtyValueText}>{mobileQty}</Text>
              </View>

              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setMobileQty((q) => Math.min(99, q + 1))}
                disabled={outOfStock}
              >
                <Icon name="add" size={20} color={outOfStock ? palette.muted : palette.primaryDeep} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.bottomAddBtn, outOfStock && styles.bottomAddBtnDisabled]}
            disabled={isCartButtonLoading || outOfStock}
            onPress={handleStickyAddOrUpdate}
            activeOpacity={0.9}
          >
            {isCartButtonLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.bottomAddBtnText}>{addBtnLabel}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Basket sheet (Modal) */}
        <Modal
          visible={showBasketSheet && !!lastAddedSummary}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={closeBasketSheet}
        >
          <Pressable style={styles.basketBackdrop} onPress={closeBasketSheet}>
            <Pressable style={styles.basketSheetWrap} onPress={() => {}}>
              <Animated.View
                style={[
                  styles.basketSheet,
                  {
                    transform: [
                      {
                        translateY: sheetAnim.interpolate({
                          inputRange: [0, 140],
                          outputRange: [0, 140],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.basketSheetContent}>
                  <View style={styles.basketHeaderRow}>
                    <View style={styles.basketSuccessIconWrapper}>
                      <Icon name="check" size={18} color={palette.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.basketProductName} numberOfLines={1}>
                        {lastAddedSummary?.productName}
                      </Text>
                      <Text style={styles.basketAddedText}>Added to basket</Text>
                    </View>
                  </View>

                  <View style={styles.basketTotalsCard}>
                    <MoneyRow label="Quantity" value={`${lastAddedSummary?.qty ?? 0}`} />
                    <MoneyRow label="Unit price" value={`₵${formatPrice(lastAddedSummary?.unit ?? 0)}.00`} />
                    <MoneyRow
                      label="Item total"
                      value={`₵${formatPrice(lastAddedSummary?.lineTotal ?? 0)}.00`}
                      bold
                    />
                    <View style={styles.divider} />
                    {/* ✅ This is the REQUIRED value: basket total (before) + item total */}
                    <MoneyRow
                      label="Basket total"
                      value={`₵${formatPrice(lastAddedSummary?.basketTotalDisplay ?? 0)}.00`}
                      bold
                    />
                  </View>

                  <View style={styles.basketButtonsWrapper}>
                    <TouchableOpacity style={styles.basketOutlineBtn} onPress={closeBasketSheet} activeOpacity={0.9}>
                      <Text style={styles.basketOutlineText}>CONTINUE SHOPPING</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.basketPrimaryBtn}
                      onPress={() => {
                        closeBasketSheet();
                        navigation.navigate("cart");
                      }}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.basketPrimaryText}>VIEW BASKET</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Image modal */}
        <Modal
          visible={isImageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsImageModalVisible(false)}
        >
          <View style={styles.imageModalOverlay}>
            <View style={styles.imageModalContent}>
              {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.imageModalImage} resizeMode="contain" /> : null}
              <TouchableOpacity style={styles.imageModalClose} onPress={() => setIsImageModalVisible(false)}>
                <View style={styles.imageModalCloseInner}>
                  <Icon name="close" size={24} color="#ffffff" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.bg },
  container: { flex: 1 },

  stickyHeader: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: "rgba(248,250,252,0.98)",
    zIndex: 20,
  },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  backButton: {
    padding: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.primaryBorder,
    backgroundColor: palette.primarySoft,
  },
  headerTitleBlock: { flex: 1, marginHorizontal: 10, minWidth: 0 },
  headerTitle: { fontSize: 16, color: palette.text, fontFamily: font.black },
  shareButton: {
    padding: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.primaryBorder,
    backgroundColor: palette.primarySoft,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.card,
  },
  bannerText: { flex: 1, fontSize: 13, color: palette.text, fontFamily: font.medium },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 12 },

  gridWrapper: { flexDirection: screenWidth >= 768 ? "row" : "column", gap: 12 },
  leftColumn: { flex: screenWidth >= 768 ? 1 : 0 },
  rightColumn: { flex: screenWidth >= 768 ? 1 : 0, marginTop: screenWidth >= 768 ? 0 : 12 },

  imageCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  imageOuter: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#fff",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 260,
  },
  mainImage: { width: "100%", height: 320 },
  imagePlaceholder: { width: "100%", height: 260, alignItems: "center", justifyContent: "center" },
  imagePlaceholderText: { marginTop: 6, fontSize: 12, color: palette.muted, fontFamily: font.bold },

  summaryCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    overflow: "hidden",
  },
  summaryBody: { padding: 12 },

  productName: { fontSize: 20, color: palette.text, fontFamily: font.black },
  priceRow: { flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap", marginTop: 8 },
  priceText: { fontSize: 28, color: palette.primaryDeep, fontFamily: font.black, marginRight: 10 },
  oldPriceText: {
    fontSize: 14,
    color: palette.gray,
    textDecorationLine: "line-through",
    marginRight: 8,
    marginBottom: 4,
    fontFamily: font.medium,
  },
  discountBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: palette.primaryBorder,
    backgroundColor: palette.primarySoft,
    marginBottom: 2,
  },
  discountBadgeText: { fontSize: 12, color: palette.primaryDeep, fontFamily: font.black },

  trustRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  infoPillText: { fontSize: 13, fontFamily: font.bold },

  // specs
  specsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    overflow: "hidden",
  },
  specsHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: "#fafafa",
  },
  specsHeaderText: { fontSize: 15, color: palette.text, fontFamily: font.black },
  specsBody: { padding: 12 },
  specsIntro: { fontSize: 14, color: palette.textSoft, lineHeight: 20, fontFamily: font.regular },
  specsSections: { marginTop: 6 },
  specsSection: { marginTop: 12 },
  specsSectionTitle: { fontSize: 14, color: palette.text, fontFamily: font.black },
  specsItemText: { fontSize: 14, color: palette.textSoft, marginTop: 6, lineHeight: 20, fontFamily: font.regular },
  specsItemLabel: { fontFamily: font.black, color: palette.text },

  // related
  relatedSection: { marginTop: 18 },
  relatedHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  relatedTitle: { fontSize: 16, color: palette.text, fontFamily: font.black },
  relatedDivider: { flex: 1, height: 1, backgroundColor: palette.border, marginLeft: 10 },

  noRelatedCard: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    padding: 18,
    alignItems: "center",
  },
  noRelatedText: { marginTop: 6, fontSize: 13, color: palette.gray, fontFamily: font.medium },

  viewMoreWrapper: { marginBottom: 2, alignItems: "center" },
  viewMoreBtn: {
    borderRadius: 36,
    borderWidth: 1,
    borderColor: palette.primaryBorder,
    backgroundColor: palette.primarySoft,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  viewMoreText: { fontSize: 16, color: palette.primaryDeep, fontFamily: font.black },

  // bottom bar
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: "rgba(255,255,255,0.98)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 30,
  },
  qtyWrapper: { width: 132 },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#fafafa",
  },
  qtyBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  qtyValueBox: { width: 40, alignItems: "center", justifyContent: "center" },
  qtyValueText: { fontSize: 16, color: palette.text, fontFamily: font.black },

  bottomAddBtn: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  bottomAddBtnDisabled: { backgroundColor: "#e5e7eb" },
  bottomAddBtnText: { fontSize: 15, color: "#ffffff", fontFamily: font.black },

  // basket modal backdrop
  basketBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "flex-end",
  },
  basketSheetWrap: { width: "100%" },

  // basket sheet
  basketSheet: { paddingHorizontal: 10, paddingBottom: 10 },
  basketSheetContent: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
  },
  basketHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  basketSuccessIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: palette.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  basketProductName: { fontSize: 15, color: palette.text, fontFamily: font.black },
  basketAddedText: { fontSize: 13, color: palette.primaryDeep, marginTop: 2, fontFamily: font.bold },

  basketTotalsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#fafafa",
    padding: 12,
    marginBottom: 12,
  },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: 10 },

  moneyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  moneyLabel: { fontSize: 14, color: palette.gray, fontFamily: font.bold },
  moneyValue: { fontSize: 14, color: palette.text, fontFamily: font.bold },
  moneyLabelBold: { fontFamily: font.black, color: palette.text },
  moneyValueBold: { fontFamily: font.black, color: palette.text },

  basketButtonsWrapper: { gap: 10 },
  basketOutlineBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  basketOutlineText: { fontSize: 14, color: palette.text, fontFamily: font.black },
  basketPrimaryBtn: {
    borderRadius: 14,
    backgroundColor: palette.primaryDeep,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  basketPrimaryText: { fontSize: 15, color: "#ffffff", fontFamily: font.black },

  // image modal
  imageModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  imageModalContent: { width: screenWidth, height: screenHeight, justifyContent: "center", alignItems: "center" },
  imageModalImage: { width: screenWidth * 0.92, height: screenHeight * 0.72 },
  imageModalClose: { position: "absolute", top: 40, right: 20 },
  imageModalCloseInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },

  // skeleton
  skeletonHeaderBar: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.bg,
  },
  skeletonBackBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e5e7eb" },
  skeletonShareBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e5e7eb" },
  skeletonHeaderTextBlock: { flex: 1, marginHorizontal: 12 },
  skeletonScroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 160 },
  skeletonImageCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#fff",
    padding: 12,
  },
  skeletonImageBox: { borderRadius: 18, height: 280, backgroundColor: "#e5e7eb", marginBottom: 12 },
  skeletonSummaryBox: { borderRadius: 16, borderWidth: 1, borderColor: palette.border, padding: 12 },
  skeletonLineLg: { height: 18, borderRadius: 9, backgroundColor: "#e5e7eb", width: "80%" },
  skeletonLineMd: { height: 14, borderRadius: 9, backgroundColor: "#e5e7eb", width: "70%" },
  skeletonLineShort: { height: 14, borderRadius: 9, backgroundColor: "#e5e7eb", width: "55%" },
  skeletonLineTiny: { height: 12, borderRadius: 9, backgroundColor: "#e5e7eb", width: "75%" },
});

export default ProductDetailsScreen;