import { 
  View, 
  Text, 
  TouchableOpacity, 
  Linking, 
  TextInput, 
  FlatList, 
  Alert, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  KeyboardAvoidingView,
  Platform,

  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';


const { width } = Dimensions.get('window');

const ShopScreen = () => {
  const locations = [
    {
      title: "ADABRAKA",
      address: "OPPOSITE ROXY BUS STOP ADABRAKA - ACCRA",
      tel: "0264189099",
      lat: 5.558,
      lng: -0.2057,
    },
    {
      title: "ACCRA",
      address: "UTC NEAR DESPITE BUILDING",
      tel: "0561925889",
      lat: 5.552,
      lng: -0.2022,
    },
    {
      title: "CIRCLE",
      address: "NEAR ODO RICE BUILDING",
      tel: "0302250396",
      lat: 5.5599,
      lng: -0.2076,
    },
    {
      title: "CIRCLE",
      address: "OPPOSITE ODO RICE BUILDING",
      tel: "0261506861",
      lat: 5.559,
      lng: -0.207,
    },
    {
      title: "CIRCLE",
      address: "ADJACENT ODO RICE BUILDING",
      tel: "0509842053",
      lat: 5.5591,
      lng: -0.2069,
    },
    {
      title: "OSU",
      address: "OXFORD STREET BEHIND VODAFONE OFFICE",
      tel: "0302772103",
      lat: 5.557,
      lng: -0.182,
    },
    {
      title: "TEMA",
      address: "COMMUNITY 1 STADIUM ROAD OPPOSITE WATER WORKS",
      tel: "0303214499",
      lat: 5.678,
      lng: -0.0166,
    },
    {
      title: "MADINA",
      address: "MADINA OLD ROAD AROUND ABSA BANK, REPUBLIC BANK",
      tel: "0241184688",
      lat: 5.683,
      lng: -0.1654,
    },
    {
      title: "HAATSO",
      address: "HAATSO STATION/BEIGE CAPITAL BUILDING, OPPOSITE MTN",
      tel: "0243628837",
      lat: 5.653,
      lng: -0.213,
    },
    {
      title: "LAPAZ",
      address: "NII BOI JUNCTION OPPOSITE PRUDENTIAL BANK",
      tel: "0561944202",
      lat: 5.607,
      lng: -0.235,
    },
    {
      title: "KASOA",
      address: "OPPOSITE POLYCLINIC",
      tel: "0264084686",
      lat: 5.534,
      lng: -0.4244,
    },
    {
      title: "KOFORIDUA",
      address: "ALL NATION UNIVERSITY TOWERS, PRINCE BOATENG AROUND ABOUT",
      tel: "0268313323",
      lat: 6.09,
      lng: -0.259,
    },
    {
      title: "KUMASI",
      address: "OPPOSITE HOTEL DE KINGSWAY",
      tel: "0322041018",
      lat: 6.692,
      lng: -1.618,
    },
    {
      title: "KUMASI",
      address: "ASEDA HOUSE OPPOSITE CHALLENGE BOOKSHOP",
      tel: "0322081949",
      lat: 6.688,
      lng: -1.622,
    },
    {
      title: "KUMASI",
      address: "ADJACENT MELCOM ADUM",
      tel: "0322047303",
      lat: 6.693,
      lng: -1.619,
    },
    {
      title: "KUMASI",
      address: "NEAR BARCLAYS BANK",
      tel: "0206310483",
      lat: 6.691,
      lng: -1.6225,
    },
    {
      title: "KUMASI",
      address: "NEAR KUFFOUR CLINIC",
      tel: "0501538602",
      lat: 6.694,
      lng: -1.621,
    },
    {
      title: "KUMASI",
      address: "OPPOSITE KEJETIA",
      tel: "0501525698",
      lat: 6.69,
      lng: -1.623,
    },
    {
      title: "HO",
      address: "OPPOSITE AMEGASHI (GOD IS GREAT BUILDING)",
      tel: "0362025775",
      lat: 6.612,
      lng: 0.47,
    },
    {
      title: "HO ANNEX",
      address: "NEAR THE HO MAIN STATION",
      tel: "0501647165",
      lat: 6.6125,
      lng: 0.4695,
    },
    {
      title: "SUNYANI",
      address: "OPPOSITE COCOA BOARD",
      tel: "0202765836",
      lat: 7.34,
      lng: -2.326,
    },
    {
      title: "TECHIMAN",
      address: "TECHIMAN TAXI RANK NEAR REPUBLIC BANK",
      tel: "0352522426",
      lat: 7.583,
      lng: -1.939,
    },
    {
      title: "BEREKUM",
      address: "BEREKUM ROUNDABOUT OPPOSITE SG-SSB BANK",
      tel: "0209835344",
      lat: 7.456,
      lng: -2.586,
    },
    {
      title: "CAPE COAST",
      address: "LONDON BRIDGE OPPOSITE OLD GUINNESS DEPOT",
      tel: "0264212339",
      lat: 5.106,
      lng: -1.246,
    },
    {
      title: "TAKORADI",
      address: "CAPE COAST STATION NEAR SUPER STAR HOTEL",
      tel: "0249902589",
      lat: 4.889,
      lng: -1.755,
    },
    {
      title: "TARKWA",
      address: "TARKWA STATION NEAR THE SHELL FILLING STATION",
      tel: "0312320144",
      lat: 5.312,
      lng: -1.995,
    },
    {
      title: "TAMALE",
      address: "OLD SALAGA STATION NEAR PK",
      tel: "0265462241",
      lat: 9.407,
      lng: -0.853,
    },
    {
      title: "HOHOE",
      address: "JAHLEX STORE NEAR THE TRAFFIC LIGHT",
      tel: "0558106241",
      lat: 7.15,
      lng: 0.473,
    },
    {
      title: "WA",
      address: "ZONGO OPPOSITE MAMA'S KITCHEN",
      tel: "0261915228",
      lat: 10.06,
      lng: -2.501,
    },
    {
      title: "WA",
      address: "WA MAIN STATION",
      tel: "0507316718",
      lat: 10.0605,
      lng: -2.5005,
    },
    {
      title: "BOLGA",
      address: "COMMERCIAL STREET NEAR ACCESS BANK",
      tel: "0501538603",
      lat: 10.787,
      lng: -0.851,
    },
    {
      title: "OBUASI",
      address: "CENTRAL MOSQUE-OPPOSITE ADANSI RURAL BANK",
      tel: "0263535131",
      lat: 6.204,
      lng: -1.666,
    },
    {
      title: "SWEDRU",
      address: "OPPOSITE MELCOM",
      tel: "0557872937",
      lat: 5.532,
      lng: -0.682,
    },
    {
      title: "ASHIAMAN",
      address: "OPPOSITE MAIN LORRY STATION",
      tel: "0509570736",
      lat: 5.688,
      lng: -0.04,
    },
    {
      title: "CIRCLE SERVICE CENTER",
      address: "NEAR ODO RICE",
      tel: "0501575745",
      lat: 5.5597,
      lng: -0.208,
    },
    {
      title: "KUMASI SERVICE CENTER",
      address: "ADUM BEHIND THE OLD MELCOM BUILDING",
      tel: "0322033821",
      lat: 6.693,
      lng: -1.619,
    },
    {
      title: "TAMALE SERVICE CENTER",
      address: "ADJACENT QUALITY FIRST SHOPPING CENTER",
      tel: "0501505020",
      lat: 9.411,
      lng: -0.856,
    },
    {
      title: "TOGO",
      address: "",
      tel: "+228 92 01 97 45",
      lat: 6.137,
      lng: 1.212,
    },
  ];

  const handleFormSubmit = (values) => {
    // emailjs implementation would go here
    Alert.alert("Success", "Your message has been sent successfully!");
  };

  const openMap = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  const openCall = (tel) => {
    const url = `tel:${tel}`;
    Linking.openURL(url);
  };

  const renderLocation = ({ item, index }) => (
    <View style={[styles.locationCard, { marginTop: index === 0 ? 0 : 12 }]}>
      <View style={styles.locationHeader}>
        <View style={styles.locationTitleContainer}>
          <MaterialIcons name="store" size={20} color="#5DD39E" />
          <Text style={styles.locationTitle}>{item.title}</Text>
        </View>
        {item.title.includes("SERVICE CENTER") && (
          <View style={styles.serviceBadge}>
            <Text style={styles.serviceBadgeText}>Service</Text>
          </View>
        )}
      </View>
      
      <View style={styles.addressContainer}>
        <MaterialIcons name="location-on" size={16} color="#666" />
        <Text style={styles.addressText}>{item.address}</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.mapButton]} 
          onPress={() => openMap(item.lat, item.lng)}
        >
          <MaterialIcons name="map" size={16} color="#006838" />
          <Text style={styles.mapButtonText}>View Map</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.callButton]} 
          onPress={() => openCall(item.tel)}
        >
          <MaterialIcons name="phone" size={16} color="#fff" />
          <Text style={styles.callButtonText}>{item.tel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
    
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
     

          {/* Locations Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="store" size={24} color="#D7263D" />
              <Text style={styles.sectionTitle}>Our Store Locations</Text>
            </View>
            <Text style={styles.locationsSubtitle}>Find us at any of our convenient locations</Text>

            <FlatList
              data={locations}
              renderItem={renderLocation}
              keyExtractor={(item, index) => `${item.title}-${index}`}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 15,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
    textAlign: 'center',
  },

  // Quick Contact Cards
  quickContactContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  quickContactCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickContactIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D7263D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickContactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  quickContactSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 8,
  },
  quickContactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D7263D',
  },

  // Section Containers
  sectionContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 12,
  },
  locationsSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
    marginTop: -8,
  },

  // Form Styles
  formContainer: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    minHeight: 120,
    paddingVertical: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    paddingVertical: 0,
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5DD39E',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#006838',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Location Cards
  locationCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#5DD39E',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
    flex: 1,
  },
  serviceBadge: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serviceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#006838',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  mapButton: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#006838',
  },
  mapButtonText: {
    color: '#006838',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  callButton: {
    backgroundColor: '#5DD39E',
  },
  callButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
});

export default ShopScreen;