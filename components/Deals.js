import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { fetchProductByShowroomAndRecord } from "../redux/slice/productSlice";
import { addToCart } from "../redux/slice/cartSlice";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { ProductCard, LoadingCard } from "./ProductCard";

const DEALS_SHOWROOM_ID = "1e93aeb7-bba7-4bd4-b017-ea3267047d46";
const CARD_MARGIN = 8;
const CARD_WIDTH = 170;
const MAX_DISPLAY_PRODUCTS = 10;

// Memoized Timer Component
const WeeklyTimer = React.memo(() => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const daysUntilSunday = currentDay === 0 ? 7 : 7 - currentDay;
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + daysUntilSunday);
      nextSunday.setHours(23, 59, 59, 999);
      
      const difference = nextSunday.getTime() - now.getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.timerContainer}>
      <TimeUnit value={timeLeft.days} label="Days" />
      <Text style={styles.timeSeparator}>:</Text>
      <TimeUnit value={timeLeft.hours} label="Hours" />
      <Text style={styles.timeSeparator}>:</Text>
      <TimeUnit value={timeLeft.minutes} label="Min" />
      <Text style={styles.timeSeparator}>:</Text>
      <TimeUnit value={timeLeft.seconds} label="Sec" />
    </View>
  );
});

// Memoized TimeUnit Component
const TimeUnit = React.memo(({ value, label }) => (
  <View style={styles.timeUnit}>
    <View style={styles.timeValueContainer}>
      <Text style={styles.timeValue}>{value.toString().padStart(2, '0')}</Text>
    </View>
    <Text style={styles.timeLabel}>{label}</Text>
  </View>
));

// Memoized Header Component
const DealsHeader = React.memo(({ onViewMore }) => (
  <View style={styles.showroomHeader}>
    <View style={styles.gradientOverlay} />
    
    <View style={styles.floatingElement1}>
      <Text style={styles.floatingEmoji}>✨</Text>
    </View>
    <View style={styles.floatingElement2}>
      <Text style={styles.floatingEmoji}>💫</Text>
    </View>
    <View style={styles.floatingElement3}>
      <Text style={styles.floatingEmoji}>🎯</Text>
    </View>

    <View style={styles.headerContent}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Text style={styles.fireIcon}>🔥</Text>
            <View style={styles.pulseRing} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.showroomTitle}>Deals of the Week</Text>
            <Text style={styles.showroomSubtitle}>⚡ Limited Time Offers</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.viewMoreButton}
          onPress={onViewMore}
          activeOpacity={0.8}
        >
          <Text style={styles.viewMoreText}>View All</Text>
          <Icon name="arrow-right" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.timerSection}>
        <View style={styles.timerHeader}>
          <Text style={styles.timerLabel}>🕒 Deals End In:</Text>
        </View>
        <WeeklyTimer />
      </View>
    </View>
  </View>
));

// Memoized Loading Component
const LoadingList = React.memo(() => (
  <FlatList
    data={Array(6).fill(null)}
    renderItem={({ index }) => <LoadingCard key={`loading-${index}`} />}
    keyExtractor={(_, index) => `loading-${index}`}
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.productList}
  />
));

// Memoized View More Card
const ViewMoreCard = React.memo(({ extraCount, onPress }) => (
  <TouchableOpacity style={styles.viewAllCard} onPress={onPress}>
    <View style={styles.viewAllContent}>
      <Text style={styles.fireIconLarge}>🔥</Text>
      <Text style={styles.viewAllText}>More Deals</Text>
      <Text style={styles.viewMoreSubtext}>{extraCount}+ more deals</Text>
    </View>
  </TouchableOpacity>
));

