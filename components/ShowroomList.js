import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { fetchHomePageShowrooms } from "../redux/slice/showroomSlice";

const ShowroomList = () => {
  const dispatch = useDispatch();
  const { homePageShowrooms, loading } = useSelector((state) => state.showrooms);

  useEffect(() => {
    dispatch(fetchHomePageShowrooms());
  }, [dispatch]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {homePageShowrooms.length > 0 ? (
          homePageShowrooms.map((showroom) => (
            <TouchableOpacity
              key={showroom.showRoomID}
              style={styles.button}
              onPress={() => {
                // TODO: navigate or filter products by showroom
                console.log("Selected Showroom:", showroom.showRoomName);
              }}
            >
              <Text style={styles.buttonText}>{showroom.showRoomName}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No Showrooms Available</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: "#10B981",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
  },
  loading: {
    padding: 10,
    alignItems: "center",
  },
});

export default ShowroomList;
