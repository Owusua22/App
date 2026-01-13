import React from 'react';
import { View, Text, TouchableOpacity, Linking, TextInput, Button, FlatList, Alert, StyleSheet, ScrollView,  SafeAreaView,  KeyboardAvoidingView,
  Platform
 } from 'react-native';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';

import { Ionicons } from '@expo/vector-icons';

const ContactUsScreen = () => {
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
    emailjs
      .send("service_1rrjoml", "template_ypg8soa", values, "YOUR_USER_ID")
      .then((_response) => {
        Alert.alert("Success", "Your message has been sent successfully!");
      })
      .catch((error) => {
        console.error(error);
        Alert.alert("Error", "There was an error sending your message. Please try again later.");
      });
  };

  const openMap = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  const openCall = (tel) => {
    const url = `tel:${tel}`;
    Linking.openURL(url);
  };

  const renderLocation = ({ item }) => (
    <View style={styles.locationCard}>
      <Text style={styles.locationTitle}>{item.title}</Text>
      <Text>{item.address}</Text>
      <TouchableOpacity onPress={() => openMap(item.lat, item.lng)}>
        <Text style={styles.link}>View on Map</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => openCall(item.tel)}>
        <Text style={styles.link}>Call: {item.tel}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={styles.header}>Contact Us</Text>

          {/* Contact Information */}
          <View style={styles.contactCard}>
            <Ionicons name="call" size={24} color="red" />
            <Text style={styles.contactTitle}>Call Us</Text>
            <Text>We are available 6 days a week.</Text>
            <TouchableOpacity onPress={() => openCall("0246422338")}>
              <Text style={styles.link}>0246422338</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactCard}>
            <MaterialIcons name="email" size={24} color="red" />
            <Text style={styles.contactTitle}>Write To Us</Text>
            <Text>Fill out our form and we will contact you within 24 hours.</Text>
            <TouchableOpacity onPress={() => Linking.openURL("mailto:online@frankotrading.com")}>
              <Text style={styles.link}>online@frankotrading.com</Text>
            </TouchableOpacity>
          </View>

          {/* Contact Form */}
          <View style={styles.formContainer}>
            <TextInput style={styles.input} placeholder="Your Name" />
            <TextInput style={styles.input} placeholder="Your Email" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Your Phone" keyboardType="phone-pad" />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Your Message" multiline numberOfLines={4} />
            <TouchableOpacity style={styles.button} onPress={handleFormSubmit}>
  <MaterialIcons name="send" size={20} color="#fff" />
  <Text style={styles.buttonText}>Send Message</Text>
</TouchableOpacity>
          </View>

          <Text style={styles.header}>Our Shop Locations</Text>

          {/* Use FlatList without nesting inside ScrollView */}
          <FlatList
            data={locations}
            renderItem={renderLocation}
            keyExtractor={(item, index) => `${item.title}-${index}`}
            scrollEnabled={false} // Disable FlatList scrolling since ScrollView handles it
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D7263D',
    marginBottom: 20,
  },
  contactCard: {
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    elevation: 3,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  link: {
    color: '#0066cc',
    textDecorationLine: 'underline',
    marginTop: 5,
  },
  formContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    paddingLeft: 10,
    borderRadius: 8,
  },
  textArea: {
    textAlignVertical: 'top',
  },
  locationCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    elevation: 3,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#006838",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8, // Spacing between icon and text
  },
});

export default ContactUsScreen;
