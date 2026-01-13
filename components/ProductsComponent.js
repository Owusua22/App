import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { resetProducts, fetchProduct } from "../redux/slice/productSlice";

const screenWidth = Dimensions.get("window").width;

const formatPrice = (price) =>
  price
    ? new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(price)
    : "N/A";

export default function ProductsComponent() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { products, loading } = useSelector((state) => state.products);

  const [recentProducts, setRecentProducts] = useState([]);

  useFocusEffect(
    React.useCallback(() => {
      dispatch(resetProducts());
      dispatch(fetchProduct());
    }, [dispatch])
  );

  useEffect(() => {
    if (products && products.length > 0) {
      const sortedProducts = products
        .slice()
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
        .slice(0, 24);
      setRecentProducts(sortedProducts);
    }
  }, [products]);

  const getValidImageURL = (imagePath) => {
    if (!imagePath) {
      return "https://via.placeholder.com/150";
    }
    if (imagePath.startsWith("F:\\") || imagePath.startsWith("D:\\")) {
      return `https://fte002n1.salesmate.app/Media/Products_Images/${imagePath.split("\\").pop()}`;
    }
    return imagePath;
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonBackgroundLogo}>
        <Image
          source={require("../assets/frankoIcon.png")}
          style={styles.skeletonLogo}
        />
      </View>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonText} />
      <View style={[styles.skeletonText, styles.skeletonTextShort]} />
    </View>
  );

  const renderItem = ({ item }) => {
    const productImageURL = getValidImageURL(item.productImage);
    const discount =
      item.oldPrice > 0
        ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)
        : 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate("ProductDetails", { productId: item.productID })}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: productImageURL }} style={styles.productImage} />
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{`${discount}% OFF`}</Text>
            </View>
          )}
        </View>
        <Text style={styles.productName} numberOfLines={1}>
          {item.productName}
        </Text>
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
          {item.oldPrice > 0 && (
            <Text style={styles.oldPrice}>{formatPrice(item.oldPrice)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && recentProducts.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Featured Products</Text>
        <FlatList
          data={Array.from({ length: 4 })}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderSkeleton}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="storefront" size={20} color="#fff" style={styles.icon} />
        <Text style={styles.title}>Featured Products</Text>
      </View>
      <FlatList
        data={recentProducts}
        keyExtractor={(item) => item.productID?.toString() || Math.random().toString()}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        style={styles.shopNowButton}
        onPress={() => navigation.navigate("Products")}
      >
        <Ionicons name="cart" size={20} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.shopNowText}>Shop Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingBottom: 70,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  row: {
    justifyContent: "space-between",
  },
  productCard: {
    flex: 1,
    margin: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
    maxWidth: "48%",
  },
  productImage: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    alignSelf: "center",
  },
  productName: {
    fontSize: 13,
    color: "#333",
  },
  productPrice: {
    fontSize: 12,
    color: "#D72638",
    fontWeight: "bold",
  },
  discountBadge: {
    position: "absolute",
    top: 5,
    left: 5,
    backgroundColor: "#D72638",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 12,
  },
  discountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  oldPrice: {
    fontSize: 10,
    color: "#aaa",
    textDecorationLine: "line-through",
  },
  shopNowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D72638",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  buttonIcon: {
    marginRight: 5,
  },
  shopNowText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
