import React, { useState, useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  TextInput
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get('window');

// Enhanced FAQ data with icons and tags
const faqData = [
  {
    category: "About Franko Trading",
    icon: "business-outline",
    color: "#059669",
    gradient: ["#059669", "#047857"],
    items: [
      {
        question: "What is Franko Trading in Ghana known for?",
        answer: "Franko Trading is a trusted electronics retailer in Ghana, selling mobile phones, laptops, TVs, home appliances, and accessories. We are known for genuine products, affordable prices, and nationwide delivery.",
        tags: ["electronics", "retailer", "genuine"],
      },
      {
        question: "Is Franko Trading a legit electronics shop?",
        answer: "Yes. Franko Trading is a well-established and trusted brand in Ghana. All products are authentic and come with manufacturer or store warranties.",
        tags: ["authentic", "warranty", "trusted"],
      },
    ],
  },
  {
    category: "Products",
    icon: "phone-portrait-outline",
    color: "#0f766e",
    gradient: ["#0f766e", "#0d9488"],
    items: [
      {
        question: "What brands of mobile phones does Franko Trading sell?",
        answer: "We stock leading brands including Samsung, Tecno, Infinix, Nokia, Itel, Huawei, TCL, iPhone, HMD, Philips, Realme, and Oale.",
        tags: ["Samsung", "iPhone", "Android"],
      },
      {
        question: "Does Franko Trading sell iOS and Android devices?",
        answer: "Yes. We sell both iOS devices (iPhones) and Android devices from top brands, available at various Franko Trading stores nationwide.",
        tags: ["iOS", "Android", "nationwide"],
      },
      {
        question: "Does Franko Trading sell home appliances?",
        answer: "Yes. Our range includes fridges, air conditioners, blenders, microwaves, fans, generators, solar panels, air fryers, mixers, washing and speakers.",
        tags: ["appliances", "fridges", "AC"],
      },
      {
        question: "Does Franko Trading sell TVs?",
        answer: "Yes. We stock Franko TVs and Skyworth Google TVs in sizes from 32 inches to 100 inches. We do not sell Samsung, LG, Hisense, Nasco, or TCL TVs.",
        tags: ["TVs", "Google TV", "32-100 inches"],
      },
    ],
  },
  {
    category: "Shopping & Ordering",
    icon: "basket-outline",
    color: "#0891b2",
    gradient: ["#0891b2", "#0e7490"],
    items: [
      { 
        question: "How can I order from Franko Trading?", 
        answer: "You can shop in-store at any of our branches or order online via our official website or WhatsApp.",
        tags: ["online", "in-store", "WhatsApp"],
      },
      { 
        question: "Does Franko Trading accept installment payments?", 
        answer: "Yes. Selected phone models can be purchased on installment. You pay a deposit upfront and the balance in installments. Contact 0264189099 for details.",
        tags: ["installment", "deposit", "phones"],
      },
      { 
        question: "Does Franko Trading offer discounts?", 
        answer: "Yes. We run weekly deals, seasonal discounts, and cashback promotions. Follow us on Facebook, Instagram, and TikTok for updates.",
        tags: ["discounts", "deals", "cashback"],
      },
      { 
        question: "Can I pre-order items not yet in stock?", 
        answer: "Yes. If pre-order is available, the required amount will be displayed at checkout for you to pay. This could be a deposit or full payment depending on the product. You will be contacted to complete any remaining payment when the item arrives.",
        tags: ["pre-order", "deposit", "checkout"],
      },
    ],
  },
  {
    category: "Delivery & Shipping",
    icon: "car-outline",
    color: "#7c3aed",
    gradient: ["#7c3aed", "#6d28d9"],
    items: [
      { 
        question: "How does Franko Trading same-day delivery work in Accra?", 
        answer: "Orders placed before 3 PM within Accra are delivered the same day.",
        tags: ["same-day", "Accra", "3 PM"],
      },
      { 
        question: "How are orders outside Accra delivered?", 
        answer: "Orders placed before 3 PM are sent the same day to your nearest transport station for pick-up. Transportation costs are paid directly to the driver.",
        tags: ["outside Accra", "transport", "pickup"],
      },
      { 
        question: "Does Franko Trading offer cash-on-delivery?", 
        answer: "Yes. Cash-on-delivery is available only for orders within Accra and Kumasi.",
        tags: ["cash-on-delivery", "Accra", "Kumasi"],
      },
      { 
        question: "What payment methods does Franko Trading accept?", 
        answer: "We accept Mobile Money (MoMo Pay), bank transfers, and cash (for eligible locations). MoMo Pay can be done via Merchant ID: 189480 (Franko Trading Enterprise).",
        tags: ["MoMo", "bank transfer", "cash"],
      },
      { 
        question: "How much is delivery?", 
        answer: "Delivery costs vary by location. For station deliveries, you pay the transport fare directly to the driver upon receiving the item.",
        tags: ["delivery cost", "location", "driver"],
      },
    ],
  },
  {
    category: "Warranty & Repairs",
    icon: "construct-outline",
    color: "#dc2626",
    gradient: ["#dc2626", "#b91c1c"],
    items: [
      { 
        question: "Does Franko Trading provide repair services?", 
        answer: "Yes. We have dedicated technicians for phones, laptops, AC units, and TVs. Contact the service numbers listed for each product category.",
        tags: ["repair", "technicians", "service"],
      },
      { 
        question: "How do I claim warranty at Franko Trading?", 
        answer: "Bring your item and proof of purchase to any branch for assessment and repair or replacement if covered under warranty.",
        tags: ["warranty", "proof", "replacement"],
      },
    ],
  },
  {
    category: "Branches & Contact",
    icon: "location-outline",
    color: "#ea580c",
    gradient: ["#ea580c", "#c2410c"],
    items: [
      { 
        question: "Where are Franko Trading shops located?", 
        answer: "We have branches in Accra, Kumasi, Koforidua, Obuasi, Ho, Hohoe, Tema, Osu, Ashaiman, Madina, Haatso, Takoradi, Tarkwa, Cape Coast, Kasoa, and more. Contact details for each branch are available on our website and social media pages.",
        tags: ["locations", "branches", "nationwide"],
      },
      { 
        question: "What are Franko Trading's opening hours?", 
        answer: "All branches are open Monday to Saturday, 8:00 AM to 6:00 PM.",
        tags: ["hours", "Monday-Saturday", "8AM-6PM"],
      },
    ],
  },
  {
    category: "Other Services",
    icon: "gift-outline",
    color: "#9333ea",
    gradient: ["#9333ea", "#7c3aed"],
    items: [
      { 
        question: "Does Franko Trading offer promotional gift items?", 
        answer: "Yes, but they are available only for online purchases, not in-store.",
        tags: ["gifts", "online only", "promotional"],
      },
      { 
        question: "Is there a Franko Trading app?", 
        answer: "Yes. We have both an Android app and an iOS app, available in app stores. You can also place orders via our website or WhatsApp.",
        tags: ["app", "Android", "iOS"],
      },
    ],
  },
];

const SearchBar = ({ searchQuery, setSearchQuery, onClear }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnimation, {
      toValue: 1.02,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[
      styles.searchContainer,
      isFocused && styles.searchContainerFocused,
      { transform: [{ scale: scaleAnimation }] }
    ]}>
      <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search FAQs..."
        placeholderTextColor="#9ca3af"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={20} color="#6b7280" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const AnimatedFAQItem = ({ faq, questionIndex, section, isOpen, onToggle, searchQuery }) => {
  const [rotationAnimation] = useState(new Animated.Value(isOpen ? 1 : 0));
  const [heightAnimation] = useState(new Animated.Value(isOpen ? 1 : 0));
  const slideAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 300 + (questionIndex * 50),
      useNativeDriver: true,
    }).start();
  }, []);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(rotationAnimation, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(heightAnimation, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isOpen]);

  const chevronRotation = rotationAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const slideTranslation = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const slideOpacity = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handlePress = () => {
    onToggle();
  };

  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => (
      part.toLowerCase() === query.toLowerCase() ? (
        <Text key={index} style={styles.highlightText}>{part}</Text>
      ) : part
    ));
  };

  return (
    <Animated.View style={[
      styles.faqItem,
      {
        transform: [{ translateY: slideTranslation }],
        opacity: slideOpacity,
      }
    ]}>
      <TouchableOpacity
        style={[
          styles.questionRow,
          isOpen && styles.questionRowExpanded,
          { backgroundColor: isOpen ? section.color + '08' : 'transparent' }
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.questionContent}>
          <View style={[
            styles.questionNumber,
            { backgroundColor: section.color + '20' }
          ]}>
            <Text style={[styles.questionNumberText, { color: section.color }]}>
              {questionIndex + 1}
            </Text>
          </View>
          <Text style={styles.question}>
            {highlightText(faq.question, searchQuery)}
          </Text>
        </View>
        <View style={[
          styles.chevronContainer,
          { 
            backgroundColor: isOpen ? section.color : section.color + '15',
            borderColor: section.color + '30',
            borderWidth: 1
          }
        ]}>
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <Ionicons 
              name="chevron-down"
              size={16} 
              color={isOpen ? "white" : section.color} 
            />
          </Animated.View>
        </View>
      </TouchableOpacity>
      
      <Animated.View style={[
        styles.answerContainer,
        {
          maxHeight: heightAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 500],
          }),
        }
      ]}>
        <View style={[styles.answerDivider, { backgroundColor: section.color }]} />
        <Text style={styles.answer}>
          {highlightText(faq.answer, searchQuery)}
        </Text>
        {faq.tags && (
          <View style={styles.tagsContainer}>
            {faq.tags.map((tag, index) => (
              <View 
                key={index} 
                style={[styles.tag, { backgroundColor: section.color + '15' }]}
              >
                <Text style={[styles.tagText, { color: section.color }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const FAQScreen = ({ navigation }) => {
  const [expanded, setExpanded] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const headerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnimation, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleContactSupport = () => {
    navigation.navigate('CustomerService');
  };

  const toggleExpand = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const filteredData = faqData.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    )
  })).filter(section => section.items.length > 0);

  const headerTranslation = headerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  return (
    <SafeAreaView style={styles.safeArea}>

      
      {/* Enhanced Header with Gradient */}
      <Animated.View style={[
        styles.header,
        { transform: [{ translateY: headerTranslation }] }
      ]}>
        <View style={styles.headerGradient}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>FAQ Center</Text>
              <Text style={styles.headerSubtitle}>
                Get instant answers to your questions
              </Text>
            </View>
            <View style={styles.headerIcon}>
              <Ionicons name="help-circle-outline" size={28} color="rgba(255,255,255,0.8)" />
            </View>
          </View>
        </View>
      </Animated.View>

      <View style={styles.container}>
 

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {searchQuery && (
            <View style={styles.searchResults}>
              <Text style={styles.searchResultsText}>
                {filteredData.reduce((total, section) => total + section.items.length, 0)} results found
              </Text>
            </View>
          )}

          {filteredData.map((section, categoryIndex) => (
            <View key={categoryIndex} style={styles.section}>
              {/* Enhanced Category Header */}
              <View style={[
                styles.categoryHeader,
                { 
                  backgroundColor: `linear-gradient(135deg, ${section.gradient[0]}, ${section.gradient[1]})`,
                  borderLeftColor: section.color,
                  borderLeftWidth: 4,
                }
              ]}>
                <View style={styles.categoryTitleRow}>
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name={section.icon} size={22} color="white" />
                  </View>
                  <View style={styles.categoryTextContainer}>
                    <Text style={styles.categoryTitle}>{section.category}</Text>
                    <Text style={styles.categoryCount}>
                      {section.items.length} question{section.items.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {section.items.length}
                  </Text>
                </View>
              </View>

              {/* FAQ Items */}
              <View style={styles.faqContainer}>
                {section.items.map((faq, questionIndex) => {
                  const key = `${categoryIndex}-${questionIndex}`;
                  const isOpen = expanded[key];
                  return (
                    <AnimatedFAQItem
                      key={key}
                      faq={faq}
                      questionIndex={questionIndex}
                      section={section}
                      isOpen={isOpen}
                      onToggle={() => toggleExpand(categoryIndex, questionIndex)}
                      searchQuery={searchQuery}
                    />
                  );
                })}
              </View>
            </View>
          ))}
          
          {filteredData.length === 0 && searchQuery && (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={64} color="#d1d5db" />
              <Text style={styles.noResultsTitle}>No results found</Text>
              <Text style={styles.noResultsText}>
                Try adjusting your search terms or browse categories above
              </Text>
            </View>
          )}

          {/* Enhanced Footer */}
          <View style={styles.footer}>
            <View style={styles.footerIcon}>
              <Ionicons name="chatbubble-ellipses" size={32} color="#059669" />
            </View>
            <Text style={styles.footerTitle}>Still need help?</Text>
            <Text style={styles.footerText}>
              Our support team is here to assist you with any questions
            </Text>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={handleContactSupport}
              activeOpacity={0.8}
            >
              <Ionicons name="headset-outline" size={18} color="white" />
              <Text style={styles.contactButtonText}>Contact Support</Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#047857",
  },
  header: {
    backgroundColor: "#059669",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#047857",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
  },
  headerIcon: {
    marginLeft: 12,
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  searchContainerFocused: {
    borderColor: "#059669",
    backgroundColor: "white",
    elevation: 4,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
  },
  clearButton: {
    padding: 4,
  },
  searchResults: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#ecfdf5",
    borderBottomWidth: 1,
    borderBottomColor: "#d1fae5",
  },
  searchResultsText: {
    fontSize: 14,
    color: "#065f46",
    fontWeight: "500",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  categoryHeader: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#059669",
  },
  categoryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  categoryBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: "center",
  },
  categoryBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  faqContainer: {
    paddingHorizontal: 16,
  },
  faqItem: {
    marginVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 64,
    borderRadius: 12,
  },
  questionRowExpanded: {
    paddingBottom: 12,
  },
  questionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    marginRight: 12,
  },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  questionNumberText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  question: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
    lineHeight: 24,
  },
  highlightText: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    fontWeight: "bold",
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  answerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  answerDivider: {
    height: 3,
    marginBottom: 12,
    marginLeft: 40,
    borderRadius: 2,
  },
  answer: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 24,
    marginLeft: 40,
    textAlign: "justify",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginLeft: 40,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
  },
  noResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4b5563",
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  footer: {
    margin: 20,
    padding: 32,
    backgroundColor: "white",
    borderRadius: 20,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  footerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ecfdf5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  footerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  contactButton: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 4,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  contactButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
    marginRight: 8,
  },
});
export default FAQScreen;