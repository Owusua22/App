import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const brands = [
  { id: '760af684-7a19-46ab-acc5-7445ef32073a', logo: require('../assets/samsung.png'), name: 'Samsung', color: '#059669' },
  { id: 'c163ee86-1d24-4c97-943b-1f82a09c6066', logo: require('../assets/infinix.png'), name: 'Infinix', color: '#16a34a' },
  { id: '4c1dba1d-61b2-4ec3-9c03-38036dd02c89', logo: require('../assets/itel.png'), name: 'Itel', color: '#14b8a6' },
  { id: 'fb694e59-77be-455f-9573-acf917ffb39d', logo: require('../assets/hmd.png'), name: 'HMD', color: '#22c55e' },
  { id: '86cca959-70a4-448e-86f1-3601309f49a6', logo: require('../assets/tecno-logo.png'), name: 'Tecno', color: '#15803d' },
  { id: '5c6cf9ae-d44f-42a9-82e5-c82bbf6913cd', logo: require('../assets/apple.jpeg'), name: 'Apple', color: '#166534' },
  { id: 'd643698d-f794-4d33-9237-4a913aa463a2', logo: require('../assets/huawel.jpeg'), name: 'Huawei', color: '#0f766e' },
  
];
  

const BrandCard = React.memo(({ brand, index, onLayout }) => {
  const navigation = useNavigation();
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        { marginLeft: index === 0 ? 20 : 0 }
      ]}
      onLayout={onLayout}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate('Brands', { brandId: brand.id })}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.brandCard}
      >
        {/* Accent border */}
        <View style={[styles.accentBorder, { backgroundColor: brand.color }]} />
        
        {/* Glow effect container */}
        <View style={[styles.glowContainer, isPressed && styles.glowActive]}>
          <View style={[styles.logoContainer, { borderColor: `${brand.color}20` }]}>
            <Image source={brand.logo} style={styles.brandImage} resizeMode="contain" />
          </View>
        </View>
        
        <View style={styles.brandInfo}>
          <Text style={styles.brandName} numberOfLines={1}>
            {brand.name}
          </Text>
          <View style={[styles.brandIndicator, { backgroundColor: brand.color }]} />
        </View>

        {/* Shimmer overlay for premium feel */}
        <View style={styles.shimmerOverlay} />
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function ShopByBrandsBanner() {
  const [showArrows, setShowArrows] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const scrollViewRef = useRef(null);
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get('window');

  useEffect(() => {
    // Container entrance animation
    Animated.timing(fadeInAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (cardWidth > 0) {
      const totalWidth = brands.length * cardWidth + 40; // 40 for padding
      const shouldShowArrows = totalWidth > width;
      setShowArrows(shouldShowArrows);
      setCanScrollRight(shouldShowArrows);
    }
  }, [width, cardWidth]);

  const handleCardLayout = (event) => {
    if (cardWidth === 0) {
      setCardWidth(event.nativeEvent.layout.width + 16); // 16 for margin
    }
  };

  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;
    const maxScrollX = contentSize.width - layoutMeasurement.width;

    setCanScrollLeft(scrollX > 15);
    setCanScrollRight(scrollX < maxScrollX - 15);
  };

  const scrollBy = (direction) => {
    if (scrollViewRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollViewRef.current.scrollTo({
        x: scrollAmount,
        animated: true,
      });
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeInAnim }]}>
      {/* Background pattern */}
      <View style={styles.backgroundPattern} />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Brand Partners</Text>
            <View style={styles.titleAccent} />
          </View>
          <Text style={styles.subtitle}>Discover authentic products from trusted Brands</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="diamond-outline" size={24} color="#16a34a" />
        </View>
      </View>
      
      <View style={styles.carouselContainer}>
        {showArrows && canScrollLeft && (
          <TouchableOpacity 
            style={[styles.arrow, styles.arrowLeft]} 
            onPress={() => scrollBy('left')}
            activeOpacity={0.8}
          >
            <View style={styles.arrowInner}>
              <Ionicons name="chevron-back" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
        
        {showArrows && canScrollRight && (
          <TouchableOpacity 
            style={[styles.arrow, styles.arrowRight]} 
            onPress={() => scrollBy('right')}
            activeOpacity={0.8}
          >
            <View style={styles.arrowInner}>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
        
        <ScrollView
          horizontal
          ref={scrollViewRef}
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={120}
          snapToAlignment="start"
        >
          {brands.map((brand, index) => (
            <BrandCard 
              key={brand.id} 
              brand={brand} 
              index={index}
              onLayout={handleCardLayout}
            />
          ))}
          <View style={styles.scrollEndPadding} />
        </ScrollView>
      </View>

      {/* Bottom accent line */}
      <View style={styles.bottomAccent} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 6,
    marginVertical: 4,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 120,
    height: 120,
    backgroundColor: '#22c55e',
    opacity: 0.03,
    borderBottomLeftRadius: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  titleAccent: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#16a34a',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  carouselContainer: {
    position: 'relative',
    paddingBottom: 28,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    alignItems: 'center',
  },
  scrollEndPadding: {
    width: 20,
  },
  brandCard: {
    width: 104,
    marginRight: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  accentBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  glowContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  glowActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#f0fdf4',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#bbf7d0',
  },
  brandImage: {
    width: 44,
    height: 44,
  },
  brandInfo: {
    alignItems: 'center',
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  brandIndicator: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: -2,
    left: -50,
    width: 30,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    transform: [{ skewX: '-20deg' }],
    opacity: 0.7,
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    marginTop: -20,
  },
  arrowInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },
  bottomAccent: {
    height: 4,
    backgroundColor: '#dcfce7',
    marginHorizontal: 24,
    borderRadius: 2,
    marginBottom: 4,
  },
});