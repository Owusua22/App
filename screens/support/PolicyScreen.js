import React from "react";
import { View, Text, FlatList, StyleSheet, Image } from "react-native";
import { franko } from "../../theme/franko";

const data = [
  {
    type: "header",
    title: "FRANKO TRADING LIMITED",
    subtitle: "RETURN POLICY",
  },
  {
    type: "text",
    content:
      "Subject to Terms and Conditions, Franko Trading Enterprise offers returns and/or exchange or refund for items purchased within 7 DAYS OF PURCHASE. We do not accept returns and or exchange for any reason whatsoever after the stated period has elapsed.",
  },
  {
    type: "policy",
    title: "WRONG ITEM DELIVERED",
    description: [
      "The seals on the box must not be broken/opened.",
      "There should be no dents and liquid intrusion on the item.",
      "Proof of Purchase/Receipt must be provided.",
    ],
    color: "#ff4d4f",
  },
  {
    type: "policy",
    title: "MANUFACTURING DEFECTS",
    description: [
      "Within the 7 days, defective items would be replaced with the same piece/unit (depending on stock availability).",
      "All items shall go through inspection and diagnosis on return to verify the reason provided.",
      "Returns (defective items) after 7 days would be sent to the Brand’s Service Centre for repairs under the Manufacturer Warranty.",
    ],
    color: "#086942",
  },
  {
    type: "policy",
    title: "INCOMPLETE PACKAGE",
    description: [
      "Incomplete package or missing complementary items must be reported within 7 days for immediate redress.",
    ],
    color: "#faad14",
  },
  {
    type: "policy",
    title: "UNDELIVERED ORDER/PACKAGE",
    description: [
      "Refund/charge back request for undelivered orders will go through vetting and approval, with refunds made within 30 days.",
      "Charge back requests must be initiated through customer’s bank for payments made via credit card or other banking platforms.",
      "Refunds will be made by cheque for accounting purposes.",
    ],
    color: "#2f54eb",
  },
];

const PolicyScreen = () => {
  const renderItem = ({ item }) => {
    if (item.type === "header") {
      return (
        <View style={styles.header}>
          <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.companyTitle}>{item.title}</Text>
          <Text style={styles.policyTitle}>{item.subtitle}</Text>
        </View>
      );
    }
    if (item.type === "text") {
      return <Text style={styles.mainText}>{item.content}</Text>;
    }
    if (item.type === "policy") {
      return (
        <View style={[styles.card, { borderLeftColor: item.color }]}>
          <Text style={[styles.cardTitle, { color: item.color }]}>{item.title}</Text>
          {item.description.map((desc, index) => (
            <Text key={index} style={styles.cardText}>
              •  {desc}
            </Text>
          ))}
        </View>
      );
    }
    return null;
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(item, index) => `${item.type}-${index}`}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 35, backgroundColor: franko.canvas },
  header: { backgroundColor: franko.forest, borderRadius: 21, padding: 23, marginBottom: 17, alignItems: 'flex-start' },
  logo: { width: 100, height: 43, marginBottom: 14 },
  companyTitle: { fontSize: 10, fontWeight: '800', color: '#D8FF85', letterSpacing: 1.4 },
  policyTitle: { fontSize: 25, fontWeight: '900', color: '#FFFFFF', marginTop: 6 },
  mainText: { fontSize: 13, lineHeight: 21, color: franko.ink, marginBottom: 17, backgroundColor: franko.soft, padding: 18, borderRadius: 16 },
  card: { borderWidth: 1, borderLeftWidth: 4, borderColor: franko.border, borderRadius: 16, padding: 17, marginBottom: 11, backgroundColor: franko.surface },
  cardTitle: { fontSize: 13, fontWeight: '800', marginBottom: 10, letterSpacing: 0.4 },
  cardText: { fontSize: 12, lineHeight: 19, color: franko.muted, marginBottom: 5 },
});

export default PolicyScreen;
