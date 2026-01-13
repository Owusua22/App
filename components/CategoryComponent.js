import { useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const categories = [
  { name: "Phones", icon: "smartphone", route: "Phones" },
  { name: "Laptops", icon: "laptop", route: "Computers" },
  { name: "Refrigerator", icon: "kitchen", route: "Fridge" },
  { name: "Television", icon: "tv", route: "Television" },
  { name: "Speakers", icon: "speaker", route: "Speakers" },
  { name: "Accessories", icon: "headphones", route: "Accessories" },
  { name: "Air-conditioners", icon: "ac-unit", route: "AirCondition" },
  { name: "Washing Machine", icon: "local-laundry-service", route: "WashingMachine" },

  

];

const CategoryComponent = () => {
  const navigation = useNavigation();

  const handleViewAllPress = () => {
    navigation.navigate('Category');
  };

  const handleCategoryPress = (category) => {
    navigation.navigate(category.route);
  };

  const CategoryItem = ({ category, index }) => {
    const scaleValue = useRef(new Animated.Value(1)).current;
    const opacityValue = useRef(new Animated.Value(1)).current;
    const translateY = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 0.92,
          useNativeDriver: true,
          tension: 400,
          friction: 10,
        }),
        Animated.spring(translateY, {
          toValue: -2,
          useNativeDriver: true,
          tension: 400,
          friction: 10,
        }),
        Animated.timing(opacityValue, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const handlePressOut = () => {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 400,
          friction: 10,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 400,
          friction: 10,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    };

    return (
      <TouchableOpacity
        key={index}
        onPress={() => handleCategoryPress(category)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.categoryItem}
      >
        <Animated.View 
          style={[
            styles.categoryContainer, 
            { 
              transform: [
                { scale: scaleValue },
                { translateY: translateY }
              ],
              opacity: opacityValue 
            }
          ]}
        >
          <View style={styles.imageContainer}>
            <LinearGradient
              colors={['#f0fdf4', '#d1fae5']}
              style={styles.gradientBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon
                name={category.icon}
                size={32}
                color="#10B981"
              />
            </LinearGradient>
          </View>
          <Text style={styles.categoryName} numberOfLines={2}>
            {category.name}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Categories</Text>
              <Text style={styles.subtitle}>Explore our products</Text>
            </View>
            <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllPress}>
              <Text style={styles.viewAll}>View All</Text>
              <Icon name="arrow-forward-ios" size={14} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories Grid */}
        <View style={styles.categoriesGrid}>
          {categories.map((category, index) => (
            <CategoryItem key={index} category={category} index={index} />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginRight: 4,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  categoryItem: {
    width: (width - 88) / 4, // 4 columns with proper spacing
    marginBottom: 20,
  },
  categoryContainer: {
    alignItems: 'center',
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  gradientBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: '100%',
  },
});

export default CategoryComponent;