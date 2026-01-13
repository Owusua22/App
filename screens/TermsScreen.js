import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Shield,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CreditCard,
  FileText,
  Info,
  ArrowLeft,
  Clock,
  Phone,
  Mail,
  ExternalLink,
} from "lucide-react-native";
import logo from "../assets/frankoIcon.png";

const TermsScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Scroll to top when mounted
  }, []);

  const handleContactSupport = () => {
    navigation.navigate("CustomerService");
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const PolicyCard = ({ title, icon, color, bgColor, borderColor, children }) => (
    <View style={[styles.policyCard, { borderColor, backgroundColor: bgColor }]}>
      <View style={[styles.policyCardHeader, { backgroundColor: color }]}>
        {icon}
        <Text style={styles.policyCardTitle}>{title}</Text>
      </View>
      <View style={styles.policyCardContent}>
        {children}
      </View>
    </View>
  );

  const BulletPoint = ({ children, style }) => (
    <View style={styles.bulletContainer}>
      <View style={styles.bulletDot} />
      <Text style={[styles.bulletText, style]}>{children}</Text>
    </View>
  );

 
  return (
    <SafeAreaView style={styles.container}>

      
      {/* Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Policies</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.content}>
          
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.logoContainer}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
              <View style={styles.verifiedBadge}>
                <Shield size={14} color="#fff" />
              </View>
            </View>
            <Text style={styles.companyName}>FRANKO TRADING LIMITED</Text>
            <Text style={styles.heroDescription}>
              Your trusted partner in electronics. Review our comprehensive terms and policies for a seamless shopping experience.
            </Text>
            
            {/* Key Info Banner */}
            <View style={styles.keyInfoBanner}>
              <View style={styles.keyInfoItem}>
                <Clock size={20} color="#10B981" />
                <Text style={styles.keyInfoText}>7 Day Return Policy</Text>
              </View>
              <View style={styles.keyInfoDivider} />
              <View style={styles.keyInfoItem}>
                <Shield size={20} color="#10B981" />
                <Text style={styles.keyInfoText}>Warranty Protected</Text>
              </View>
            </View>
          </View>


          {/* Main Policy Section */}
          <View style={styles.policySection}>
            <View style={styles.policySectionHeader}>
              <FileText size={24} color="#10B981" />
              <Text style={styles.policySectionTitle}>Return Policy Details</Text>
            </View>

            {/* Important Notice */}
            <View style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <Info size={20} color="#3B82F6" />
                <Text style={styles.noticeTitle}>Important Notice</Text>
              </View>
              <Text style={styles.noticeText}>
                Subject to Terms and Conditions, Franko Trading Enterprise offers returns, exchange, or refund for items purchased within{" "}
                <Text style={styles.highlightText}>7 DAYS OF PURCHASE</Text>. We do not accept returns or exchanges for any reason whatsoever after this period has elapsed.
              </Text>
            </View>

            {/* Policy Cards */}
            <Text style={styles.subsectionTitle}>Eligibility Conditions</Text>
            
            <PolicyCard
              title="WRONG ITEM DELIVERED"
              icon={<XCircle size={18} color="#fff" />}
              color="#EF4444"
              bgColor="#FEF2F2"
              borderColor="#FECACA"
            >
              <BulletPoint>The seals on the box must not be broken or opened</BulletPoint>
              <BulletPoint>There should be no dents or liquid intrusion on the item</BulletPoint>
              <BulletPoint>Proof of Purchase/Receipt must be provided</BulletPoint>
            </PolicyCard>

            <PolicyCard
              title="MANUFACTURING DEFECTS"
              icon={<AlertTriangle size={18} color="#fff" />}
              color="#22C55E"
              bgColor="#F0FDF4"
              borderColor="#BBF7D0"
            >
              <BulletPoint>Within 7 days, defective items will be replaced (subject to stock availability)</BulletPoint>
              <BulletPoint>All items undergo inspection/diagnosis upon return</BulletPoint>
              <BulletPoint>After 7 days, defective items are sent to Brand Service Centre for warranty repairs</BulletPoint>
            </PolicyCard>

            <PolicyCard
              title="INCOMPLETE PACKAGE"
              icon={<Package size={18} color="#fff" />}
              color="#F59E0B"
              bgColor="#FFFBEB"
              borderColor="#FDE68A"
            >
              <BulletPoint>Incomplete packages or missing complementary items must be reported within 7 days for immediate resolution</BulletPoint>
            </PolicyCard>

            {/* Refund Policy */}
            <View style={styles.refundSection}>
              <Text style={styles.subsectionTitle}>Refund & Charge Back Policy</Text>
              
              <PolicyCard
                title="UNDELIVERED ORDERS"
                icon={<CreditCard size={18} color="#fff" />}
                color="#3B82F6"
                bgColor="#EFF6FF"
                borderColor="#BFDBFE"
              >
                <BulletPoint>Refund requests for undelivered orders are vetted and processed within 30 days</BulletPoint>
                <BulletPoint>Charge back requests must be initiated through your bank</BulletPoint>
                <BulletPoint>Refunds are issued by cheque for accounting purposes</BulletPoint>
              </PolicyCard>
            </View>
          </View>

          {/* Support Section */}
          <View style={styles.supportSection}>
            <View style={styles.supportCard}>
              <View style={styles.supportIcon}>
                <Shield size={32} color="#10B981" />
              </View>
              <Text style={styles.supportTitle}>Need Help?</Text>
              <Text style={styles.supportDescription}>
                Our dedicated customer service team is ready to assist you with any questions about our policies or your orders.
              </Text>
              
              <View style={styles.supportButtons}>
                <TouchableOpacity 
                  style={styles.primarySupportButton} 
                  onPress={handleContactSupport}
                  activeOpacity={0.8}
                >
                  <Phone size={18} color="#fff" />
                  <Text style={styles.primarySupportButtonText}>Contact Support</Text>
                </TouchableOpacity>
                
               
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            <View style={styles.footerContent}>
              <Text style={styles.lastUpdated}>
                Last updated: {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <Text style={styles.copyrightText}>
                © 2025 Franko Trading Limited. All rights reserved.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header Styles
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    marginTop: -8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    borderWidth: 3,
    borderColor: '#BBF7D0',
  },
  logo: {
    height: 56,
    width: 56,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  companyName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: '90%',
  },
  
  // Key Info Banner
  keyInfoBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  keyInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  keyInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  keyInfoDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#BBF7D0',
    marginHorizontal: 8,
  },
  
  // Quick Access Section
  quickAccessSection: {
    marginBottom: 28,
  },
  quickAccessGrid: {
    gap: 12,
  },
  quickAccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickAccessIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  quickAccessContent: {
    flex: 1,
  },
  quickAccessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  quickAccessDesc: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  // Section Styles
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    marginTop: 8,
  },
  
  // Policy Section
  policySection: {
    marginBottom: 20,
  },
  policySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  policySectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  
  // Notice Card
  noticeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  noticeText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  highlightText: {
    fontWeight: '700',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  
  // Policy Cards
  policyCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  policyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  policyCardTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  policyCardContent: {
    padding: 20,
  },
  
  // Bullet Points
  bulletContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginTop: 8,
    marginRight: 12,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    flex: 1,
  },
  
  // Refund Section
  refundSection: {
    marginTop: 16,
  },
  
  // Support Section
  supportSection: {
    marginBottom: 28,
  },
  supportCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  supportIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  supportTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  supportDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  supportButtons: {
    width: '100%',
    gap: 12,
  },
  primarySupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
  },
  primarySupportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondarySupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
    gap: 8,
  },
  secondarySupportButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Footer
  footer: {
    marginTop: 10,
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 20,
  },
  footerContent: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  copyrightText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
export default TermsScreen;