import React, { useEffect, useState } from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import Swiper from "react-native-swiper";
import { useDispatch, useSelector } from "react-redux";
import { getBannerPageAdvertisment } from "../redux/slice/advertismentSlice";

const backendBaseURL = "https://fte002n1.salesmate.app";

const CarouselComponent = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const { advertisments = [] } = useSelector((state) => state.advertisment);

  useEffect(() => {
    dispatch(getBannerPageAdvertisment()).finally(() => setLoading(false));
  }, [dispatch]);

  return (
    <View style={styles.container}>
      {loading ? (
        <Image source={require("../assets/kumasi.jpg")} style={styles.image} />
      ) : advertisments.length === 0 ? (
        <Image source={require("../assets/kumasi.jpg")} style={styles.image} />
      ) : (
      <Swiper
  autoplay={advertisments.length > 1}
  autoplayTimeout={5}
  loop={advertisments.length > 1}
  index={0}
  showsPagination={true}
  removeClippedSubviews={false} // Prevents flickering
  dotStyle={styles.dot}
  activeDotStyle={styles.activeDot}
>

          {advertisments.map((ad, index) => (
            <View key={index} style={styles.slide}>
              <Image
                source={{
                  uri: `${backendBaseURL}/Media/Ads/${ad.fileName.split("\\").pop()}`,
                }}
                style={styles.image}
              />
            </View>
          ))}

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
    width: "100%", // Match BannerComponent width
    height: 160, // Match BannerComponent height
    resizeMode: "cover",
  },
  noAdsText: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
    marginBottom: 10,
  },
  dot: {
    backgroundColor: "#ccc",
    width: 8,
    height: 8,
    borderRadius: 4,
    margin: 3,
    marginTop: 105
  },
  activeDot: {
    backgroundColor: "#10B981",
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 105
  },
});

export default CarouselComponent;