// Main Deals Component
const Deals = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { productsByShowroom, loading } = useSelector((state) => state.products);
  const cartId = useSelector((state) => state.cart.cartId);
  const [addingToCart, setAddingToCart] = useState({});

  const products = useMemo(
    () => productsByShowroom?.[DEALS_SHOWROOM_ID] || [],
    [productsByShowroom]
  );

  const displayProducts = useMemo(
    () => products.slice(0, MAX_DISPLAY_PRODUCTS),
    [products]
  );

  const extraProductsCount = useMemo(
    () => Math.max(0, products.length - MAX_DISPLAY_PRODUCTS),
    [products.length]
  );

  useEffect(() => {
    if (products.length === 0) {
      dispatch(
        fetchProductByShowroomAndRecord({
          showRoomCode: DEALS_SHOWROOM_ID,
          recordNumber: 10,
        })
      );
    }
  }, [dispatch, products.length]);

  const handleAddToCart = useCallback((product) => {
    setAddingToCart((prev) => ({ ...prev, [product.productID]: true }));

    dispatch(addToCart({
      cartId,
      productId: product.productID,
      price: product.price,
      quantity: 1,
    }))
      .then(() => {
        Alert.alert("Success", `${product.productName} added to cart!`);
      })
      .catch((error) => {
        Alert.alert("Error", `Failed to add: ${error.message}`);
      })
      .finally(() => {
        setAddingToCart((prev) => {
          const newState = { ...prev };
          delete newState[product.productID];
          return newState;
        });
      });
  }, [cartId, dispatch]);

  const handleProductPress = useCallback((productId) => {
    navigation.navigate('ProductDetails', { productId });
  }, [navigation]);

  const handleViewMore = useCallback(() => {
    navigation.navigate("showroom", { showRoomID: DEALS_SHOWROOM_ID });
  }, [navigation]);

  const renderProduct = useCallback(({ item }) => (
    <ProductCard
      product={item}
      onPress={handleProductPress}
      onAddToCart={handleAddToCart}
      isAddingToCart={addingToCart[item.productID]}
      showHotDeal={true}
    />
  ), [handleProductPress, handleAddToCart, addingToCart]);

  const keyExtractor = useCallback((item) => item.productID, []);

  const getItemLayout = useCallback((_, index) => ({
    length: CARD_WIDTH + CARD_MARGIN,
    offset: (CARD_WIDTH + CARD_MARGIN) * index,
    index,
  }), []);

  const renderFooter = useCallback(() => (
    extraProductsCount > 0 ? (
      <ViewMoreCard extraCount={extraProductsCount} onPress={handleViewMore} />
    ) : null
  ), [extraProductsCount, handleViewMore]);

  const shouldShowLoading = loading && products.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.showroomContainer}>
        <DealsHeader onViewMore={handleViewMore} />

        {shouldShowLoading ? (
          <LoadingList />
        ) : (
          <FlatList
            data={displayProducts}
            renderItem={renderProduct}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + CARD_MARGIN}
            snapToAlignment="start"
            removeClippedSubviews={true}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
            updateCellsBatchingPeriod={100}
            ListFooterComponent={renderFooter}
          />
        )}
      </View>
    </View>
  );
};

export default React.memo(Deals);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  showroomContainer: {
    marginBottom: 1,
  },
  showroomHeader: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  floatingElement1: {
    position: 'absolute',
    top: 10,
    right: 20,
  },
  floatingElement2: {
    position: 'absolute',
    top: 40,
    right: 60,
  },
  floatingElement3: {
    position: 'absolute',
    bottom: 20,
    right: 30,
  },
  floatingEmoji: {
    fontSize: 24,
    opacity: 0.3,
  },
  headerContent: {
    zIndex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  fireIcon: {
    fontSize: 32,
  },
  pulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    top: -4,
    left: -4,
  },
  headerTextContainer: {
    flex: 1,
  },
  showroomTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  showroomSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewMoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  timerSection: {
    marginTop: 8,
  },
  timerHeader: {
    marginBottom: 8,
  },
  timerLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeUnit: {
    alignItems: 'center',
  },
  timeValueContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  timeValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    marginTop: 4,
  },
  timeSeparator: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  productList: {
    paddingHorizontal: 2,
  },
  viewAllCard: {
    width: CARD_WIDTH,
    height: 200,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: CARD_MARGIN,
    borderWidth: 2,
    borderColor: '#10b981',
    borderStyle: 'dashed',
  },
  viewAllContent: {
    alignItems: 'center',
  },
  fireIconLarge: {
    fontSize: 48,
    marginBottom: 8,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  viewMoreSubtext: {
    fontSize: 12,
    color: '#059669',
  },
});
