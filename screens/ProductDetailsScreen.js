
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
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

} from "react-native";


import { useDispatch, useSelector } from "react-redux";
import { useRoute, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/MaterialIcons";

import {
  fetchProductById,
  fetchProducts,
} from "../redux/slice/productSlice";
import {
  addToCart,
  getCartById,
  updateCartItem,
} from "../redux/slice/cartSlice";

// ⬇️ Use your existing ProductCard UI for "You may also like"
import { OptimizedProductList } from "../components/ProductCard"; // adjust path

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

/* ----------------- colors & small helpers ----------------- */

const palette = {
  greenBg: "#f0fdf4",
  greenBorder: "#bbf7d0",
  greenText: "#15803d",
  greenDeep: "#14532d",
  greenBadge: "#dcfce7",
  white: "#ffffff",
  text: "#0f172a",
  subtleText: "#166534",
  grayText: "#6b7280",
  mutedText: "#9ca3af",
  border: "#e5e7eb",
  blue: "#2563EB",
};

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
  return `https://fte002n1.salesmate.app/Media/Products_Images/${file}`;
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

/* ---------------- description parsing (web‑like) ---------------- */

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

  const firstStructuredIdx = lines.findIndex(
    (l) => isSectionHeader(l) || isKeyValue(l)
  );

  const intro =
    firstStructuredIdx === -1
      ? lines.join(" ")
      : lines.slice(0, firstStructuredIdx).join(" ");

  const structuredLines =
    firstStructuredIdx === -1 ? [] : lines.slice(firstStructuredIdx);

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

/* ---------------- small UI bits ---------------- */

const Chip = ({ iconName, label }) => (
  <View style={styles.chip}>
    {iconName ? (
      <Icon name={iconName} size={14} color={palette.greenText} />
    ) : null}
    <Text style={styles.chipText}>{label}</Text>
  </View>
);

const ProductSpecsList = ({ product }) => {
  const { intro, sections } = splitDescription(product);

  return (
    <View style={styles.specsCard}>
      <View style={styles.specsHeader}>
        <Text style={styles.specsHeaderText}>Product details</Text>
      </View>

      <View style={styles.specsBody}>
        {intro ? <Text style={styles.specsIntro}>{intro}</Text> : null}

        {sections.length > 0 && (
          <View style={[styles.specsSections, intro ? { marginTop: 12 } : null]}>
            {sections.map((sec) => (
              <View key={sec.title} style={styles.specsSection}>
                <Text style={styles.specsSectionTitle}>{sec.title}</Text>
                {sec.items.map((it, idx) => (
                  <Text
                    key={`${sec.title}-${idx}`}
                    style={styles.specsItemText}
                  >
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
        )}
      </View>
    </View>
  );
};

/* ---------------- skeleton that imitates layout ---------------- */

const ProductDetailSkeleton = () => (
  <SafeAreaView style={styles.safeArea}>
    <View style={styles.skeletonHeaderBar}>
      <View style={styles.skeletonBackBtn} />
      <View style={styles.skeletonHeaderTextBlock}>
        <View style={styles.skeletonLineShort} />
        <View style={[styles.skeletonLineTiny, { marginTop: 4 }]} />
      </View>
      <View style={styles.skeletonShareBtn} />
    </View>

    <ScrollView
      contentContainerStyle={styles.skeletonScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.gridWrapper}>
        <View style={styles.leftColumn}>
          <View style={styles.skeletonImageCard}>
            <View style={styles.skeletonImageBox} />
            <View style={styles.skeletonSummaryBox}>
              <View style={styles.skeletonLineLg} />
              <View style={styles.skeletonPriceRow}>
                <View style={styles.skeletonPrice} />
                <View style={styles.skeletonOldPrice} />
                <View style={styles.skeletonPill} />
              </View>
              <View style={styles.skeletonChipRow}>
                <View style={styles.skeletonChip} />
                <View style={styles.skeletonChip} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.rightColumn}>
          <View style={styles.skeletonSpecsCard}>
            <View style={styles.skeletonSpecsHeader} />
            <View style={styles.skeletonSpecsBody}>
              <View style={styles.skeletonLineMd} />
              <View style={styles.skeletonLineMd} />
              <View style={styles.skeletonLineShort} />
              <View style={styles.skeletonLineTiny} />
              <View
                style={[styles.skeletonLineTiny, { width: "40%", marginTop: 4 }]}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.relatedSection}>
        <View style={styles.relatedHeader}>
          <View style={styles.skeletonLineShort} />
          <View style={styles.relatedDivider} />
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>
);

/* ---------------- main screen ---------------- */

const RELATED_LIMIT = 10;

const ProductDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const { productId } = route.params;

  const { currentProduct, products, loading: productsLoading } = useSelector(
    (state) => state.products
  );
  const { cartItems, cartId, loading: cartLoading } = useSelector(
    (state) => state.cart
  );

  const [networkStatus, setNetworkStatus] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addingRelatedToCart, setAddingRelatedToCart] = useState({});
  const [mobileQty, setMobileQty] = useState(1);
  const [cartSyncError, setCartSyncError] = useState(null);

  const [showBasketSheet, setShowBasketSheet] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState(null);
  const sheetAnim = useRef(new Animated.Value(120)).current;

  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  /* ----- fetch product + products ----- */

  useEffect(() => {
    if (!products || products.length === 0) {
      dispatch(fetchProducts());
    }
    dispatch(fetchProductById(productId));
  }, [dispatch, productId, products?.length]);

  /* ----- network status ----- */

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setNetworkStatus(online);
      if (!online) {
        setCartSyncError(
          "You're offline. Cart changes will sync when connection is restored."
        );
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

  useEffect(() => {
    if (cartId && networkStatus) syncCartWithDatabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId, networkStatus]);

  /* ----- select product, animate when ready ----- */

  const productFromList = useMemo(() => {
    if (!Array.isArray(products)) return null;
    return (
      products.find((p) => String(p.productID) === String(productId)) ||
      null
    );
  }, [products, productId]);

  const product = currentProduct?.[0] || productFromList;

  useEffect(() => {
    if (!product) return;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [product, fadeAnim, slideAnim, scaleAnim]);

  const isOutOfStock = (p) => {
    if (!p) return false;
    const indicators = [
      "products out of stock",
      "out of stock",
      "unavailable",
      "not available",
    ];
    if (p.brandName && indicators.some((x) => p.brandName.toLowerCase().includes(x)))
      return true;
    if (p.categoryName && indicators.some((x) => p.categoryName.toLowerCase().includes(x)))
      return true;
    if (p.showRoomName && indicators.some((x) => p.showRoomName.toLowerCase().includes(x)))
      return true;
    if (p.stockStatus && p.stockStatus.toLowerCase() === "out of stock") return true;
    if (p.quantity !== undefined && Number(p.quantity) <= 0) return true;
    return false;
  };

  const outOfStock = isOutOfStock(product);
  const imageUrl = useMemo(() => getValidImageUrl(product?.productImage), [product]);

  const discountPercent = useMemo(() => {
    const oldP = Number(product?.oldPrice || 0);
    const newP = Number(product?.price || 0);
    if (!oldP || oldP <= newP) return 0;
    return Math.round(((oldP - newP) / oldP) * 100);
  }, [product]);

  const sameCategoryProducts = useMemo(() => {
    if (!Array.isArray(products) || !product?.categoryName) return [];
    return products.filter(
      (p) =>
        p.categoryName === product.categoryName &&
        p.productID !== product.productID
    );
  }, [products, product]);

  const related = useMemo(
    () => sameCategoryProducts.slice(0, RELATED_LIMIT),
    [sameCategoryProducts]
  );
  const hasMoreInCategory = sameCategoryProducts.length > RELATED_LIMIT;

  const categoryRouteName = useMemo(
    () =>
      product?.categoryName
        ? getCategoryRouteName(product.categoryName)
        : null,
    [product]
  );

  const basketTotal = useMemo(() => {
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.reduce(
      (acc, item) =>
        acc +
        (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0
    );
  }, [cartItems]);

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

  const openBasketSheet = (addedProduct) => {
    setLastAddedProduct(addedProduct);
    setShowBasketSheet(true);
    Animated.spring(sheetAnim, {
      toValue: 0,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const closeBasketSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 120,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setShowBasketSheet(false));
  };

  const addProductToCartWithSync = async (p, quantity = 1) => {
    if (!p) return;
    if (!networkStatus) {
      setCartSyncError("No internet connection. Please check your network.");
      return;
    }

    const payload = {
      cartId,
      productId: p.productID,
      price: p.price,
      quantity,
    };

    await dispatch(addToCart(payload)).unwrap();

    if (cartId) {
      const updated = await dispatch(getCartById(cartId)).unwrap();
      if (Array.isArray(updated)) {
        await AsyncStorage.setItem("cart", JSON.stringify(updated));
      }
    }
  };

  const handleAddToCartMain = async () => {
    if (!product || isOutOfStock(product)) return;
    try {
      setIsAddingToCart(true);
      await addProductToCartWithSync(product, 1);
      openBasketSheet(product);
    } catch {
      setCartSyncError("Failed to add product to cart. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleAddRelatedToCart = async (p) => {
    if (!p || isOutOfStock(p)) return;
    try {
      setAddingRelatedToCart((prev) => ({
        ...prev,
        [p.productID]: true,
      }));
      await addProductToCartWithSync(p, 1);
      openBasketSheet(p);
    } catch {
      setCartSyncError("Failed to add product to cart. Please try again.");
    } finally {
      setAddingRelatedToCart((prev) => ({
        ...prev,
        [p.productID]: false,
      }));
    }
  };

  const handleStickyAddOrUpdate = async () => {
    if (!product || isOutOfStock(product)) return;

    if (cartLineForThisProduct?.productId && cartId) {
      try {
        await dispatch(
          updateCartItem({
            cartId,
            productId: cartLineForThisProduct.productId,
            quantity: mobileQty,
          })
        ).unwrap();
        const updated = await dispatch(getCartById(cartId)).unwrap();
        if (Array.isArray(updated)) {
          await AsyncStorage.setItem("cart", JSON.stringify(updated));
        }
        openBasketSheet(product);
      } catch {
        setCartSyncError("Failed to update cart. Please try again.");
      }
      return;
    }

    await handleAddToCartMain();
  };

  if (!product && productsLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.skeletonHeader} />
        <View style={styles.skeletonBody}>
          <Text style={{ textAlign: "center", color: palette.grayText }}>
            Product not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ----- main render ----- */

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Sticky header */}
        <View style={styles.stickyHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <Icon
                name="arrow-back-ios"
                size={18}
                color={palette.greenText}
              />
            </TouchableOpacity>

            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {product.productName}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {product.brandName || "Brand"} •{" "}
                {product.categoryName || "Category"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleShare}
              style={styles.shareButton}
              activeOpacity={0.8}
            >
              <Icon name="share" size={18} color={palette.greenText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.gridWrapper,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            {/* Left column */}
            <View style={styles.leftColumn}>
              <View style={styles.imageCard}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setIsImageModalVisible(true)}
                >
                  <View style={styles.imageOuter}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.mainImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Icon
                          name="image-not-supported"
                          size={36}
                          color={palette.mutedText}
                        />
                        <Text style={styles.imagePlaceholderText}>
                          No image
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Name + price card */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryBody}>
                    <Text style={styles.productName}>
                      {product.productName}
                    </Text>

                    <View style={styles.priceRow}>
                      <Text style={styles.priceText}>
                        ₵{formatPrice(product.price)}.00
                      </Text>
                      {Number(product.oldPrice) >
                        Number(product.price) && (
                        <Text style={styles.oldPriceText}>
                          ₵{formatPrice(product.oldPrice)}.00
                        </Text>
                      )}
                      {discountPercent > 0 && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>
                            -{discountPercent}%
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.chipsRow}>
                      <Chip
                        iconName="local-offer"
                        label={product.brandName || "Brand"}
                      />
                      <Chip
                        iconName="category"
                        label={product.categoryName || "Category"}
                      />
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

          {/* You may also like — using your ProductCard / OptimizedProductList */}
          <View style={styles.relatedSection}>
            <View style={styles.relatedHeader}>
              <Text style={styles.relatedTitle}>You may also like</Text>
              <View style={styles.relatedDivider} />
            </View>

            {related.length > 0 ? (
              <>
                <OptimizedProductList
                  products={related}
                  loading={productsLoading}
                  onProductPress={(pid) =>
                    navigation.push("ProductDetails", { productId: pid })
                  }
                  onAddToCart={handleAddRelatedToCart}
                  addingToCart={addingRelatedToCart}
                  showHotDeal={true}
                />

                {hasMoreInCategory && categoryRouteName && (
                  <View style={styles.viewMoreWrapper}>
                    <TouchableOpacity
                      style={styles.viewMoreBtn}
                      onPress={() =>
                        navigation.navigate(categoryRouteName, {
                          categoryName: product.categoryName,
                        })
                      }
                      activeOpacity={0.9}
                    >
                      <Text style={styles.viewMoreText}>
                        View more in {product.categoryName}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noRelatedCard}>
                <Icon
                  name="remove-shopping-cart"
                  size={32}
                  color={palette.mutedText}
                />
                <Text style={styles.noRelatedText}>
                  No related products found.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom bar: qty + Add to Cart */}
        <View style={styles.bottomBar}>
          <View style={styles.qtyWrapper}>
            <View style={styles.qtyBox}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() =>
                  setMobileQty((q) => Math.max(1, q - 1))
                }
                disabled={outOfStock || mobileQty <= 1}
              >
                <Icon
                  name="remove"
                  size={18}
                  color={
                    outOfStock || mobileQty <= 1
                      ? palette.mutedText
                      : palette.greenText
                  }
                />
              </TouchableOpacity>
              <View style={styles.qtyValueBox}>
                <Text style={styles.qtyValueText}>{mobileQty}</Text>
              </View>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() =>
                  setMobileQty((q) => Math.min(99, q + 1))
                }
                disabled={outOfStock}
              >
                <Icon
                  name="add"
                  size={18}
                  color={
                    outOfStock
                      ? palette.mutedText
                      : palette.greenText
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.bottomAddBtn,
              outOfStock && styles.bottomAddBtnDisabled,
            ]}
            disabled={isCartButtonLoading || outOfStock}
            onPress={handleStickyAddOrUpdate}
            activeOpacity={0.9}
          >
            {isCartButtonLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.bottomAddBtnText}>
                {outOfStock ? "Out of Stock" : "Add to Cart"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Success “Added to basket” bottom sheet */}
        {showBasketSheet && lastAddedProduct && (
          <Animated.View
            style={[
              styles.basketSheet,
              {
                transform: [
                  {
                    translateY: sheetAnim.interpolate({
                      inputRange: [0, 120],
                      outputRange: [0, 120],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.basketSheetContent}>
              <View style={styles.basketSuccessRow}>
                <View style={styles.basketSuccessIconWrapper}>
                  <Icon name="check" size={18} color="#22c55e" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={styles.basketProductName}
                    numberOfLines={1}
                  >
                    {lastAddedProduct.productName}
                  </Text>
                  <Text style={styles.basketAddedText}>
                    Added to basket
                  </Text>
                </View>
              </View>

              <View style={styles.basketTotalRow}>
                <Text style={styles.basketTotalLabel}>
                  Basket Total
                </Text>
                <Text style={styles.basketTotalValue}>
                  {formatPrice(basketTotal)} GH₵
                </Text>
              </View>

              <View style={styles.basketButtonsWrapper}>
                <TouchableOpacity
                  style={styles.basketOutlineBtn}
                  onPress={closeBasketSheet}
                  activeOpacity={0.9}
                >
                  <Text style={styles.basketOutlineText}>
                    CONTINUE SHOPPING
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.basketPrimaryBtn}
                  onPress={() => {
                    closeBasketSheet();
                    navigation.navigate("cart");
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={styles.basketPrimaryText}>
                    VIEW BASKET
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Image preview modal */}
        <Modal
          visible={isImageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsImageModalVisible(false)}
        >
          <View style={styles.imageModalOverlay}>
            <View style={styles.imageModalContent}>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.imageModalImage}
                  resizeMode="contain"
                />
              ) : null}
              <TouchableOpacity
                style={styles.imageModalClose}
                onPress={() => setIsImageModalVisible(false)}
              >
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
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  // skeleton layout
  skeletonHeaderBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: "#ffffff",
  },
  skeletonBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
  },
  skeletonShareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
  },
  skeletonHeaderTextBlock: {
    flex: 1,
    marginHorizontal: 12,
  },
  skeletonScroll: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 120,
  },
  skeletonImageCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#ffffff",
    padding: 10,
  },
  skeletonImageBox: {
    borderRadius: 18,
    height: 260,
    backgroundColor: "#e5e7eb",
    marginBottom: 10,
  },
  skeletonSummaryBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 10,
  },
  skeletonPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  skeletonPrice: {
    width: 80,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    marginRight: 6,
  },
  skeletonOldPrice: {
    width: 60,
    height: 12,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    marginRight: 6,
  },
  skeletonPill: {
    width: 50,
    height: 14,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  skeletonChipRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  skeletonChip: {
    width: 70,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    marginRight: 6,
  },
  skeletonSpecsCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  skeletonSpecsHeader: {
    height: 28,
    backgroundColor: "#e5e7eb",
  },
  skeletonSpecsBody: {
    padding: 10,
  },
  skeletonLineLg: {
    height: 16,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    marginTop: 4,
    width: "80%",
  },
  skeletonLineMd: {
    height: 12,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    marginTop: 4,
    width: "70%",
  },
  skeletonLineShort: {
    height: 12,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    width: "50%",
  },
  skeletonLineTiny: {
    height: 10,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    width: "80%",
    marginTop: 4,
  },
  skeletonRelatedCard: {
    width: 140,
    marginRight: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#ffffff",
    padding: 8,
  },
  skeletonRelatedImage: {
    height: 90,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
    marginBottom: 6,
  },

  // header
  stickyHeader: {
    borderBottomWidth: 1,
    borderBottomColor: palette.greenBorder,
    backgroundColor: "rgba(255,255,255,0.96)",
    zIndex: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.greenBorder,
    backgroundColor: palette.greenBg,
  },
  headerTitleBlock: {
    flex: 1,
    marginHorizontal: 8,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: palette.greenText,
  },
  headerSubtitle: {
    fontSize: 11,
    color: palette.subtleText,
    marginTop: 2,
  },
  shareButton: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.greenBorder,
    backgroundColor: palette.greenBg,
  },

  // scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 120,
  },

  gridWrapper: {
    flexDirection: screenWidth >= 768 ? "row" : "column",
    gap: 12,
  },
  leftColumn: {
    flex: screenWidth >= 768 ? 1 : 0,
  },
  rightColumn: {
    flex: screenWidth >= 768 ? 1 : 0,
    marginTop: screenWidth >= 768 ? 0 : 12,
  },

  // image + summary
  imageCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.greenBorder,
   
    padding: 10,
  },
  imageOuter: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.greenBorder,
 
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 260,
  },
  mainImage: {
    width: "100%",
    height: 320,
  },
  imagePlaceholder: {
    width: "100%",
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    marginTop: 4,
    fontSize: 11,
    color: palette.mutedText,
  },
  summaryCard: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.greenBorder,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  summaryBody: {
    padding: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.greenDeep,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    marginTop: 6,
  },
  priceText: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.greenText,
    marginRight: 8,
  },
  oldPriceText: {
    fontSize: 12,
    color: palette.subtleText,
    textDecorationLine: "line-through",
    opacity: 0.8,
    marginRight: 6,
  },
  discountBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: palette.greenBorder,
    backgroundColor: palette.greenBg,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: palette.subtleText,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.greenBorder,
    backgroundColor: palette.greenBg,
    marginRight: 6,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "700",
    color: palette.greenText,
    marginLeft: 4,
  },

  // specs
  specsCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.greenBorder,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  specsHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: palette.greenBorder,
    backgroundColor: palette.greenBg,
  },
  specsHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    color: palette.greenText,
  },
  specsBody: {
    padding: 10,
  },
  specsIntro: {
    fontSize: 12,
    color: palette.subtleText,
    lineHeight: 18,
  },
  specsSections: {
    marginTop: 4,
  },
  specsSection: {
    marginTop: 8,
  },
  specsSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: palette.greenDeep,
  },
  specsItemText: {
    fontSize: 12,
    color: palette.subtleText,
    marginTop: 2,
  },
  specsItemLabel: {
    fontWeight: "600",
  },

  // related section header
  relatedSection: {
    marginTop: 18,
  },
  relatedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: palette.greenText,
  },
  relatedDivider: {
    flex: 1,
    height: 1,
    backgroundColor: palette.greenBorder,
    marginLeft: 8,
  },
  relatedScrollContent: {
    paddingVertical: 4,
  },
  noRelatedCard: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.greenBorder,
    backgroundColor: palette.greenBg,
    padding: 16,
    alignItems: "center",
  },
  noRelatedText: {
    marginTop: 4,
    fontSize: 11,
    color: palette.subtleText,
  },
  viewMoreWrapper: {
    marginTop: 4,
    alignItems: "center",
  },
  viewMoreBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.greenBorder,
    backgroundColor: palette.greenBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: "800",
    color: palette.greenText,
  },

  // bottom bar
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: palette.greenBorder,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 30,
  },
  qtyWrapper: {
    width: 120,
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.greenBorder,
    backgroundColor: palette.greenBg,
  },
  qtyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  qtyValueBox: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValueText: {
    fontSize: 12,
    fontWeight: "800",
    color: palette.greenDeep,
  },
  bottomAddBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  bottomAddBtnDisabled: {
    backgroundColor: "#e5e7eb",
  },
  bottomAddBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },

  // basket sheet
  basketSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingBottom: 10,
    zIndex: 40,
  },
  basketSheetContent: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  basketSuccessRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  basketSuccessIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.greenBg,
    borderWidth: 1,
    borderColor: palette.greenBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  basketProductName: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.text,
  },
  basketAddedText: {
    fontSize: 12,
    color: palette.greenText,
    marginTop: 2,
  },
  basketTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  basketTotalLabel: {
    fontSize: 13,
    color: palette.grayText,
  },
  basketTotalValue: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.text,
  },
  basketButtonsWrapper: {
    gap: 8,
  },
  basketOutlineBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  basketOutlineText: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.text,
  },
  basketPrimaryBtn: {
    borderRadius: 12,
    backgroundColor: palette.greenText,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  basketPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },

  // image modal
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalContent: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalImage: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
  },
  imageModalClose: {
    position: "absolute",
    top: 40,
    right: 20,
  },
  imageModalCloseInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ProductDetailsScreen;