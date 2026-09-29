import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { loadCart } from "../redux/slice/cartSlice";

const GREEN = "#059669";
const GREEN_DARK = "#047857";
const INK = "#1F2937";
const MUTED = "#6B7280";
const MARQUEE_HEIGHT = 23;

const PRODUCT_SUGGESTIONS = [
  "Phones",
  "Smart TVs",
  "Fridge",
  "Laptop",
  "Air-conditioners",
  "Home appliances",
];

const HEADER_CATEGORIES = [
  { name: "Phones", icon: "smartphone", route: "Phones" },
  { name: "Laptops", icon: "laptop", route: "Computers" },
  { name: "Refrigerator", icon: "kitchen", route: "Fridge" },
  { name: "Television", icon: "tv", route: "Television" },
  { name: "Speakers", icon: "speaker", route: "Speakers" },
  { name: "Accessories", icon: "headphones", route: "Accessories" },
  { name: "Air-conditioners", icon: "ac-unit", route: "AirCondition" },
  {
    name: "Washing Machine",
    icon: "local-laundry-service",
    route: "WashingMachine",
  },
];

function RotatingSearchPrompt({ items = PRODUCT_SUGGESTIONS }) {
  const suggestions = items.length ? items : ["Search products"];
  const [index, setIndex] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (suggestions.length < 2) return undefined;

    let active = true;
    const showNextSuggestion = () => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -MARQUEE_HEIGHT,
          duration: 210,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!active || !finished) return;

        setIndex((current) => (current + 1) % suggestions.length);
        translateY.setValue(MARQUEE_HEIGHT);
        opacity.setValue(0.25);

        // Each incoming product rises from below and flashes once before the
        // next product takes its turn.
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 270,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 120,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.38,
              duration: 75,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 170,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    };

    const timer = setInterval(showNextSuggestion, 2200);
    return () => {
      active = false;
      clearInterval(timer);
      translateY.stopAnimation();
      opacity.stopAnimation();
    };
  }, [suggestions.length, translateY, opacity]);

  return (
    <View style={styles.marqueeViewport}>
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.searchPrompt,
          { opacity, transform: [{ translateY }] },
        ]}
      >
        {suggestions[index % suggestions.length]}
      </Animated.Text>
    </View>
  );
}

const Header = ({
  onNotificationsPress,
  searchSuggestions = PRODUCT_SUGGESTIONS,
}) => {
  const suggestions =
    Array.isArray(searchSuggestions) && searchSuggestions.length
      ? searchSuggestions
      : PRODUCT_SUGGESTIONS;
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const cartCount = useSelector((state) => Number(state.cart?.totalItems) || 0);

  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    dispatch(loadCart());
  }, [dispatch]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      dispatch(loadCart());
    });
    return unsubscribe;
  }, [navigation, dispatch]);

  const navigateToCart = () => navigation.navigate("cart");
  const navigateToWishlist = () => navigation.navigate("Wishlist");

  const navigateToCategory = (category) => {
    setActiveCategory(category.route);
    navigation.navigate(category.route);
  };

  const renderQuickCategory = (category) => {
    const isActive = activeCategory === category.route;
    return (
      <TouchableOpacity
        key={category.route}
        style={[styles.categoryItem, isActive && styles.categoryItemActive]}
        onPress={() => navigateToCategory(category)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        <MaterialIcons
          name={category.icon}
          size={17}
          color={isActive ? GREEN_DARK : MUTED}
          style={styles.categoryIcon}
        />
        <Text
          numberOfLines={1}
          style={[styles.categoryText, isActive && styles.categoryTextActive]}
        >
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.headerWrapper}>
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationsPress}
          disabled={!onNotificationsPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Feather name="bell" size={22} color={GREEN_DARK} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate("Search")}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Search products. Suggested: ${suggestions.join(", ")}`}
        >
          <Feather name="search" size={17} color={MUTED} style={styles.searchIcon} />
          <RotatingSearchPrompt items={suggestions} />
          <MaterialIcons
            name="auto-awesome"
            size={21}
            color={GREEN}
            style={styles.sparkleIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={navigateToWishlist}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Wishlist"
        >
          <Feather name="heart" size={23} color={INK} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={navigateToCart}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Cart${cartCount ? `, ${cartCount} items` : ""}`}
        >
          <View style={styles.cartIconWrap}>
            <Feather name="shopping-bag" size={21} color={GREEN_DARK} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartCount > 99 ? "99+" : cartCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.categoryRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.categoryScrollContent}
          style={styles.categoryScroll}
        >
          {HEADER_CATEGORIES.map(renderQuickCategory)}
        </ScrollView>

        <View style={styles.menuDivider} />
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate("Category")}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Categories"
        >
          <MaterialIcons name="menu" size={23} color={GREEN_DARK} />
        </TouchableOpacity>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: "#FFFFFF",
    paddingTop: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5F5EC",
  },
  topRow: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  iconButton: {
    width: 32,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flex: 1,
    minWidth: 0,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#9CA3AF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
  },
  searchIcon: {
    marginRight: 7,
  },
  marqueeViewport: {
    flex: 1,
    height: MARQUEE_HEIGHT,
    justifyContent: "center",
    overflow: "hidden",
  },
  searchPrompt: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
  },
  sparkleIcon: {
    marginLeft: 4,
  },
  cartIconWrap: {
    width: 28,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -3,
    right: -7,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
  },
  categoryRow: {
    height: 43,
    flexDirection: "row",
    alignItems: "stretch",
  },
  categoryScroll: {
    flex: 1,
    minWidth: 0,
  },
  categoryScrollContent: {
    alignItems: "stretch",
    paddingRight: 7,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 14,
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  categoryIcon: {
    marginRight: 5,
  },
  categoryItemActive: {
    borderBottomColor: GREEN,
  },
  categoryText: {
    color: INK,
    fontSize: 12,
    fontWeight: "500",
  },
  categoryTextActive: {
    color: GREEN_DARK,
    fontWeight: "700",
  },
  menuDivider: {
    width: 1,
    height: 26,
    alignSelf: "center",
    backgroundColor: "#D1D5DB",
  },
  menuButton: {
    width: 39,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: 8,
  },

});

export default Header;
