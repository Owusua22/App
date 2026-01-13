import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

const { width, height } = Dimensions.get('window');

export default function AboutUs() {
  const navigation = useNavigation();

  const coreValues = [
    { 
      icon: 'shield',
      title: 'Integrity', 
      desc: 'We believe in doing the right thing, always.',
      color: '#3B82F6'
    },
    { 
      icon: 'users',
      title: "Accountability", 
      desc: 'Constantly pushing boundaries and improving.',
      color: '#10B981'
    },
    { 
      icon: 'heart',
      title: 'Customer Satisfaction', 
      desc: 'Every decision centers on your satisfaction.',
      color: '#EF4444'
    },
    { 
      icon: 'zap',
      title: 'Teamwork', 
      desc: 'Collaboration that drives progress.',
      color: '#8B5CF6'
    },
  ];

  const benefits = [
    { icon: 'truck', text: 'Fast Delivery', desc: 'Quick delivery across Ghana' },
    { icon: 'rotate-ccw', text: 'Secure Payments', desc: 'Safe and protected transactions' },
    { icon: 'check-circle', text: 'Quality Guaranteed', desc: 'Only authentic products' },
    { icon: 'message-circle', text: 'Customer Support', desc: 'Dedicated support Team' },
  ];

  const products = [
    { icon: 'smartphone', name: 'Mobile Phones' },
    { icon: 'airplay', name: 'Laptops & Computers' },
    { icon: 'tv', name: 'Televisions' },
    { icon: 'headphones', name: 'Accessories' },
  ];

  const stats = [
    { number: '20+', label: 'Years of Excellence' },
    { number: '100K+', label: 'Customers Base' },
    { number: '50+', label: 'Brand Partners' },
    { number: '24/7', label: 'Customer Support' },
  ];

  const navigateToProducts = () => {
    navigation.navigate('Products');
  };

  const navigateToShops = () => {
    navigation.navigate('Shops');
  };

  const navigateToContact = () => {
    navigation.navigate('CustomerService');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroContent}>
          <View style={styles.badgeContainer}>
            <Icon name="star" size={16} color="#FCD34D" />
            <Text style={styles.badgeText}>Ghana's #1 Electronics Store</Text>
          </View>
          
          <Text style={styles.heroTitle}>Welcome to</Text>
          <Text style={styles.heroTitleAccent}>Franko Trading</Text>
          
          <Text style={styles.heroSubtitle}>
            "Phone Papa Fie" - Your trusted electronic partner since 2004
          </Text>
          
          <View style={styles.productsContainer}>
            {products.map((product, idx) => (
              <View key={idx} style={styles.productBadge}>
                <Icon name={product.icon} size={16} color="#FCD34D" />
                <Text style={styles.productBadgeText}>{product.name}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.heroButtons}>
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={navigateToProducts}
            >
              <Text style={styles.primaryButtonText}>Explore Products</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Our Story</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statsContainer}>
          {stats.map((stat, idx) => (
            <View key={idx} style={styles.statItem}>
              <Text style={styles.statNumber}>{stat.number}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Who We Are Section */}
      <View style={styles.aboutSection}>
        <View style={styles.locationBadge}>
          <Icon name="map-pin" size={16} color="#059669" />
          <Text style={styles.locationBadgeText}>Established 2004 • Adabraka, Accra</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Ghana's Leading Electronics Destination</Text>
        
        <Text style={styles.sectionText}>
          Franko Trading Limited is the premier retail and wholesale company specializing in mobile phones, computers, laptops, televisions, and accessories. For over two decades, we've been committed to bringing cutting-edge technology to Ghana at unbeatable prices.
        </Text>
        
        <Text style={styles.sectionText}>
          Located at Adabraka Opposite Roxy Cinema in Accra, we've earned the nickname "Phone Papa Fie" (Home of Quality Phones) by consistently delivering quality and affordability to every Ghanaian family.
        </Text>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={navigateToShops}
        >
          <Text style={styles.actionButtonText}>Visit Our Store</Text>
          <Icon name="arrow-right" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Products Grid */}
        <View style={styles.productsGrid}>
          <View style={styles.productCard}>
            <Icon name="smartphone" size={24} color="#059669" />
            <Text style={styles.productCardTitle}>Mobile Phones</Text>
            <Text style={styles.productCardDesc}>Latest smartphones</Text>
          </View>
          <View style={styles.productCard}>
            <FontAwesome5 name="laptop" size={24} color="#DC2626" />
            <Text style={styles.productCardTitle}>Computers</Text>
            <Text style={styles.productCardDesc}>Laptops & desktops</Text>
          </View>
          <View style={styles.productCard}>
            <Icon name="tv" size={24} color="#7C3AED" />
            <Text style={styles.productCardTitle}>Televisions</Text>
            <Text style={styles.productCardDesc}>Smart TVs & more</Text>
          </View>
          <View style={styles.productCard}>
            <Icon name="headphones" size={24} color="#DC2626" />
            <Text style={styles.productCardTitle}>Accessories</Text>
            <Text style={styles.productCardDesc}>All your accessories needs</Text>
          </View>
        </View>
      </View>

      {/* Mission & Vision Section */}
      <View style={styles.missionVisionSection}>
        {/* Mission */}
        <View style={[styles.missionVisionCard, { borderLeftColor: '#059669' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#DCFCE7' }]}>
            <Icon name="award" size={24} color="#059669" />
          </View>
          <Text style={styles.cardTitle}>Our Mission</Text>
          <Text style={styles.cardText}>
            To be the leader in inspiring Africa and the world with innovative products and designs, revolutionizing the electronics and mobile phone market through excellence and accessibility.
          </Text>
        </View>

        {/* Vision */}
        <View style={[styles.missionVisionCard, { borderLeftColor: '#DC2626' }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="zap" size={24} color="#DC2626" />
          </View>
          <Text style={styles.cardTitle}>Our Vision</Text>
          <Text style={styles.cardText}>
            To devote our human and technological resources to create superior household electronics and mobile phone markets through research and innovation in Ghana and the West African Sub-region.
          </Text>
        </View>
      </View>

      {/* Core Values */}
      <View style={styles.valuesSection}>
        <Text style={styles.sectionTitle}>Our Core Values</Text>
        <Text style={styles.sectionSubtitle}>
          These principles guide everything we do and define who we are as a company
        </Text>
        
        <View style={styles.valuesGrid}>
          {coreValues.map((value, idx) => (
            <View key={idx} style={styles.valueCard}>
              <View style={[styles.valueIconContainer, { backgroundColor: value.color }]}>
                <Icon name={value.icon} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.valueTitle}>{value.title}</Text>
              <Text style={styles.valueDesc}>{value.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Why Choose Us */}
      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>Why Choose Franko Trading?</Text>
        <Text style={styles.sectionSubtitle}>
          Experience the difference with our commitment to excellence and customer satisfaction
        </Text>
        
        <View style={styles.benefitsGrid}>
          {benefits.map((item, idx) => (
            <View key={idx} style={styles.benefitCard}>
              <View style={styles.benefitIconContainer}>
                <Icon name={item.icon} size={24} color="#059669" />
              </View>
              <Text style={styles.benefitTitle}>{item.text}</Text>
              <Text style={styles.benefitDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Ready to Experience the Best in Technology?</Text>
        <Text style={styles.ctaSubtitle}>
          Discover our latest collection of smartphones, laptops, TVs, and accessories. Quality guaranteed, prices you'll love.
        </Text>
        
        <View style={styles.ctaButtons}>
          <TouchableOpacity 
            style={styles.ctaPrimaryButton} 
            onPress={navigateToProducts}
          >
            <Text style={styles.ctaPrimaryButtonText}>Browse Our Products</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.ctaSecondaryButton} 
            onPress={navigateToContact}
          >
            <Text style={styles.ctaSecondaryButtonText}>Contact Us Today</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.locationContainer}>
          <Icon name="map-pin" size={20} color="#FCD34D" />
          <Text style={styles.locationText}>Visit us at Accra, Kingsway, Opposite GCB (Former UT Bank Building)</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroSection: {
    backgroundColor: '#059669',
    minHeight: height * 0.7,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  heroContent: {
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroTitleAccent: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FCD34D',
    textAlign: 'center',
    marginBottom: 24,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#D1FAE5',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '300',
  },
  productsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 12,
  },
  productBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
  },
  productBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  heroButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#FCD34D',
    borderRadius: 25,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 32,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsSection: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    width: '45%',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  aboutSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  locationBadgeText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  sectionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'left',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  productCardDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  missionVisionSection: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  missionVisionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    marginBottom: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  valuesSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  valueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  valueIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  valueDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
  },
  benefitsSection: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  benefitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  benefitIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  benefitTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  benefitDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  ctaSection: {
    backgroundColor: '#059669',
    paddingVertical: 80,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 40,
  },
  ctaSubtitle: {
    fontSize: 18,
    color: '#D1FAE5',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 28,
  },
  ctaButtons: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 48,
  },
  ctaPrimaryButton: {
    backgroundColor: '#FCD34D',
    borderRadius: 25,
    paddingHorizontal: 40,
    paddingVertical: 16,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  ctaPrimaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ctaSecondaryButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 40,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  ctaSecondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    textAlign: 'center',
  },
});
